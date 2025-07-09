import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface TestData {
  users: Array<{
    id: string;
    name: string;
    email: string;
    picture?: string | null;
  }>;
  categories: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
  products: Array<{
    id: string;
    name: string;
    description?: string | null;
    price: number;
    stockQuantity: number;
    categoryId: string;
  }>;
  orders: Array<{
    id: string;
    userId: string;
    status: string;
    orderItems: Array<{
      id: string;
      productId: string;
      quantity: number;
      priceAtTime: number;
    }>;
  }>;
}

/**
 * Get comprehensive test data from the database
 */
export async function getTestData(): Promise<TestData> {
  try {
    // Query all data with relationships
    const [users, categories, products, orders] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          picture: true,
        },
      }),
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          description: true,
        },
      }),
      prisma.product.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          stockQuantity: true,
          categoryId: true,
        },
      }),
      prisma.order.findMany({
        select: {
          id: true,
          userId: true,
          status: true,
          orderItems: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              priceAtTime: true,
            },
          },
        },
      }),
    ]);

    return {
      users,
      categories,
      products: products.map((product) => ({
        ...product,
        price: Number(product.price),
      })),
      orders: orders.map((order) => ({
        id: order.id,
        userId: order.userId,
        status: order.status,
        orderItems: order.orderItems.map((item) => ({
          ...item,
          priceAtTime: Number(item.priceAtTime),
        })),
      })),
    };
  } catch (error) {
    console.error("Error fetching test data:", error);
    throw new Error(`Failed to fetch test data: ${error}`);
  }
}

/**
 * Get a specific item by index from an array
 */
export function getItemByIndex<T>(array: T[], index: number): T {
  if (!array || array.length === 0) {
    throw new Error("Array is empty or undefined");
  }
  return array[index % array.length];
}

/**
 * Generate a unique email for testing
 */
export function generateUniqueEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Get a valid reference ID for a specific resource type
 */
export async function getValidReferenceId(resourceType: string): Promise<string> {
  const testData = await getTestData();

  switch (resourceType.toLowerCase()) {
    case "user":
    case "users":
      if (testData.users.length === 0) {
        throw new Error("No users available in test data");
      }
      return testData.users[0].id;

    case "category":
    case "categories":
      if (testData.categories.length === 0) {
        throw new Error("No categories available in test data");
      }
      return testData.categories[0].id;

    case "product":
    case "products":
      if (testData.products.length === 0) {
        throw new Error("No products available in test data");
      }
      return testData.products[0].id;

    case "order":
    case "orders":
      if (testData.orders.length === 0) {
        throw new Error("No orders available in test data");
      }
      return testData.orders[0].id;

    default:
      throw new Error(`Unknown resource type: ${resourceType}`);
  }
}

/**
 * Get a valid order item for testing
 */
export async function getValidOrderItem(): Promise<{
  productId: string;
  quantity: number;
}> {
  const testData = await getTestData();

  if (testData.products.length === 0) {
    throw new Error("No products available for order item");
  }

  return {
    productId: testData.products[0].id,
    quantity: 1,
  };
}

/**
 * Disconnect from the database
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}
