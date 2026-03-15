import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { getOrgIdForUser } from '../index';

const router = Router();

function serializeRow(row: any): any {
    if (!row) return row;
    const result: any = {};
    for (const key of Object.keys(row)) {
        result[key] = typeof row[key] === 'bigint' ? row[key].toString() : row[key];
    }
    return result;
}

// ── GET /api/economic/income ──────────────────────────────────────────────────
router.get('/income', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const { crop_id, plot_id } = req.query;

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT * FROM public.fn_economic_income_list(
                $1::uuid,
                $2::bigint,
                $3::uuid
            )
        `, orgId, crop_id ? parseInt(crop_id as string) : null, plot_id || null);

        return res.json({ data: rows.map(serializeRow), count: rows.length });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// ── POST /api/economic/income ─────────────────────────────────────────────────
router.post('/income', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const { crop_id, plot_id, description, amount, currency, income_date, category, notes } = req.body;

        if (!description || amount === undefined || !currency || !income_date || !category) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: description, amount, currency, income_date, category' });
        }

        const validCategories = ['VENTA', 'SUBSIDIO', 'OTRO'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: `Categoría inválida. Use: ${validCategories.join(', ')}` });
        }

        const result = await prisma.$queryRawUnsafe<any[]>(`
            SELECT public.fn_economic_income_create(
                $1::uuid, $2::uuid, $3::bigint, $4::uuid,
                $5::text, $6::numeric, $7::text, $8::date, $9::text, $10::text
            ) AS income_id
        `,
            orgId, userId,
            crop_id ? parseInt(crop_id) : null,
            plot_id || null,
            description, parseFloat(amount), currency, income_date, category, notes || null
        );

        return res.status(201).json({ message: 'Ingreso registrado', income_id: result[0]?.income_id?.toString() });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// ── GET /api/economic/costs ───────────────────────────────────────────────────
router.get('/costs', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const { crop_id, plot_id } = req.query;

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT * FROM public.fn_economic_cost_list(
                $1::uuid,
                $2::bigint,
                $3::uuid
            )
        `, orgId, crop_id ? parseInt(crop_id as string) : null, plot_id || null);

        return res.json({ data: rows.map(serializeRow), count: rows.length });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// ── POST /api/economic/costs ──────────────────────────────────────────────────
router.post('/costs', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const { crop_id, plot_id, description, amount, currency, cost_date, category, inventory_item_id, notes } = req.body;

        if (!description || amount === undefined || !currency || !cost_date || !category) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: description, amount, currency, cost_date, category' });
        }

        const validCategories = ['INSUMO', 'MANO_OBRA', 'MAQUINARIA', 'OTRO'];
        if (!validCategories.includes(category)) {
            return res.status(400).json({ error: `Categoría inválida. Use: ${validCategories.join(', ')}` });
        }

        const result = await prisma.$queryRawUnsafe<any[]>(`
            SELECT public.fn_economic_cost_create(
                $1::uuid, $2::uuid, $3::bigint, $4::uuid,
                $5::text, $6::numeric, $7::text, $8::date, $9::text, $10::bigint, $11::text
            ) AS cost_id
        `,
            orgId, userId,
            crop_id ? parseInt(crop_id) : null,
            plot_id || null,
            description, parseFloat(amount), currency, cost_date, category,
            inventory_item_id ? parseInt(inventory_item_id) : null,
            notes || null
        );

        return res.status(201).json({ message: 'Costo registrado', cost_id: result[0]?.cost_id?.toString() });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// ── GET /api/economic/rentability ─────────────────────────────────────────────
router.get('/rentability', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const { crop_id, plot_id } = req.query;

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT * FROM public.fn_economic_rentability(
                $1::uuid,
                $2::bigint,
                $3::uuid
            )
        `, orgId, crop_id ? parseInt(crop_id as string) : null, plot_id || null);

        const result = rows[0] ? serializeRow(rows[0]) : { total_income: 0, total_cost: 0, profit: 0 };
        return res.json({ data: result });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// ── GET /api/economic/prices ──────────────────────────────────────────────────
router.get('/prices', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT * FROM public.fn_price_reference_list($1::uuid)
        `, orgId);

        return res.json({ data: rows.map(serializeRow), count: rows.length });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// ── POST /api/economic/prices ─────────────────────────────────────────────────
router.post('/prices', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const { crop_name, price, currency, source, source_url, reference_date, notes } = req.body;

        if (!crop_name || price === undefined || !currency || !source || !reference_date) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: crop_name, price, currency, source, reference_date' });
        }

        const validSources = ['MANUAL', 'API'];
        if (!validSources.includes(source)) {
            return res.status(400).json({ error: `Fuente inválida. Use: ${validSources.join(', ')}` });
        }

        const result = await prisma.$queryRawUnsafe<any[]>(`
            SELECT public.fn_price_reference_create(
                $1::uuid, $2::uuid, $3::text, $4::numeric,
                $5::text, $6::text, $7::text, $8::date, $9::text
            ) AS price_id
        `,
            orgId, userId, crop_name, parseFloat(price),
            currency, source, source_url || null, reference_date, notes || null
        );

        return res.status(201).json({ message: 'Precio de referencia registrado', price_id: result[0]?.price_id?.toString() });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
