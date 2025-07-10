import { Zodios, type ZodiosOptions, makeApi } from "@zodios/core";
import { z } from "zod";

type User = {
  id: string;
  name: string;
  email: string;
  password?: string | undefined;
  picture: string;
  notifications: Array<Notification>;
  orders: Array<Order>;
  createdAt: string;
  updatedAt: string;
};
type OrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
type Notification = {
  id: string;
  type: string;
  title: string;
  content: string;
  link?: string | undefined;
  read: boolean;
  archived: boolean;
  user: User;
  userId: string;
  createdAt: string;
  updatedAt: string;
};
type Category = {
  id: string;
  name: string;
  description?: string | undefined;
  products: Array<Product>;
  createdAt: string;
  updatedAt: string;
};
type Product = {
  id: string;
  name: string;
  description?: string | undefined;
  price: number;
  stockQuantity: number;
  category: Category;
  categoryId: string;
  orderItems: Array<OrderItem>;
  createdAt: string;
  updatedAt: string;
};
type Order = {
  id: string;
  user: User;
  userId: string;
  status: OrderStatus;
  totalAmount: number;
  orderItems: Array<OrderItem>;
  createdAt: string;
  updatedAt: string;
};
type OrderItem = {
  id: string;
  order: Order;
  orderId: string;
  product: Product;
  productId: string;
  quantity: number;
  priceAtTime: number;
  createdAt: string;
  updatedAt: string;
};

const OrderStatus = z.enum([
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);
const Category: z.ZodType<Category> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      products: z.array(Product),
      createdAt: z.string().datetime({ offset: true }),
      updatedAt: z.string().datetime({ offset: true }),
    })
    .passthrough()
);
const Product: z.ZodType<Product> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      price: z.number(),
      stockQuantity: z.number().int(),
      category: Category,
      categoryId: z.string(),
      orderItems: z.array(OrderItem),
      createdAt: z.string().datetime({ offset: true }),
      updatedAt: z.string().datetime({ offset: true }),
    })
    .passthrough()
);
const OrderItem: z.ZodType<OrderItem> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      order: Order,
      orderId: z.string(),
      product: Product,
      productId: z.string(),
      quantity: z.number().int(),
      priceAtTime: z.number(),
      createdAt: z.string().datetime({ offset: true }),
      updatedAt: z.string().datetime({ offset: true }),
    })
    .passthrough()
);
const Order: z.ZodType<Order> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      user: User,
      userId: z.string(),
      status: OrderStatus,
      totalAmount: z.number(),
      orderItems: z.array(OrderItem),
      createdAt: z.string().datetime({ offset: true }),
      updatedAt: z.string().datetime({ offset: true }),
    })
    .passthrough()
);
const User: z.ZodType<User> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      password: z.string().optional(),
      picture: z.string(),
      notifications: z.array(Notification),
      orders: z.array(Order),
      createdAt: z.string().datetime({ offset: true }),
      updatedAt: z.string().datetime({ offset: true }),
    })
    .passthrough()
);
const Notification: z.ZodType<Notification> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      type: z.string(),
      title: z.string(),
      content: z.string(),
      link: z.string().optional(),
      read: z.boolean(),
      archived: z.boolean(),
      user: User,
      userId: z.string(),
      createdAt: z.string().datetime({ offset: true }),
      updatedAt: z.string().datetime({ offset: true }),
    })
    .passthrough()
);

export const schemas = {
  OrderStatus,
  Category,
  Product,
  OrderItem,
  Order,
  User,
  Notification,
};

const endpoints = makeApi([]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
