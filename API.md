# feathers-elasticsearch API Documentation

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Service Methods](#service-methods)
- [Query Operators](#query-operators)
- [Special Features](#special-features)
- [Error Handling](#error-handling)
- [TypeScript Support](#typescript-support)

## Installation

```bash
npm install feathers-elasticsearch @elastic/elasticsearch
```

## Quick Start

```javascript
import { Client } from '@elastic/elasticsearch'
import service from 'feathers-elasticsearch'

// Initialize Elasticsearch client
const client = new Client({
  node: 'http://localhost:9200'
})

// Create service
const peopleService = service({
  Model: client,
  index: 'people',
  id: 'id',
  paginate: {
    default: 10,
    max: 100
  }
})

// Use in Feathers app
app.use('/people', peopleService)
```

## Configuration

### Service Options

| Option      | Type                | Required | Description                                      |
| ----------- | ------------------- | -------- | ------------------------------------------------ |
| `Model`     | `Client`            | Yes      | Elasticsearch client instance                    |
| `index`     | `string`            | No       | Default index name                               |
| `id`        | `string`            | No       | ID field name (default: '\_id')                  |
| `parent`    | `string`            | No       | Parent field name for parent-child relationships |
| `routing`   | `string`            | No       | Routing field name                               |
| `join`      | `string`            | No       | Join field name for parent-child relationships   |
| `meta`      | `string`            | No       | Metadata field name (default: '\_meta')          |
| `esVersion` | `string`            | No       | Elasticsearch version (e.g., '8.0')              |
| `esParams`  | `object`            | No       | Default Elasticsearch parameters                 |
| `paginate`  | `object`            | No       | Pagination configuration                         |
| `whitelist` | `string[]`          | No       | Allowed query operators                          |
| `multi`     | `boolean\|string[]` | No       | Allow multi operations                           |

### Example Configuration

```javascript
const service = service({
  Model: client,
  index: 'products',
  id: 'productId',
  esVersion: '8.0',
  esParams: {
    refresh: true,
    timeout: '30s'
  },
  paginate: {
    default: 20,
    max: 50
  },
  multi: true,
  whitelist: ['$match', '$phrase', '$prefix']
})
```

## Service Methods

### find(params)

Find multiple documents matching the query.

```javascript
// Basic find
const results = await service.find({
  query: {
    status: 'active',
    category: 'electronics'
  }
})

// With pagination
const page = await service.find({
  query: {
    status: 'active'
  },
  paginate: {
    default: 10,
    max: 50
  }
})
// Returns: { total, limit, skip, data }

// Without pagination
const all = await service.find({
  query: {
    status: 'active'
  },
  paginate: false
})
```

### get(id, params)

Get a single document by ID.

```javascript
const doc = await service.get('doc123')

// With selected fields
const doc = await service.get('doc123', {
  query: {
    $select: ['name', 'email']
  }
})
```

### create(data, params)

Create one or more documents.

```javascript
// Single document
const created = await service.create({
  name: 'John Doe',
  email: 'john@example.com'
})

// With specific ID
const created = await service.create({
  id: 'user123',
  name: 'John Doe',
  email: 'john@example.com'
})

// Bulk creation
const items = await service.create([
  { name: 'John', age: 30 },
  { name: 'Jane', age: 25 }
])

// With upsert
const doc = await service.create({ id: 'doc123', name: 'Updated' }, { upsert: true })
```

### update(id, data, params)

Replace a document entirely.

```javascript
const updated = await service.update('doc123', {
  name: 'Jane Doe',
  email: 'jane@example.com',
  age: 28
})

// With upsert
const doc = await service.update('doc123', { name: 'New Document' }, { upsert: true })
```

### patch(id, data, params)

Partially update one or more documents.

```javascript
// Single document
const patched = await service.patch('doc123', {
  status: 'inactive'
})

// Bulk patch
const results = await service.patch(
  null,
  { archived: true },
  {
    query: {
      createdAt: { $lt: '2023-01-01' }
    }
  }
)
```

### remove(id, params)

Remove one or more documents.

```javascript
// Single document
const removed = await service.remove('doc123')

// Bulk removal
const results = await service.remove(null, {
  query: {
    status: 'deleted'
  }
})
```

### raw(method, params)

Execute raw Elasticsearch API methods.

```javascript
// Direct search
const results = await service.raw('search', {
  body: {
    query: {
      match_all: {}
    },
    aggs: {
      categories: {
        terms: { field: 'category' }
      }
    }
  }
})

// Index operations
const mapping = await service.raw('indices.getMapping')
```

## Query Operators

### Comparison Operators

| Operator | Description           | Example                                         |
| -------- | --------------------- | ----------------------------------------------- |
| `$gt`    | Greater than          | `{ age: { $gt: 18 } }`                          |
| `$gte`   | Greater than or equal | `{ age: { $gte: 18 } }`                         |
| `$lt`    | Less than             | `{ age: { $lt: 65 } }`                          |
| `$lte`   | Less than or equal    | `{ age: { $lte: 65 } }`                         |
| `$ne`    | Not equal             | `{ status: { $ne: 'deleted' } }`                |
| `$in`    | In array              | `{ status: { $in: ['active', 'pending'] } }`    |
| `$nin`   | Not in array          | `{ status: { $nin: ['deleted', 'archived'] } }` |

### Text Search Operators

| Operator         | Description        | Example                                     |
| ---------------- | ------------------ | ------------------------------------------- |
| `$match`         | Full-text match    | `{ title: { $match: 'elasticsearch' } }`    |
| `$phrase`        | Phrase match       | `{ title: { $phrase: 'quick brown fox' } }` |
| `$phrase_prefix` | Phrase prefix      | `{ title: { $phrase_prefix: 'quick br' } }` |
| `$prefix`        | Term prefix        | `{ username: { $prefix: 'john' } }`         |
| `$wildcard`      | Wildcard pattern   | `{ email: { $wildcard: '*@example.com' } }` |
| `$regexp`        | Regular expression | `{ phone: { $regexp: '^\\+1.*' } }`         |

### Logical Operators

```javascript
// $or
{
  $or: [
    { status: 'active' },
    { priority: 'high' }
  ]
}

// $and
{
  $and: [
    { status: 'active' },
    { category: 'electronics' }
  ]
}

// Combined
{
  status: 'active',
  $or: [
    { priority: 'high' },
    { deadline: { $lt: '2024-01-01' } }
  ]
}
```

### Special Operators

#### $all (Match All)

```javascript
{
  $all: true
} // Returns all documents
```

#### $sqs (Simple Query String)

```javascript
{
  $sqs: {
    $query: 'nodejs elasticsearch',
    $fields: ['title', 'description'],
    $operator: 'and'  // Optional: 'and' or 'or'
  }
}
```

#### $exists / $missing

```javascript
{
  $exists: ['email', 'phone']
} // Documents with these fields
{
  $missing: ['deletedAt']
} // Documents without these fields
```

#### $nested (Nested Documents)

```javascript
{
  $nested: {
    $path: 'comments',
    'comments.author': 'John',
    'comments.rating': { $gte: 4 }
  }
}
```

#### $child / $parent (Parent-Child Relationships)

```javascript
// Find child documents
{
  $child: {
    $type: 'comment',
    author: 'John'
  }
}

// Find parent documents
{
  $parent: {
    $type: 'post',
    status: 'published'
  }
}
```

## Special Features

### Pagination

```javascript
// Default pagination
const page1 = await service.find({
  query: { status: 'active' }
})

// Custom pagination
const page2 = await service.find({
  query: {
    status: 'active',
    $limit: 20,
    $skip: 20
  }
})

// Disable pagination
const all = await service.find({
  query: { status: 'active' },
  paginate: false
})
```

### Sorting

```javascript
{
  query: {
    $sort: {
      createdAt: -1,  // Descending
      name: 1         // Ascending
    }
  }
}
```

### Field Selection

```javascript
{
  query: {
    $select: ['name', 'email', 'status']
  }
}
```

### Index Routing

```javascript
// Query specific index
{
  query: {
    $index: 'products-2024'
  }
}

// With routing
{
  query: {
    $routing: 'user123'
  }
}
```

### Bulk Operations

```javascript
// Bulk create
const docs = await service.create([{ name: 'Doc1' }, { name: 'Doc2' }, { name: 'Doc3' }])

// Bulk patch
const updated = await service.patch(
  null,
  { status: 'archived' },
  { query: { createdAt: { $lt: '2023-01-01' } } }
)

// Bulk remove
const removed = await service.remove(null, {
  query: { status: 'deleted' }
})
```

## Error Handling

The service throws Feathers errors that can be caught and handled:

```javascript
try {
  const doc = await service.get('nonexistent')
} catch (error) {
  if (error.name === 'NotFound') {
    // Handle not found
  }
}

// Error types:
// - BadRequest (400): Invalid query or parameters
// - NotFound (404): Document not found
// - Conflict (409): Document already exists
// - GeneralError (500): Elasticsearch errors
```

## TypeScript Support

The service exports comprehensive TypeScript types:

```typescript
import service, {
  ElasticsearchServiceOptions,
  ElasticsearchServiceParams,
  ElasticsearchDocument,
  ESSearchResponse,
  QueryOperators,
  ServiceResult,
  PaginatedResult
} from 'feathers-elasticsearch'

// Typed service creation
const typedService = service<User>({
  Model: client,
  index: 'users'
})

// Typed queries
const users: User[] = await typedService.find({
  query: {
    age: { $gte: 18 },
    status: 'active'
  }
})

// Custom document type
interface User extends ElasticsearchDocument {
  name: string
  email: string
  age: number
  status: 'active' | 'inactive'
}
```

## Advanced Examples

### Complex Query with Aggregations

```javascript
const results = await service.raw('search', {
  body: {
    query: {
      bool: {
        must: [{ term: { status: 'active' } }],
        filter: [{ range: { age: { gte: 18 } } }]
      }
    },
    aggs: {
      age_groups: {
        histogram: {
          field: 'age',
          interval: 10
        }
      }
    }
  }
})
```

### Parent-Child Relationships

```javascript
// Setup service with join
const service = service({
  Model: client,
  index: 'blog',
  join: 'post_comment',
  parent: 'post_id'
})

// Create parent document
const post = await service.create({
  id: 'post1',
  title: 'My Post',
  join: 'post'
})

// Create child document
const comment = await service.create({
  content: 'Great post!',
  parent: 'post1',
  join: {
    name: 'comment',
    parent: 'post1'
  }
})
```

### Retry Configuration

```javascript
import { createRetryWrapper } from 'feathers-elasticsearch/utils'

// Wrap client with retry logic
const retryClient = createRetryWrapper(client, {
  maxRetries: 3,
  initialDelay: 100,
  backoffMultiplier: 2
})

const service = service({
  Model: retryClient,
  index: 'products'
})
```

## Migration Guide

### From v2 to v3

1. Update to Feathers v5 (Dove)
2. Use new TypeScript types
3. Update error handling (errors are now properly thrown)
4. Use new query operators format

```javascript
// Old (v2)
service.find({
  query: {
    $search: 'text'
  }
})

// New (v3)
service.find({
  query: {
    $match: 'text'
  }
})
```

## Performance Tips

1. **Use field selection** to reduce data transfer:

   ```javascript
   {
     query: {
       $select: ['id', 'name']
     }
   }
   ```

2. **Enable refresh only when needed**:

   ```javascript
   esParams: {
     refresh: false
   } // Default
   ```

3. **Use bulk operations** for multiple documents:

   ```javascript
   service.create([...documents]) // Instead of multiple create calls
   ```

4. **Leverage Elasticsearch caching**:

   ```javascript
   service.raw('search', {
     request_cache: true,
     body: { ... }
   })
   ```

5. **Use appropriate pagination limits**:
   ```javascript
   paginate: { default: 20, max: 100 }
   ```

## Support

- GitHub Issues: [Report bugs](https://github.com/feathersjs-ecosystem/feathers-elasticsearch/issues)
- Documentation: [Full documentation](https://github.com/feathersjs-ecosystem/feathers-elasticsearch)
- Feathers Discord: [Community support](https://discord.gg/qa8kez8QBx)
