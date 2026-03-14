import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';
import { getOrgIdForUser } from '../index';

const router = Router();

// ── BigInt → String helper ──────────────────────────────────────────────
function serializeRow(row: any): any {
    if (!row) return row;
    const result: any = {};
    for (const key of Object.keys(row)) {
        result[key] = typeof row[key] === 'bigint' ? row[key].toString() : row[key];
    }
    return result;
}

// ── Helper to check Plan P2 ─────────────────────────────────────────────
async function isPlanP2(orgId: string, userId: string): Promise<boolean> {
    const sub = await prisma.$queryRawUnsafe<any[]>(`
        SELECT s.plan_code
        FROM public.subscription s
        JOIN public.org_user_role our ON our.organization_id = s.organization_id
        WHERE our.user_id = $1::uuid AND s.status = 'ACTIVE' LIMIT 1
    `, userId);
    return sub[0]?.plan_code === 'P2';
}

router.get('/', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        if (!orgId) return res.status(403).json({ error: 'Usuario sin organización' });

        const { include_deleted = 'false' } = req.query;

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT * FROM public.fn_inventory_list($1::uuid, $2::boolean)
        `, orgId, include_deleted === 'true');

        const sub = await prisma.$queryRawUnsafe<any[]>(`
            SELECT s.plan_code
            FROM public.subscription s
            JOIN public.org_user_role our ON our.organization_id = s.organization_id
            WHERE our.user_id = $1::uuid AND s.status = 'ACTIVE' LIMIT 1
        `, userId);

        return res.json({
            data: rows.map(serializeRow),
            plan_code: sub[0]?.plan_code || 'P1',
            count: rows.length
        });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        if (!orgId) return res.status(403).json({ error: 'Usuario sin organización' });

        const { name, category, unit, description, quantity, min_stock, expiration_date } = req.body;

        if (!name || !category || !unit || quantity === undefined || min_stock === undefined) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }

        const result = await prisma.$queryRawUnsafe<any[]>(`
            SELECT public.fn_inventory_create(
                $1::uuid, $2::uuid, $3::text, $4::text, $5::text, $6::text, $7::numeric, $8::numeric, $9::date
            ) AS item_id
        `, orgId, userId, name, category, unit, description || null, quantity, min_stock, expiration_date || null);

        return res.status(201).json({ message: 'Ítem creado', item_id: result[0]?.item_id?.toString() });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        if (!orgId) return res.status(403).json({ error: 'Usuario sin organización' });

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT * FROM public.fn_inventory_get($1::bigint, $2::uuid)
        `, parseInt(req.params.id), orgId);

        if (!rows.length || !rows[0])
            return res.status(404).json({ error: 'Ítem no encontrado' });
        return res.json({ data: serializeRow(rows[0]) });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        if (!orgId) return res.status(403).json({ error: 'Usuario sin organización' });

        await prisma.$executeRawUnsafe(`
            SELECT public.fn_inventory_delete_soft($1::bigint, $2::uuid, $3::uuid)
        `, parseInt(req.params.id), orgId, userId);

        return res.json({ message: 'Ítem eliminado' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/:id/movement', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        if (!orgId) return res.status(403).json({ error: 'Usuario sin organización' });

        const { type, quantity, crop_id, notes } = req.body;

        if (!type || quantity === undefined || quantity === null) {
            return res.status(400).json({ error: 'type y quantity son requeridos' });
        }

        const validTypes = ['ENTRADA', 'SALIDA', 'AJUSTE', 'CONSUMO_CULTIVO'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Tipo de movimiento inválido' });
        }

        // Logic fix: for removals, quantity must be negative
        let qtyToProcess = parseFloat(quantity);
        if (type === 'SALIDA' || type === 'CONSUMO_CULTIVO') {
            qtyToProcess = -Math.abs(qtyToProcess);
        }

        await prisma.$executeRawUnsafe(`
            SELECT public.fn_inventory_movement(
                $1::bigint, $2::uuid, $3::uuid, $4::text, $5::numeric, $6::bigint, $7::text
            )
        `, parseInt(req.params.id), orgId, userId, type, qtyToProcess, crop_id ? parseInt(crop_id) : null, notes || null);

        return res.json({ message: 'Movimiento registrado' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// P2 Only Routes
router.get('/requests', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        if (!orgId) return res.status(403).json({ error: 'Usuario sin organización' });

        if (!(await isPlanP2(orgId, userId))) {
            return res.status(403).json({ error: 'Función solo disponible para Plan P2 (Cooperativas)' });
        }

        // Ideally we use a PL/pgSQL function here, but we will query directly if none provided.
        // Or assume there is a fn_inventory_request_list(p_org_id)
        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT r.*, u.full_name as created_by_name FROM public.inventory_request r
            LEFT JOIN public.users u ON r.created_by = u.id
            WHERE r.organization_id = $1::uuid
            ORDER BY r.created_at DESC
        `, orgId);

        return res.json({ data: rows.map(serializeRow) });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

router.post('/requests', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        if (!orgId) return res.status(403).json({ error: 'Usuario sin organización' });

        if (!(await isPlanP2(orgId, userId))) {
            return res.status(403).json({ error: 'Función solo disponible para Plan P2 (Cooperativas)' });
        }

        const { item_name, quantity, unit, notes } = req.body;

        if (!item_name || !quantity || !unit) {
            return res.status(400).json({ error: 'item_name, quantity y unit son obligatorios' });
        }

        await prisma.$executeRawUnsafe(`
            SELECT public.fn_inventory_request_create(
                $1::uuid, $2::uuid, $3::text, $4::numeric, $5::text, $6::text
            )
        `, orgId, userId, item_name, quantity, unit, notes || null);

        return res.status(201).json({ message: 'Solicitud creada exitosamente' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
