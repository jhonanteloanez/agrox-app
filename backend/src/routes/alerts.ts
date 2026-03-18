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

// ── GET /api/alerts ───────────────────────────────────────────────────────────
// Query param: property_id (optional)
router.get('/', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const { property_id } = req.query;

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT * FROM public.fn_climate_alert_config_list($1::uuid, $2::uuid)
        `, orgId, property_id || null);

        return res.json({ data: rows.map(serializeRow), count: rows.length });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// ── POST /api/alerts ──────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const {
            property_id,
            alert_type,
            threshold_value,
            threshold_unit,
            notify_inapp,
            notify_whatsapp,
            whatsapp_number,
        } = req.body;

        if (!property_id || !alert_type || threshold_value === undefined || !threshold_unit) {
            return res.status(400).json({ error: 'property_id, alert_type, threshold_value y threshold_unit son obligatorios' });
        }

        const result = await prisma.$queryRawUnsafe<any[]>(`
            SELECT public.fn_climate_alert_config_create(
                $1::uuid, $2::uuid, $3::uuid, $4::text, $5::numeric, $6::text, $7::boolean, $8::boolean, $9::text
            ) AS config_id
        `,
            orgId,
            userId,
            property_id,
            alert_type,
            threshold_value,
            threshold_unit,
            notify_inapp ?? true,
            notify_whatsapp ?? false,
            whatsapp_number || null
        );

        return res.status(201).json({ message: 'Alerta creada', config_id: result[0]?.config_id?.toString() });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/alerts/:id ────────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const { id } = req.params;

        await prisma.$executeRawUnsafe(`
            SELECT public.fn_climate_alert_config_delete_soft($1::uuid, $2::uuid, $3::uuid)
        `, id, orgId, userId);

        return res.json({ message: 'Alerta eliminada' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
