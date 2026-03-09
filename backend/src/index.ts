import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { getPrismaWithUser, prisma } from './prisma';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'agrox-dev-secret';

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
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string, role: string };
    req.user = payload;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Registration Route
app.post('/api/auth/register', async (req, res) => {
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
      await tx.$queryRawUnsafe(
        `SELECT * FROM public.fn_finalize_user_registration($1::uuid, $2, $3, 150.00, 'BOB')`,
        userId, plan_code || 'P1', orgName
      );

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

// Organizations - using RLS Context
app.get('/api/organizations', authMiddleware, async (req, res) => {
  try {
    const rlsPrisma = getPrismaWithUser(req.user!.sub, req.user!.role);
    const orgs = await rlsPrisma.organization.findMany();
    res.json(orgs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Properties
app.get('/api/properties', authMiddleware, async (req, res) => {
  try {
    const rlsPrisma = getPrismaWithUser(req.user!.sub, req.user!.role);
    const properties = await rlsPrisma.property.findMany({
      include: {
        organization: true
      }
    });
    res.json(properties);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Plots
app.get('/api/plots', authMiddleware, async (req, res) => {
  try {
    const rlsPrisma = getPrismaWithUser(req.user!.sub, req.user!.role);
    const plots = await rlsPrisma.plot.findMany();
    res.json(plots);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch plots' });
  }
});

// Crops
app.get('/api/crops', authMiddleware, async (req, res) => {
  try {
    const rlsPrisma = getPrismaWithUser(req.user!.sub, req.user!.role);
    const crops = await rlsPrisma.crop.findMany({
      include: {
        product: true
      }
    });
    res.json(crops);
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
