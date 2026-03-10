import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { getOrgIdForUser } from '../index';

const router = Router();
router.use((req: any, res: any, next: any) => {
    if (!req.headers['authorization'])
        return res.status(401).json({ error: 'No autorizado' });
    next();
});

// ── Catálogo ──────────────────────────────────────────────────────────────

router.get('/products', async (req: Request, res: Response) => {
    try {
        const { name = null, category = null } = req.query;
        const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT product_id, name, scientific_name, category,
             harvest_time, planting_season, description
      FROM public.product
      WHERE ($1::text IS NULL OR name ILIKE '%' || $1 || '%')
        AND ($2::text IS NULL OR category::text = $2)
      ORDER BY name ASC
    `, name, category);
        return res.json({ data: rows });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/products/:productId/stages', async (req: Request, res: Response) => {
    try {
        const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT product_id, stage, stage_order, estimated_duration_days
      FROM public.product_phenology_stage
      WHERE product_id = $1::integer
      ORDER BY stage_order ASC
    `, parseInt(req.params.productId));
        if (!rows.length)
            return res.status(404).json({ error: 'Producto sin etapas configuradas' });
        return res.json({ data: rows });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});


// ── Ciclos de cultivo ─────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const orgId = await getOrgIdForUser(userId);
        if (!orgId) return res.status(403).json({ error: 'Usuario sin organización' });

        const { plot_id, product_id, planting_date, area_ha,
            estimated_harvest_date = null, notes = null } = req.body;

        if (!plot_id || !product_id || !planting_date || !area_ha)
            return res.status(400).json({ error: 'plot_id, product_id, planting_date y area_ha son requeridos' });
        if (Number(area_ha) <= 0)
            return res.status(400).json({ error: 'area_ha debe ser mayor que 0' });

        // Verificar lote pertenece a la org
        const plotCheck = await prisma.$queryRawUnsafe<any[]>(`
      SELECT pl.plot_id FROM public.plot pl
      JOIN public.property pr ON pl.property_id = pr.property_id
      WHERE pl.plot_id = $1
        AND pr.organization_id = $2
        AND pl.deleted_at IS NULL
    `, plot_id, orgId);
        if (!plotCheck.length)
            return res.status(404).json({ error: 'Lote no encontrado o no pertenece a tu organización' });

        // Regla MVP: 1 ciclo activo por lote
        const active = await prisma.$queryRawUnsafe<any[]>(`
      SELECT crop_id FROM public.crop
      WHERE plot_id = $1
        AND organization_id = $2
        AND status NOT IN ('Cosechado/Finalizado', 'Cerrado')
        AND deleted_at IS NULL
    `, plot_id, orgId);
        if (active.length)
            return res.status(409).json({ error: 'Ya existe un ciclo activo en este lote. Solo se permite uno en MVP.' });

        const result = await prisma.$queryRawUnsafe<any[]>(`
      SELECT public.fn_create_crop(
        $1::uuid, $2::integer, $3::date, $4::numeric,
        $5::date, $6::uuid, $7::uuid, $8::text
      ) AS crop_id
    `, plot_id, parseInt(product_id), planting_date,
            parseFloat(area_ha), estimated_harvest_date,
            orgId, userId, notes);

        return res.status(201).json({ message: 'Ciclo registrado', crop_id: result[0]?.crop_id });
    } catch (err: any) {
        if (err.message?.includes('etapas fenológicas') || err.message?.includes('harvest_time'))
            return res.status(422).json({ error: err.message });
        return res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const orgId = await getOrgIdForUser(userId);
        if (!orgId) return res.status(403).json({ error: 'Usuario sin organización' });

        const { plot_id = null, status = null, q = null,
            include_deleted = 'false', limit = '50', offset = '0' } = req.query;

        const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM public.fn_crop_list(
        $1::uuid, $2::uuid, $3::uuid, $4::text,
        $5::text, $6::boolean, $7::integer, $8::integer
      )
    `, orgId, userId, plot_id ?? null, status ?? null, q ?? null,
            include_deleted === 'true',
            parseInt(limit as string),
            parseInt(offset as string));

        return res.json({ data: rows, count: rows.length });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const orgId = await getOrgIdForUser(userId);
        if (!orgId) return res.status(403).json({ error: 'Usuario sin organización' });

        const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM public.fn_crop_get($1::bigint, $2::uuid, $3::uuid)
    `, parseInt(req.params.id), orgId, userId);

        if (!rows.length || !rows[0])
            return res.status(404).json({ error: 'Cultivo no encontrado' });
        return res.json({ data: rows[0] });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.patch('/:id', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const orgId = await getOrgIdForUser(userId);
        if (!orgId) return res.status(403).json({ error: 'Usuario sin organización' });

        const { product_id = null, status = null, growth_stage = null,
            planting_date = null, estimated_harvest_date = null,
            area_ha = null, notes = null } = req.body;

        await prisma.$executeRawUnsafe(`
      SELECT public.fn_crop_update(
        $1::bigint, $2::uuid, $3::uuid,
        NULL::bigint, $4::bigint,
        $5::text, $6::text,
        $7::date, $8::date, $9::numeric, $10::text
      )
    `, parseInt(req.params.id), orgId, userId,
            product_id, status, growth_stage,
            planting_date, estimated_harvest_date, area_ha, notes);

        return res.json({ message: 'Cultivo actualizado' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.patch('/:id/status', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const orgId = await getOrgIdForUser(userId);
        if (!orgId) return res.status(403).json({ error: 'Usuario sin organización' });

        const { status = null, growth_stage = null, notes = null } = req.body;
        if (!status && !growth_stage)
            return res.status(400).json({ error: 'Se requiere status o growth_stage' });

        await prisma.$executeRawUnsafe(`
      SELECT public.fn_crop_set_status_stage(
        $1::bigint, $2::uuid, $3::uuid, $4::text, $5::text, $6::text
      )
    `, parseInt(req.params.id), orgId, userId, status, growth_stage, notes);

        return res.json({ message: 'Estado actualizado' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const orgId = await getOrgIdForUser(userId);
        if (!orgId) return res.status(403).json({ error: 'Usuario sin organización' });

        await prisma.$executeRawUnsafe(`
      SELECT public.fn_crop_delete_soft($1::bigint, $2::uuid, $3::uuid)
    `, parseInt(req.params.id), orgId, userId);

        return res.json({ message: 'Ciclo archivado' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id/stages', async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    try {
        const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM public.fn_get_phenological_stages($1::bigint, $2::uuid)
    `, parseInt(req.params.id), userId);
        return res.json({ data: rows });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
