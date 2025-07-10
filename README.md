# Catalyst Starter Kit

A modern, full-stack web application starter kit built with Next.js, Prisma, and TypeScript.

## Features

- **Next.js 15** with App Router and Turbopack
- **Prisma** for database management with auto-generated OpenAPI specs
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **NextAuth.js** for authentication
- **Stripe** for payments
- **Comprehensive Testing** with dynamic contract and violation tests
- **Auto-generated Zod Schemas** from OpenAPI specifications

## Quick Start

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd catalyst
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Set up the database:**
   ```bash
   npm run migrate
   npm run seed
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

## Schema Generation and Contract Testing

This project uses a modern approach to API validation and testing with auto-generated Zod schemas from OpenAPI specifications.

### Workflow

1. **Generate OpenAPI spec from Prisma schema:**
   ```bash
   npm run generate:openapi
   ```

2. **Generate Zod schemas from OpenAPI:**
   ```bash
   npm run generate:zod
   ```

3. **Run contract tests:**
   ```bash
   npm run test:contract
   ```

### Available Scripts

- `npm run generate:openapi` - Generate OpenAPI spec from Prisma schema
- `npm run generate:zod` - Generate Zod schemas from OpenAPI spec
- `npm run test:contract` - Run complete contract testing workflow
- `npm run test:heyapi-contract` - Test HeyAPI contract validation
- `npm run test:heyapi-dynamic` - Run dynamic contract tests with generated schemas

### Architecture

- **Prisma Schema** → **OpenAPI Spec** → **Zod Schemas** → **API Validation**
- All API routes use auto-generated schemas for request/response validation
- Dynamic contract tests validate API responses against generated schemas
- Violation tests ensure proper error handling

## Testing

The project includes comprehensive testing infrastructure:

### Contract Tests
- Validate API responses match OpenAPI specifications
- Use auto-generated Zod schemas for validation
- Dynamic test generation from OpenAPI spec

### Violation Tests
- Test error handling and validation
- Ensure proper HTTP status codes
- Validate error response schemas

### Unified Testing
- `npm run test:unified-contract` - Run contract tests only
- `npm run test:unified-violation` - Run violation tests only
- `npm run test:unified-all` - Run both test types

## Database

The project uses Prisma with PostgreSQL. Key commands:

- `npm run migrate` - Run database migrations
- `npm run seed` - Seed the database with sample data
- `npm run generate:openapi` - Generate OpenAPI spec from Prisma schema

## API Endpoints

All API endpoints are automatically documented in the OpenAPI specification and validated using generated Zod schemas:

- `/api/users` - User management
- `/api/products` - Product catalog
- `/api/categories` - Product categories
- `/api/orders` - Order management
- `/api/stripe` - Payment processing

## Development

### Code Quality
- `npm run lint-check` - Run linting
- `npm run format` - Format code
- `npm run type-check` - TypeScript type checking

### Database
- `npm run migrate` - Create and apply migrations
- `npm run seed` - Seed with sample data

## Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

## Contributing

1. Follow the existing code style and patterns
2. Ensure all tests pass before submitting
3. Update OpenAPI specs when adding new endpoints
4. Use generated Zod schemas for validation

## License

MIT License - see LICENSE file for details.
