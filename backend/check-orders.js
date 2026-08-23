const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.order.count();
  console.log('Total orders:', c);
}
main().catch(console.error).finally(() => prisma.$disconnect());
