# Contributing

Thank you for considering contributing to feathers-elasticsearch! This document provides guidelines and instructions for contributing to the project.

## How to Contribute

There are many ways to contribute:

- **Report bugs** - Create an issue describing the bug
- **Suggest features** - Propose new features or improvements
- **Fix bugs** - Submit pull requests for open issues
- **Add features** - Implement new functionality
- **Improve documentation** - Fix typos, clarify instructions, add examples
- **Write tests** - Increase test coverage

## Getting Started

### Prerequisites

- **Node.js 18+** - Required for development
- **Elasticsearch 8.x or 9.x** - For running tests
- **Git** - For version control

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR-USERNAME/feathers-elasticsearch.git
cd feathers-elasticsearch
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/feathersjs/feathers-elasticsearch.git
```

### Install Dependencies

```bash
npm install
```

### Set Up Elasticsearch

You need a running Elasticsearch instance for development and testing.

**Option 1: Docker (Recommended)**

```bash
# Elasticsearch 8.x
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0

# Elasticsearch 9.x
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  docker.elastic.co/elasticsearch/elasticsearch:9.0.0
```

**Option 2: Local Installation**

Download and install Elasticsearch from [elastic.co](https://www.elastic.co/downloads/elasticsearch).

### Verify Setup

```bash
# Check Elasticsearch is running
curl http://localhost:9200

# Should return cluster info
```

## Development Workflow

### Create a Branch

Create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

**Branch naming conventions:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `test/` - Test improvements
- `refactor/` - Code refactoring

### Make Changes

1. Write your code
2. Follow the existing code style
3. Add tests for new functionality
4. Update documentation as needed

### Code Style

This project uses:
- **ESLint** - For code linting
- **Prettier** - For code formatting (configured)
- **TypeScript** - For type definitions

**Run linting:**

```bash
npm run lint
```

**Fix linting errors automatically:**

```bash
npm run lint:fix
```

### Write Tests

All new features and bug fixes should include tests.

**Test structure:**
- Tests are in the `test/` directory
- Uses **Mocha** as the test framework
- Uses **Chai** for assertions

**Write a test:**

```js
// test/my-feature.test.js
describe('My Feature', () => {
  it('should do something', async () => {
    const result = await service.myFeature();
    expect(result).to.equal('expected value');
  });
});
```

### Run Tests

#### Set Elasticsearch Version

You must set the `ES_VERSION` environment variable to tell tests which Elasticsearch version to use:

```bash
# For Elasticsearch 8.x
export ES_VERSION=8.11.0

# For Elasticsearch 9.x
export ES_VERSION=9.0.0

# For Elasticsearch 6.x (legacy)
export ES_VERSION=6.8.0
```

#### Run All Tests

```bash
ES_VERSION=8.11.0 npm test
```

#### Run Specific Tests

```bash
# Run a specific test file
ES_VERSION=8.11.0 npx mocha test/my-feature.test.js

# Run tests matching a pattern
ES_VERSION=8.11.0 npx mocha test/**/*security*.test.js
```

#### Run Tests with Coverage

```bash
ES_VERSION=8.11.0 npm run coverage
```

Coverage reports are generated in the `coverage/` directory.

### Commit Changes

**Commit message format:**

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `test` - Test improvements
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `chore` - Build process or tooling changes

**Examples:**

```bash
# Feature
git commit -m "feat(query): add support for $fuzzy operator"

# Bug fix
git commit -m "fix(pagination): handle max_result_window correctly"

# Documentation
git commit -m "docs: update configuration examples"

# With body
git commit -m "feat(security): add input sanitization

Adds protection against prototype pollution attacks by sanitizing
all input objects before processing.

Closes #123"
```

### Push Changes

```bash
git push origin feature/your-feature-name
```

## Submitting a Pull Request

### Before Submitting

- [ ] All tests pass
- [ ] Code is linted and formatted
- [ ] New features have tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventions

### Create Pull Request

1. Go to your fork on GitHub
2. Click "New Pull Request"
3. Select your branch
4. Fill out the pull request template:
   - **Description** - What does this PR do?
   - **Motivation** - Why is this change needed?
   - **Breaking changes** - Are there any breaking changes?
   - **Related issues** - Link to related issues

### Pull Request Guidelines

- **Clear description** - Explain what and why, not just how
- **Small, focused PRs** - One feature or fix per PR
- **Reference issues** - Link to related issues (e.g., "Fixes #123")
- **Add tests** - All new code should have tests
- **Update docs** - Update relevant documentation
- **Follow code style** - Match existing code style

### Review Process

1. **Automated checks** - CI will run tests and linting
2. **Code review** - Maintainers will review your code
3. **Feedback** - Address any feedback or requested changes
4. **Approval** - Once approved, your PR will be merged

**Be patient and respectful** - Maintainers are volunteers and may take time to review.

## Running Tests Locally

### Full Test Suite

The full test suite includes tests for multiple Elasticsearch versions:

```bash
# ES 8.x
ES_VERSION=8.11.0 npm test

# ES 6.x (legacy support)
ES_VERSION=6.8.0 npm test

# ES 5.x (legacy support)
ES_VERSION=5.6.0 npm test
```

### Test Coverage

Aim for high test coverage:

```bash
ES_VERSION=8.11.0 npm run coverage
```

**Coverage goals:**
- **Statements:** >90%
- **Branches:** >85%
- **Functions:** >90%
- **Lines:** >90%

### Debugging Tests

Use `--grep` to run specific tests:

```bash
# Run only security-related tests
ES_VERSION=8.11.0 npx mocha --grep "security"

# Run only tests with "pagination" in the name
ES_VERSION=8.11.0 npx mocha --grep "pagination"
```

Use `.only` for debugging a single test:

```js
it.only('should do something', async () => {
  // This is the only test that will run
});
```

## Code Quality Standards

### TypeScript

Type definitions are in `types/index.d.ts`. Update them when:
- Adding new methods
- Changing method signatures
- Adding new configuration options

### Error Handling

- Use descriptive error messages
- Include context in errors
- Follow existing error patterns

```js
// Good
throw new BadRequest('Query depth exceeds maximum allowed depth of 50', {
  maxDepth: 50,
  actualDepth: 75
});

// Bad
throw new Error('Invalid query');
```

### Security

- Never trust user input
- Validate all parameters
- Follow security best practices
- Don't expose internal errors to clients

### Performance

- Avoid unnecessary operations
- Use bulk operations where possible
- Consider memory usage
- Profile performance-critical code

## Documentation

### Update Documentation When:

- Adding new features
- Changing APIs
- Fixing bugs that affect usage
- Adding new configuration options

### Documentation Files

- **README.md** - High-level overview and quick start
- **docs/getting-started.md** - Installation and basic setup
- **docs/configuration.md** - All configuration options
- **docs/querying.md** - Query syntax and examples
- **docs/SECURITY.md** - Security best practices
- **docs/PERFORMANCE_FEATURES.md** - Performance optimizations
- **docs/API.md** - Complete API reference

### Documentation Style

- **Clear and concise** - Avoid jargon
- **Examples** - Show, don't just tell
- **Code blocks** - Use syntax highlighting
- **Links** - Link to related docs
- **Warnings** - Highlight important caveats

## Release Process

Releases are managed by maintainers. The process is:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a git tag
4. Push to GitHub
5. Publish to npm
6. Create GitHub release

**Contributors don't need to worry about this** - focus on making great contributions!

## Getting Help

- **Questions** - Open a GitHub discussion
- **Bugs** - Open a GitHub issue
- **Chat** - Join the Feathers Slack (link in main repo)

## Code of Conduct

Be respectful and professional:

- **Be welcoming** - Everyone starts somewhere
- **Be patient** - People have different skill levels
- **Be constructive** - Provide helpful feedback
- **Be respectful** - Treat others with kindness

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Quick Reference

### Common Commands

```bash
# Install dependencies
npm install

# Run tests
ES_VERSION=8.11.0 npm test

# Run tests with coverage
ES_VERSION=8.11.0 npm run coverage

# Lint code
npm run lint

# Fix linting errors
npm run lint:fix

# Run specific test
ES_VERSION=8.11.0 npx mocha test/my-test.js
```

### Useful Git Commands

```bash
# Sync with upstream
git fetch upstream
git merge upstream/main

# Rebase your branch
git rebase upstream/main

# Update your fork on GitHub
git push origin feature/your-feature --force-with-lease

# Undo last commit (keep changes)
git reset --soft HEAD~1
```

---

Thank you for contributing to feathers-elasticsearch! 🎉
