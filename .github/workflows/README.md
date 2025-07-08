# CI/CD Pipeline Documentation

This repository uses GitHub Actions for continuous integration and deployment, with a focus on contract testing to ensure API reliability.

## Workflows

### 1. Build & Test (`build.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch

**Jobs:**

#### Build & Lint
- Sets up Bun.js runtime
- Installs dependencies
- Runs linting and type checking
- Builds the project

#### Contract Tests
- Sets up MySQL database service
- Generates Prisma client and database schema
- Seeds test data
- Generates OpenAPI specification using HeyAPI
- Starts the API server
- Runs contract tests (`npm run test:contract`)
- Runs contract violation tests (`npm run test:violations`)

### 2. Contract Tests (`contract-tests.yml`)

**Triggers:**
- Push to `main` branch
- Pull requests to `main` branch
- Manual workflow dispatch

**Features:**
- Dedicated contract testing pipeline
- PR comments with test results
- Test artifact uploads
- Integration tests with coverage reporting

## Contract Testing in CI

### What Gets Tested

1. **API Contract Compliance**
   - All endpoints conform to OpenAPI specification
   - Response schemas match expected types
   - HTTP status codes are correct
   - Required fields are present

2. **Contract Violation Detection**
   - Missing required fields
   - Wrong data types
   - Extra fields (strict validation)
   - Missing endpoints
   - Wrong HTTP status codes
   - Invalid response structures
   - Wrong enum values
   - Missing pagination fields

### Database Setup

The CI pipeline uses MySQL 8.0 with:
- Database: `catalyst_test`
- Root password: `password`
- Health checks to ensure database is ready

### Environment Variables

```yaml
DATABASE_URL: "mysql://root:password@localhost:3306/catalyst_test"
NODE_ENV: test
NEXT_PUBLIC_AUTHORITY: http://localhost:3000
AUTH_SECRET: "test-secret-for-contract-testing"
```

## Running Tests Locally

### Prerequisites
- Node.js 18+
- MySQL 8.0
- npm or bun

### Setup
```bash
# Install dependencies
npm install

# Set up database
npx prisma db push --force-reset
npm run seed

# Generate OpenAPI client
npx @hey-api/openapi-ts -f heyapi.config.ts

# Start the API server
npm run build
npm start
```

### Run Tests
```bash
# Run contract tests
npm run test:contract

# Run contract violation tests
npm run test:violations

# Run all tests
npm test
```

## Test Results

### Contract Tests
- ✅ **PASS**: API conforms to OpenAPI specification
- ❌ **FAIL**: API violates contract (blocks PR merge)

### Violation Tests
- ✅ **PASS**: Contract violations detected (expected behavior)
- ⚠️ **WARNING**: No violations detected (may indicate test issues)

## PR Integration

When a pull request is created or updated:

1. **Automatic Testing**: Contract tests run automatically
2. **PR Comments**: Results are posted as comments
3. **Status Checks**: PR cannot be merged if contract tests fail
4. **Artifacts**: Test results are uploaded for debugging

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Ensure MySQL service is running
   - Check DATABASE_URL environment variable
   - Verify database credentials

2. **API Server Not Starting**
   - Check build process
   - Verify port 3000 is available
   - Review server logs

3. **Contract Tests Failing**
   - Review API implementation
   - Check OpenAPI specification
   - Verify response schemas

### Debugging

1. **Download Artifacts**: Test results are uploaded as artifacts
2. **Check Logs**: Full test output is available in workflow logs
3. **Local Reproduction**: Run tests locally to debug issues

## Best Practices

1. **Always run contract tests locally before pushing**
2. **Keep OpenAPI specification up to date**
3. **Review violation test results to ensure detection is working**
4. **Use PR comments to understand test failures**
5. **Maintain test data consistency**

## Security

- Test database is isolated and reset for each run
- No production data is used in testing
- Environment variables are properly scoped
- Secrets are not exposed in logs 