import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe<any[]>(
      "SELECT prosrc FROM pg_proc WHERE proname = 'fn_crop_set_status_stage';"
    );
    if (result.length > 0) {
      console.log(result[0].prosrc);
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
