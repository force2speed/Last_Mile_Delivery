const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.user.updateMany({ data: { role: 'CUSTOMER' } });
  console.log('All users reverted to CUSTOMER');
}
main().catch(console.error).finally(() => prisma.$disconnect());
