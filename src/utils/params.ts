import { ElasticsearchServiceParams } from '../types';
import { removeProps } from './core';

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
  }) as ElasticsearchServiceParams;
}

/**
 * Extracts Elasticsearch-specific parameters from service params
 * @param params - Service parameters
 * @returns Elasticsearch parameters or empty object
 */
export function getESParams(params: ElasticsearchServiceParams = {}): Record<string, any> {
  return params.elasticsearch || {};
}

/**
 * Merges default ES params with request-specific params
 * @param defaultParams - Default parameters from service config
 * @param requestParams - Request-specific parameters
 * @returns Merged parameters
 */
export function mergeESParams(
  defaultParams: Record<string, any> = {},
  requestParams: Record<string, any> = {}
): Record<string, any> {
  return Object.assign({}, defaultParams, requestParams);
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
    };
  }
  return params;
}
