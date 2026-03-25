import { prisma } from './src/prisma';

async function test() {
  try {
    console.log("Testing DB connection...");
    // Simulate the login query to see if it's a DB issue or schema issue
    const users = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, first_name, last_name, status FROM custom_auth.users LIMIT 1`
    );
    console.log("DB connection OK, users found:", users.length);
  } catch (e: any) {
    console.error("DB connection ERROR:", e.message);
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
