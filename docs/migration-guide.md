# Migration Guide: v3.x to v4.0

Version 4.0.0 introduces **Feathers v5 compatibility**, significant **security improvements**, and **performance optimizations**. This guide will help you migrate from v3.x to v4.0+.

## Overview of Changes

### Major Changes

1. **Feathers v5 (Dove) Support** - Full compatibility with Feathers v5
2. **Security-First Design** - New security limits and controls enabled by default
3. **Raw Method Access Disabled** - `raw()` method now requires explicit whitelisting
4. **Performance Optimizations** - Query caching, lean mode, and complexity budgeting
5. **Breaking API Changes** - Some configuration options have changed

### Minimum Requirements

- **Feathers:** v5.x (Dove)
- **Elasticsearch:** 5.0+ (8.x and 9.x recommended)
- **Node.js:** 18+

---

## Breaking Changes

### 1. Raw Method Access - DISABLED BY DEFAULT ⚠️

**The most important change in v4.0.0**

The `raw()` method is now **disabled by default** for security reasons. If your application uses `raw()`, you must explicitly whitelist the methods you need.

#### Before (v3.x)

```js
// raw() allowed any Elasticsearch API call
await service.raw('search', { query: {...} });
await service.raw('indices.delete', { index: 'test' });
await service.raw('cluster.health');
```

#### After (v4.0+)

```js
// Must configure allowedRawMethods
app.use('/messages', service({
  Model: client,
  elasticsearch: { index: 'test', type: 'messages' },
  security: {
    allowedRawMethods: ['search', 'count']  // Only allow these methods
  }
}));

// Now only whitelisted methods work
await service.raw('search', { query: {...} });      // ✅ Works
await service.raw('count', { query: {...} });       // ✅ Works
await service.raw('indices.delete', { index: 'test' }); // ❌ Throws MethodNotAllowed
```

**Why this change?**

The `raw()` method provides direct access to the Elasticsearch API, which can be dangerous if exposed to clients. Destructive operations like `indices.delete`, `indices.create`, or cluster management commands could be triggered by malicious users.

**Migration steps:**

1. Identify all `raw()` calls in your codebase
2. Add only the methods you actually need to `allowedRawMethods`
3. Avoid whitelisting destructive operations
4. Consider if you need `raw()` at all - standard CRUD methods may suffice

```js
// Example: Safe whitelist for read operations only
security: {
  allowedRawMethods: [
    'search',     // Full-text search
    'count',      // Document counting
    'mget',       // Multi-get
    // DON'T add: 'indices.delete', 'indices.create', 'cluster.*'
  ]
}
```

---

### 2. New Security Limits

Default security limits are now enforced to prevent DoS attacks and abuse.

#### Default Limits (v4.0+)

```js
security: {
  maxQueryDepth: 50,              // Max nesting for $or, $and, $nested
  maxArraySize: 10000,            // Max items in $in/$nin arrays
  maxBulkOperations: 10000,       // Max documents in bulk ops
  maxDocumentSize: 10485760,      // Max document size (10MB)
  maxQueryStringLength: 500,      // Max length for $sqs queries
  allowedRawMethods: [],          // Raw methods disabled
  allowedIndices: [],             // Only service index allowed
  searchableFields: [],           // All fields searchable
  enableInputSanitization: true,  // Prototype pollution protection
  enableDetailedErrors: false     // In production
}
```

**Impact:**

Most applications won't be affected by these limits. However, if you have:

- Very deep query nesting (>50 levels)
- Large `$in` arrays (>10,000 items)
- Bulk operations with >10,000 documents
- Very long `$sqs` query strings (>500 chars)

You'll need to adjust the limits:

```js
app.use('/messages', service({
  Model: client,
  elasticsearch: { index: 'test', type: 'messages' },
  security: {
    maxQueryDepth: 100,          // Increase if you need deeper nesting
    maxBulkOperations: 50000,    // Increase for larger bulk ops
    maxArraySize: 50000,         // Increase for larger arrays
    maxQueryStringLength: 1000,  // Increase for longer queries
  }
}));
```

**Best practice:** Only increase limits if you have a genuine need. The defaults protect your Elasticsearch cluster from resource exhaustion.

---

### 3. Configuration Changes

Some configuration options have been renamed or moved for consistency.

#### Elasticsearch Client

**Before (v3.x):**
```js
const elasticsearch = require('elasticsearch');

const client = new elasticsearch.Client({
  host: 'localhost:9200',
  apiVersion: '5.0'
});
```

**After (v4.0+):**
```js
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: 'http://localhost:9200'
});
```

The official Elasticsearch client changed from `elasticsearch` to `@elastic/elasticsearch` and the initialization API changed.

#### Service Options

Most service options remain the same, but there are new security options:

**Before (v3.x):**
```js
app.use('/messages', service({
  Model: client,
  elasticsearch: { index: 'test', type: 'messages' }
}));
```

**After (v4.0+):**
```js
app.use('/messages', service({
  Model: client,
  elasticsearch: { index: 'test', type: 'messages' },
  // New security configuration (optional but recommended)
  security: {
    allowedRawMethods: [],  // Explicitly configure if needed
  }
}));
```

---

## Migration Checklist

Use this checklist to ensure a smooth migration:

### Phase 1: Preparation

- [ ] **Review your Feathers version** - Upgrade to Feathers v5 if needed
- [ ] **Check Node.js version** - Ensure Node.js 18+ is installed
- [ ] **Review Elasticsearch version** - Elasticsearch 8.x or 9.x recommended
- [ ] **Audit `raw()` usage** - Find all `service.raw()` calls in your codebase
- [ ] **Identify custom queries** - Review queries that might hit security limits
- [ ] **Check bulk operations** - Review bulk create/patch/remove operations

### Phase 2: Update Dependencies

- [ ] **Update Feathers** - `npm install @feathersjs/feathers@^5.0.0`
- [ ] **Update Elasticsearch client** - `npm install @elastic/elasticsearch@^8.0.0`
- [ ] **Update feathers-elasticsearch** - `npm install feathers-elasticsearch@^4.0.0`
- [ ] **Remove old client** - `npm uninstall elasticsearch` (if using old client)

### Phase 3: Code Changes

- [ ] **Update Elasticsearch client initialization**
  ```js
  // Old
  const elasticsearch = require('elasticsearch');
  const client = new elasticsearch.Client({ host: 'localhost:9200' });
  
  // New
  const { Client } = require('@elastic/elasticsearch');
  const client = new Client({ node: 'http://localhost:9200' });
  ```

- [ ] **Configure raw method whitelist** (if using `raw()`)
  ```js
  security: {
    allowedRawMethods: ['search', 'count']  // Only methods you need
  }
  ```

- [ ] **Adjust security limits** (if needed)
  ```js
  security: {
    maxQueryDepth: 100,        // If you have deep queries
    maxBulkOperations: 50000,  // If you have large bulk ops
  }
  ```

- [ ] **Update service configuration** with new `security` option

### Phase 4: Testing

- [ ] **Test all CRUD operations** - Create, read, update, delete
- [ ] **Test all query types** - Standard and Elasticsearch-specific queries
- [ ] **Test raw() calls** - Ensure whitelisted methods work
- [ ] **Test bulk operations** - Verify bulk create/patch/remove
- [ ] **Test pagination** - Ensure pagination works correctly
- [ ] **Test parent-child operations** - If using parent-child relationships
- [ ] **Load testing** - Verify performance under load
- [ ] **Security testing** - Try to call non-whitelisted raw methods (should fail)

### Phase 5: Deployment

- [ ] **Update documentation** - Document new security configuration
- [ ] **Review logs** - Check for deprecation warnings or errors
- [ ] **Monitor performance** - Ensure no performance degradation
- [ ] **Monitor errors** - Watch for MethodNotAllowed errors on raw()

---

## Common Migration Scenarios

### Scenario 1: Basic App (No raw() usage)

**Effort:** Low (< 1 hour)

If you don't use `raw()` and have standard queries:

1. Update dependencies
2. Update Elasticsearch client initialization
3. Test CRUD operations
4. Deploy

**No security configuration needed** - defaults are safe.

---

### Scenario 2: Using raw() for Search

**Effort:** Medium (1-3 hours)

If you use `raw()` for custom search operations:

1. Update dependencies
2. Update Elasticsearch client initialization
3. Add security configuration:
   ```js
   security: {
     allowedRawMethods: ['search', 'count', 'mget']
   }
   ```
4. Test all raw() calls
5. Deploy

---

### Scenario 3: Complex Queries or Large Bulk Operations

**Effort:** Medium (2-4 hours)

If you have deep queries or large bulk operations:

1. Update dependencies
2. Update Elasticsearch client initialization
3. Identify operations that might hit limits:
   ```bash
   # Search for deep queries
   grep -r '\$or\|\$and' src/
   
   # Search for bulk operations
   grep -r '\.create(\[' src/
   ```
4. Add security configuration with adjusted limits:
   ```js
   security: {
     maxQueryDepth: 100,
     maxBulkOperations: 50000,
     maxArraySize: 50000,
   }
   ```
5. Test thoroughly
6. Deploy

---

### Scenario 4: Using Index Management via raw()

**Effort:** High (4-8 hours)

If you use `raw()` for index management (creating/deleting indices):

**⚠️ Security Warning:** This is risky. Consider alternatives.

**Option A: Move index management to admin service** (Recommended)

Create a separate, secured admin service for index management:

```js
// Admin service (secured, not exposed to clients)
const adminService = service({
  Model: client,
  elasticsearch: { index: 'admin', type: '_doc' },
  security: {
    allowedRawMethods: [
      'indices.create',
      'indices.delete',
      'indices.exists',
    ]
  }
});

// Don't expose this via REST
app.use('/admin/elasticsearch', adminService);

// Secure it with authentication
app.service('/admin/elasticsearch').hooks({
  before: {
    all: [authenticate('jwt'), requireAdmin]
  }
});
```

**Option B: Use Elasticsearch client directly**

```js
// For admin operations, bypass Feathers service
const { Client } = require('@elastic/elasticsearch');
const esClient = new Client({ node: 'http://localhost:9200' });

// In admin scripts or authenticated admin routes
async function createIndex(name, mapping) {
  await esClient.indices.create({
    index: name,
    body: { mappings: mapping }
  });
}
```

---

## Performance Improvements in v4.0

While migrating, you can also take advantage of new performance features:

### Content-Based Query Caching

Improves cache hit rates from ~5-10% to ~50-90%.

**Automatic** - No configuration needed. The service now caches based on query content instead of object reference.

### Lean Mode

Skip fetching full documents after bulk operations (60% faster).

```js
// Create bulk data without fetching back
await service.create(largeDataset, {
  lean: true,        // Don't fetch documents back
  refresh: false     // Don't wait for refresh
});
```

### Per-Operation Refresh Control

```js
// Fast: Don't wait for refresh
await service.create(data, { refresh: false });

// Balanced: Wait for refresh
await service.create(data, { refresh: 'wait_for' });

// Immediate visibility (slower)
await service.create(data, { refresh: true });
```

See [Performance Features](./PERFORMANCE_FEATURES.md) for more details.

---

## Troubleshooting

### Error: "Method 'X' is not allowed"

**Cause:** You're calling `service.raw('X')` but `X` is not in `allowedRawMethods`.

**Solution:** Add the method to the whitelist:

```js
security: {
  allowedRawMethods: ['search', 'X']  // Add your method
}
```

### Error: "Query depth exceeds maximum"

**Cause:** Your query has too many nested `$or` or `$and` operators.

**Solution:** Increase the limit or simplify your query:

```js
security: {
  maxQueryDepth: 100  // Increase from default 50
}
```

### Error: "Array size exceeds maximum"

**Cause:** You're using `$in` or `$nin` with more than 10,000 items.

**Solution:** Increase the limit or use a different query approach:

```js
security: {
  maxArraySize: 50000  // Increase from default 10,000
}
```

### Error: "Bulk operation size exceeds maximum"

**Cause:** You're trying to create/patch/remove more than 10,000 documents at once.

**Solution:** Increase the limit or batch your operations:

```js
security: {
  maxBulkOperations: 50000  // Increase from default 10,000
}
```

Or batch manually:

```js
// Split into batches of 10,000
const batchSize = 10000;
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);
  await service.create(batch);
}
```

### Performance Degradation After Upgrade

If you notice performance issues:

1. **Check refresh settings** - Ensure you're not using `refresh: true` globally
2. **Use lean mode** - For bulk operations, use `lean: true`
3. **Review query complexity** - Complex queries may hit new validation overhead
4. **Check Elasticsearch version** - Elasticsearch 8.x+ is recommended

---

## Getting Help

If you encounter issues during migration:

1. **Check the documentation:**
   - [Configuration](./configuration.md)
   - [Security](./SECURITY.md)
   - [Querying](./querying.md)

2. **Review examples:**
   - [Getting Started](./getting-started.md)
   - [Performance Features](./PERFORMANCE_FEATURES.md)

3. **Report issues:**
   - GitHub Issues: https://github.com/feathersjs-ecosystem/feathers-elasticsearch/issues

---

## Summary

**For most applications:**
- Update dependencies
- Update Elasticsearch client initialization  
- Add `security.allowedRawMethods` if using `raw()`
- Test thoroughly
- Deploy

**Key principle:** Start with secure defaults, only relax limits when you have a proven need.

The v4.0 migration prioritizes **security by default** while maintaining **flexibility** for advanced use cases. The breaking changes are intentional and designed to prevent common security vulnerabilities in production applications.
