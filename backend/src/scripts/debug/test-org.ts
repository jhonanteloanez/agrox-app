import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  try {
    // 1. Get first user
    const users = await prisma.$queryRawUnsafe<any[]>(
      `SELECT id, email, first_name, last_name FROM custom_auth.users LIMIT 1`
    );
    
    if (users.length === 0) {
      console.log('No users found');
      return;
    }
    
    const user = users[0];
    console.log('DEBUG: Found user:', user);
    
    const userId = user.id;

    // 2. Get organizationId from org_user_role
    const userRoles = await prisma.$queryRawUnsafe<any[]>(
      `SELECT organization_id FROM public.org_user_role WHERE user_id = $1::uuid LIMIT 1`,
      userId
    );
    console.log('DEBUG: org_user_role result:', userRoles);

    if (userRoles.length === 0) {
      console.log('DEBUG: No organization roles found for user');
      return;
    }

    const organizationId = userRoles[0].organization_id;

    // 3. Call public.org_get(organizationId)
    const orgData = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM public.org_get($1::uuid)`,
      organizationId
    );
    console.log('DEBUG: org_get result:', orgData);

    if (orgData.length === 0) {
      console.log('DEBUG: org_get returned no data');
      return;
    }

    const responseData = {
      name: orgData[0].name,
      type: orgData[0].type || 'P1'
    };
    console.log('DEBUG: Final response data:', responseData);

  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
