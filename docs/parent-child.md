# Parent-Child Relationships

Elasticsearch supports parent-child relationships, though they work differently than in traditional relational databases. This guide covers how to use parent-child relationships with feathers-elasticsearch.

## Important Changes in Elasticsearch 6.0

The approach to parent-child relationships changed significantly between Elasticsearch versions:

- **Elasticsearch ≤ 5.6:** Uses `_parent` field mapping
- **Elasticsearch ≥ 6.0:** Uses `join` field type

feathers-elasticsearch provides a consistent API across both approaches through configuration options.

---

## Overview

### Key Concepts

1. **Parent and child documents must be in the same index**
2. **Routing ensures parent and child are on the same shard**
3. **Parent ID must be provided for all child operations**
4. **feathers-elasticsearch handles routing automatically**

### Constraints

- **Single document operations** (create, get, patch, update, remove) require parent ID
- **Bulk create** requires parent ID for each child document
- **Query-based operations** (find, bulk patch, bulk remove) cannot filter by parent ID alone

---

## Elasticsearch 5.6 and Earlier

### Mapping Setup

Define the parent-child relationship in your index mapping:

```json
{
  "mappings": {
    "blog": {
      "properties": {
        "title": { "type": "text" },
        "content": { "type": "text" },
        "publishedAt": { "type": "date" }
      }
    },
    "comment": {
      "_parent": {
        "type": "blog"
      },
      "properties": {
        "text": { "type": "text" },
        "author": { "type": "keyword" },
        "createdAt": { "type": "date" }
      }
    }
  }
}
```

### Service Configuration

Configure services for both parent and child types:

```js
const service = require('feathers-elasticsearch');
const { Client } = require('@elastic/elasticsearch');

const esClient = new Client({ node: 'http://localhost:9200' });

// Parent service (blog posts)
app.use('/posts', service({
  Model: esClient,
  elasticsearch: {
    index: 'blog-index',
    type: 'blog'
  },
  esVersion: '5.6',
  parent: '_parent'  // Parent field name (default)
}));

// Child service (comments)
app.use('/comments', service({
  Model: esClient,
  elasticsearch: {
    index: 'blog-index',  // Same index as parent
    type: 'comment'
  },
  esVersion: '5.6',
  parent: '_parent'  // Parent field name (default)
}));
```

### Creating Documents

#### Create Parent

```js
// Create a blog post (parent)
const post = await app.service('posts').create({
  _id: 123,
  title: 'Introduction to Elasticsearch',
  content: 'Elasticsearch is a powerful search engine...',
  publishedAt: new Date()
});
```

#### Create Child (Single)

Provide parent ID in the document data:

```js
// Create a comment (child)
const comment = await app.service('comments').create({
  _id: 1000,
  _parent: 123,  // Parent post ID
  text: 'Great article!',
  author: 'Alice',
  createdAt: new Date()
});
```

#### Create Children (Bulk)

Each child document must include the parent ID:

```js
const comments = await app.service('comments').create([
  {
    _id: 1001,
    _parent: 123,  // Parent post ID
    text: 'Thanks for sharing!',
    author: 'Bob'
  },
  {
    _id: 1002,
    _parent: 123,  // Same parent
    text: 'Very helpful.',
    author: 'Charlie'
  }
]);
```

### Reading Documents

#### Get Child by ID

Provide parent ID in the query:

```js
const comment = await app.service('comments').get(1000, {
  query: { _parent: 123 }
});
```

#### Find Children of a Parent

Use the `$parent` query operator:

```js
// Find all comments on post 123
const comments = await app.service('comments').find({
  query: {
    $parent: {
      $type: 'blog',
      _id: 123
    }
  }
});
```

### Updating Documents

#### Patch Child

Provide parent ID in the query:

```js
const updated = await app.service('comments').patch(
  1000,  // Comment ID
  { text: 'Updated comment text' },
  { query: { _parent: 123 } }  // Parent ID required
);
```

#### Update Child (Full Replacement)

```js
const updated = await app.service('comments').update(
  1000,
  {
    _id: 1000,
    _parent: 123,
    text: 'Completely new comment',
    author: 'Alice'
  },
  { query: { _parent: 123 } }
);
```

### Removing Documents

Provide parent ID in the query:

```js
await app.service('comments').remove(
  1000,
  { query: { _parent: 123 } }
);
```

---

## Elasticsearch 6.0 and Later

### Mapping Setup with Join Field

Define a `join` field to establish the relationship:

```json
{
  "mappings": {
    "_doc": {
      "properties": {
        "title": { "type": "text" },
        "content": { "type": "text" },
        "text": { "type": "text" },
        "author": { "type": "keyword" },
        "my_join_field": {
          "type": "join",
          "relations": {
            "blog": "comment"
          }
        }
      }
    }
  }
}
```

**Key differences:**
- Single type per index (`_doc`)
- `join` field defines the relationship
- Relationship name (e.g., `blog`, `comment`) instead of type name

### Service Configuration

```js
// Service for both parent and child documents
app.use('/blog-docs', service({
  Model: esClient,
  elasticsearch: {
    index: 'blog-index',
    type: '_doc'  // Single type in ES 6.0+
  },
  esVersion: '6.0',
  parent: '_parent',         // Parent ID field name
  join: 'my_join_field'      // Join field name from mapping
}));
```

**Important:** Set the `join` option to match the join field name in your mapping.

### Creating Documents

#### Create Parent

Include the join field with the relationship name:

```js
const post = await app.service('blog-docs').create({
  _id: 123,
  title: 'Introduction to Elasticsearch',
  content: 'Elasticsearch is a powerful search engine...',
  my_join_field: 'blog'  // Relationship name for parent
});
```

#### Create Child (Single)

Include both the parent ID and the join field:

```js
const comment = await app.service('blog-docs').create({
  _id: 1000,
  _parent: 123,           // Parent document ID
  text: 'Great article!',
  author: 'Alice',
  my_join_field: 'comment'  // Relationship name for child
});
```

#### Create Children (Bulk)

```js
const comments = await app.service('blog-docs').create([
  {
    _id: 1001,
    _parent: 123,
    text: 'Thanks for sharing!',
    author: 'Bob',
    my_join_field: 'comment'
  },
  {
    _id: 1002,
    _parent: 123,
    text: 'Very helpful.',
    author: 'Charlie',
    my_join_field: 'comment'
  }
]);
```

### Reading Documents

#### Get Child by ID

```js
const comment = await app.service('blog-docs').get(1000, {
  query: { _parent: 123 }
});
```

#### Find Children Using $parent Query

Use the relationship name in `$type`:

```js
// Find all comments (children) where parent blog has "elasticsearch" in title
const comments = await app.service('blog-docs').find({
  query: {
    $parent: {
      $type: 'blog',  // Parent relationship name
      title: { $match: 'elasticsearch' }
    }
  }
});
```

#### Find Parents Using $child Query

```js
// Find all blog posts (parents) that have comments containing "great"
const posts = await app.service('blog-docs').find({
  query: {
    $child: {
      $type: 'comment',  // Child relationship name
      text: { $match: 'great' }
    }
  }
});
```

### Updating Documents

Same as Elasticsearch 5.6:

```js
const updated = await app.service('blog-docs').patch(
  1000,
  { text: 'Updated comment' },
  { query: { _parent: 123 } }
);
```

### Removing Documents

```js
await app.service('blog-docs').remove(
  1000,
  { query: { _parent: 123 } }
);
```

---

## Complete Examples

### Example 1: Blog with Comments (ES 5.6)

```js
const service = require('feathers-elasticsearch');
const { Client } = require('@elastic/elasticsearch');

const app = feathers();
const esClient = new Client({ node: 'http://localhost:9200' });

// Posts service
app.use('/posts', service({
  Model: esClient,
  elasticsearch: { index: 'blog', type: 'post' },
  esVersion: '5.6'
}));

// Comments service
app.use('/comments', service({
  Model: esClient,
  elasticsearch: { index: 'blog', type: 'comment' },
  esVersion: '5.6',
  parent: '_parent'
}));

// Usage
async function example() {
  // Create a post
  const post = await app.service('posts').create({
    title: 'Hello World',
    content: 'My first post'
  });

  // Create comments on the post
  await app.service('comments').create([
    { _parent: post._id, text: 'Nice post!', author: 'Alice' },
    { _parent: post._id, text: 'Thanks!', author: 'Bob' }
  ]);

  // Find all comments on the post
  const comments = await app.service('comments').find({
    query: {
      $parent: {
        $type: 'post',
        _id: post._id
      }
    }
  });

  console.log(`Post has ${comments.total} comments`);
}
```

### Example 2: Blog with Comments (ES 6.0+)

```js
const service = require('feathers-elasticsearch');
const { Client } = require('@elastic/elasticsearch');

const app = feathers();
const esClient = new Client({ node: 'http://localhost:9200' });

// Single service for both posts and comments
app.use('/blog', service({
  Model: esClient,
  elasticsearch: { index: 'blog', type: '_doc' },
  esVersion: '8.0',
  parent: '_parent',
  join: 'post_comment_join'  // Join field from mapping
}));

// Usage
async function example() {
  // Create a post
  const post = await app.service('blog').create({
    title: 'Hello World',
    content: 'My first post',
    post_comment_join: 'post'  // Parent relationship
  });

  // Create comments on the post
  await app.service('blog').create([
    {
      _parent: post._id,
      text: 'Nice post!',
      author: 'Alice',
      post_comment_join: 'comment'  // Child relationship
    },
    {
      _parent: post._id,
      text: 'Thanks!',
      author: 'Bob',
      post_comment_join: 'comment'
    }
  ]);

  // Find all comments on this post
  const comments = await app.service('blog').find({
    query: {
      $parent: {
        $type: 'post',
        _id: post._id
      }
    }
  });

  // Find all posts with comments containing "nice"
  const postsWithNiceComments = await app.service('blog').find({
    query: {
      $child: {
        $type: 'comment',
        text: { $match: 'nice' }
      }
    }
  });
}
```

---

## Custom Field Names

You can customize the parent field name:

```js
app.use('/comments', service({
  Model: esClient,
  elasticsearch: { index: 'blog', type: 'comment' },
  parent: 'parentPostId',  // Use custom field name instead of _parent
  esVersion: '5.6'
}));

// Create comment with custom parent field
await app.service('comments').create({
  parentPostId: 123,  // Custom parent field name
  text: 'Great post!'
});

// Get comment with custom parent field
await app.service('comments').get(1000, {
  query: { parentPostId: 123 }
});
```

---

## Limitations and Gotchas

### 1. Parent ID Required for Child Operations

All operations on child documents (except find) require the parent ID:

```js
// ❌ Will fail - missing parent ID
await service.get(childId);

// ✅ Correct - includes parent ID
await service.get(childId, { query: { _parent: parentId } });
```

### 2. Cannot Query by Parent ID Alone with find()

You cannot use find with just a parent ID:

```js
// ❌ Doesn't work - parent ID in regular query
await service.find({
  query: { _parent: 123 }
});

// ✅ Use $parent query operator
await service.find({
  query: {
    $parent: {
      $type: 'post',
      _id: 123
    }
  }
});
```

### 3. Same Index Requirement

Parent and child documents must be in the same index:

```js
// ❌ Won't work - different indices
app.use('/posts', service({
  elasticsearch: { index: 'posts', type: 'post' }
}));
app.use('/comments', service({
  elasticsearch: { index: 'comments', type: 'comment' }  // Different index!
}));

// ✅ Correct - same index
app.use('/posts', service({
  elasticsearch: { index: 'blog', type: 'post' }
}));
app.use('/comments', service({
  elasticsearch: { index: 'blog', type: 'comment' }  // Same index
}));
```

### 4. Join Field Required for ES 6.0+

For Elasticsearch 6.0+, you must:
1. Define a join field in your mapping
2. Set the `join` option in service configuration
3. Include the join field value in all documents

---

## Performance Considerations

### 1. Routing

feathers-elasticsearch automatically handles routing to ensure parent and child documents are on the same shard. This is crucial for performance.

### 2. Parent-Child Query Performance

`$parent` and `$child` queries are more expensive than regular queries. Use them judiciously:

- ✅ Good: Finding children of a specific parent
- ⚠️ Careful: Finding all parents with children matching complex criteria
- ❌ Avoid: Deep nesting of parent-child queries

### 3. Index Design

Consider if parent-child is the right approach:

- **Use parent-child when:** Parent and child have different update frequencies, or you need to query across the relationship
- **Use nested objects when:** Child documents are always retrieved with the parent
- **Use denormalization when:** Performance is critical and data duplication is acceptable

---

## Troubleshooting

### Error: "routing_missing_exception"

**Cause:** Parent ID not provided for child operation.

**Solution:** Include parent ID in the query:

```js
await service.get(childId, { query: { _parent: parentId } });
```

### Error: "Parent document missing"

**Cause:** Trying to create a child with a non-existent parent ID.

**Solution:** Ensure the parent document exists before creating children:

```js
// Create parent first
const parent = await parentService.create({ title: 'My Post' });

// Then create child
await childService.create({
  _parent: parent._id,  // Use the created parent's ID
  text: 'My Comment'
});
```

### No Results from $parent or $child Query

**Cause:** Incorrect relationship type or field name.

**Solution:** 
- For ES ≤ 5.6: Use the parent/child document type names
- For ES ≥ 6.0: Use the relationship names from the join field definition

```js
// ES 5.6 - use type names
$parent: { $type: 'blog', ... }

// ES 6.0+ - use relationship names from join field
$parent: { $type: 'post', ... }  // Not 'blog', but 'post' from the join relations
```

---

## Next Steps

- Learn more about queries: [Querying](./querying.md)
- Configure your service: [Configuration](./configuration.md)
- Understand limitations: [Quirks and Limitations](./quirks-and-limitations.md)
