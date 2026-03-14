import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe<any[]>(
      "SELECT unnest(enum_range(NULL::public.phenological_stages)) as stage;"
    );
    console.log('Enum phenological_stages:');
    console.log(JSON.stringify(result, null, 2));

    const resultSingular = await prisma.$queryRawUnsafe<any[]>(
      "SELECT unnest(enum_range(NULL::public.phenological_stage)) as stage;"
    );
    console.log('Enum phenological_stage (singular):');
    console.log(JSON.stringify(resultSingular, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
