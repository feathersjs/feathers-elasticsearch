// import { _ } from "@feathersjs/commons";
import { AdapterBase, filterQuery } from '@feathersjs/adapter-commons';

import { errors } from '@feathersjs/errors';
import { errorHandler } from './error-handler';
// const errors = require('@feathersjs/errors');
// const debug = makeDebug('feathers-elasticsearch');

import * as methods from './methods/index';

export class ElasticAdapter extends AdapterBase {
  core: any;

  constructor(options) {
    if (typeof options !== 'object') {
      throw new Error('Elasticsearch options have to be provided');
    }

    if (!options || !options.Model) {
      throw new Error('Elasticsearch `Model` (client) needs to be provided');
    }

    super({
      id: '_id',
      parent: '_parent',
      routing: '_routing',
      meta: '_meta',
      esParams: Object.assign({ refresh: false }, options.elasticsearch),
      // Extract index from elasticsearch config if not provided at top level
      index: options.index || options.elasticsearch?.index,
      ...options,
      filters: {
        ...options.filters,
        $routing: (val) => val,
        $all: (val) => val,
        $prefix: (val) => val,
        $wildcard: (val) => val,
        $regexp: (val) => val,
        $exists: (val) => val,
        $missing: (val) => val,
        $match: (val) => val,
        $phrase: (val) => val,
        $phrase_prefix: (val) => val,
        $sqs: (val) => val,
        $child: (val) => val,
        $parent: (val) => val,
        $nested: (val) => val,
        $and: (val) => val,
        $or: (val) => val,
        $fields: (val) => val,
        $path: (val) => val,
        $type: (val) => val,
        $query: (val) => val,
        $operator: (val) => val,
        $index: (val) => val,
      },
      operators: [
        ...(options.operators || []),
        '$prefix',
        '$wildcard',
        '$regexp',
        '$exists',
        '$missing',
        '$all',
        '$match',
        '$phrase',
        '$phrase_prefix',
        '$and',
        '$sqs',
        '$child',
        '$parent',
        '$nested',
        '$fields',
        '$path',
        '$type',
        '$query',
        '$operator',
        '$index',
      ],
    });

    // Alias getters for options
    ['Model', 'index', 'parent', 'meta', 'join', 'esVersion', 'esParams'].forEach((name) =>
      Object.defineProperty(this, name, {
        get() {
          return this.options[name];
        },
      })
    );

    // Set up core methods reference
    this.core = {
      find: methods.find,
      get: methods.get
    };
  }

  filterQuery(params: any = {}) {
    const options = this.getOptions(params);
    const { filters, query } = filterQuery((params as any)?.query || {}, options);

    if (!filters.$skip || isNaN(filters.$skip)) {
      filters.$skip = 0;
    }

    if (typeof filters.$sort === 'object') {
      filters.$sort = Object.entries(filters.$sort).map(([key, val]) => ({
        [key]: val > 0 ? 'asc' : 'desc',
      }));
    }

    return { filters, query, paginate: options.paginate };
  }

  // GET
  _find(params = {}) {
    return methods.find(this, params).catch((error) => errorHandler(error, undefined));
  }

  // GET
  _get(id, params = {}) {
    return methods.get(this, id, params).catch((error) => errorHandler(error, id));
  }

  // POST
  // Supports single and bulk creation, with or without id specified.
  _create(data, params = {}) {
    // Check if we are creating single item.
    if (!Array.isArray(data)) {
      return methods
        .create(this, data, params)
        .catch((error) => errorHandler(error, data[this.id]));
    }

    return methods.createBulk(this, data, params).catch(errorHandler);
  }

  // PUT
  // Supports single item update.
  _update(id, data, params = {}) {
    return methods.update(this, id, data, params).catch((error) => errorHandler(error, id));
  }

  // PATCH
  // Supports single and bulk patching.
  _patch(id, data, params = {}) {
    // Check if we are patching single item.
    if (id !== null) {
      return methods.patch(this, id, data, params).catch((error) => errorHandler(error, id));
    }

    return methods.patchBulk(this, data, params).catch(errorHandler);
  }

  // DELETE
  // Supports single and bulk removal.
  _remove(id, params = {}) {
    if (id !== null) {
      return methods.remove(this, id, params).catch((error) => errorHandler(error, id));
    }

    return methods.removeBulk(this, params).catch(errorHandler);
  }

  // RAW
  _raw(method, params = {}) {
    return methods.raw(this, method, params).catch(errorHandler);
  }
}
