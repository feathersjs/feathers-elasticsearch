# Getting Started

This guide will help you get started with feathers-elasticsearch, a Feathers database adapter for Elasticsearch.

## Installation

```bash
npm install feathers-elasticsearch @elastic/elasticsearch --save
```

## Compatibility

- **Feathers v5** (Dove)
- **Elasticsearch 8.x and 9.x**
- **Node.js 18+**

> **Important:** `feathers-elasticsearch` implements the [Feathers Common database adapter API](https://docs.feathersjs.com/api/databases/common.html) and [querying syntax](https://docs.feathersjs.com/api/databases/querying.html).

## Supported Elasticsearch Versions

feathers-elasticsearch is currently tested on Elasticsearch 5.0, 5.6, 6.6, 6.7, 6.8, 7.0, 7.1, 8.x, and 9.x.

> **Note:** We have recently dropped support for version 2.4, as its life ended quite a while back. If you are still running Elasticsearch 2.4 and want to take advantage of feathers-elasticsearch, please use version 2.x of this package.

## Basic Example

The following bare-bones example will create a `messages` endpoint and connect to a local `messages` type in the `test` index in your Elasticsearch database:

```js
const feathers = require('@feathersjs/feathers');
const elasticsearch = require('@elastic/elasticsearch');
const service = require('feathers-elasticsearch');

const app = feathers();

app.use('/messages', service({
  Model: new elasticsearch.Client({
    node: 'http://localhost:9200'
  }),
  elasticsearch: {
    index: 'test',
    type: 'messages'
  }
}));
```

## Complete Example

Here's a complete example of a Feathers server with REST API using `feathers-elasticsearch`:

```js
const feathers = require('@feathersjs/feathers');
const express = require('@feathersjs/express');
const service = require('feathers-elasticsearch');
const elasticsearch = require('@elastic/elasticsearch');

// Create the Elasticsearch client
const esClient = new elasticsearch.Client({
  node: 'http://localhost:9200'
});

// Create the message service
const messageService = service({
  Model: esClient,
  paginate: {
    default: 10,
    max: 50
  },
  elasticsearch: {
    index: 'test',
    type: 'messages',
    refresh: true  // Make changes immediately visible (not recommended for production)
  },
  esVersion: '8.0'
});

// Initialize the application
const app = express(feathers());

// Enable JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable REST services
app.configure(express.rest());

// Register the message service
app.use('/messages', messageService);

// Enable error handling
app.use(express.errorHandler());

// Start the server
app.listen(3030);

console.log('Feathers app started on http://127.0.0.1:3030');
```

### Testing Your Setup

You can run this example and test it:

1. Start your Elasticsearch server (ensure it's running on `localhost:9200`)
2. Run the example code above
3. Visit [http://localhost:3030/messages](http://localhost:3030/messages)

You should see an empty array `[]`. That's because you don't have any messages yet, but you now have full CRUD for your new message service!

### Creating Your First Document

Using curl:

```bash
curl -X POST http://localhost:3030/messages \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello Feathers!"}'
```

Or using JavaScript:

```js
// Using the Feathers client
const message = await app.service('messages').create({
  text: 'Hello Feathers!'
});

console.log(message);
```

### Querying Documents

```js
// Find all messages
const messages = await app.service('messages').find();

// Find with query
const results = await app.service('messages').find({
  query: {
    text: 'Hello'
  }
});

// Find with pagination
const page = await app.service('messages').find({
  query: {
    $limit: 10,
    $skip: 20
  }
});
```

## What's Next?

Now that you have a basic setup working, you can:

- **Configure your service** - See [Configuration](./configuration.md) for all available options
- **Learn about queries** - See [Querying](./querying.md) for Elasticsearch-specific query syntax
- **Optimize performance** - See [Performance Features](./PERFORMANCE_FEATURES.md)
- **Secure your service** - See [Security](./SECURITY.md) for security best practices
- **Work with relationships** - See [Parent-Child Relationships](./parent-child.md)

## Common First Steps

### Enable Pagination

```js
app.use('/messages', service({
  Model: esClient,
  elasticsearch: { index: 'test', type: 'messages' },
  paginate: {
    default: 10,  // Return 10 items by default
    max: 100      // Allow up to 100 items per request
  }
}));
```

### Add Security Limits

```js
app.use('/messages', service({
  Model: esClient,
  elasticsearch: { index: 'test', type: 'messages' },
  security: {
    maxQueryDepth: 50,
    maxBulkOperations: 10000,
    allowedRawMethods: []  // Disable raw() method for security
  }
}));
```

### Configure Refresh Strategy

```js
app.use('/messages', service({
  Model: esClient,
  elasticsearch: { 
    index: 'test', 
    type: 'messages',
    refresh: false  // Don't wait for refresh (better performance)
    // refresh: true      // Wait for refresh (immediate visibility)
    // refresh: 'wait_for' // Wait for refresh to complete
  }
}));
```

See the [Configuration Guide](./configuration.md) for all available options and detailed explanations.
