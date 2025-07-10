# Salesperson Feature Specification

## Overview
Add salesperson management to the e-commerce system to track which salesperson is responsible for each order. This feature will include database schema changes, API endpoints for CRUD operations, and integration with the existing order system.

## Database Schema Changes

### New Salesperson Model
```prisma
model Salesperson {
  id          String   @id @default(cuid())
  name        String
  email       String   @unique
  phone       String?
  commission  Decimal  @default(0.05) // 5% default commission rate
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relationships
  orders      Order[]
  
  @@map("salespersons")
}
```

### Updated Order Model
```prisma
model Order {
  id            String        @id @default(cuid())
  userId        String
  salespersonId String?       // Optional field - nullable
  status        OrderStatus   @default(PENDING)
  totalAmount   Decimal
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  
  // Relationships
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  salesperson   Salesperson?  @relation(fields: [salespersonId], references: [id], onDelete: SetNull)
  items         OrderItem[]
  
  @@map("orders")
}
```

## API Endpoints

### 1. List All Salespersons
- **Endpoint:** `GET /api/salespersons`
- **Description:** Retrieve all active salespersons with optional filtering
- **Query Parameters:**
  - `active` (boolean, optional): Filter by active status
  - `search` (string, optional): Search by name or email
- **Response:** Array of salesperson objects with pagination

### 2. Get Single Salesperson
- **Endpoint:** `GET /api/salespersons/[id]`
- **Description:** Retrieve a specific salesperson by ID
- **Response:** Single salesperson object with order count

### 3. Create Salesperson
- **Endpoint:** `POST /api/salespersons`
- **Description:** Create a new salesperson
- **Request Body:** Salesperson creation data
- **Response:** Created salesperson object

### 4. Update Salesperson
- **Endpoint:** `PUT /api/salespersons/[id]`
- **Description:** Update an existing salesperson
- **Request Body:** Salesperson update data
- **Response:** Updated salesperson object

### 5. Delete Salesperson
- **Endpoint:** `DELETE /api/salespersons/[id]`
- **Description:** Soft delete a salesperson (set isActive to false)
- **Response:** Success confirmation

### 6. Update Order with Salesperson
- **Endpoint:** `PUT /api/orders/[id]`
- **Description:** Update order to include salesperson assignment
- **Request Body:** Order update data including optional salespersonId
- **Response:** Updated order object

## Zod Schemas

### Salesperson Schemas
```typescript
// Create salesperson
const CreateSalespersonSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional(),
  commission: z.number().min(0).max(1).default(0.05), // 0-100% as decimal
  isActive: z.boolean().default(true)
});

// Update salesperson
const UpdateSalespersonSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  commission: z.number().min(0).max(1).optional(),
  isActive: z.boolean().optional()
});

// Salesperson response
const SalespersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  commission: z.number(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  _count: z.object({
    orders: z.number()
  }).optional()
});

// Salespersons list response
const SalespersonsResponseSchema = z.object({
  data: z.array(SalespersonSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number()
  })
});
```

### Updated Order Schemas
```typescript
// Update order (existing schema extended)
const UpdateOrderSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
  totalAmount: z.number().positive().optional(),
  salespersonId: z.string().optional().nullable() // New field
});

// Order response (existing schema extended)
const OrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  salespersonId: z.string().nullable(), // New field
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  totalAmount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  salesperson: SalespersonSchema.nullable().optional() // New nested field
});
```

## Seeded Data

### 3 Sample Salespersons
```typescript
const salespersons = [
  {
    name: "Sarah Johnson",
    email: "sarah.johnson@company.com",
    phone: "+1-555-0101",
    commission: 0.06, // 6%
    isActive: true
  },
  {
    name: "Michael Chen",
    email: "michael.chen@company.com", 
    phone: "+1-555-0102",
    commission: 0.05, // 5%
    isActive: true
  },
  {
    name: "Emily Rodriguez",
    email: "emily.rodriguez@company.com",
    phone: "+1-555-0103", 
    commission: 0.07, // 7%
    isActive: true
  }
];
```

## Implementation Plan

### Phase 1: Database Schema
1. Update Prisma schema with Salesperson model
2. Add salespersonId to Order model
3. Run database migration
4. Update seed script with salesperson data

### Phase 2: API Endpoints
1. Create `/api/salespersons` route handlers
2. Implement CRUD operations
3. Add validation with Zod schemas
4. Update order endpoints to handle salesperson assignment

### Phase 3: Testing
1. Update contract tests for new endpoints
2. Add violation tests for salesperson endpoints
3. Update unified dynamic tests
4. Verify existing order tests still pass

### Phase 4: Documentation
1. Update OpenAPI specification
2. Update README with new endpoints
3. Add salesperson examples to documentation

## Business Rules

1. **Salesperson Assignment:**
   - Orders can optionally be assigned to a salesperson
   - If a salesperson is deleted, their orders remain but salespersonId becomes null
   - Only active salespersons can be assigned to new orders

2. **Commission Tracking:**
   - Each salesperson has a commission rate (0-100% as decimal)
   - Commission is calculated on order total amount
   - Historical commission data is preserved even if salesperson is deactivated

3. **Data Integrity:**
   - Email addresses must be unique across all salespersons
   - Phone numbers are optional but must be valid format if provided
   - Commission rates must be between 0 and 1 (0-100%)

## Testing Requirements

### Contract Tests
- All salesperson CRUD operations return correct schemas
- Order updates with salesperson assignment work correctly
- Error handling for invalid salesperson IDs
- Validation of required fields and data types

### Violation Tests
- Attempt to create salesperson with duplicate email
- Attempt to assign non-existent salesperson to order
- Attempt to use invalid commission rates
- Attempt to access deleted salesperson

### Integration Tests
- Verify salesperson appears in order responses
- Verify order count updates when salesperson is assigned/removed
- Verify soft delete functionality works correctly 