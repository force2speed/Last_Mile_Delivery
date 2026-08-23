const { PrismaClient, OrderStatus, BusinessType, PaymentType, RouteType } = require('@prisma/client');
const prisma = new PrismaClient();

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function main() {
  // Find dependencies
  let customer = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
  if (!customer) customer = await prisma.user.findFirst();
  
  const zone = await prisma.zone.findFirst();
  if (!zone) throw new Error("No zone found");

  const rateCard = await prisma.rateCard.findFirst();
  if (!rateCard) throw new Error("No rate card found");

  const area = await prisma.area.findFirst();
  if (!area) throw new Error("No area found");

  // Generate 50 mock orders over the last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  let createdCount = 0;

  for (let i = 0; i < 50; i++) {
    const isDelivered = Math.random() > 0.3; // 70% delivered
    const status = isDelivered ? OrderStatus.DELIVERED : OrderStatus.CREATED;
    const createdAt = randomDate(sevenDaysAgo, now);
    
    // Generate some mock coordinates near a central point (e.g. 28.6139, 77.2090 for Delhi)
    const lat = 28.6139 + (Math.random() - 0.5) * 0.1;
    const lng = 77.2090 + (Math.random() - 0.5) * 0.1;

    const charge = Math.floor(Math.random() * 900) + 100; // 100 to 1000

    // Create order with addresses
    await prisma.order.create({
      data: {
        orderNumber: `MOCK-${Date.now()}-${i}`,
        customer: { connect: { id: customer.id } },
        status: status,
        createdAt: createdAt,
        updatedAt: createdAt,
        
        pickupZone: { connect: { id: zone.id } },
        dropZone: { connect: { id: zone.id } },
        routeType: RouteType.INTRA_ZONE,
        rateCard: { connect: { id: rateCard.id } },

        lengthCm: 10, breadthCm: 10, heightCm: 10,
        actualWeightKg: 1, volumetricWeightKg: 1, billableWeightKg: 1,
        
        businessType: BusinessType.B2C,
        paymentType: PaymentType.PREPAID,
        paymentStatus: 'PAID',
        
        totalCharge: charge,
        baseCharge: charge,
        weightCharge: 0,
        codSurcharge: 0,
        codCollectAmount: 0,
        
        pickupAddress: {
          create: {
            street: '123 Pickup St',
            city: 'Mock City',
            state: 'Mock State',
            pincode: '110001',
            latitude: lat - 0.01,
            longitude: lng - 0.01,
            areaId: area.id
          }
        },
        dropAddress: {
          create: {
            street: '456 Drop St',
            city: 'Mock City',
            state: 'Mock State',
            pincode: '110002',
            latitude: lat,
            longitude: lng,
            areaId: area.id
          }
        }
      }
    });
    createdCount++;
  }

  console.log(`Successfully created ${createdCount} mock orders for analytics!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
