import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe<any[]>(
      "SELECT pg_get_function_arguments(oid) as args FROM pg_proc WHERE proname = 'fn_crop_list';"
    );
    console.log('Function fn_crop_list arguments:');
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
