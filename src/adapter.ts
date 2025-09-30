// import { _ } from "@feathersjs/commons";
import { AdapterBase, filterQuery } from '@feathersjs/adapter-commons';
import { Client } from '@elastic/elasticsearch';
import { ElasticsearchServiceOptions, ElasticsearchServiceParams, ElasticAdapterInterface } from './types';
import { errorHandler } from './error-handler';
// const errors = require('@feathersjs/errors');
// const debug = makeDebug('feathers-elasticsearch');

import * as methods from './methods/index';

/**
 * Elasticsearch adapter for FeathersJS
 * Extends AdapterBase to provide full CRUD operations with Elasticsearch
 *
 * @class ElasticAdapter
 * @extends {AdapterBase}
 */
export class ElasticAdapter extends AdapterBase implements ElasticAdapterInterface {
  Model!: Client;
  index?: string;
  parent?: string;
  routing?: string;
  join?: string;
  meta?: string;
  esVersion?: string;
  esParams?: Record<string, unknown>;
  core: Record<string, unknown>;

  /**
   * Creates an instance of ElasticAdapter
   * @param {ElasticsearchServiceOptions} options - Configuration options
   * @throws {Error} If options are invalid or Model is not provided
   */
  constructor(options: ElasticsearchServiceOptions) {
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
      esParams: Object.assign({ refresh: false }, options.esParams || options.elasticsearch),
      // Extract index from elasticsearch config if not provided at top level
      index: options.index || options.elasticsearch?.index,
      ...options,
      filters: {
        ...options.filters,
        $routing: (val: unknown) => val,
        $all: (val: unknown) => val,
        $prefix: (val: unknown) => val,
        $wildcard: (val: unknown) => val,
        $regexp: (val: unknown) => val,
        $exists: (val: unknown) => val,
        $missing: (val: unknown) => val,
        $match: (val: unknown) => val,
        $phrase: (val: unknown) => val,
        $phrase_prefix: (val: unknown) => val,
        $sqs: (val: unknown) => val,
        $child: (val: unknown) => val,
        $parent: (val: unknown) => val,
        $nested: (val: unknown) => val,
        $and: (val: unknown) => val,
        $or: (val: unknown) => val,
        $fields: (val: unknown) => val,
        $path: (val: unknown) => val,
        $type: (val: unknown) => val,
        $query: (val: unknown) => val,
        $operator: (val: unknown) => val,
        $index: (val: unknown) => val
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
        '$index'
      ]
    })

    // Alias getters for options
    ;['Model', 'index', 'parent', 'meta', 'join', 'esVersion', 'esParams'].forEach((name) =>
      Object.defineProperty(this, name, {
        get() {
          return this.options[name];
        }
      })
    );

    // Set up core methods reference
    this.core = {
      find: methods.find,
      get: methods.get
    };
  }

  /**
   * Filters and validates query parameters
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Object} Filtered query parameters with pagination settings
   */
  filterQuery(params: ElasticsearchServiceParams = {}) {
    const options = this.getOptions(params);
    const { filters, query } = filterQuery((params as any)?.query || {}, options);

    if (!filters.$skip || isNaN(filters.$skip)) {
      filters.$skip = 0;
    }

    if (typeof filters.$sort === 'object') {
      filters.$sort = Object.entries(filters.$sort).map(([key, val]) => ({
        [key]: (val as number) > 0 ? 'asc' : 'desc'
      }));
    }

    return { filters, query, paginate: options.paginate };
  }

  /**
   * Find multiple documents matching the query
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Promise} Array of documents or paginated result
   */
  async _find(params: ElasticsearchServiceParams = {}): Promise<any> {
    return methods.find(this, params).catch((error: any) => {
      throw errorHandler(error, undefined);
    });
  }

  /**
   * Get a single document by ID
   * @param {string|number} id - Document ID
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Promise} The document
   * @throws {NotFound} If document doesn't exist
   */
  _get(id: any, params: ElasticsearchServiceParams = {}) {
    return methods.get(this, id, params).catch((error: any) => {
      throw errorHandler(error, id);
    });
  }

  /**
   * Create one or more documents
   * @param {Object|Object[]} data - Document(s) to create
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Promise} Created document(s)
   * @throws {Conflict} If document with same ID already exists
   */
  _create(data: any, params: ElasticsearchServiceParams = {}) {
    // Check if we are creating single item.
    if (!Array.isArray(data)) {
      return methods.create(this, data, params).catch((error: any) => {
        throw errorHandler(error, data[this.id]);
      });
    }

    return methods.createBulk(this, data, params).catch((error: any) => {
      throw errorHandler(error);
    });
  }

  /**
   * Replace a document entirely
   * @param {string|number} id - Document ID
   * @param {Object} data - New document data
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Promise} Updated document
   * @throws {NotFound} If document doesn't exist
   */
  _update(id: any, data: any, params: ElasticsearchServiceParams = {}) {
    return methods.update(this, id, data, params).catch((error: any) => {
      throw errorHandler(error, id);
    });
  }

  /**
   * Partially update one or more documents
   * @param {string|number|null} id - Document ID (null for bulk)
   * @param {Object} data - Fields to update
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Promise} Updated document(s)
   */
  _patch(id: any, data: any, params: ElasticsearchServiceParams = {}) {
    // Check if we are patching single item.
    if (id !== null) {
      return methods.patch(this, id, data, params).catch((error: any) => {
        throw errorHandler(error, id);
      });
    }

    return methods.patchBulk(this, data, params).catch((error: any) => {
      throw errorHandler(error);
    });
  }

  /**
   * Remove one or more documents
   * @param {string|number|null} id - Document ID (null for bulk)
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Promise} Removed document(s)
   */
  _remove(id: any, params: ElasticsearchServiceParams = {}) {
    if (id !== null) {
      return methods.remove(this, id, params).catch((error: any) => {
        throw errorHandler(error, id);
      });
    }

    return methods.removeBulk(this, params).catch((error: any) => {
      throw errorHandler(error);
    });
  }

  /**
   * Execute raw Elasticsearch API methods
   * @param {string} method - Elasticsearch method name
   * @param {ElasticsearchServiceParams} params - Method parameters
   * @returns {Promise} Raw Elasticsearch response
   */
  _raw(method: any, params: ElasticsearchServiceParams = {}) {
    return methods.raw(this, method, params).catch((error: any) => {
      throw errorHandler(error);
    });
  }
}
