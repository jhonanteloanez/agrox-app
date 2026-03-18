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

// ── GET /api/notifications ────────────────────────────────────────────────────
// Query param: unread_only=true/false (default false)
router.get('/', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const orgId = await getOrgIdForUser(userId);
        const unreadOnly = req.query.unread_only === 'true';

        const rows = await prisma.$queryRawUnsafe<any[]>(`
            SELECT * FROM public.fn_notification_list($1::uuid, $2::uuid, $3::boolean)
        `, orgId, userId, unreadOnly);

        return res.json({ data: rows.map(serializeRow), count: rows.length });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
router.patch('/:id/read', async (req: Request, res: Response) => {
    const userId = (req as any).user?.sub;
    try {
        const { id } = req.params;

        await prisma.$executeRawUnsafe(`
            SELECT public.fn_notification_mark_read($1::uuid, $2::uuid)
        `, id, userId);

        return res.json({ message: 'Notificación marcada como leída' });
    } catch (err: any) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
