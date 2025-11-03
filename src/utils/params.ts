import { ElasticsearchServiceParams } from '../types'
import { removeProps } from './core'

/**
 * Prepares parameters for get operations by removing query and preserving other params
 * @param params - Service parameters
 * @param removeFields - Additional fields to remove from params
 * @returns Prepared parameters with normalized query
 */
export function prepareGetParams(
  params: ElasticsearchServiceParams = {},
  ...removeFields: string[]
): ElasticsearchServiceParams {
  return Object.assign(removeProps(params as Record<string, unknown>, 'query', ...removeFields), {
    query: params.query || {}
  }) as ElasticsearchServiceParams
}

/**
 * Extracts Elasticsearch-specific parameters from service params
 * @param params - Service parameters
 * @returns Elasticsearch parameters or empty object
 */
export function getESParams(params: ElasticsearchServiceParams = {}): Record<string, unknown> {
  return params.elasticsearch || {}
}

/**
 * Merges default ES params with request-specific params
 * @param defaultParams - Default parameters from service config
 * @param requestParams - Request-specific parameters
 * @returns Merged parameters
 */
export function mergeESParams(
  defaultParams: Record<string, unknown> = {},
  requestParams: Record<string, unknown> = {}
): Record<string, unknown> {
  return Object.assign({}, defaultParams, requestParams)
}

/**
 * Prepares routing parameter if parent is specified
 * @param params - Service parameters
 * @param parent - Parent field name
 * @param routing - Routing value
 * @returns Parameters with routing query if needed
 */
export function prepareRoutingParams(
  params: ElasticsearchServiceParams,
  parent?: string,
  routing?: string
): ElasticsearchServiceParams {
  if (routing !== undefined && parent) {
    return {
      ...params,
      query: Object.assign({}, params.query, { [parent]: routing })
    }
  }
  return params
}

/**
 * Merges ES params with per-operation overrides for refresh control
 * PERFORMANCE: Allows configurable refresh per operation instead of global setting
 * @param serviceEsParams - Service-level ES parameters
 * @param operationParams - Operation-specific parameters from request
 * @returns Merged parameters with refresh override if specified
 */
export function mergeESParamsWithRefresh(
  serviceEsParams: Record<string, unknown> = {},
  operationParams: ElasticsearchServiceParams = {}
): Record<string, unknown> {
  const merged = { ...serviceEsParams }

  // Allow per-operation refresh override
  if (operationParams.refresh !== undefined) {
    merged.refresh = operationParams.refresh
  }

  return merged
}
