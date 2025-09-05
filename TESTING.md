# Testing feathers-elasticsearch

This project includes comprehensive test coverage using a real Elasticsearch instance via Docker.

## Prerequisites

- Node.js (>= 18.x)
- Docker and Docker Compose
- npm or yarn

## Running Tests

### Quick Test (with Docker)

The simplest way to run the full test suite:

```bash
npm run docker:test
```

This command will:
1. Start Elasticsearch in Docker on port 9201
2. Wait for Elasticsearch to be ready
3. Run the complete test suite
4. Clean up the Docker container

### Manual Docker Testing

If you want more control over the testing process:

```bash
# Start Elasticsearch
npm run docker:up

# Wait for it to be ready (optional, runs automatically in docker:test)
npm run docker:wait

# Run tests against the Docker instance
npm run test:integration

# Clean up when done
npm run docker:down
```

### Docker Management

- **Start Elasticsearch**: `npm run docker:up`
- **Stop and clean up**: `npm run docker:down`
- **View logs**: `npm run docker:logs`
- **Wait for readiness**: `npm run docker:wait`

### Environment Variables

- `ES_VERSION`: Elasticsearch version to use (default: 8.15.0)
- `ELASTICSEARCH_URL`: Elasticsearch connection URL (default: http://localhost:9201)

### Test Configuration

The test suite supports multiple Elasticsearch versions:
- 5.0.x
- 6.0.x  
- 7.0.x
- 8.0.x (default)

## Test Structure

- `test/` - Main test files using `@feathersjs/adapter-tests`
- `test-utils/` - Test utilities and schema definitions
- `test-utils/schema-*.js` - Version-specific Elasticsearch schemas

## Coverage

Test coverage reports are generated with nyc and displayed after test completion.

```bash
# Run tests with coverage
npm test

# Run only coverage (after tests)
npm run coverage
```