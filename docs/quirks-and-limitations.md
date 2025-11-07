# Quirks and Limitations

This guide covers important behaviors, limitations, and workarounds when using feathers-elasticsearch.

## Update and Delete by Query

### The Limitation

Elasticsearch's "update by query" and "delete by query" APIs were experimental in earlier versions:

- ["update by query"](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-update-by-query.html) - Still considered experimental
- ["delete by query"](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-delete-by-query.html) - Introduced in Elasticsearch 5.0

> **Note:** In Feathers terminology, "update" is called `patch`, and "delete" is called `remove`.

### How feathers-elasticsearch Handles It

Instead of using these experimental APIs directly, feathers-elasticsearch uses a two-step process:

1. **Find** documents matching the query
2. **Bulk patch/remove** the found documents

**Example of what happens internally:**

```js
// When you call:
await service.patch(null, { status: 'updated' }, {
  query: { category: 'news' }
});

// The service does:
// Step 1: Find all documents matching the query
const results = await service.find({ query: { category: 'news' } });

// Step 2: Bulk patch those documents
await bulkPatch(results.data, { status: 'updated' });
```

### Implications

#### 1. Pagination Affects Results

Standard pagination applies to the find operation, which means:

**⚠️ Not all matching documents will be patched/removed by default**

```js
// This will only patch the first page of results (default: 10 items)
await service.patch(null, { status: 'archived' }, {
  query: { year: 2020 }
});
```

**Solution:** Disable pagination or increase the limit:

```js
// Option 1: Disable pagination for this operation
await service.patch(null, { status: 'archived' }, {
  query: { year: 2020 },
  paginate: false
});

// Option 2: Increase the limit
await service.patch(null, { status: 'archived' }, {
  query: {
    year: 2020,
    $limit: 10000  // Process up to 10,000 documents
  }
});
```

#### 2. Two-Step Process is Slower

The find-then-bulk approach is slower than native Elasticsearch update/delete by query:

- ✅ **Pro:** Works consistently across all Elasticsearch versions
- ✅ **Pro:** Returns the actual modified documents
- ❌ **Con:** Slower due to two round trips
- ❌ **Con:** More network bandwidth usage

**When it matters:**
- Large bulk operations (>1000 documents)
- Time-sensitive operations
- High-frequency updates

**Workarounds:**

1. Use the `lean` option to skip fetching documents back:
   ```js
   await service.patch(null, updates, {
     query: { ... },
     lean: true  // Don't fetch documents back (60% faster)
   });
   ```

2. For very large operations, use the `raw()` method (if whitelisted):
   ```js
   await service.raw('updateByQuery', {
     index: 'myindex',
     body: {
       query: { match: { status: 'pending' } },
       script: { source: 'ctx._source.status = "completed"' }
     }
   });
   ```

---

## Search Visibility and Refresh

### The Issue

Changes to Elasticsearch documents (creates, updates, patches, removals) are **not immediately visible** for search operations.

This is due to Elasticsearch's [`index.refresh_interval`](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html) setting, which defaults to 1 second.

### What This Means

```js
// Create a document
const doc = await service.create({ title: 'Hello World' });

// Immediately try to find it
const results = await service.find({
  query: { title: 'Hello World' }
});

console.log(results.total);  // Might be 0!
```

The document exists in Elasticsearch but hasn't been refreshed yet, so it's not visible to search operations.

### Solutions

#### Option 1: Force Refresh (Not Recommended)

Set `refresh: true` in the service configuration:

```js
app.use('/messages', service({
  Model: esClient,
  elasticsearch: {
    index: 'test',
    type: 'messages',
    refresh: true  // Force refresh after every operation
  }
}));
```

**⚠️ Warning:** This is **highly discouraged** in production due to severe performance implications. Forcing refresh after every operation can significantly impact cluster performance.

#### Option 2: Per-Operation Refresh (Recommended)

Use `refresh: 'wait_for'` for operations where you need immediate visibility:

```js
// Create with refresh
const doc = await service.create(
  { title: 'Hello World' },
  { refresh: 'wait_for' }  // Wait for refresh before returning
);

// Now it's visible
const results = await service.find({
  query: { title: 'Hello World' }
});
console.log(results.total);  // 1
```

**Refresh options:**
- `false` (default) - Don't wait for refresh (fastest, eventual visibility)
- `'wait_for'` - Wait for the next automatic refresh (balanced)
- `true` - Force immediate refresh (slowest, immediate visibility)

#### Option 3: Design for Eventual Consistency (Best)

Accept that search visibility is eventually consistent and design your application accordingly:

```js
// Create a document
const doc = await service.create({ title: 'Hello World' });

// Use get() by ID instead of find() - get() doesn't require refresh
const retrieved = await service.get(doc._id);  // ✅ Immediately available

// For find(), accept ~1 second delay
setTimeout(async () => {
  const results = await service.find({
    query: { title: 'Hello World' }
  });
  console.log(results.total);  // 1
}, 1000);
```

**Design patterns:**
- Use `get()` by ID when you need immediate retrieval
- Use optimistic UI updates (assume success, update UI immediately)
- Use polling or WebSockets to detect when changes become visible
- Design workflows that don't require immediate search visibility

#### Option 4: Adjust Refresh Interval

For development/testing, you can decrease the refresh interval:

```bash
# Set refresh interval to 100ms (not recommended for production)
curl -X PUT "localhost:9200/myindex/_settings" -H 'Content-Type: application/json' -d'
{
  "index": {
    "refresh_interval": "100ms"
  }
}
'
```

---

## Full-Text Search Limitations

### Current State

feathers-elasticsearch supports the most important full-text queries in their default form:

- `$match` - Basic full-text matching
- `$phrase` - Phrase matching
- `$phrase_prefix` - Phrase prefix matching
- `$sqs` - Simple query string

### What's Missing

Elasticsearch full-text queries support many additional parameters for fine-tuning:

- `boost` - Relevance boosting
- `fuzziness` - Fuzzy matching
- `minimum_should_match` - Minimum matching criteria
- `analyzer` - Custom analyzers
- `operator` - AND/OR logic

**Example of what's not supported:**

```js
// ❌ Cannot specify additional parameters
query: {
  title: {
    $match: {
      query: 'javascript',
      boost: 2.0,        // Not supported
      fuzziness: 'AUTO'  // Not supported
    }
  }
}
```

### Workarounds

#### Option 1: Use $sqs for Some Parameters

The `$sqs` operator supports more options:

```js
query: {
  $sqs: {
    $fields: ['title^5', 'content'],  // Field boosting supported
    $query: 'javascript',
    $operator: 'and'  // AND/OR logic supported
  }
}
```

#### Option 2: Use raw() for Advanced Queries

If you need full control, use the `raw()` method (requires whitelisting):

```js
// In service configuration
security: {
  allowedRawMethods: ['search']
}

// In your code
const results = await service.raw('search', {
  body: {
    query: {
      match: {
        title: {
          query: 'javascript',
          boost: 2.0,
          fuzziness: 'AUTO',
          minimum_should_match: '75%'
        }
      }
    }
  }
});
```

#### Option 3: Custom Service Methods

Extend the service with custom methods for complex queries:

```js
class CustomElasticsearchService extends Service {
  async fuzzySearch(text, options = {}) {
    return this.raw('search', {
      body: {
        query: {
          match: {
            [options.field || 'content']: {
              query: text,
              fuzziness: options.fuzziness || 'AUTO'
            }
          }
        }
      }
    });
  }
}

// Usage
const results = await service.fuzzySearch('javascript', {
  field: 'title',
  fuzziness: 2
});
```

---

## Performance Considerations

### Get Operations After Mutations

In Elasticsearch v5.0+, most data-mutating operations (create, update, remove) don't return the full resulting document. To provide consistent behavior with other Feathers adapters, feathers-elasticsearch performs an additional `get()` to retrieve the complete document.

**What happens internally:**

```js
// When you call:
const doc = await service.create({ title: 'Hello' });

// The service does:
// 1. Index the document
await esClient.index({ ... });

// 2. Get the full document
const fullDoc = await esClient.get({ id: result._id });

// 3. Return the full document
return fullDoc;
```

### Performance Impact

- ✅ **Pro:** Consistent API with other Feathers database adapters
- ✅ **Pro:** Returns complete document with metadata
- ❌ **Con:** Adds overhead (extra round trip to Elasticsearch)
- ❌ **Con:** Increases latency for create/update/remove operations

### Solution: Lean Mode

Use the `lean` option to skip the additional `get()`:

```js
// Skip fetching the document back (60% faster)
const result = await service.create(data, {
  lean: true
});

// Result contains only basic info (_id, _version), not full document
console.log(result);  // { _id: '123', _version: 1, result: 'created' }
```

**When to use lean mode:**
- Bulk operations where you don't need the returned data
- High-throughput scenarios
- When you already know what the document looks like

**When NOT to use lean mode:**
- When you need the full document back (with generated fields, etc.)
- When you need Elasticsearch metadata (_score, _type, etc.)
- When maintaining consistency with other Feathers adapters

---

## Upsert Capability

### Create with Upsert

The `upsert` parameter for `create` updates an existing document instead of throwing an error:

```js
// First call: creates the document
await service.create({
  _id: 123,
  title: 'Hello World'
}, {
  upsert: true
});

// Second call: updates the document instead of erroring
await service.create({
  _id: 123,
  title: 'Hello World v2'
}, {
  upsert: true
});
```

### Update with Upsert

The `upsert` parameter for `update` creates the document if it doesn't exist:

```js
// Document doesn't exist yet - will be created
await service.update(123, {
  _id: 123,
  title: 'Created via upsert'
}, {
  upsert: true
});
```

### Important Notes

1. **Use explicit IDs:** Upsert only makes sense with explicit document IDs
2. **Full document required:** For `update` with upsert, provide the complete document
3. **Not the same as patch:** `update` replaces the entire document; use `patch` for partial updates

---

## Elasticsearch Result Window

### The 10,000 Document Limit

Elasticsearch has a hard limit (by default) on how deep you can paginate: **10,000 documents**.

This is the `max_result_window` setting, and `from + size` cannot exceed it.

**What this means:**

```js
// ✅ Works: skip 100, limit 50 (total: 150)
await service.find({
  query: {
    $skip: 100,
    $limit: 50
  }
});

// ❌ Fails: skip 9990, limit 50 (total: 10,040 > 10,000)
await service.find({
  query: {
    $skip: 9990,
    $limit: 50
  }
});
// Error: "Result window is too large, from + size must be less than or equal to: [10000]"
```

### How feathers-elasticsearch Handles It

The service automatically adjusts the limit to prevent exceeding `max_result_window`:

```js
// Internally limits size to prevent exceeding 10,000
const results = await service.find({
  query: {
    $skip: 9990,
    $limit: 50  // Automatically reduced to 10
  }
});

console.log(results.data.length);  // 10 (not 50)
```

### Solutions for Large Datasets

#### Option 1: Increase max_result_window (Not Recommended)

```bash
curl -X PUT "localhost:9200/myindex/_settings" -H 'Content-Type: application/json' -d'
{
  "index": {
    "max_result_window": 50000
  }
}
'
```

**⚠️ Warning:** This can cause memory issues and is not recommended for large datasets.

#### Option 2: Use Search After (Recommended)

For deep pagination, use Elasticsearch's [search_after](https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html#search-after) API via `raw()`:

```js
security: {
  allowedRawMethods: ['search']
}

// First page
let results = await service.raw('search', {
  body: {
    size: 100,
    sort: [{ createdAt: 'asc' }],
    query: { ... }
  }
});

// Next page
results = await service.raw('search', {
  body: {
    size: 100,
    sort: [{ createdAt: 'asc' }],
    search_after: results.hits.hits[results.hits.hits.length - 1].sort,
    query: { ... }
  }
});
```

#### Option 3: Use Scroll API (For Export)

For exporting large datasets, use the [scroll API](https://www.elastic.co/guide/en/elasticsearch/reference/current/scroll-api.html):

```js
// Not recommended for real-time pagination
// Only for batch processing or data export
```

---

## Elasticsearch Version Differences

### Type Removal (ES 7.0+)

Elasticsearch 7.0 removed support for multiple types per index. In ES 7.0+, use `_doc` as the type:

```js
// ES 6.x and earlier
elasticsearch: {
  index: 'myindex',
  type: 'mytype'
}

// ES 7.0+
elasticsearch: {
  index: 'myindex',
  type: '_doc'  // Use _doc for ES 7.0+
}
```

### Parent-Child Changes (ES 6.0+)

Parent-child relationships changed significantly in ES 6.0. See [Parent-Child Relationships](./parent-child.md) for details.

---

## Summary

| Issue | Impact | Solution |
|-------|--------|----------|
| Update/Delete by query | Only processes paginated results | Use `paginate: false` or `$limit` |
| Search visibility delay | ~1 second delay for new docs to appear in search | Use `refresh: 'wait_for'` or design for eventual consistency |
| Full-text search params | Limited parameter support | Use `raw()` for advanced queries |
| Extra get() after mutations | Adds latency to create/update/remove | Use `lean: true` for better performance |
| 10,000 result window | Cannot paginate beyond 10,000 | Use `search_after` or increase `max_result_window` |

## Next Steps

- Learn about performance optimizations: [Performance Features](./PERFORMANCE_FEATURES.md)
- Configure your service properly: [Configuration](./configuration.md)
- Understand security implications: [Security](./SECURITY.md)
