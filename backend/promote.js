const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@lastmile.dev';
  const password = 'Admin@123';
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.ADMIN,
      passwordHash,
    },
    create: {
      email,
      passwordHash,
      fullName: 'System Admin',
      phone: '1-800-ADMIN',
      role: Role.ADMIN,
    },
  });

  console.log(`Successfully set ${user.email} as ${user.role}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
