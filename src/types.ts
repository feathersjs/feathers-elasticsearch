import { AdapterParams, PaginationOptions } from '@feathersjs/adapter-commons'
import { Client } from '@elastic/elasticsearch'
import type {
  SearchRequest,
  SearchResponse,
  GetRequest,
  GetResponse,
  IndexRequest,
  IndexResponse,
  UpdateRequest,
  UpdateResponse,
  DeleteRequest,
  DeleteResponse,
  BulkRequest,
  BulkResponse,
  MgetRequest,
  MgetResponse
} from '@elastic/elasticsearch/lib/api/types'
import type { SecurityConfig } from './utils/security'

// Re-export commonly used ES types
export type {
  SearchRequest,
  SearchResponse,
  GetRequest,
  GetResponse,
  IndexRequest,
  IndexResponse,
  UpdateRequest,
  UpdateResponse,
  DeleteRequest,
  DeleteResponse,
  BulkRequest,
  BulkResponse,
  MgetRequest,
  MgetResponse
}

// Error Types
export interface ElasticsearchErrorMeta {
  body?: {
    error?: {
      type?: string
      reason?: string
      caused_by?: {
        type: string
        reason: string
      }
      root_cause?: Array<{
        type: string
        reason: string
      }>
      failures?: Array<Record<string, unknown>>
    }
    status?: number
  }
  statusCode?: number
  headers?: Record<string, string>
}

export interface ElasticsearchError extends Error {
  name: string
  statusCode?: number
  status?: number
  meta?: ElasticsearchErrorMeta
}

// Document Types
export interface DocumentMeta {
  _index: string
  _id: string
  _version: number
  _seq_no: number
  _primary_term: number
  found?: boolean
  _routing?: string
  _parent?: string
}

export interface ElasticsearchDocument {
  [key: string]: unknown
  _meta?: DocumentMeta
  id?: string | number
}

// Elasticsearch Response Types (for backward compatibility and convenience)
export interface ESHit<T = Record<string, unknown>> {
  _id: string
  _index: string
  _source: T
  _version?: number
  _score?: number
  _routing?: string
  _parent?: string
  _type?: string
  _seq_no?: number
  _primary_term?: number
  found?: boolean
}

export interface ESSearchResponse<T = Record<string, unknown>> {
  hits: {
    hits: ESHit<T>[]
    total: number | { value: number; relation: string }
    max_score?: number
  }
  took?: number
  timed_out?: boolean
  _shards?: {
    total: number
    successful: number
    skipped: number
    failed: number
  }
}

export interface ESBulkResponseItem {
  index?: ESBulkOperation
  create?: ESBulkOperation
  update?: ESBulkOperation
  delete?: ESBulkOperation
}

export interface ESBulkOperation {
  _id: string
  _index: string
  _version?: number
  result?: string
  status: number
  error?: {
    type: string
    reason: string
  }
  _seq_no?: number
  _primary_term?: number
  get?: {
    _source?: Record<string, unknown>
  }
}

export interface ESBulkResponse {
  took: number
  errors: boolean
  items: ESBulkResponseItem[]
}

export interface ESGetResponse<T = Record<string, unknown>> {
  _id: string
  _index: string
  _source?: T
  _version?: number
  _seq_no?: number
  _primary_term?: number
  found: boolean
  _routing?: string
}

export interface ESMGetResponse<T = Record<string, unknown>> {
  docs: ESGetResponse<T>[]
}

export interface ESUpdateResponse {
  _id: string
  _index: string
  _version: number
  result: string
  _shards: {
    total: number
    successful: number
    failed: number
  }
  _seq_no: number
  _primary_term: number
  get?: {
    _source?: Record<string, unknown>
  }
}

export interface ESDeleteResponse {
  _id: string
  _index: string
  _version: number
  result: string
  _shards: {
    total: number
    successful: number
    failed: number
  }
  _seq_no: number
  _primary_term: number
}

// Query Types
export type QueryClause = Record<string, unknown>

export interface ESQuery {
  must?: QueryClause[]
  filter?: QueryClause[]
  should?: QueryClause[]
  must_not?: QueryClause[]
  minimum_should_match?: number
}

export type ScalarValue = string | number | boolean | null
export type ArrayValue = ScalarValue[]
export type QueryValue = ScalarValue | ArrayValue | Record<string, unknown>

export interface QueryOperators {
  $nin?: ArrayValue
  $in?: ArrayValue
  $gt?: ScalarValue
  $gte?: ScalarValue
  $lt?: ScalarValue
  $lte?: ScalarValue
  $ne?: ScalarValue
  $prefix?: string
  $wildcard?: string
  $regexp?: string
  $match?: string | Record<string, unknown>
  $phrase?: string | Record<string, unknown>
  $phrase_prefix?: string | Record<string, unknown>
  $or?: QueryValue[]
  $and?: QueryValue[]
  $all?: boolean
  $sqs?: SQSQuery
  $nested?: NestedQuery
  $exists?: string[]
  $missing?: string[]
  $child?: ChildParentQuery
  $parent?: ChildParentQuery
}

export interface SQSQuery {
  $fields: string[]
  $query: string
  $operator?: string
}

export interface NestedQuery {
  $path: string
  [key: string]: QueryValue
}

export interface ChildParentQuery {
  $type: string
  [key: string]: QueryValue
}

// Service Types
export interface ElasticsearchServiceOptions {
  Model: Client
  elasticsearch?: Client | { index?: string }
  index?: string
  id?: string
  parent?: string
  routing?: string
  join?: string
  meta?: string
  esVersion?: string
  esParams?: Record<string, unknown>
  multi?: boolean
  whitelist?: string[]
  paginate?: PaginationOptions
  filters?: Record<string, (val: unknown) => unknown>
  operators?: string[]
  security?: SecurityConfig
  events?: string[]
}

export interface ElasticsearchServiceParams extends AdapterParams {
  query?: Record<string, QueryValue> & QueryOperators
  elasticsearch?: Record<string, unknown>
  upsert?: boolean
  lean?: boolean // Skip fetching full documents after bulk operations (performance optimization)
  refresh?: boolean | 'wait_for' // Control when index refresh happens
}

export interface DocDescriptor {
  id?: string
  parent?: string
  routing?: string
  join?: Record<string, unknown>
  doc: Record<string, unknown>
}

// Method Signatures
export interface ElasticAdapterInterface {
  Model: Client
  index: string
  id: string
  parent?: string
  routing?: string
  join?: string
  meta: string
  esVersion?: string
  esParams?: Record<string, unknown>
  security: Required<SecurityConfig>
  core?: Record<string, unknown>
  filterQuery: (params: ElasticsearchServiceParams) => {
    filters: Record<string, unknown>
    query: Record<string, unknown>
    paginate?: PaginationOptions | false
  }
  _find: (params?: ElasticsearchServiceParams) => Promise<unknown>
  _get: (id: string | number, params?: ElasticsearchServiceParams) => Promise<unknown>
  _create: (
    data: Record<string, unknown> | Record<string, unknown>[],
    params?: ElasticsearchServiceParams
  ) => Promise<unknown>
}

export type ElasticsearchMethod<T = unknown> = (
  service: ElasticAdapterInterface,
  data: Record<string, unknown> | Record<string, unknown>[],
  params?: ElasticsearchServiceParams
) => Promise<T>

// Re-export SecurityConfig for convenience
export type { SecurityConfig } from './utils/security'

// Utility Types
export type ValidatorType =
  | 'number'
  | 'string'
  | 'boolean'
  | 'undefined'
  | 'null'
  | 'NaN'
  | 'object'
  | 'array'

export interface CachedQuery {
  query: Record<string, QueryValue>
  result: ESQuery | null
}

// Result Types
export interface PaginatedResult<T = Record<string, unknown>> {
  total: number
  limit: number
  skip: number
  data: T[]
}

export type ServiceResult<T = Record<string, unknown>> = T | T[] | PaginatedResult<T>

// Adapter Types
export interface AdapterOptions extends Omit<ElasticsearchServiceOptions, 'multi'> {
  events?: string[]
  multi?: boolean | string[]
  filters?: Record<string, (val: unknown) => unknown>
  operators?: string[]
}

// Bulk Operation Types
export interface BulkOperation {
  action: 'index' | 'create' | 'update' | 'delete'
  id?: string
  data?: Record<string, unknown>
  params?: Record<string, unknown>
}

export interface BulkResult<T = Record<string, unknown>> {
  items: T[]
  errors?: Array<Record<string, unknown>>
  raw?: ESBulkResponse
}
