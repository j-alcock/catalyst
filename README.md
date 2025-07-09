# <img src="src/app/icon.svg" alt="Catalyst Starter Kit" width="28" height="28" /> Catalyst Starter Kit

![GitHub Workflow Status](https://github.com/kovrichard/catalyst/actions/workflows/build.yml/badge.svg)

This repository provides a powerful starter kit for building modern web applications using the following stack:

- [Bun.js](https://bun.sh): A fast JavaScript runtime for modern web applications.
- [Prisma](https://www.prisma.io): A next-generation ORM for TypeScript and JavaScript that simplifies database access.
- [Next.js](https://nextjs.org): A full-stack React framework for building server-side rendered applications.
- [Tailwind CSS](https://tailwindcss.com): A utility-first CSS framework for building responsive designs.
- [shadcn/ui](https://ui.shadcn.com): A collection of beautifully designed UI components built with Tailwind CSS.
- [Husky](https://typicode.github.io/husky/): Git hooks that help to enforce coding standards by running scripts during the commit process.
- [Biome](https://biomejs.dev): A toolchain for linting, formatting, and other code quality tasks.
- [Auth.js](https://authjs.dev): A simple and open-source authentication library for modern web applications.
- [Stripe](https://stripe.com): A payment processing platform for online businesses.
- [Zod](https://zod.dev): TypeScript-first schema validation with static type inference.
- [Winston](https://github.com/winstonjs/winston): A logger for just about everything.
- [Tabler Icons](https://tablericons.com): A set of over 5,600 open-source SVG icons.
- [Amazon SES](https://aws.amazon.com/ses/): A reliable, scalable, and cost-effective email service.
- [React Email](https://react.email): A library for building responsive HTML emails using React.
- [Google Analytics](https://analytics.google.com): You know what it is.
- [Google Tag Manager](https://tagmanager.google.com): For fine-grained tracking and analytics.
- [Docker](https://www.docker.com): In case you need to containerize your application.
- [GitHub Actions](https://github.com/features/actions): For continuous integration and deployment.

It also contains an example [GitHub Actions workflow](/.github/workflows/build.yml) for continuous integration and deployment. The workflow installs the dependencies, lints the code, and builds the project.

https://github.com/user-attachments/assets/b9d199c8-50ea-42f1-8d9f-d833b95aa91f

## Getting Started

### Prerequisites

Ensure that you have the following tools installed on your machine:

- [Bun](https://bun.sh): Install Bun via the command line by running:

```bash
curl -fsSL https://bun.sh/install | bash
```

or

```bash
powershell -c "irm bun.sh/install.ps1 | iex"
```

Or if you prefer, you can use other package managers like npm, yarn, or pnpm.

### Development

Copy the [`.env.sample`](.env.sample) file to `.env` to set up the environment variables. Then, run the development server:

```bash
bun dev
# or
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying [`src/app/(public)/page.tsx`](<src/app/(public)/page.tsx>). The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Contract Testing

This project includes comprehensive contract testing using HeyAPI and Zod with both manual and algorithmic approaches:

### Running Contract Tests

```bash
# Run comprehensive manual contract tests
npm run test:contract

# Run algorithmic contract tests (OpenAPI-driven)
npm run test:contract:algorithmic

# Run contract violation tests (should fail)
npm run test:violations
```

### Contract Testing Approaches

#### 1. Manual Contract Tests (`test:contract`)
- **Comprehensive field validation**: Tests every characteristic of all fields
- **Type safety**: Uses TypeScript and Zod for runtime validation
- **Error scenarios**: Tests 400, 404, 409, and 500 error responses
- **Relationship integrity**: Validates foreign key relationships and nested objects
- **Data consistency**: Ensures data matches between create and retrieve operations
- **Business rules**: Validates business logic constraints

#### 2. Algorithmic Contract Tests (`test:contract:algorithmic`)
- **OpenAPI-driven**: Automatically generates tests from the OpenAPI specification
- **Schema-based validation**: Uses Zod validators derived from the OpenAPI spec
- **Automatic test generation**: No manual test maintenance required
- **Complete coverage**: Tests all endpoints defined in the OpenAPI spec
- **Edge case testing**: Automatically tests boundary conditions and edge cases
- **Error response validation**: Validates error responses against OpenAPI error schemas

### Algorithmic Testing Benefits

- **Single source of truth**: The OpenAPI spec is the contract
- **Automatic updates**: Tests update automatically as the spec changes
- **Complete coverage**: Ensures no endpoints are missed
- **Consistent validation**: All responses validated against the same schemas
- **Reduced maintenance**: No need to manually update tests when API changes

### HeyAPI Contract Tests

To run contract tests using the HeyAPI-generated TypeScript client:

```bash
npm run test:heyapi
```

This test suite uses the HeyAPI client generated from your OpenAPI specification to:
- Test all API endpoints with proper TypeScript types
- Validate request/response schemas
- Test error scenarios and edge cases
- Ensure type safety throughout the testing process

The HeyAPI tests provide additional confidence that your API implementation matches the OpenAPI specification exactly.

### Contract Violation Tests

To demonstrate that your contract testing framework correctly identifies API contract violations:

```bash
npm run test:violations
```

This test suite is designed to **FAIL** when the API contract is broken, demonstrating how the framework catches various types of violations:

- **Missing Required Fields**: Tests fail when API responses are missing required fields
- **Wrong Data Types**: Tests fail when API returns incorrect data types (e.g., string instead of number)
- **Extra Fields**: Tests fail when API returns unexpected fields (using strict validation)
- **Missing Endpoints**: Tests fail when expected endpoints don't exist
- **Wrong HTTP Status Codes**: Tests fail when API returns unexpected status codes
- **Invalid Response Structure**: Tests fail when API returns wrong response structure
- **Wrong Enum Values**: Tests fail when API returns invalid enum values
- **Missing Pagination Fields**: Tests fail when pagination fields are missing

**Note**: These tests are designed to detect violations, so they should fail when contracts are broken. A successful run means violations were detected, which is the expected behavior.

## Database

The Catalyst starter kit uses Prisma to interact with the database. By default, it uses PostgreSQL as the database engine.

To set up a local database for development, you can use Docker:

```bash
docker compose up -d
```

This command starts a PostgreSQL database in a Docker container and lets it run in the background.

You can find the database connection URL in the [`.env.sample`](.env.sample?plain=1#L38) file.

You can connect to the database with the following command:

```bash
docker compose exec database psql -U app_dev -d dev
```

Or, if you have `make` installed, you can use the following command:

```bash
make db
```

There is already a `User` model defined in [`prisma/schema.prisma`](prisma/schema.prisma). The correspondent migration file is located in [`prisma/migrations/`](prisma/migrations/). To create the database schema and generate the Prisma client, run:

```bash
bun run migrate
```

## Authentication

The Catalyst starter kit uses Auth.js for authentication. You can find the authentication logic in [`src/auth.ts`](src/auth.ts).

By default, a development secret is already set in the [`.env.sample`](.env.sample?plain=1#L26) file called `AUTH_SECRET`. Set this secret to a more secure random string at the hosting provider of your choice when deploying the application.

If you also need Google login, add your Google OAuth client ID and secret to the [`.env`](.env.sample?plain=1#L29) file.

GitHub login is also supported. Add your GitHub OAuth client ID and secret to the [`.env`](.env.sample?plain=1#L27) file.

All of these environment variables have placeholders if you copied the [`.env.sample`](.env.sample) file.

## CI/CD

This project uses GitHub Actions for continuous integration and deployment with comprehensive contract testing.

### Automated Testing

The CI pipeline includes:

- **Build & Lint**: Code quality checks and project building
- **Contract Tests**: API contract validation against OpenAPI specification using HeyAPI client
- **Contract Violation Tests**: Verification that contract violations are detected

### Workflows

- **Build & Test** (`.github/workflows/build.yml`): Runs on every push and PR
- **Contract Tests** (`.github/workflows/contract-tests.yml`): Dedicated contract testing with PR comments

### PR Integration

When you create a pull request:
1. ✅ Contract tests run automatically
2. 📝 Results are posted as PR comments
3. 🚫 PR cannot be merged if contract tests fail
4. 📦 Test artifacts are uploaded for debugging

For detailed CI/CD documentation, see [`.github/workflows/README.md`](.github/workflows/README.md).

## SEO

The project is configured to have a `robots.txt`, a `sitemap.xml`, and a `manifest.webmanifest` file. However, these files cannot be found directly in the repository. Instead, you can find TypeScript files with similar names in the [`src/app`](src/app) directory. Edit them to fit your app. These files use the [Metadata API from Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/metadata).

Set the `NEXT_PUBLIC_AUTHORITY` environment variable in the [`.env`](.env.sample?plain=1#L5) file to the domain of your application. This variable is used in the `robots.txt` and `sitemap.xml` files.

It also sets various SEO-related tags in the root [`layout.tsx`](src/app/layout.tsx) file. Modify and extend these tags to fit your application's needs.

## Payments

The Catalyst starter kit uses Stripe for payment processing. The [`/api/stripe`](src/app/api/stripe/route.ts) endpoint is used to receive webhook events from Stripe. To enable this endpoint, set the `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` environment variables in the [`.env`](.env.sample?plain=1#L33) file.

In Stripe, set the webhook URL to `https://your-app-url/api/stripe`.

### Events

An example event handler is already set up for the `customer.subscription.updated` event. This event is triggered when a subscription is updated and is used in most subscription-based applications.

Configure the [endpoint](src/app/api/stripe/route.ts?plain=1#L26) to listen for the events you need. To to this, extend the logic of the `switch` statement with the cases for the events you want to handle.

### Billing Portal

For ease of use, we suggest not to reinvent the wheel and use the [Stripe Billing Portal](https://docs.stripe.com/customer-management) to allow your users to manage their subscriptions. The Catalyst starter kit already has a helper function defined in [`src/lib/stripe.ts`](src/lib/stripe.ts?plain=1#L9) to create a session for the billing portal.

The helper function can only be used on the server side and ensures that the user is authenticated before creating the session. It has a single parameter: the Stripe `customerId` of the user.

As the example dashboard of Catalyst can be found at `/dashboard`, the return URL of the billing portal is `http://localhost:3000/dashboard` by default. You can change this to any URL by setting the `STRIPE_PORTAL_RETURN_URL` environment variable in the [`.env`](.env.sample?plain=1#L35) file. 

## Logging

Catalyst uses Winston as the default logger and the default log level is `info`. You can change this by setting the `LOG_LEVEL` environment variable in the [`.env`](.env.sample?plain=1#L22) file.

If you want to configure a log drain, set the `LOG_DRAIN_URL` environment variable in the [`.env`](.env.sample?plain=1#L23) file. This will send the logs to the specified URL as well as to the console.

## Analytics

Set the `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` and/or `NEXT_PUBLIC_GOOGLE_TAG_MANAGER_ID` environment variables in the [`.env`](.env.sample?plain=1#L11) file to enable Google Analytics and/or Google Tag Manager.
