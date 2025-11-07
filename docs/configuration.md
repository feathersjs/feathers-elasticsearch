# Configuration

This guide covers all configuration options available for feathers-elasticsearch.

## Service Options

When creating a new Elasticsearch service, you can pass the following options:

### Required Options

#### `Model` (required)

The Elasticsearch client instance.

```js
const { Client } = require('@elastic/elasticsearch');

const esClient = new Client({
  node: 'http://localhost:9200'
});

app.use('/messages', service({
  Model: esClient,
  // ... other options
}));
```

#### `elasticsearch` (required)

Configuration object for Elasticsearch requests. Required properties are `index` and `type`.

```js
elasticsearch: {
  index: 'test',      // Required: The Elasticsearch index name
  type: 'messages',   // Required: The document type
  refresh: false      // Optional: Control search visibility (default: false)
}
```

You can also specify anything that should be passed to **all** Elasticsearch requests. Use additional properties at your own risk.

### Optional Options

#### `paginate`

A pagination object containing a `default` and `max` page size.

```js
paginate: {
  default: 10,  // Default number of items per page
  max: 50       // Maximum items that can be requested per page
}
```

See the [Pagination documentation](https://docs.feathersjs.com/api/databases/common.html#pagination) for more details.

#### `esVersion`

A string indicating which version of Elasticsearch the service is supposed to be talking to. Based on this setting, the service will choose compatible APIs.

**Default:** `'5.0'`

**Important:** If you plan on using Elasticsearch 6.0+ features (e.g., join fields), set this option appropriately as there were breaking changes in Elasticsearch 6.0.

```js
esVersion: '8.0'  // For Elasticsearch 8.x
esVersion: '6.0'  // For Elasticsearch 6.x
esVersion: '5.0'  // For Elasticsearch 5.x
```

#### `id`

The id property of your documents in this service.

**Default:** `'_id'`

```js
id: '_id'  // Use Elasticsearch's default _id field
id: 'id'   // Use a custom id field
```

#### `parent`

The parent property, which is used to pass a document's parent id.

**Default:** `'_parent'`

```js
parent: '_parent'  // Default
parent: 'parentId' // Custom parent field name
```

#### `routing`

The routing property, which is used to pass a document's routing parameter.

**Default:** `'_routing'`

```js
routing: '_routing'  // Default
routing: 'route'     // Custom routing field name
```

#### `join`

**Elasticsearch 6.0+ specific.** The name of the [join field](https://www.elastic.co/guide/en/elasticsearch/reference/6.0/parent-join.html) defined in the mapping type used by the service.

**Default:** `undefined`

**Required for:** Parent-child relationship features to work in Elasticsearch 6.0+

```js
join: 'my_join_field'  // Name of the join field in your mapping
```

See [Parent-Child Relationships](./parent-child.md) for more details.

#### `meta`

The meta property of your documents in this service. The meta field is an object containing Elasticsearch-specific information.

**Default:** `'_meta'`

The meta object contains properties like:
- `_score` - Document relevance score
- `_type` - Document type
- `_index` - Index name
- `_parent` - Parent document ID
- `_routing` - Routing value

This field will be stripped from documents passed to the service.

```js
meta: '_meta'      // Default
meta: 'esMetadata' // Custom meta field name
```

#### `whitelist`

The list of additional non-standard query parameters to allow.

**Default:** `['$prefix', '$wildcard', '$regexp', '$exists', '$missing', '$all', '$match', '$phrase', '$phrase_prefix', '$and', '$sqs', '$child', '$parent', '$nested', '$fields', '$path', '$type', '$query', '$operator']`

By default, all Elasticsearch-specific query operators are whitelisted. You can override this to restrict access to certain queries.

```js
whitelist: ['$prefix', '$match']  // Only allow prefix and match queries
```

See the [options documentation](https://docs.feathersjs.com/api/databases/common.html#serviceoptions) for more details.

#### `security`

Security configuration object for controlling access and enforcing limits.

**New in v4.0.0**

See [Security Configuration](#security-configuration) below for detailed information.

---

## Security Configuration

Version 4.0.0 introduces comprehensive security controls to protect against DoS attacks and unauthorized access.

### Full Security Options

```js
app.use('/messages', service({
  Model: esClient,
  elasticsearch: { index: 'test', type: 'messages' },
  security: {
    // Query complexity limits
    maxQueryDepth: 50,              // Max nesting depth for queries (default: 50)
    maxArraySize: 10000,            // Max items in $in/$nin arrays (default: 10000)
    
    // Operation limits
    maxBulkOperations: 10000,       // Max documents in bulk operations (default: 10000)
    maxDocumentSize: 10485760,      // Max document size in bytes (default: 10MB)
    
    // Query string limits
    maxQueryStringLength: 500,      // Max length for $sqs queries (default: 500)
    
    // Raw method whitelist (IMPORTANT: empty by default)
    allowedRawMethods: [],          // Methods allowed via raw() (default: [])
    
    // Cross-index restrictions
    allowedIndices: [],             // Allowed indices for $index filter (default: [])
                                    // Empty = only service's index allowed
    
    // Field restrictions
    searchableFields: [],           // Fields allowed in $sqs (default: [] = all)
    
    // Error handling
    enableDetailedErrors: false,    // Show detailed errors (default: false in prod)
    
    // Input sanitization
    enableInputSanitization: true,  // Prevent prototype pollution (default: true)
  }
}));
```

### Security Defaults

If you don't provide a `security` configuration, these safe defaults are used:

```js
{
  maxQueryDepth: 50,
  maxArraySize: 10000,
  maxBulkOperations: 10000,
  maxDocumentSize: 10485760,      // 10MB
  maxQueryStringLength: 500,
  allowedRawMethods: [],           // ⚠️ All raw methods DISABLED
  allowedIndices: [],              // Only default index allowed
  searchableFields: [],            // All fields searchable
  enableDetailedErrors: process.env.NODE_ENV !== 'production',
  enableInputSanitization: true
}
```

### Security Option Details

#### `maxQueryDepth`

Maximum nesting depth for queries using `$or`, `$and`, `$nested` operators.

**Default:** `50`

**Purpose:** Prevent deeply nested queries that can cause stack overflow or excessive processing.

```js
maxQueryDepth: 100  // Allow deeper nesting if needed
```

#### `maxArraySize`

Maximum number of items allowed in `$in` and `$nin` arrays.

**Default:** `10000`

**Purpose:** Prevent large arrays that can cause memory issues.

```js
maxArraySize: 50000  // Allow larger arrays if needed
```

#### `maxBulkOperations`

Maximum number of documents allowed in bulk create, patch, or remove operations.

**Default:** `10000`

**Purpose:** Prevent overwhelming Elasticsearch with massive bulk operations.

```js
maxBulkOperations: 50000  // Allow larger bulk operations
```

#### `maxDocumentSize`

Maximum document size in bytes.

**Default:** `10485760` (10MB)

**Purpose:** Prevent extremely large documents from consuming excessive resources.

```js
maxDocumentSize: 52428800  // 50MB
```

#### `maxQueryStringLength`

Maximum length for `$sqs` (simple query string) queries.

**Default:** `500`

**Purpose:** Prevent excessively long query strings that can be slow to parse.

```js
maxQueryStringLength: 1000  // Allow longer query strings
```

#### `allowedRawMethods`

List of Elasticsearch API methods that can be called via the `raw()` method.

**Default:** `[]` (empty - all raw methods disabled)

**⚠️ Security Warning:** The `raw()` method allows direct access to the Elasticsearch API. Only whitelist methods you actually need, and avoid destructive operations.

```js
allowedRawMethods: [
  'search',           // Safe read operation
  'count',            // Safe read operation
  'mget',             // Safe read operation
  // 'indices.delete', // ❌ Don't enable destructive methods
  // 'indices.create', // ❌ Don't enable index management
]
```

**Migration Note:** In v3.x, `raw()` allowed any Elasticsearch API call. In v4.0+, you must explicitly whitelist methods.

#### `allowedIndices`

List of indices that can be queried using the `$index` filter.

**Default:** `[]` (empty - only the service's default index allowed)

**Purpose:** Prevent cross-index queries that could access unauthorized data.

```js
allowedIndices: ['test', 'test-archive']  // Allow queries to these indices
```

#### `searchableFields`

List of fields that can be searched using `$sqs` queries.

**Default:** `[]` (empty - all fields searchable)

**Purpose:** Restrict full-text search to specific fields.

```js
searchableFields: ['title', 'description', 'body']  // Only these fields searchable
```

#### `enableDetailedErrors`

Whether to include detailed error information in error responses.

**Default:** `false` in production, `true` in development

**Purpose:** Prevent information leakage in production while aiding debugging in development.

```js
enableDetailedErrors: true   // Enable detailed errors
enableDetailedErrors: false  // Hide error details (recommended for production)
```

#### `enableInputSanitization`

Whether to sanitize input to prevent prototype pollution attacks.

**Default:** `true`

**Purpose:** Protect against prototype pollution vulnerabilities.

```js
enableInputSanitization: true   // Enable sanitization (recommended)
enableInputSanitization: false  // Disable (not recommended)
```

---

## Refresh Configuration

The `refresh` option in the `elasticsearch` configuration object controls when changes become visible for search.

### Refresh Options

```js
elasticsearch: {
  index: 'test',
  type: 'messages',
  refresh: false        // Default: Don't wait for refresh
  // refresh: true      // Wait for refresh (slower but immediate visibility)
  // refresh: 'wait_for' // Wait for refresh to complete
}
```

### Refresh Values

- **`false`** (default) - Don't force refresh. Changes will be visible after the next automatic refresh (typically 1 second).
- **`true`** - Force a refresh immediately after the operation. Changes are immediately visible but impacts performance.
- **`'wait_for'`** - Wait for the refresh to make changes visible before returning. Slower than `false` but faster than `true`.

### Per-Operation Refresh

You can override the default refresh setting on a per-operation basis:

```js
// Force immediate visibility for this operation only
await service.create(data, {
  refresh: 'wait_for'
});

// Don't wait for refresh (fast but eventual consistency)
await service.create(data, {
  refresh: false
});
```

### Performance Considerations

**⚠️ Warning:** Setting `refresh: true` globally is **highly discouraged** in production due to Elasticsearch performance implications. It can significantly impact cluster performance.

**Best Practice:**
- Use `refresh: false` (default) for most operations
- Use `refresh: 'wait_for'` for operations where you need to immediately read back the changes
- Only use `refresh: true` in development/testing environments

See [Elasticsearch refresh documentation](https://www.elastic.co/guide/en/elasticsearch/guide/2.x/near-real-time.html#refresh-api) for more details.

---

## Complete Configuration Example

Here's a complete example with all common options configured:

```js
const { Client } = require('@elastic/elasticsearch');
const service = require('feathers-elasticsearch');

const esClient = new Client({
  node: 'http://localhost:9200'
});

app.use('/articles', service({
  // Required: Elasticsearch client
  Model: esClient,
  
  // Required: Elasticsearch configuration
  elasticsearch: {
    index: 'blog',
    type: 'articles',
    refresh: false  // Don't wait for refresh
  },
  
  // Optional: Pagination
  paginate: {
    default: 20,
    max: 100
  },
  
  // Optional: Elasticsearch version
  esVersion: '8.0',
  
  // Optional: Field names
  id: '_id',
  parent: '_parent',
  routing: '_routing',
  meta: '_meta',
  
  // Optional: Query whitelist
  whitelist: [
    '$prefix',
    '$match',
    '$phrase',
    '$exists',
    '$all'
  ],
  
  // Optional: Security configuration
  security: {
    maxQueryDepth: 50,
    maxArraySize: 10000,
    maxBulkOperations: 10000,
    maxDocumentSize: 10485760,
    maxQueryStringLength: 500,
    allowedRawMethods: ['search', 'count'],
    allowedIndices: [],
    searchableFields: ['title', 'content', 'tags'],
    enableDetailedErrors: process.env.NODE_ENV !== 'production',
    enableInputSanitization: true
  }
}));
```

## Next Steps

- Learn about [Querying](./querying.md) to use Elasticsearch-specific queries
- Review [Security Best Practices](./SECURITY.md) for production deployments
- Optimize performance with [Performance Features](./PERFORMANCE_FEATURES.md)
- Set up [Parent-Child Relationships](./parent-child.md) if needed
