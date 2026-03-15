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

// ── GET /api/activities ───────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const { crop_id, plot_id, status } = req.query;

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT * FROM public.fn_activity_list(
                $1::uuid,
                $2::bigint,
                $3::uuid,
                $4::text
            )
        `, orgId,
            crop_id ? parseInt(crop_id as string) : null,
            plot_id || null,
            status || null
        );

        return res.json({ data: rows.map(serializeRow), count: rows.length });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// ── POST /api/activities ──────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const { title, activity_type, scheduled_date, crop_id, plot_id, description, assigned_to, notes } = req.body;

        if (!title || !activity_type || !scheduled_date) {
            return res.status(400).json({ error: 'Faltan campos obligatorios: title, activity_type, scheduled_date' });
        }

        const validTypes = ['RIEGO', 'FERTILIZACION', 'FUMIGACION', 'COSECHA', 'OTRO'];
        if (!validTypes.includes(activity_type)) {
            return res.status(400).json({ error: `Tipo inválido. Use: ${validTypes.join(', ')}` });
        }

        const result = await prisma.$queryRawUnsafe<any[]>(`
            SELECT public.fn_activity_create(
                $1::uuid, $2::uuid, $3::text, $4::text, $5::date,
                $6::bigint, $7::uuid, $8::text, $9::uuid, $10::text
            ) AS activity_id
        `,
            orgId, userId, title, activity_type, scheduled_date,
            crop_id ? parseInt(crop_id) : null,
            plot_id || null,
            description || null,
            assigned_to || null,
            notes || null
        );

        return res.status(201).json({ message: 'Actividad creada', activity_id: result[0]?.activity_id?.toString() });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/activities/:id/status ─────────────────────────────────────────
router.patch('/:id/status', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const activityId = parseInt(req.params.id);
        const { status, completed_date, notes } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'El campo status es requerido' });
        }

        const validStatuses = ['PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Status inválido. Use: ${validStatuses.join(', ')}` });
        }

        await prisma.$executeRawUnsafe(`
            SELECT public.fn_activity_update_status(
                $1::bigint, $2::uuid, $3::uuid, $4::text, $5::date, $6::text
            )
        `,
            activityId, orgId, userId, status,
            completed_date || null,
            notes || null
        );

        return res.json({ message: 'Status actualizado' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// ── DELETE /api/activities/:id ────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const activityId = parseInt(req.params.id);

        await prisma.$executeRawUnsafe(`
            SELECT public.fn_activity_delete_soft($1::bigint, $2::uuid, $3::uuid)
        `, activityId, orgId, userId);

        return res.json({ message: 'Actividad eliminada' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// ── GET /api/calendar ─────────────────────────────────────────────────────────
router.get('/calendar', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const { from_date, to_date, crop_id, plot_id } = req.query;

        // Default to current month if no dates provided
        const now = new Date();
        const defaultFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${lastDay}`;

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT * FROM public.fn_calendar_list(
                $1::uuid, $2::date, $3::date, $4::bigint, $5::uuid
            )
        `,
            orgId,
            (from_date as string) || defaultFrom,
            (to_date as string) || defaultTo,
            crop_id ? parseInt(crop_id as string) : null,
            plot_id || null
        );

        return res.json({ data: rows.map(serializeRow), count: rows.length });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
