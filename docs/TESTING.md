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

## Troubleshooting

### Docker Issues

#### Port Already in Use

If you see an error like `Bind for 0.0.0.0:9201 failed: port is already allocated`:

```bash
# Check what's using the port
lsof -i :9201

# Stop any existing Elasticsearch containers
npm run docker:down

# Or manually stop the container
docker ps
docker stop <container-id>

# Clean up all stopped containers
docker container prune
```

#### Container Won't Start

If the Elasticsearch container fails to start:

```bash
# Check container logs
npm run docker:logs

# Common issues:
# 1. Insufficient memory - Elasticsearch needs at least 2GB RAM
# 2. Docker daemon not running - start Docker Desktop
# 3. Previous container still running - run docker:down first

# Reset everything
npm run docker:down
docker system prune -f
npm run docker:up
```

#### Permission Denied Errors

On Linux, if you see permission errors:

```bash
# Fix Docker socket permissions
sudo chmod 666 /var/run/docker.sock

# Or add your user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### Elasticsearch Connection Issues

#### Connection Refused

If tests fail with `ECONNREFUSED`:

```bash
# 1. Verify Elasticsearch is running
curl http://localhost:9201/_cluster/health

# 2. Wait longer for Elasticsearch to be ready
npm run docker:wait

# 3. Check if correct port is being used
echo $ELASTICSEARCH_URL  # Should be http://localhost:9201

# 4. Manually wait and check status
docker logs elasticsearch
```

#### Timeout Errors

If tests timeout waiting for Elasticsearch:

```bash
# Increase wait time in docker:wait script
# Or manually check when it's ready
while ! curl -s http://localhost:9201/_cluster/health > /dev/null; do
  echo "Waiting for Elasticsearch..."
  sleep 2
done
echo "Elasticsearch is ready!"
```

#### Version Mismatch

If you see compatibility errors:

```bash
# Check your ES version
curl http://localhost:9201/ | grep number

# Set explicit version
ES_VERSION=8.15.0 npm run test:integration

# For ES 9.x testing
ES_VERSION=9.0.0 ELASTICSEARCH_URL=http://localhost:9202 npm run test:es9
```

### Test-Specific Issues

#### Running Individual Test Suites

To run specific tests:

```bash
# Run only one test file
npm run mocha -- test/index.test.js

# Run tests matching a pattern
npm run mocha -- --grep "should create"

# Run with specific ES version
ES_VERSION=8.15.0 ELASTICSEARCH_URL=http://localhost:9201 npm run mocha -- --grep "should find"
```

#### Debug Mode

To see detailed output:

```bash
# Enable debug logging
DEBUG=feathers-elasticsearch* npm test

# Enable Elasticsearch client debugging
NODE_ENV=development npm test

# Run single test with full output
npm run mocha -- --grep "specific test" --reporter spec
```

#### Test Failures After Code Changes

If tests suddenly fail:

```bash
# 1. Rebuild the project
npm run clean
npm run build

# 2. Restart Elasticsearch (clears all data)
npm run docker:down
npm run docker:up

# 3. Verify dependencies
npm ci

# 4. Run tests with fresh install
rm -rf node_modules package-lock.json
npm install
npm test
```

#### Coverage Issues

If coverage is not generated:

```bash
# Make sure nyc is installed
npm ls nyc

# Run coverage explicitly
npm run clean
npm run build
npm run coverage

# Check coverage output
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
```

### Environment Issues

#### Node Version

If you see syntax errors or unexpected behavior:

```bash
# Check Node version (needs >= 18.x)
node --version

# Use nvm to switch versions
nvm install 18
nvm use 18
```

#### Missing Dependencies

If imports fail:

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Verify peer dependencies
npm ls @elastic/elasticsearch
```

### CI/CD Issues

#### GitHub Actions Failures

If CI tests fail but local tests pass:

1. Check the ES version matrix in `.github/workflows/test-matrix.yml`
2. Ensure all ES versions are compatible with your changes
3. Test locally with the same ES version:
   ```bash
   ES_VERSION=8.15.0 npm run test:integration
   ES_VERSION=9.0.0 npm run test:es9
   ```

#### Flaky Tests

If tests pass/fail intermittently:

```bash
# Run tests multiple times
for i in {1..10}; do npm test || break; done

# Increase timeouts in problematic tests
# Check for race conditions in bulk operations
# Ensure proper cleanup in afterEach hooks
```

## Getting Help

If you're still experiencing issues:

1. Check [Elasticsearch documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
2. Review [FeathersJS adapter guide](https://feathersjs.com/api/databases/adapters.html)
3. Open an issue on [GitHub](https://github.com/feathersjs/feathers-elasticsearch/issues)
4. Include:
   - Node version (`node --version`)
   - Elasticsearch version (`curl http://localhost:9201/`)
   - Error messages and stack traces
   - Steps to reproduce
