"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const modules = [
        {
            key: 'retail_supermarket',
            name: 'Retail & Supermarkets',
            description: 'Fast POS, stock control, barcode scanning.'
        },
        {
            key: 'bar_restaurant',
            name: 'Bar & Restaurants',
            description: 'Tables, orders, kitchen flow, bar tabs.'
        },
        {
            key: 'chicken_meat',
            name: 'Chicken/Eggs',
            description: 'Batches, weight sales, profit tracking.'
        }
    ];
    for (const m of modules) {
        await prisma.module.upsert({
            where: { key: m.key },
            update: { name: m.name, description: m.description, isActive: true },
            create: { ...m, isActive: true }
        });
    }
    const plans = [
        {
            name: 'starter',
            pricePerMonth: 20000,
            months: 1,
            discountPercent: 0,
            userLimit: 3,
            trialDays: 0,
            featuresJson: ['1 module', 'Basic reports', 'Inventory & sales', 'Standard support']
        },
        {
            name: 'professional',
            pricePerMonth: 40000,
            months: 1,
            discountPercent: 0,
            userLimit: 6,
            trialDays: 0,
            featuresJson: ['1 module', 'Advanced reports', 'User roles', 'Priority support']
        },
        {
            name: 'enterprise',
            pricePerMonth: 60000,
            months: 1,
            discountPercent: 0,
            userLimit: 11,
            trialDays: 0,
            featuresJson: ['1 module', 'All reports', 'Multi-user access', 'Dedicated support']
        }
    ];
    for (const p of plans) {
        await prisma.plan.upsert({
            where: { name: p.name },
            update: {
                pricePerMonth: p.pricePerMonth,
                months: p.months,
                discountPercent: p.discountPercent,
                userLimit: p.userLimit,
                trialDays: p.trialDays,
                featuresJson: p.featuresJson,
                isActive: true,
                price: p.pricePerMonth * p.months
            },
            create: {
                name: p.name,
                pricePerMonth: p.pricePerMonth,
                months: p.months,
                discountPercent: p.discountPercent,
                userLimit: p.userLimit,
                trialDays: p.trialDays,
                featuresJson: p.featuresJson,
                isActive: true,
                price: p.pricePerMonth * p.months
            }
        });
    }
    await prisma.$executeRawUnsafe('SELECT 1');
    void client_1.SubscriptionStatus;
    void client_1.UserRole;
}
main()
    .catch(async (e) => {
    console.error(e);
    process.exitCode = 1;
})
    .finally(async () => {
    await prisma.$disconnect();
});
