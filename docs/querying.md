# Querying

feathers-elasticsearch supports both standard [Feathers query syntax](https://docs.feathersjs.com/api/databases/querying.html) and Elasticsearch-specific queries.

## Standard Feathers Queries

All standard Feathers query operators are supported:

### Equality

```js
// Find messages with text equal to "Hello"
query: {
  text: 'Hello'
}
```

### Comparison Operators

```js
// $lt - less than
query: {
  age: { $lt: 30 }
}

// $lte - less than or equal
query: {
  age: { $lte: 30 }
}

// $gt - greater than
query: {
  age: { $gt: 30 }
}

// $gte - greater than or equal
query: {
  age: { $gte: 30 }
}

// $ne - not equal
query: {
  status: { $ne: 'archived' }
}
```

### Array Operators

```js
// $in - value in array
query: {
  status: { $in: ['active', 'pending'] }
}

// $nin - value not in array
query: {
  status: { $nin: ['archived', 'deleted'] }
}
```

### Special Operators

```js
// $or - match any condition
query: {
  $or: [
    { status: 'active' },
    { priority: 'high' }
  ]
}

// $limit - limit results
query: {
  $limit: 10
}

// $skip - skip results (pagination)
query: {
  $skip: 20
}

// $sort - sort results
query: {
  $sort: {
    createdAt: -1  // -1 for descending, 1 for ascending
  }
}

// $select - select specific fields
query: {
  $select: ['title', 'content', 'createdAt']
}
```

---

## Elasticsearch-Specific Queries

On top of standard Feathers queries, feathers-elasticsearch supports Elasticsearch-specific query operators.

### $all

[`match_all` query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-all-query.html) - Find all documents.

```js
query: {
  $all: true
}
```

**Example:**
```js
// Find all messages
const allMessages = await service.find({
  query: { $all: true }
});
```

---

### $prefix

[`prefix` query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-prefix-query.html) - Find all documents which have the given field containing terms with a specified prefix (not analyzed).

```js
query: {
  user: {
    $prefix: 'bo'
  }
}
```

**Example:**
```js
// Find users whose name starts with "bo" (bob, bobby, etc.)
const users = await service.find({
  query: {
    name: { $prefix: 'bo' }
  }
});
```

---

### $wildcard

[`wildcard` query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-wildcard-query.html) - Find all documents which have the given field containing terms matching a wildcard expression (not analyzed).

```js
query: {
  user: {
    $wildcard: 'B*b'
  }
}
```

**Wildcard characters:**
- `*` - matches zero or more characters
- `?` - matches exactly one character

**Example:**
```js
// Find users matching pattern "B*b" (Bob, Barb, etc.)
const users = await service.find({
  query: {
    name: { $wildcard: 'B*b' }
  }
});
```

---

### $regexp

[`regexp` query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html) - Find all documents which have the given field containing terms matching a regular expression (not analyzed).

```js
query: {
  user: {
    $regexp: 'Bo[xb]'
  }
}
```

**Example:**
```js
// Find users matching regex "Bo[xb]" (Bob, Box)
const users = await service.find({
  query: {
    name: { $regexp: 'Bo[xb]' }
  }
});
```

---

### $exists

[`exists` query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-exists-query.html) - Find all documents that have at least one non-null value in the specified fields.

```js
query: {
  $exists: ['phone', 'address']
}
```

**Example:**
```js
// Find users who have both phone and address fields
const users = await service.find({
  query: {
    $exists: ['phone', 'address']
  }
});

// Find users who have an email field
const usersWithEmail = await service.find({
  query: {
    $exists: ['email']
  }
});
```

---

### $missing

The inverse of [`exists`](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-exists-query.html) - Find all documents missing the specified fields.

```js
query: {
  $missing: ['phone', 'address']
}
```

**Example:**
```js
// Find users who are missing both phone and address
const users = await service.find({
  query: {
    $missing: ['phone', 'address']
  }
});
```

---

### $match

[`match` query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html) - Full-text search. Find all documents which have the given fields matching the specified value (analyzed).

```js
query: {
  bio: {
    $match: 'javascript'
  }
}
```

**Example:**
```js
// Find articles mentioning "javascript" in the content
const articles = await service.find({
  query: {
    content: { $match: 'javascript' }
  }
});

// The query is analyzed, so it will match variations like "JavaScript", "Javascript", etc.
```

---

### $phrase

[`match_phrase` query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query-phrase.html) - Find all documents which have the given fields matching the specified phrase (analyzed).

```js
query: {
  bio: {
    $phrase: 'I like JavaScript'
  }
}
```

**Example:**
```js
// Find articles with the exact phrase "machine learning"
const articles = await service.find({
  query: {
    content: { $phrase: 'machine learning' }
  }
});
```

---

### $phrase_prefix

[`match_phrase_prefix` query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query-phrase-prefix.html) - Find all documents which have the given fields matching the specified phrase prefix (analyzed).

```js
query: {
  bio: {
    $phrase_prefix: 'I like JavaS'
  }
}
```

**Example:**
```js
// Find articles with phrases starting with "machine learn" (matches "machine learning", "machine learned", etc.)
const articles = await service.find({
  query: {
    content: { $phrase_prefix: 'machine learn' }
  }
});
```

---

### $and

This operator provides support for [Elasticsearch array datatype](https://www.elastic.co/guide/en/elasticsearch/reference/current/array.html). Find all documents which match all of the given criteria.

As any field in Elasticsearch can contain an array, this is useful for matching multiple values in the same field.

```js
query: {
  $and: [
    { notes: { $match: 'javascript' } },
    { notes: { $match: 'project' } }
  ]
}
```

**Shorthand for equality:**

```js
// Long form
query: {
  $and: [
    { tags: 'javascript' },
    { tags: 'react' }
  ]
}

// Shorthand
query: {
  tags: ['javascript', 'react']
}
```

**Example:**
```js
// Find articles tagged with both "javascript" AND "react"
const articles = await service.find({
  query: {
    tags: ['javascript', 'react']
  }
});

// More complex: articles that mention both "javascript" and "tutorial" in content
const tutorials = await service.find({
  query: {
    $and: [
      { content: { $match: 'javascript' } },
      { content: { $match: 'tutorial' } }
    ]
  }
});
```

---

### $sqs

[`simple_query_string` query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-simple-query-string-query.html) - A query that uses the SimpleQueryParser to parse its context.

```js
query: {
  $sqs: {
    $fields: ['title^5', 'description'],
    $query: '+like +javascript',
    $operator: 'and'  // Optional, default: 'or'
  }
}
```

**Parameters:**
- `$fields` - Array of fields to search. Use `^` to boost field importance (e.g., `title^5`)
- `$query` - The query string with operators
- `$operator` - Default operator: `'and'` or `'or'` (default: `'or'`)

**Query string operators:**
- `+` - AND operator (must match)
- `|` - OR operator
- `-` - NOT operator (must not match)
- `"..."` - Phrase query
- `*` - Wildcard
- `(...)` - Grouping

**Example:**
```js
// Search for articles that mention "javascript" AND "react" in title or content
// Boost title matches 5x
const articles = await service.find({
  query: {
    $sqs: {
      $fields: ['title^5', 'content'],
      $query: '+javascript +react',
      $operator: 'and'
    }
  }
});

// URL format
// http://localhost:3030/articles?$sqs[$fields][]=title^5&$sqs[$fields][]=content&$sqs[$query]=+javascript +react&$sqs[$operator]=and
```

---

### $child

[`has_child` query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-has-child-query.html) - Find all documents which have children matching the query.

The `$child` query is a full-blown query of its own and requires the `$type` property.

**Elasticsearch 6.0+ Change:**
- **Before 6.0:** `$type` represents the child document type in the index
- **6.0+:** `$type` represents the child relationship name as defined in the [join field](https://www.elastic.co/guide/en/elasticsearch/reference/6.0/parent-join.html)

```js
query: {
  $child: {
    $type: 'blog_tag',
    tag: 'something'
  }
}
```

**Example:**
```js
// Find all blog posts that have a comment containing "great"
const posts = await service.find({
  query: {
    $child: {
      $type: 'comment',
      content: { $match: 'great' }
    }
  }
});

// Find all posts with active comments
const postsWithActiveComments = await service.find({
  query: {
    $child: {
      $type: 'comment',
      status: 'active'
    }
  }
});
```

See [Parent-Child Relationships](./parent-child.md) for more details.

---

### $parent

[`has_parent` query](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-has-parent-query.html) - Find all documents which have a parent matching the query.

The `$parent` query is a full-blown query of its own and requires the `$type` property.

**Elasticsearch 6.0+ Change:**
- **Before 6.0:** `$type` represents the parent document type in the index
- **6.0+:** `$type` represents the parent relationship name as defined in the [join field](https://www.elastic.co/guide/en/elasticsearch/reference/6.0/parent-join.html)

```js
query: {
  $parent: {
    $type: 'blog',
    title: {
      $match: 'javascript'
    }
  }
}
```

**Example:**
```js
// Find all comments whose parent blog post has "javascript" in the title
const comments = await service.find({
  query: {
    $parent: {
      $type: 'blog',
      title: { $match: 'javascript' }
    }
  }
});

// Find all comments on published posts
const commentsOnPublished = await service.find({
  query: {
    $parent: {
      $type: 'blog',
      status: 'published'
    }
  }
});
```

See [Parent-Child Relationships](./parent-child.md) for more details.

---

## Complex Query Examples

### Combining Multiple Operators

```js
// Find active articles about "javascript" or "react" with high priority
const articles = await service.find({
  query: {
    status: 'active',
    priority: { $gte: 8 },
    $or: [
      { tags: 'javascript' },
      { tags: 'react' }
    ],
    $sort: {
      createdAt: -1
    },
    $limit: 20
  }
});
```

### Full-Text Search with Filters

```js
// Search for "machine learning" in content, only in published articles
const articles = await service.find({
  query: {
    status: 'published',
    content: { $match: 'machine learning' },
    publishedAt: { $gte: '2024-01-01' },
    $sort: {
      _score: -1  // Sort by relevance
    }
  }
});
```

### Advanced Text Search

```js
// Complex search with field boosting
const results = await service.find({
  query: {
    $sqs: {
      $fields: ['title^10', 'tags^5', 'content'],
      $query: '+javascript +(react | vue) -angular',
      $operator: 'and'
    },
    status: 'published',
    $limit: 50
  }
});
```

### Array Field Matching

```js
// Find articles with both "javascript" and "tutorial" tags
const tutorials = await service.find({
  query: {
    $and: [
      { tags: 'javascript' },
      { tags: 'tutorial' }
    ]
  }
});

// Or using shorthand
const tutorials = await service.find({
  query: {
    tags: ['javascript', 'tutorial']
  }
});
```

### Existence Checks

```js
// Find complete user profiles (have all required fields)
const completeProfiles = await service.find({
  query: {
    $exists: ['email', 'phone', 'address', 'avatar']
  }
});

// Find incomplete profiles (missing optional fields)
const incompleteProfiles = await service.find({
  query: {
    $missing: ['phone', 'address']
  }
});
```

### Pattern Matching

```js
// Find users with email addresses from specific domains
const users = await service.find({
  query: {
    email: { $wildcard: '*@company.com' }
  }
});

// Find product codes matching a pattern
const products = await service.find({
  query: {
    sku: { $regexp: 'PROD-[0-9]{4}-[A-Z]{2}' }
  }
});
```

## Query Performance Tips

1. **Use specific queries** - Prefer `$match` over `$wildcard` when possible
2. **Limit result sets** - Always use `$limit` to prevent large result sets
3. **Use filters for exact matches** - Use equality queries for exact matches instead of full-text search
4. **Avoid leading wildcards** - Queries like `$wildcard: '*abc'` are slow
5. **Use pagination** - Use `$skip` and `$limit` for large result sets
6. **Index fields properly** - Ensure fields are indexed appropriately for your query types

## Security Considerations

Some query operators can be restricted for security. See [Configuration](./configuration.md) for details on:

- `whitelist` - Control which query operators are allowed
- `security.maxQueryDepth` - Limit query nesting depth
- `security.maxArraySize` - Limit array sizes in `$in` and `$nin`
- `security.maxQueryStringLength` - Limit `$sqs` query length
- `security.searchableFields` - Restrict searchable fields for `$sqs`

## Next Steps

- Configure query security: [Configuration](./configuration.md)
- Learn about parent-child queries: [Parent-Child Relationships](./parent-child.md)
- Optimize query performance: [Performance Features](./PERFORMANCE_FEATURES.md)
