import { z } from "zod";

// Base schemas
export const OrderStatusSchema = z.enum([
  "PENDING",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
]);

export const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  picture: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const ProductSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().positive(),
  stockQuantity: z.number().int().min(0),
  categoryId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const OrderItemSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  priceAtTime: z.number().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const OrderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: OrderStatusSchema,
  totalAmount: z.number().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Schemas with relations
export const ProductWithCategorySchema = ProductSchema.extend({
  category: CategorySchema,
});

export const OrderItemWithProductSchema = OrderItemSchema.extend({
  product: ProductSchema,
});

export const OrderWithItemsSchema = OrderSchema.extend({
  user: UserSchema,
  orderItems: z.array(OrderItemWithProductSchema),
});

export const CategoryWithProductsSchema = CategorySchema.extend({
  products: z.array(ProductSchema),
});

// API Response schemas
export const PaginatedProductsResponseSchema = z.object({
  data: z.array(ProductWithCategorySchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const ProductsResponseSchema = z.array(ProductWithCategorySchema);
export const CategoriesResponseSchema = z.array(CategorySchema);
export const OrdersResponseSchema = z.array(OrderWithItemsSchema);

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
});

// Request schemas
export const CreateProductRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  price: z.number().positive(),
  stockQuantity: z.number().int().min(0),
  categoryId: z.string().uuid(),
});

export const UpdateProductRequestSchema = CreateProductRequestSchema.partial();

export const CreateCategoryRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

export const CreateUserRequestSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  picture: z.string().url().optional(),
});

export const CreateOrderRequestSchema = z.object({
  userId: z.string().uuid(),
  orderItems: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export const UpdateOrderStatusRequestSchema = z.object({
  status: OrderStatusSchema,
});

// Query parameter schemas
export const PaginationQuerySchema = z.object({
  page: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive())
    .default("1"),
  pageSize: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(100))
    .default("10"),
});

export const OrdersQuerySchema = z.object({
  userId: z.string().uuid().optional(),
});

// Type exports
export type OrderStatus = z.infer<typeof OrderStatusSchema>;
export type User = z.infer<typeof UserSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Product = z.infer<typeof ProductSchema>;
export type OrderItem = z.infer<typeof OrderItemSchema>;
export type Order = z.infer<typeof OrderSchema>;
export type ProductWithCategory = z.infer<typeof ProductWithCategorySchema>;
export type OrderItemWithProduct = z.infer<typeof OrderItemWithProductSchema>;
export type OrderWithItems = z.infer<typeof OrderWithItemsSchema>;
export type CategoryWithProducts = z.infer<typeof CategoryWithProductsSchema>;
export type PaginatedProductsResponse = z.infer<typeof PaginatedProductsResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
