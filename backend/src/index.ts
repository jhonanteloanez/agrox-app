import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'agrox-dev-secret';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the organization_id for the given user, or throws if none found. */
async function getOrgIdForUser(userId: string): Promise<string> {
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT organization_id FROM public.org_user_role WHERE user_id = $1::uuid LIMIT 1`,
    userId
  );
  if (rows.length === 0) throw new Error('No organization found for this user');
  return rows[0].organization_id as string;
}

/** Calls fn_log_audit_event (fire-and-forget, errors are swallowed by the DB function). */
async function logAudit(
  entity: string,
  entityId: string,
  action: string,
  organizationId: string,
  userId: string,
  details: object = {}
): Promise<void> {
  await prisma.$executeRawUnsafe(
    `SELECT public.fn_log_audit_event($1, $2, $3, $4::uuid, $5::uuid, $6::jsonb)`,
    entity,
    entityId,
    action,
    organizationId,
    userId,
    JSON.stringify(details)
  );
}

// Declare global types
declare global {
  namespace Express {
    interface Request {
      user?: { sub: string, role: string };
    }
  }
}

// Authentication Middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('DEBUG: authMiddleware - No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string, role: string };
    console.log('DEBUG: authMiddleware - Token verified, payload:', payload);
    req.user = payload;
    next();
  } catch (err: any) {
    console.log('DEBUG: authMiddleware - Token verification failed:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Registration Route
app.post('/api/auth/register', async (req, res) => {
  console.log('REGISTER endpoint hit', req.body);
  const { email, password, first_name, last_name, phone, username, plan_code } = req.body;

  if (!email || !password || !first_name || !last_name || !username) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 1. Create the user using the database function
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Register User
      const userResult = await tx.$queryRawUnsafe<any[]>(
        `SELECT public.fn_register_user_initial($1, $2, $3, $4, $5, $6, $7) as user_id`,
        email, first_name, last_name, password, phone || '', plan_code || 'P1', username
      );
      const userId = userResult[0].user_id;

      // Step 2: Finalize registration (Creates Organization, Subscription, and sets Owner role)
      const orgName = `${first_name} ${last_name}'s Organization`;
      try {
        console.log(`DEBUG: Finalizing registration for user ${userId} with plan ${plan_code || 'P1'}`);
        await tx.$queryRawUnsafe(
          `SELECT * FROM public.fn_finalize_user_registration($1::uuid, $2, $3, 150.00, 'BOB')`,
          userId, plan_code || 'P1', orgName
        );
        console.log('DEBUG: fn_finalize_user_registration completed successfully');
      } catch (finalizeError: any) {
        console.error('DEBUG: fn_finalize_user_registration FAILED:', finalizeError);
        throw finalizeError; // Rethrow to rollback transaction
      }

      return userId;
    });

    res.status(201).json({ message: 'User registered successfully and organization created', userId: result });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message || 'Registration failed' });
  }
});

// Check Email Route
app.get('/api/auth/check-email', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const available = await prisma.$queryRawUnsafe<any[]>(
      `SELECT public.fn_validate_email_available($1)`,
      email
    );
    res.json({ available: true });
  } catch (error: any) {
    res.json({ available: false, error: error.message });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    // Verify password using PostgreSQL crypt in a raw query
    const users = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, first_name, last_name, status FROM custom_auth.users 
       WHERE lower(email) = lower($1) AND password = crypt($2, password)`,
      email, password
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    if (user.status !== 'ACTIVE') {
      // In this specific schema, users might start as PENDING_ACTIVATION
      // For now, let's allow login but the frontend should handle the state
      // return res.status(403).json({ error: 'User account is not active', status: user.status });
    }

    // Fetch the user's role from public.user_roles or default to 'PRODUCTOR'
    const roles = await prisma.$queryRawUnsafe<any[]>(
      `SELECT role FROM public.user_roles WHERE user_id = $1::uuid LIMIT 1`,
      user.id
    );

    const role = roles.length > 0 ? roles[0].role : 'PRODUCTOR';

    const token = jwt.sign(
      { sub: user.id, role: role },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get My Organization
app.get('/api/org/my-org', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.sub;
    console.log('DEBUG: userId from JWT:', userId);

    // 1. Get organizationId from org_user_role
    const userRoles = await prisma.$queryRawUnsafe<any[]>(
      `SELECT organization_id FROM public.org_user_role WHERE user_id = $1::uuid LIMIT 1`,
      userId
    );
    console.log('DEBUG: org_user_role result:', userRoles);

    if (userRoles.length === 0) {
      return res.status(404).json({ error: 'No organization found for this user' });
    }

    const organizationId = userRoles[0].organization_id;

    // 2. Call public.org_get(organizationId)
    const orgData = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM public.org_get($1::uuid)`,
      organizationId
    );
    console.log('DEBUG: org_get result:', orgData);

    if (orgData.length === 0) {
      return res.status(404).json({ error: 'Organization details not found' });
    }

    const responseData = {
      name: orgData[0].name,
      type: orgData[0].type || 'P1'
    };
    console.log('DEBUG: Sending response:', responseData);
    res.json(responseData);
  } catch (error: any) {
    console.error('Fetch organization error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch organization' });
  }
});

// Organizations
app.get('/api/organizations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const orgId = await getOrgIdForUser(userId);
    const orgs = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM public.organization WHERE organization_id = $1::uuid`,
      orgId
    );
    res.json(orgs);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to fetch organizations' });
  }
});

// ─── Properties ──────────────────────────────────────────────────────────────

/** GET /api/properties — list active properties for the user's organization */
app.get('/api/properties', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const orgId = await getOrgIdForUser(userId);

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
         property_id, organization_id, name, alias, department, municipality, community,
         centroid_lat, centroid_lon, area_m2, elevation_m, address,
         climate_radius_km, status, created_at, updated_at
       FROM public.property
       WHERE organization_id = $1::uuid AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      orgId
    );
    res.json(rows);
  } catch (error: any) {
    console.error('GET /api/properties error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch properties' });
  }
});

/** POST /api/properties — create a new property */
app.post('/api/properties', authMiddleware, async (req, res) => {
  const userId = req.user!.sub;
  const {
    name,
    department,
    municipality,
    community,
    climate_radius_km,
    polygon, // Array of { lat: number, lon: number }
  } = req.body;

  // ── Basic field validation ──────────────────────────────────────────────
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }
  if (!department || typeof department !== 'string' || department.trim() === '') {
    return res.status(400).json({ error: 'El departamento es obligatorio' });
  }
  if (!municipality || typeof municipality !== 'string' || municipality.trim() === '') {
    return res.status(400).json({ error: 'El municipio es obligatorio' });
  }

  const radius = Number(climate_radius_km);
  if (isNaN(radius) || radius < 5 || radius > 100) {
    return res.status(400).json({ error: 'El radio climático debe estar entre 5 y 100 km' });
  }

  // ── Polygon validation ─────────────────────────────────────────────────
  if (!Array.isArray(polygon) || polygon.length < 3) {
    return res.status(400).json({ error: 'El polígono debe tener al menos 3 puntos' });
  }

  for (const pt of polygon) {
    const lat = Number(pt.lat);
    const lon = Number(pt.lon);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return res.status(400).json({ error: `Latitud inválida: ${pt.lat} (debe estar entre -90 y 90)` });
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      return res.status(400).json({ error: `Longitud inválida: ${pt.lon} (debe estar entre -180 y 180)` });
    }
  }

  // ── Build closed polygon (first point = last point) ────────────────────
  const pts: { lat: number; lon: number }[] = polygon.map((p: any) => ({ lat: Number(p.lat), lon: Number(p.lon) }));
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first.lat !== last.lat || first.lon !== last.lon) {
    pts.push(first); // auto-close
  }

  // WKT uses (longitude latitude) order
  const coordStr = pts.map(p => `${p.lon} ${p.lat}`).join(', ');
  const wkt = `SRID=4326;POLYGON((${coordStr}))`;

  // ── Centroid (simple average of input points, excluding repeated last) ─
  const uniquePts = pts.slice(0, -1);
  const centroidLat = uniquePts.reduce((sum, p) => sum + p.lat, 0) / uniquePts.length;
  const centroidLon = uniquePts.reduce((sum, p) => sum + p.lon, 0) / uniquePts.length;

  try {
    const orgId = await getOrgIdForUser(userId);

    // Check unique name per org
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT property_id FROM public.property
       WHERE organization_id = $1::uuid AND lower(name) = lower($2) AND deleted_at IS NULL`,
      orgId,
      name.trim()
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Ya existe una propiedad con ese nombre en tu organización' });
    }

    // Insert property — area_m2 calculated by PostGIS
    const inserted = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.property
         (organization_id, name, department, municipality, community,
          geo_area, centroid_lat, centroid_lon, area_m2, climate_radius_km, status)
       VALUES
         ($1::uuid, $2, $3, $4, $5,
          ST_GeogFromText($6), $7, $8,
          COALESCE(ST_Area(ST_GeogFromText($6)), 0),
          $9, 'ACTIVE')
       RETURNING property_id, name, department, municipality, community,
                 centroid_lat, centroid_lon, area_m2, climate_radius_km, status, created_at`,
      orgId,
      name.trim(),
      department.trim(),
      municipality.trim(),
      community ? community.trim() : null,
      wkt,
      centroidLat,
      centroidLon,
      radius
    );

    const newProperty = inserted[0];

    // Audit
    await logAudit(
      'property',
      newProperty.property_id,
      'CREATE',
      orgId,
      userId,
      { name: newProperty.name, department, municipality, community, climate_radius_km: radius }
    );

    res.status(201).json(newProperty);
  } catch (error: any) {
    console.error('POST /api/properties error:', error);
    if (error.message?.includes('uk_property_name_per_org')) {
      return res.status(400).json({ error: 'Ya existe una propiedad con ese nombre en tu organización' });
    }
    res.status(500).json({ error: error.message || 'Error al crear la propiedad' });
  }
});

/** GET /api/properties/:id — get property detail */
app.get('/api/properties/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const { id } = req.params;
    const orgId = await getOrgIdForUser(userId);

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT
         property_id, organization_id, name, alias, department, municipality, community,
         centroid_lat, centroid_lon, area_m2, elevation_m, address,
         climate_radius_km, status, created_at, updated_at,
         ST_AsText(geo_area::geometry) AS polygon_wkt
       FROM public.property
       WHERE property_id = $1::uuid AND organization_id = $2::uuid AND deleted_at IS NULL`,
      id,
      orgId
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }
    res.json(rows[0]);
  } catch (error: any) {
    console.error('GET /api/properties/:id error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener la propiedad' });
  }
});

/** DELETE /api/properties/:id — soft delete */
app.delete('/api/properties/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const { id } = req.params;
    const orgId = await getOrgIdForUser(userId);

    // Ensure property belongs to this org and is active
    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT property_id FROM public.property
       WHERE property_id = $1::uuid AND organization_id = $2::uuid AND deleted_at IS NULL`,
      id,
      orgId
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    await prisma.$queryRawUnsafe(
      `UPDATE public.property
       SET deleted_at = NOW(), status = 'INACTIVE', updated_at = NOW()
       WHERE property_id = $1::uuid`,
      id
    );

    await logAudit('property', id, 'DELETE', orgId, userId, {});

    res.json({ message: 'Propiedad eliminada correctamente' });
  } catch (error: any) {
    console.error('DELETE /api/properties/:id error:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar la propiedad' });
  }
});

// ─── Lots ────────────────────────────────────────────────────────────────────

/** GET /api/properties/:propertyId/lots — list active lots for a property */
app.get('/api/properties/:propertyId/lots', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const { propertyId } = req.params;
    const orgId = await getOrgIdForUser(userId);

    // Verify property belongs to org
    const propCheck = await prisma.$queryRawUnsafe<any[]>(
      `SELECT property_id FROM public.property 
       WHERE property_id = $1::uuid AND organization_id = $2::uuid AND deleted_at IS NULL`,
      propertyId, orgId
    );
    if (propCheck.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const lots = await prisma.$queryRawUnsafe<any[]>(
      `SELECT plot_id as lot_id, property_id, name, area_m2, description, status, created_at, updated_at
       FROM public.plot
       WHERE property_id = $1::uuid AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      propertyId
    );
    
    res.json(lots);
  } catch (error: any) {
    console.error('GET /api/properties/:propertyId/lots error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch lots' });
  }
});

/** POST /api/properties/:propertyId/lots — create a new lot */
app.post('/api/properties/:propertyId/lots', authMiddleware, async (req, res) => {
  try {
    if (req.user!.role !== 'PRODUCTOR') {
      return res.status(403).json({ error: 'No tienes permiso para registrar lotes' });
    }

    const userId = req.user!.sub;
    const { propertyId } = req.params;
    const orgId = await getOrgIdForUser(userId);
    const { name, area_m2, status = 'ACTIVE', description } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    const area = Number(area_m2);
    if (isNaN(area) || area <= 0) {
      return res.status(400).json({ error: 'El área debe ser mayor a 0' });
    }
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return res.status(400).json({ error: 'Status inválido' });
    }
    const desc = description && typeof description === 'string' ? description.trim() : null;
    if (desc && desc.length > 500) {
      return res.status(400).json({ error: 'La descripción no puede superar los 500 caracteres' });
    }

    // Verify property belongs to org
    const propCheck = await prisma.$queryRawUnsafe<any[]>(
      `SELECT property_id FROM public.property 
       WHERE property_id = $1::uuid AND organization_id = $2::uuid AND deleted_at IS NULL`,
      propertyId, orgId
    );
    if (propCheck.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    // Check unique name per property
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT plot_id FROM public.plot
       WHERE property_id = $1::uuid AND lower(name) = lower($2) AND deleted_at IS NULL`,
      propertyId, name.trim()
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Ya existe un lote con ese nombre en esta propiedad' });
    }

    const inserted = await prisma.$queryRawUnsafe<any[]>(
      `INSERT INTO public.plot (property_id, name, area_m2, description, status)
       VALUES ($1::uuid, $2, $3, $4, $5::status_basic)
       RETURNING plot_id as lot_id, property_id, name, area_m2, description, status, created_at`,
      propertyId, name.trim(), area, desc, status
    );

    const newLot = inserted[0];

    await logAudit(
      'lot',
      newLot.lot_id,
      'CREATE',
      orgId,
      userId,
      { property_id: propertyId, name: newLot.name, area_m2: area, status }
    );

    res.status(201).json(newLot);
  } catch (error: any) {
    console.error('POST /api/properties/:propertyId/lots error:', error);
    res.status(500).json({ error: error.message || 'Error al crear el lote' });
  }
});

/** GET /api/properties/:propertyId/lots/:lotId — get lot detail */
app.get('/api/properties/:propertyId/lots/:lotId', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const { propertyId, lotId } = req.params;
    const orgId = await getOrgIdForUser(userId);

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT pl.plot_id as lot_id, pl.property_id, pl.name, pl.area_m2, pl.description, pl.status, pl.created_at, pl.updated_at
       FROM public.plot pl
       JOIN public.property pr ON pr.property_id = pl.property_id
       WHERE pl.plot_id = $1::uuid AND pl.property_id = $2::uuid AND pr.organization_id = $3::uuid AND pl.deleted_at IS NULL`,
      lotId, propertyId, orgId
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }
    
    res.json(rows[0]);
  } catch (error: any) {
    console.error('GET /api/properties/:propertyId/lots/:lotId error:', error);
    res.status(500).json({ error: error.message || 'Error al obtener el lote' });
  }
});

/** PUT /api/properties/:propertyId/lots/:lotId — update lot data */
app.put('/api/properties/:propertyId/lots/:lotId', authMiddleware, async (req, res) => {
  try {
    if (req.user!.role !== 'PRODUCTOR') {
      return res.status(403).json({ error: 'No tienes permiso para editar lotes' });
    }

    const userId = req.user!.sub;
    const { propertyId, lotId } = req.params;
    const orgId = await getOrgIdForUser(userId);
    const { name, area_m2, status, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    const area = Number(area_m2);
    if (isNaN(area) || area <= 0) {
      return res.status(400).json({ error: 'El área debe ser mayor a 0' });
    }
    if (status !== 'ACTIVE' && status !== 'INACTIVE') {
      return res.status(400).json({ error: 'Status inválido' });
    }
    const desc = description ? description.trim() : null;
    if (desc && desc.length > 500) {
      return res.status(400).json({ error: 'La descripción no puede superar los 500 caracteres' });
    }

    // Verify ownership and check existence
    const lotCheck = await prisma.$queryRawUnsafe<any[]>(
      `SELECT pl.plot_id 
       FROM public.plot pl
       JOIN public.property pr ON pr.property_id = pl.property_id
       WHERE pl.plot_id = $1::uuid AND pl.property_id = $2::uuid AND pr.organization_id = $3::uuid AND pl.deleted_at IS NULL`,
      lotId, propertyId, orgId
    );
    if (lotCheck.length === 0) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    // Check unique name per property (excluding current lot)
    const existing = await prisma.$queryRawUnsafe<any[]>(
      `SELECT plot_id FROM public.plot
       WHERE property_id = $1::uuid AND lower(name) = lower($2) AND plot_id != $3::uuid AND deleted_at IS NULL`,
      propertyId, name.trim(), lotId
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Ya existe un lote con ese nombre en esta propiedad' });
    }

    const updated = await prisma.$queryRawUnsafe<any[]>(
      `UPDATE public.plot 
       SET name = $1, area_m2 = $2, description = $3, status = $4::status_basic, updated_at = NOW()
       WHERE plot_id = $5::uuid
       RETURNING plot_id as lot_id, property_id, name, area_m2, description, status, updated_at`,
      name.trim(), area, desc, status, lotId
    );

    const updatedLot = updated[0];

    await logAudit(
      'lot',
      updatedLot.lot_id,
      'UPDATE',
      orgId,
      userId,
      { property_id: propertyId, name: updatedLot.name, area_m2: area, status }
    );

    res.json(updatedLot);
  } catch (error: any) {
    console.error('PUT /api/properties/:propertyId/lots/:lotId error:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar el lote' });
  }
});

/** DELETE /api/properties/:propertyId/lots/:lotId — soft delete */
app.delete('/api/properties/:propertyId/lots/:lotId', authMiddleware, async (req, res) => {
  try {
    if (req.user!.role !== 'PRODUCTOR') {
      return res.status(403).json({ error: 'No tienes permiso para eliminar lotes' });
    }

    const userId = req.user!.sub;
    const { propertyId, lotId } = req.params;
    const orgId = await getOrgIdForUser(userId);

    // Verify ownership and existence
    const lotCheck = await prisma.$queryRawUnsafe<any[]>(
      `SELECT pl.plot_id 
       FROM public.plot pl
       JOIN public.property pr ON pr.property_id = pl.property_id
       WHERE pl.plot_id = $1::uuid AND pl.property_id = $2::uuid AND pr.organization_id = $3::uuid AND pl.deleted_at IS NULL`,
      lotId, propertyId, orgId
    );
    if (lotCheck.length === 0) {
      return res.status(404).json({ error: 'Lote no encontrado' });
    }

    await prisma.$queryRawUnsafe(
      `UPDATE public.plot
       SET deleted_at = NOW(), status = 'INACTIVE'::status_basic, updated_at = NOW()
       WHERE plot_id = $1::uuid`,
      lotId
    );

    await logAudit('lot', lotId, 'DELETE', orgId, userId, { property_id: propertyId });

    res.json({ message: 'Lote eliminado correctamente' });
  } catch (error: any) {
    console.error('DELETE /api/properties/:propertyId/lots/:lotId error:', error);
    res.status(500).json({ error: error.message || 'Error al eliminar el lote' });
  }
});

// Plots
app.get('/api/plots', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.sub;
    const orgId = await getOrgIdForUser(userId);
    const plots = await prisma.$queryRawUnsafe<any[]>(
      `SELECT p.* FROM public.plot p
       JOIN public.property pr ON pr.property_id = p.property_id
       WHERE pr.organization_id = $1::uuid AND p.deleted_at IS NULL`,
      orgId
    );
    res.json(plots);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to fetch plots' });
  }
});

// Crops
app.get('/api/crops', authMiddleware, async (req, res) => {
  try {
    res.json([]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch crops' });
  }
});

// Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`AgroX Backend running on port ${PORT}`);
});
