import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // Clear existing data
  console.log("🧹 Clearing existing data...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  await prisma.salesperson.deleteMany();

  // Create Users
  console.log("👥 Creating users...");
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "John Doe",
        email: "john.doe@example.com",
        picture:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      },
    }),
    prisma.user.create({
      data: {
        name: "Jane Smith",
        email: "jane.smith@example.com",
        picture:
          "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
      },
    }),
    prisma.user.create({
      data: {
        name: "Bob Johnson",
        email: "bob.johnson@example.com",
        picture:
          "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      },
    }),
  ]);

  // Create Salespersons
  console.log("👔 Creating salespersons...");
  const salespersons = await Promise.all([
    prisma.salesperson.create({
      data: {
        name: "Sarah Johnson",
        email: "sarah.johnson@company.com",
        phone: "+1-555-0101",
        commission: 0.06, // 6%
        isActive: true,
      },
    }),
    prisma.salesperson.create({
      data: {
        name: "Michael Chen",
        email: "michael.chen@company.com",
        phone: "+1-555-0102",
        commission: 0.05, // 5%
        isActive: true,
      },
    }),
    prisma.salesperson.create({
      data: {
        name: "Emily Rodriguez",
        email: "emily.rodriguez@company.com",
        phone: "+1-555-0103",
        commission: 0.07, // 7%
        isActive: true,
      },
    }),
  ]);

  // Create Categories
  console.log("📂 Creating categories...");
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: "Electronics",
        description: "Latest gadgets and electronic devices",
      },
    }),
    prisma.category.create({
      data: {
        name: "Clothing",
        description: "Fashion and apparel for all seasons",
      },
    }),
    prisma.category.create({
      data: {
        name: "Books",
        description: "Fiction, non-fiction, and educational books",
      },
    }),
    prisma.category.create({
      data: {
        name: "Home & Garden",
        description: "Everything for your home and garden",
      },
    }),
  ]);

  // Create Products
  console.log("📦 Creating products...");
  const products = await Promise.all([
    // Electronics
    prisma.product.create({
      data: {
        name: "iPhone 15 Pro",
        description: "Latest iPhone with advanced camera system",
        price: 999.99,
        stockQuantity: 50,
        categoryId: categories[0].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "MacBook Air M2",
        description: "Lightweight laptop with powerful M2 chip",
        price: 1199.99,
        stockQuantity: 25,
        categoryId: categories[0].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Sony WH-1000XM5",
        description: "Premium noise-cancelling headphones",
        price: 349.99,
        stockQuantity: 100,
        categoryId: categories[0].id,
      },
    }),
    // Clothing
    prisma.product.create({
      data: {
        name: "Nike Air Max 270",
        description: "Comfortable running shoes with Air Max technology",
        price: 129.99,
        stockQuantity: 75,
        categoryId: categories[1].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Levi's 501 Jeans",
        description: "Classic straight-fit denim jeans",
        price: 89.99,
        stockQuantity: 120,
        categoryId: categories[1].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Patagonia Down Jacket",
        description: "Warm and lightweight down jacket",
        price: 199.99,
        stockQuantity: 30,
        categoryId: categories[1].id,
      },
    }),
    // Books
    prisma.product.create({
      data: {
        name: "The Pragmatic Programmer",
        description: "Your journey to mastery in software development",
        price: 49.99,
        stockQuantity: 200,
        categoryId: categories[2].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Clean Code",
        description: "A handbook of agile software craftsmanship",
        price: 44.99,
        stockQuantity: 150,
        categoryId: categories[2].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Design Patterns",
        description: "Elements of reusable object-oriented software",
        price: 54.99,
        stockQuantity: 80,
        categoryId: categories[2].id,
      },
    }),
    // Home & Garden
    prisma.product.create({
      data: {
        name: "Philips Hue Starter Kit",
        description: "Smart lighting system with 3 bulbs and bridge",
        price: 199.99,
        stockQuantity: 40,
        categoryId: categories[3].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Dyson V15 Detect",
        description: "Cord-free vacuum with laser technology",
        price: 699.99,
        stockQuantity: 15,
        categoryId: categories[3].id,
      },
    }),
    prisma.product.create({
      data: {
        name: "Weber Spirit II E-310",
        description: "3-burner gas grill with side tables",
        price: 449.99,
        stockQuantity: 20,
        categoryId: categories[3].id,
      },
    }),
  ]);

  // Create Orders
  console.log("🛒 Creating orders...");
  const orders = await Promise.all([
    // Order 1: John's electronics order (assigned to Sarah)
    prisma.order.create({
      data: {
        userId: users[0].id,
        salespersonId: salespersons[0].id, // Sarah Johnson
        status: "PROCESSING",
        totalAmount: 1349.98, // iPhone + Headphones
        orderItems: {
          create: [
            {
              productId: products[0].id, // iPhone
              quantity: 1,
              priceAtTime: 999.99,
            },
            {
              productId: products[2].id, // Headphones
              quantity: 1,
              priceAtTime: 349.99,
            },
          ],
        },
      },
    }),
    // Order 2: Jane's clothing order (assigned to Michael)
    prisma.order.create({
      data: {
        userId: users[1].id,
        salespersonId: salespersons[1].id, // Michael Chen
        status: "SHIPPED",
        totalAmount: 219.98, // Shoes + Jeans
        orderItems: {
          create: [
            {
              productId: products[3].id, // Nike shoes
              quantity: 1,
              priceAtTime: 129.99,
            },
            {
              productId: products[4].id, // Levi's jeans
              quantity: 1,
              priceAtTime: 89.99,
            },
          ],
        },
      },
    }),
    // Order 3: Bob's book order (assigned to Emily)
    prisma.order.create({
      data: {
        userId: users[2].id,
        salespersonId: salespersons[2].id, // Emily Rodriguez
        status: "DELIVERED",
        totalAmount: 149.97, // 3 books
        orderItems: {
          create: [
            {
              productId: products[6].id, // Pragmatic Programmer
              quantity: 1,
              priceAtTime: 49.99,
            },
            {
              productId: products[7].id, // Clean Code
              quantity: 1,
              priceAtTime: 44.99,
            },
            {
              productId: products[8].id, // Design Patterns
              quantity: 1,
              priceAtTime: 54.99,
            },
          ],
        },
      },
    }),
    // Order 4: John's home improvement order (no salesperson assigned)
    prisma.order.create({
      data: {
        userId: users[0].id,
        // No salespersonId - demonstrates optional assignment
        status: "PENDING",
        totalAmount: 899.98, // Smart lights + Vacuum
        orderItems: {
          create: [
            {
              productId: products[9].id, // Philips Hue
              quantity: 1,
              priceAtTime: 199.99,
            },
            {
              productId: products[10].id, // Dyson vacuum
              quantity: 1,
              priceAtTime: 699.99,
            },
          ],
        },
      },
    }),
  ]);

  console.log("✅ Database seeding completed!");
  console.log(`📊 Created:`);
  console.log(`   - ${users.length} users`);
  console.log(`   - ${salespersons.length} salespersons`);
  console.log(`   - ${categories.length} categories`);
  console.log(`   - ${products.length} products`);
  console.log(`   - ${orders.length} orders`);

  // Log some sample data for verification
  console.log("\n📋 Sample data:");
  console.log(`   Users: ${users.map((u) => u.name).join(", ")}`);
  console.log(`   Salespersons: ${salespersons.map((s) => s.name).join(", ")}`);
  console.log(`   Categories: ${categories.map((c) => c.name).join(", ")}`);
  console.log(
    `   Products: ${products
      .slice(0, 3)
      .map((p) => p.name)
      .join(", ")}...`
  );
  console.log(`   Orders: ${orders.length} orders with various statuses`);
  console.log(
    `   Orders with salespersons: ${orders.filter((o) => o.salespersonId).length}/${orders.length}`
  );
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
