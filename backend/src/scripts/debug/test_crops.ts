import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const crops = await prisma.$queryRawUnsafe<any[]>(
      "SELECT * FROM crop;"
    );
    console.log("Crops in DB:", crops);
    
    // Also test fn_crop_list if there are crops
    if (crops.length > 0) {
      const orgId = crops[0].organization_id;
      const createdBy = crops[0].created_by;
      
      const list = await prisma.$queryRawUnsafe<any[]>(`
        SELECT * FROM public.fn_crop_list(
          $1::uuid, $2::uuid, null, null, null, false, 50, 0
        )
      `, orgId, createdBy);
      console.log("fn_crop_list output:", list);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
