// import { _ } from "@feathersjs/commons";
import { AdapterBase, filterQuery } from '@feathersjs/adapter-commons'
import { errors } from '@feathersjs/errors'
import { Client } from '@elastic/elasticsearch'
import {
  ElasticsearchServiceOptions,
  ElasticsearchServiceParams,
  ElasticAdapterInterface,
  SecurityConfig
} from './types'
import { errorHandler } from './error-handler'
import { DEFAULT_SECURITY_CONFIG } from './utils/security'
// const errors = require('@feathersjs/errors');
// const debug = makeDebug('feathers-elasticsearch');

import * as methods from './methods/index'

/**
 * Elasticsearch adapter for FeathersJS
 * Extends AdapterBase to provide full CRUD operations with Elasticsearch
 *
 * @class ElasticAdapter
 * @extends {AdapterBase}
 */
export class ElasticAdapter extends AdapterBase implements ElasticAdapterInterface {
  Model!: Client
  index!: string
  parent?: string
  routing?: string
  join?: string
  meta!: string
  esVersion?: string
  esParams?: Record<string, unknown>
  security!: Required<SecurityConfig>
  core: Record<string, unknown>

  /**
   * Creates an instance of ElasticAdapter
   * @param {ElasticsearchServiceOptions} options - Configuration options
   * @throws {Error} If options are invalid or Model is not provided
   */
  constructor(options: ElasticsearchServiceOptions) {
    if (typeof options !== 'object') {
      throw new Error('Elasticsearch options have to be provided')
    }

    if (!options || !options.Model) {
      throw new Error('Elasticsearch `Model` (client) needs to be provided')
    }

    const index = options.index || options.elasticsearch?.index
    if (!index) {
      throw new Error('Elasticsearch `index` needs to be provided')
    }

    // Merge esParams with defaults, allowing user-provided values to override
    const elasticsearchConfig = (options.elasticsearch && typeof options.elasticsearch === 'object' && !('client' in options.elasticsearch))
      ? options.elasticsearch as Record<string, unknown>
      : {}
    const esParams = Object.assign({ refresh: false }, elasticsearchConfig, options.esParams || {})

    super({
      id: '_id',
      parent: '_parent',
      routing: '_routing',
      meta: '_meta',
      esParams,
      index,
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
          return this.options[name]
        }
      })
    )

    // Initialize security configuration with defaults
    this.security = {
      ...DEFAULT_SECURITY_CONFIG,
      ...options.security
    }

    // BREAKING CHANGE: Disable $index filter by default for security
    // Users must explicitly enable it via security.allowedIndices
    if (this.security.allowedIndices.length === 0 && this.options.filters?.$index) {
      delete this.options.filters.$index
    }

    // Set up core methods reference
    this.core = {
      find: methods.find,
      get: methods.get
    }
  }

  /**
   * Filters and validates query parameters
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Object} Filtered query parameters with pagination settings
   */
  filterQuery(params: ElasticsearchServiceParams = {}) {
    const options = this.getOptions(params)
    const { filters, query } = filterQuery(params?.query || {}, options)

    if (!filters.$skip || isNaN(filters.$skip as number)) {
      filters.$skip = 0
    }

    if (typeof filters.$sort === 'object') {
      filters.$sort = Object.entries(filters.$sort).map(([key, val]) => ({
        [key]: (val as number) > 0 ? 'asc' : 'desc'
      }))
    }

    return { filters, query, paginate: options.paginate }
  }

  /**
   * Find multiple documents matching the query
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Promise} Array of documents or paginated result
   */
  // @ts-expect-error - Intentionally not matching all base class overloads
  async _find(
    params: ElasticsearchServiceParams = {}
  ): Promise<
    | Record<string, unknown>[]
    | { total: number; skip: number; limit: number; data: Record<string, unknown>[] }
  > {
    return methods.find(this, params).catch((error: Error) => {
      throw errorHandler(error, undefined)
    }) as Promise<
      | Record<string, unknown>[]
      | { total: number; skip: number; limit: number; data: Record<string, unknown>[] }
    >
  }

  /**
   * Get a single document by ID
   * @param {string|number} id - Document ID
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Promise} The document
   * @throws {NotFound} If document doesn't exist
   */
  _get(id: string | number, params: ElasticsearchServiceParams = {}): Promise<Record<string, unknown>> {
    return (methods.get(this, id, params) as Promise<Record<string, unknown>>).catch((error: Error) => {
      throw errorHandler(error, id)
    })
  }

  /**
   * Create one or more documents
   * @param {Object|Object[]} data - Document(s) to create
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Promise} Created document(s)
   * @throws {Conflict} If document with same ID already exists
   */
  // @ts-expect-error - Intentionally not matching all base class overloads
  _create(
    data: Record<string, unknown> | Record<string, unknown>[],
    params: ElasticsearchServiceParams = {}
  ): Promise<Record<string, unknown> | Record<string, unknown>[]> {
    // Check if we are creating single item.
    if (!Array.isArray(data)) {
      return methods.create(this, data, params).catch((error: Error) => {
        throw errorHandler(error, (data as Record<string, unknown>)[this.id] as string | number)
      }) as Promise<Record<string, unknown>>
    }

    // Handle empty array - return early to avoid invalid bulk request
    if (data.length === 0) {
      if (!this.allowsMulti('create', params)) {
        return Promise.reject(
          new errors.MethodNotAllowed('Can not create multiple entries')
        )
      }
      return Promise.resolve([])
    }

    if (!this.allowsMulti('create', params)) {
      return Promise.reject(
        new errors.MethodNotAllowed('Can not create multiple entries')
      )
    }

    return methods.createBulk(this, data, params).catch((error: Error) => {
      throw errorHandler(error)
    }) as Promise<Record<string, unknown>[]>
  }

  /**
   * Replace a document entirely
   * @param {string|number} id - Document ID
   * @param {Object} data - New document data
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Promise} Updated document
   * @throws {NotFound} If document doesn't exist
   */
  _update(id: string | number, data: Record<string, unknown>, params: ElasticsearchServiceParams = {}) {
    return methods.update(this, id, data, params).catch((error: Error) => {
      throw errorHandler(error, id)
    })
  }

  /**
   * Partially update one or more documents
   * @param {string|number|null} id - Document ID (null for bulk)
   * @param {Object} data - Fields to update
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Promise} Updated document(s)
   */
  // @ts-expect-error - Intentionally not matching all base class overloads
  _patch(
    id: string | number | null,
    data: Record<string, unknown>,
    params: ElasticsearchServiceParams = {}
  ): Promise<Record<string, unknown> | Record<string, unknown>[]> {
    // Check if we are patching single item.
    if (id !== null) {
      return methods.patch(this, id, data, params).catch((error: Error) => {
        throw errorHandler(error, id)
      }) as Promise<Record<string, unknown>>
    }

    if (!this.allowsMulti('patch', params)) {
      return Promise.reject(
        new errors.MethodNotAllowed('Can not patch multiple entries')
      )
    }

    return methods.patchBulk(this, data, params).catch((error: Error) => {
      throw errorHandler(error)
    }) as Promise<Record<string, unknown>[]>
  }

  /**
   * Remove one or more documents
   * @param {string|number|null} id - Document ID (null for bulk)
   * @param {ElasticsearchServiceParams} params - Query parameters
   * @returns {Promise} Removed document(s)
   */
  // @ts-expect-error - Intentionally not matching all base class overloads
  _remove(id: string | number | null, params: ElasticsearchServiceParams = {}) {
    if (id !== null) {
      return methods.remove(this, id, params).catch((error: Error) => {
        throw errorHandler(error, id)
      })
    }

    if (!this.allowsMulti('remove', params)) {
      return Promise.reject(
        new errors.MethodNotAllowed('Can not remove multiple entries')
      )
    }

    return methods.removeBulk(this, params).catch((error: Error) => {
      throw errorHandler(error)
    })
  }

  /**
   * Execute raw Elasticsearch API methods
   * @param {string} method - Elasticsearch method name
   * @param {ElasticsearchServiceParams} params - Method parameters
   * @returns {Promise} Raw Elasticsearch response
   */
  _raw(method: string, params: ElasticsearchServiceParams = {}) {
    return methods.raw(this, method, params).catch((error: Error) => {
      throw errorHandler(error)
    })
  }
}
