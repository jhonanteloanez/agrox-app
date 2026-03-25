import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();


/**
 * Creates a Prisma Client extension that applies Row Level Security (RLS)
 * by setting standard JWT claims in the PostgreSQL transaction context.
 * 
 * Assumes RLS policies use current_setting('request.jwt.claims')::json->>'sub' or similar.
 */
export const getPrismaWithUser = (userId: string, role: string) => {
  const claims = JSON.stringify({ sub: userId, role: role });
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          const [, result] = await prisma.$transaction([
            // TRUE means local to the transaction
            prisma.$executeRaw`SELECT set_config('request.jwt.claims', ${claims}, TRUE)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
};
