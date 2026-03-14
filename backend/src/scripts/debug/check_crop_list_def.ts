import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe<any[]>(
      "SELECT pg_get_functiondef(oid) as def FROM pg_proc WHERE proname = 'fn_crop_list';"
    );
    if (result.length > 0) {
      console.log(result[0].def);
    } else {
      console.log('Function not found');
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
