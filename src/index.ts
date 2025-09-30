import { ElasticAdapter } from './adapter';
import { ElasticsearchServiceOptions, ElasticsearchServiceParams } from './types';

// Types will be exported through module declaration

/**
 * Elasticsearch adapter service for FeathersJS
 * Provides full CRUD operations and special Elasticsearch query capabilities
 */
class Service extends ElasticAdapter {
  /**
   * Find multiple documents matching the query
   * @param params - Query parameters including filters, pagination, and special operators
   * @returns Promise resolving to array of documents or paginated result
   *
   * @example
   * // Basic find
   * service.find({ query: { status: 'active' } })
   *
   * @example
   * // With special operators
   * service.find({
   *   query: {
   *     name: { $match: 'john' },
   *     age: { $gte: 18 }
   *   }
   * })
   */
  async find(params?: ElasticsearchServiceParams) {
    return this._find(params);
  }

  /**
   * Get a single document by ID
   * @param id - Document ID
   * @param params - Additional query parameters
   * @returns Promise resolving to the document
   *
   * @example
   * service.get('doc123')
   */
  async get(id: any, params?: ElasticsearchServiceParams) {
    return this._get(id, params);
  }

  /**
   * Create a new document or multiple documents
   * @param data - Document data or array of documents for bulk creation
   * @param params - Additional parameters including upsert options
   * @returns Promise resolving to created document(s)
   *
   * @example
   * // Single document
   * service.create({ name: 'John', age: 30 })
   *
   * @example
   * // Bulk creation
   * service.create([
   *   { name: 'John', age: 30 },
   *   { name: 'Jane', age: 25 }
   * ])
   */
  async create(data: any, params?: ElasticsearchServiceParams) {
    return this._create(data, params);
  }

  /**
   * Update a document by replacing it entirely
   * @param id - Document ID
   * @param data - New document data
   * @param params - Additional parameters including upsert options
   * @returns Promise resolving to updated document
   *
   * @example
   * service.update('doc123', { name: 'John Updated', age: 31 })
   */
  async update(id: any, data: any, params?: ElasticsearchServiceParams) {
    return this._update(id, data, params);
  }

  /**
   * Patch a document or multiple documents with partial data
   * @param id - Document ID (null for bulk patch)
   * @param data - Partial data to merge
   * @param params - Query parameters for bulk patch
   * @returns Promise resolving to patched document(s)
   *
   * @example
   * // Single document patch
   * service.patch('doc123', { age: 32 })
   *
   * @example
   * // Bulk patch
   * service.patch(null, { status: 'archived' }, {
   *   query: { createdAt: { $lte: '2023-01-01' } }
   * })
   */
  async patch(id: any, data: any, params?: ElasticsearchServiceParams) {
    return this._patch(id, data, params);
  }

  /**
   * Remove a document or multiple documents
   * @param id - Document ID (null for bulk remove)
   * @param params - Query parameters for bulk remove
   * @returns Promise resolving to removed document(s)
   *
   * @example
   * // Single document removal
   * service.remove('doc123')
   *
   * @example
   * // Bulk removal
   * service.remove(null, {
   *   query: { status: 'deleted' }
   * })
   */
  async remove(id: any, params?: ElasticsearchServiceParams) {
    return this._remove(id, params);
  }

  /**
   * Execute raw Elasticsearch API methods
   * @param method - Elasticsearch method name (e.g., 'search', 'indices.getMapping')
   * @param params - Parameters to pass to the Elasticsearch method
   * @returns Promise resolving to raw Elasticsearch response
   *
   * @example
   * // Direct search
   * service.raw('search', {
   *   body: { query: { match_all: {} } }
   * })
   *
   * @example
   * // Index operations
   * service.raw('indices.getMapping')
   */
  async raw(method: string, params?: any) {
    return this._raw(method, params);
  }
}

/**
 * Creates a new Elasticsearch service instance
 * @param options - Service configuration options
 * @returns Configured Elasticsearch service
 *
 * @example
 * import { Client } from '@elastic/elasticsearch';
 * import service from 'feathers-elasticsearch';
 *
 * const esService = service({
 *   Model: new Client({ node: 'http://localhost:9200' }),
 *   index: 'my-index',
 *   id: 'id',
 *   paginate: { default: 10, max: 100 }
 * });
 */
function service(options: ElasticsearchServiceOptions) {
  return new Service(options);
}

// CommonJS compatible export
export = service
