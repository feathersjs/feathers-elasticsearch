# @refrens/feathers-esx

![npm version](https://img.shields.io/badge/@refrens/feathers--esx-v1.0.0-blue?style=flat-square)

[feathers-esx](https://github.com/refrens/feathers-esx) is an extension for [feathers-elasticsearch](https://github.com/feathersjs-ecosystem/feathers-elasticsearch/) database adapter for [Elasticsearch](https://www.elastic.co/products/elasticsearch). This adapter is not using any ORM, it is dealing with the database directly through the [elasticsearch.js client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/quick-start.html).

```bash
$ npm install --save elasticsearch @refrens/feathers-esx@latest
```

> **Important:** `feathers-esx` implements the [Feathers Common database adapter API](https://docs.feathersjs.com/api/databases/common.html) and [querying syntax](https://docs.feathersjs.com/api/databases/querying.html).

## Getting Started

The following bare-bones example will create a `messages` endpoint and connect to a local `messages` type in the `test` index in your Elasticsearch database:

```js
const feathers = require('@feathersjs/feathers');
const elasticsearch = require('elasticsearch');
const service = require('@refrens/feathers-esx');

app.use(
  '/messages',
  service({
    Model: new elasticsearch.Client({
      host: 'localhost:9200',
      apiVersion: '5.0',
    }),
    elasticsearch: {
      index: 'test',
      type: 'messages',
    },
  }),
);
```

## Options

The following options can be passed when creating a new Elasticsearch service:

- `Model` (**required**) - The Elasticsearch client instance.
- `elasticsearch` (**required**) - Configuration object for elasticsearch requests. The required properties are `index` and `type`. Apart from that you can specify anything that should be passed to **all** requests going to Elasticsearch. Another recognised property is [`refresh`](https://www.elastic.co/guide/en/elasticsearch/guide/2.x/near-real-time.html#refresh-api) which is set to `false` by default. Anything else use at your own risk.
- `paginate` [optional] - A pagination object containing a `default` and `max` page size (see the [Pagination documentation](https://docs.feathersjs.com/api/databases/common.html#pagination)).
- `esVersion` (default: '5.0') [optional] - A string indicating which version of Elasticsearch the service is supposed to be talking to. Based on this setting the service will choose compatible API. If you plan on using Elasticsearch 6.0+ features (e.g. join fields) it's quite important to have it set, as there were breaking changes in Elasticsearch 6.0.
- `id` (default: '\_id') [optional] - The id property of your documents in this service.
- `parent` (default: '\_parent') [optional] - The parent property, which is used to pass document's parent id.
- `routing` (default: '\_routing') [optional] - The routing property, which is used to pass document's routing parameter.
- `join` (default: undefined) [optional] - Elasticsearch 6.0+ specific. The name of the [join field](https://www.elastic.co/guide/en/elasticsearch/reference/6.0/parent-join.html) defined in the mapping type used by the service. It is required for parent-child relationship features (e.g. setting a parent, `$child` and `$parent` queries) to work.
- `meta` (default: '\_meta') [optional] - The meta property of your documents in this service. The meta field is an object containing elasticsearch specific information, e.g. `_score`, `_type`, `_index`, `_parent`, `_routing` and so forth. It will be stripped off from the documents passed to the service.
- `whitelist` (default: `['$prefix', '$wildcard', '$regexp', '$exists', '$missing', '$all', '$match', '$phrase', '$phrase_prefix', '$and', '$sqs', '$child', '$parent', '$nested', '$fields', '$path', '$type', '$query', '$operator']`) [optional] - The list of additional non-standard query parameters to allow, by default populated with all Elasticsearch specific ones. You can override, for example in order to restrict access to some queries (see the [options documentation](https://docs.feathersjs.com/api/databases/common.html#serviceoptions)).

## Complete Example

Here's an example of a Feathers server that uses `feathers-esx`.

```js
const feathers = require('@feathersjs/feathers');
const rest = require('@feathersjs/express/rest');
const express = require('@feathersjs/express');

const service = require('@refrens/feathers-esx');
const elasticsearch = require('elasticsearch');

const messageService = service({
  Model: new elasticsearch.Client({
    host: 'localhost:9200',
    apiVersion: '6.0',
  }),
  paginate: {
    default: 10,
    max: 50,
  },
  elasticsearch: {
    index: 'test',
    type: 'messages',
  },
  esVersion: '6.0',
});

// Initialize the application
const app = express(feathers());

// Needed for parsing bodies (login)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Enable REST services
app.configure(express.rest());
// Initialize your feathers plugin
app.use('/messages', messageService);
app.use(express.errorHandler());

app.listen(3030);

console.log('Feathers app started on 127.0.0.1:3030');
```

You can run this example by using `npm start` and going to [localhost:3030/messages](http://localhost:3030/messages).
You should see an empty array. That's because you don't have any messages yet but you now have full CRUD for your new message service!

## Supported Elasticsearch specific queries

On top of the standard, cross-adapter [queries](querying.md), feathers-elasticsearch also supports Elasticsearch specific queries.

### $all

[The simplest query `match_all`](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-all-query.html). Find all documents.

```js
query: {
  $all: true;
}
```

### $prefix

[Term level query `prefix`](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-prefix-query.html). Find all documents which have given field containing terms with a specified prefix (not analyzed).

```js
query: {
  user: {
    $prefix: 'bo';
  }
}
```

### $wildcard

[Term level query `wildcard`](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-wildcard-query.html). Find all documents which have given field containing terms matching a wildcard expression (not analyzed).

```js
query: {
  user: {
    $wildcard: 'B*b';
  }
}
```

### $regexp

[Term level query `regexp`](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-regexp-query.html). Find all documents which have given field containing terms matching a regular expression (not analyzed).

```js
query: {
  user: {
    $regexp: 'Bo[xb]';
  }
}
```

### $exists

[Term level query `exists`](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-exists-query.html). Find all documents that have at least one non-null value in the original field (not analyzed).

```js
query: {
  $exists: ['phone', 'address'];
}
```

### $missing

The inverse of [`exists`](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-exists-query.html). Find all documents missing the specified field (not analyzed).

```js
query: {
  $missing: ['phone', 'address'];
}
```

### $match

[Full text query `match`](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query.html). Find all documents which have given given fields matching the specified value (analysed).

```js
query: {
  bio: {
    $match: 'javascript';
  }
}
```

### $phrase

[Full text query `match_phrase`](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query-phrase.html). Find all documents which have given given fields matching the specified phrase (analysed).

```js
query: {
  bio: {
    $phrase: 'I like JavaScript';
  }
}
```

### $phrase_prefix

[Full text query `match_phrase_prefix`](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-match-query-phrase-prefix.html). Find all documents which have given given fields matching the specified phrase prefix (analysed).

```js
query: {
  bio: {
    $phrase_prefix: 'I like JavaS';
  }
}
```

### $child

[Joining query `has_child`](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-has-child-query.html).
Find all documents which have children matching the query. The `$child` query is essentially a full-blown query of its own. The `$child` query requires `$type` property.

**Elasticsearch 6.0 change**

Prior to Elasticsearch 6.0, the `$type` parameter represents the child document type in the index. As of Elasticsearch 6.0, the `$type` parameter represents the child relationship name, as defined in the [join field](https://www.elastic.co/guide/en/elasticsearch/reference/6.0/parent-join.html).

```js
query: {
  $child: {
    $type: 'blog_tag',
    tag: 'something'
  }
}
```

### $parent

[Joining query `has_parent`](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-has-parent-query.html).
Find all documents which have parent matching the query. The `$parent` query is essentially a full-blown query of its own. The `$parent` query requires `$type` property.

**Elasticsearch 6.0 change**

Prior to Elasticsearch 6.0, the `$type` parameter represents the parent document type in the index. As of Elasticsearch 6.0, the `$type` parameter represents the parent relationship name, as defined in the [join field](https://www.elastic.co/guide/en/elasticsearch/reference/6.0/parent-join.html).

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

### $and

This operator does not translate directly to any Elasticsearch query, but it provides support for [Elasticsearch array datatype](https://www.elastic.co/guide/en/elasticsearch/reference/current/array.html).
Find all documents which match all of the given criteria. As any field in Elasticsearch can contain an array, therefore sometimes it is important to match more than one value per field.

```js
query: {
  $and: [{ notes: { $match: 'javascript' } }, { notes: { $match: 'project' } }];
}
```

There is also a shorthand version of `$and` for equality. For instance:

```js
query: {
  $and: [{ tags: 'javascript' }, { tags: 'react' }];
}
```

Can be also expressed as:

```js
query: {
  tags: ['javascript', 'react'];
}
```

### $sqs

[simple_query_string](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-simple-query-string-query.html). A query that uses the SimpleQueryParser to parse its context. Optional `$operator` which is set to `or` by default but can be set to `and` if required.

```js
query: {
  $sqs: {
    $fields: [
      'title^5',
      'description'
    ],
    $query: '+like +javascript',
    $operator: 'and'
  }
}
```

This can also be expressed in an URL as the following:

```http
http://localhost:3030/users?$sqs[$fields][]=title^5&$sqs[$fields][]=description&$sqs[$query]=+like +javascript&$sqs[$operator]=and
```

## Parent-child relationship

Elasticsearch supports parent-child relationship however it is not exactly the same as in relational databases. To make things even more interesting, the relationship principles were slightly different up to (version 5.6)[https://www.elastic.co/guide/en/elasticsearch/reference/5.6/mapping-parent-field.html] and from (version 6.0+)[https://www.elastic.co/guide/en/elasticsearch/reference/6.0/parent-join.html] onwards.

Even though Elasticsearch's API changed in that matter, feathers-elasticsearch offers consistent API across those changes. That is actually the main reason why the `esVersion` and `join` service options have been introduced (see the "Options" section of this manual). Having said that, it is important to notice that there are but subtle differences, which are outline below and in the description of `$parent` and `$child` queries.

### Overview

feathers-esx supports all CRUD operations for Elasticsearch types with parent mapping, and does that with the Elasticsearch constrains. Therefore:

- each operation concering a single document (create, get, patch, update, remove) is required to provide parent id
- creating documents in bulk (providing a list of documents) is the same as many single document operations, so parent id is required as well
- to avoid any doubts, none of the query based operations (find, bulk patch, bulk remove) can use the parent id

#### Elasticsearch <= 5.6

Parent id should be provided as part of the data for the create operations (single and bulk):

```javascript
postService.create({
  _id: 123,
  text: "JavaScript may be flawed, but it's better than Java anyway.",
});

commentService.create({
  _id: 1000,
  _parent: 123,
  text: 'You cannot be serious.',
});
```

Please note, that name of the parent property (`_parent` by default) is configurable through the service options, so that you can set it to whatever suits you.

For all other operations (get, patch, update, remove), the parent id should be provided as part of the query:

```javascript
childService.remove(1000, { query: { _parent: 123 } });
```

#### Elasticsearch >= 6.0

As the parent-child relationship changed in Elasticsearch 6.0, it is now expressed by the [join datatype](https://www.elastic.co/guide/en/elasticsearch/reference/6.0/parent-join.html). Everything said above about the parent id holds true, although there is one more detail to be taken into account - the relationship name.

Let's consider the following mapping:

```javascript
{
  mappings: {
    doc: {
      properties: {
        text: {
          type: 'text'
        },
        my_join_field: {
          type: 'join',
          relations: {
            post: 'comment'
          }
        }
      }
    }
  }
}
```

Parent id (for children) and relationship name (for children and parents) should be provided for as part of the data for the create operations (single and bulk):

```javascript
docService.create({
  _id: 123,
  text: "JavaScript may be flawed, but it's better than Java anyway.",
  my_join_field: 'post',
});

docService.create({
  _id: 1000,
  _parent: 123,
  text: 'You cannot be serious.',
  my_join_field: 'comment',
});
```

Please note, that name of the parent property ('\_parent' by default) and the join property (`undefined` by default) are configurable through the service options, so that you can set it to whatever suits you.

For all other operations (get, patch, update, remove), the parent id should be provided as part of the query:

```javascript
docService.remove(1000, { query: { _parent: 123 } });
```

## Supported Elasticsearch versions

feathers-esx is currently tested on Elasticsearch 5.0, 5.6, 6.6, 6.7, 6.8, 7.0 and 7.1 Please note, we have recently dropped support for version 2.4, as its life ended quite a while back. If you are still running Elasticsearch 2.4 and want to take advantage of feathers-elasticsearch, please use version 2.x of this package.

## Quirks

### Updating and deleting by query

Elasticsearch is special in many ways. For example, the ["update by query"](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-update-by-query.html) API is still considered experimental and so is the ["delete by query"](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-delete-by-query.html) API introduced in Elasticsearch 5.0.

Just to clarify - update in Elasticsearch is an equivalent to `patch` in feathers. I will use `patch` from now on, to set focus on the feathers side of the fence.

Considering the above, our implementation of path / remove by query uses combo of find and bulk patch / remove, which in turn means for you:

- Standard pagination is taken into account for patching / removing by query, so you have no guarantee that all existing documents matching your query will be patched / removed.
- The operation is a bit slower than it could potentially be, because of the two-step process involved.

Considering, however that elasticsearch is mainly used to dump data in it and search through it, I presume that should not be a great problem.

### Search visibility

Please be aware that search visibility of the changes (creates, updates, patches, removals) is going to be delayed due to Elasticsearch [`index.refresh_interval`](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html) setting. You may force refresh after each operation by setting the service option `elasticsearch.refresh` as decribed above but it is highly discouraged due to Elasticsearch performance implications.

### Full-text search

Currently feathers-esx supports most important full-text queries in their default form. Elasticsearch search allows additional parameters to be passed to each of those queries for fine-tuning. Those parameters can change behaviour and affect peformance of the queries therefore I believe they should not be exposed to the client. I am considering ways of adding them safely to the queries while retaining flexibility.

### Performance considerations

Most of the data mutating operations in Elasticsearch v5.0 (create, update, remove) do not return the full resulting document, therefore I had to resolve to using get as well in order to return complete data. This solution is of course adding a bit of an overhead, although it is also compliant with the standard behaviour expected of a feathers database adapter.

The conceptual solution for that is quite simple. This behaviour will be configurable through a `lean` switch allowing to get rid of those additional gets should they be not needed for your application. This feature will be added soon as well.

### Upsert capability

An `upsert` parameter is available for the `create` operation that will update the document if it exists already instead of throwing an error.

```javascript
postService.create(
  {
    _id: 123,
    text: "JavaScript may be flawed, but it's better than Ruby.",
  },
  {
    upsert: true,
  },
);
```

Additionally, an `upsert` parameter is also available for the `update` operation that will create the document if it doesn't exist instead of throwing an error.

```javascript
postService.update(
  123,
  {
    _id: 123,
    text: 'JavaScript may be flawed, but Feathers makes it fly.',
  },
  {
    upsert: true,
  },
);
```

## Contributing

If you find a bug or something to improve we will be happy to see your PR!

When adding a new feature, please make sure you write tests for it with decent coverage as well.

### Running tests locally

When you run the test locally, you need to set the Elasticsearch version you are testing against in an environmental variable `ES_VERSION` to tell the tests which schema it should set up. The value from this variable will be also used to determine the API version for the Elasticsearch client and the tested service.

If you want to all tests:

```bash
ES_VERSION=6.7.2 npm t
```

When you just want to run coverage:

```bash
ES_VERSION=6.7.2 npm run coverage
```

## License

Copyright (c) 2018

Licensed under the [MIT license](LICENSE).
