# feathers-elasticsearch

[![CI](https://github.com/feathersjs-ecosystem/feathers-elasticsearch/actions/workflows/test-matrix.yml/badge.svg)](https://github.com/feathersjs-ecosystem/feathers-elasticsearch/actions/workflows/test-matrix.yml)
[![npm version](https://img.shields.io/npm/v/feathers-elasticsearch.svg)](https://www.npmjs.com/package/feathers-elasticsearch)
[![Download Status](https://img.shields.io/npm/dm/feathers-elasticsearch.svg?style=flat-square)](https://www.npmjs.com/package/feathers-elasticsearch)

A [Feathers](https://feathersjs.com) database adapter for [Elasticsearch](https://www.elastic.co/elasticsearch/) with full Feathers v5 (Dove) support, built-in security controls, and performance optimizations.

## Features

- ✅ **Feathers v5 (Dove)** - Full compatibility with the latest Feathers
- 🔒 **Security-First** - Built-in protection against DoS attacks and unauthorized access
- ⚡ **Performance** - Query caching, lean mode, and complexity budgeting
- 🔍 **Rich Queries** - Full support for Elasticsearch-specific query operators
- 👨‍👩‍👧‍👦 **Parent-Child** - Support for parent-child relationships
- 📊 **Bulk Operations** - Efficient bulk create, patch, and remove

## Installation

```bash
npm install feathers-elasticsearch @elastic/elasticsearch --save
```

**Requirements:**
- Feathers v5+
- Elasticsearch 8.x or 9.x (5.x, 6.x, 7.x also supported)
- Node.js 18+

## Quick Start

```js
const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const { Client } = require('@elastic/elasticsearch');
const service = require('feathers-elasticsearch');

const app = express(feathers());
const esClient = new Client({ node: 'http://localhost:9200' });

// Configure the service
app.use('/messages', service({
  Model: esClient,
  elasticsearch: {
    index: 'messages',
    type: '_doc'
  },
  paginate: {
    default: 10,
    max: 50
  }
}));

// Use the service
app.service('messages').create({
  text: 'Hello Feathers!'
});
```

That's it! You now have a fully functional Feathers service with CRUD operations.

## 📚 Documentation

### Getting Started

- **[Getting Started Guide](./docs/getting-started.md)** - Installation, setup, and your first service
- **[Migration Guide](./docs/migration-guide.md)** - Upgrading from v3.x to v4.0

### Configuration & Usage

- **[Configuration](./docs/configuration.md)** - All service options and settings
- **[Querying](./docs/querying.md)** - Query syntax and Elasticsearch-specific operators
- **[Parent-Child Relationships](./docs/parent-child.md)** - Working with parent-child documents

### Advanced Topics

- **[Security](./docs/SECURITY.md)** - Security configuration and best practices
- **[Performance Features](./docs/PERFORMANCE_FEATURES.md)** - Optimization techniques
- **[Quirks & Limitations](./docs/quirks-and-limitations.md)** - Important behaviors and workarounds
- **[API Reference](./docs/API.md)** - Complete API documentation

### Project Information

- **[Contributing](./docs/contributing.md)** - How to contribute to the project
- **[Changelog](./docs/CHANGELOG.md)** - Version history and changes
- **[Testing](./docs/TESTING.md)** - Running and writing tests

## 🚨 What's New in v4.0

Version 4.0.0 introduces **breaking changes** with a focus on security and performance.

### Key Changes

**1. Raw Method Access Disabled by Default**

For security, the `raw()` method now requires explicit whitelisting:

```js
// v3.x - raw() allowed any Elasticsearch API call
await service.raw('indices.delete', { index: 'test' });  // ⚠️ Dangerous!

// v4.0+ - Must whitelist methods
app.use('/messages', service({
  Model: esClient,
  elasticsearch: { index: 'messages', type: '_doc' },
  security: {
    allowedRawMethods: ['search', 'count']  // Only allow safe methods
  }
}));

await service.raw('search', { query: {...} });  // ✅ Works
await service.raw('indices.delete', {...});      // ❌ Throws MethodNotAllowed
```

**2. New Security Limits**

Default limits protect against DoS attacks:

```js
security: {
  maxQueryDepth: 50,         // Max query nesting depth
  maxBulkOperations: 10000,  // Max bulk operation size
  maxArraySize: 10000,       // Max array size in $in/$nin
  // ... and more
}
```

**3. Performance Improvements**

- Content-based query caching (50-90% hit rate vs 5-10%)
- Lean mode for bulk operations (60% faster)
- Configurable refresh strategies

See the [Migration Guide](./docs/migration-guide.md) for complete upgrade instructions.

## Example Usage

### Basic CRUD

```js
// Create
const message = await service.create({
  text: 'Hello World',
  user: 'Alice'
});

// Find with query
const results = await service.find({
  query: {
    user: 'Alice',
    $sort: { createdAt: -1 },
    $limit: 10
  }
});

// Get by ID
const message = await service.get(messageId);

// Patch (partial update)
await service.patch(messageId, {
  text: 'Updated text'
});

// Remove
await service.remove(messageId);
```

### Elasticsearch-Specific Queries

```js
// Full-text search
const results = await service.find({
  query: {
    content: { $match: 'elasticsearch' }
  }
});

// Wildcard search
const users = await service.find({
  query: {
    email: { $wildcard: '*@example.com' }
  }
});

// Complex search with field boosting
const articles = await service.find({
  query: {
    $sqs: {
      $fields: ['title^5', 'content'],
      $query: '+javascript +tutorial'
    }
  }
});
```

See [Querying](./docs/querying.md) for all query operators and examples.

### Performance Optimization

```js
// Bulk create with lean mode (60% faster)
await service.create(largeDataset, {
  lean: true,        // Don't fetch documents back
  refresh: false     // Don't wait for refresh
});

// Per-operation refresh control
await service.create(data, {
  refresh: 'wait_for'  // Wait for changes to be searchable
});
```

See [Performance Features](./docs/PERFORMANCE_FEATURES.md) for optimization techniques.

## Compatibility

**Tested on:**
- Elasticsearch 5.0, 5.6, 6.6, 6.7, 6.8, 7.0, 7.1, 8.x, 9.x
- Feathers v5 (Dove)
- Node.js 18+

**Note:** Support for Elasticsearch 2.4 was dropped in v3.0. Use feathers-elasticsearch v2.x for Elasticsearch 2.4.

## Security

This package includes security features to protect against common vulnerabilities:

- **Query depth limiting** - Prevent stack overflow from deeply nested queries
- **Bulk operation limits** - Prevent memory exhaustion
- **Raw method whitelisting** - Control access to Elasticsearch API
- **Input sanitization** - Protect against prototype pollution
- **Configurable limits** - Adjust based on your needs

See [Security](./docs/SECURITY.md) for complete security documentation.

## Contributing

We welcome contributions! Please see [Contributing](./docs/contributing.md) for guidelines.

**Quick Start:**

```bash
# Clone and install
git clone https://github.com/feathersjs-ecosystem/feathers-elasticsearch.git
cd feathers-elasticsearch
npm install

# Run tests
ES_VERSION=8.11.0 npm test

# Run tests with coverage
ES_VERSION=8.11.0 npm run coverage
```

## License

Copyright (c) 2025

Licensed under the [MIT license](LICENSE).
