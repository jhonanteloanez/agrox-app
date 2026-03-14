import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const orgs = await prisma.$queryRawUnsafe<any[]>(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'organization';"
    );
    console.log("Org Columns:", orgs);

    const prods = await prisma.$queryRawUnsafe<any[]>(
      "SELECT * FROM product LIMIT 5;"
    );
    console.log("Products:", prods);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
