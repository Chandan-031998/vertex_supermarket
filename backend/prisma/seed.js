import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getDelegate(modelName) {
  const delegate = prisma[modelName];

  if (!delegate || typeof delegate.upsert !== "function") {
    console.warn(`Skipping ${modelName}: model is not available in the current Prisma schema.`);
    return null;
  }

  return delegate;
}

async function seedRolesAndUsers() {
  const roleDelegate = getDelegate("role");
  const userDelegate = getDelegate("user");

  if (!roleDelegate || !userDelegate) {
    return;
  }

  const roles = await Promise.all([
    roleDelegate.upsert({
      where: { name: "SUPER_ADMIN" },
      update: { description: "Full access" },
      create: { name: "SUPER_ADMIN", description: "Full access" },
    }),
    roleDelegate.upsert({
      where: { name: "MANAGER" },
      update: { description: "Store manager" },
      create: { name: "MANAGER", description: "Store manager" },
    }),
    roleDelegate.upsert({
      where: { name: "CASHIER" },
      update: { description: "POS cashier" },
      create: { name: "CASHIER", description: "POS cashier" },
    }),
  ]);

  const roleByName = Object.fromEntries(roles.map((role) => [role.name, role]));
  const users = [
    { name: "Super Admin", email: "admin@vertex.local", password: "Admin@123", roleName: "SUPER_ADMIN" },
    { name: "Store Manager", email: "manager@vertex.local", password: "Manager@123", roleName: "MANAGER" },
    { name: "Main Cashier", email: "cashier@vertex.local", password: "Cashier@123", roleName: "CASHIER" },
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    const roleId = roleByName[user.roleName]?.id;

    if (!roleId) {
      continue;
    }

    await userDelegate.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash, roleId },
      create: { name: user.name, email: user.email, passwordHash, roleId },
    });
  }
}

async function seedCategoriesProductsAndInventory() {
  const categoryDelegate = getDelegate("category");
  const productDelegate = getDelegate("product");
  const inventoryDelegate = getDelegate("inventory");

  if (!categoryDelegate || !productDelegate || !inventoryDelegate) {
    return;
  }

  const groceries = await categoryDelegate.upsert({
    where: { name: "Groceries" },
    update: { description: "Daily essentials" },
    create: { name: "Groceries", description: "Daily essentials" },
  });

  const beverages = await categoryDelegate.upsert({
    where: { name: "Beverages" },
    update: { description: "Drinks and juices" },
    create: { name: "Beverages", description: "Drinks and juices" },
  });

  const sampleProducts = [
    {
      name: "Basmati Rice 1kg",
      sku: "SKU-RICE-001",
      barcode: "890100100001",
      categoryId: groceries.id,
      mrp: 95,
      sellingPrice: 90,
      purchasePrice: 78,
      gstRate: 5,
      reorderLevel: 10,
    },
    {
      name: "Sunflower Oil 1L",
      sku: "SKU-OIL-001",
      barcode: "890100100002",
      categoryId: groceries.id,
      mrp: 180,
      sellingPrice: 175,
      purchasePrice: 152,
      gstRate: 5,
      reorderLevel: 8,
    },
    {
      name: "Orange Juice 1L",
      sku: "SKU-JUICE-001",
      barcode: "890100100003",
      categoryId: beverages.id,
      mrp: 120,
      sellingPrice: 110,
      purchasePrice: 88,
      gstRate: 12,
      reorderLevel: 6,
    },
  ];

  for (const product of sampleProducts) {
    const createdProduct = await productDelegate.upsert({
      where: { sku: product.sku },
      update: product,
      create: product,
    });

    await inventoryDelegate.upsert({
      where: { productId: createdProduct.id },
      update: { currentStock: 50 },
      create: { productId: createdProduct.id, currentStock: 50 },
    });
  }
}

async function main() {
  await seedRolesAndUsers();
  await seedCategoriesProductsAndInventory();

  console.log("Seed completed");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
