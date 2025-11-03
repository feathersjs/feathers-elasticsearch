'use strict';

import { removeProps } from './core';
import { ESSearchResponse, ESHit, ESBulkResponseItem } from '../types';

export * from './core';
export * from './parse-query';
export * from './params';
export { ESSearchResponse, ESHit, ESBulkResponseItem } from '../types';

/**
 * Maps Elasticsearch find results to Feathers format
 * @param results - Raw Elasticsearch search response
 * @param idProp - Property name for document ID
 * @param metaProp - Property name for metadata
 * @param joinProp - Property name for join field
 * @param filters - Query filters
 * @param hasPagination - Whether pagination is enabled
 * @returns Formatted results (array or paginated object)
 */
export function mapFind<T = Record<string, unknown>>(
  results: ESSearchResponse<T>,
  idProp: string,
  metaProp: string,
  joinProp?: string,
  filters?: Record<string, unknown>,
  hasPagination?: boolean
): T[] | { total: number; skip: number; limit: number; data: T[] } {
  const data = results.hits.hits.map((result) => mapGet(result, idProp, metaProp, joinProp));

  if (hasPagination) {
    const total = typeof results.hits.total === 'object' ? results.hits.total.value : results.hits.total;

    return {
      total,
      skip: (filters?.$skip as number) || 0,
      limit: (filters?.$limit as number) || 0,
      data
    };
  }

  return data;
}

/**
 * Maps a single Elasticsearch document to Feathers format
 * @param item - Raw Elasticsearch hit
 * @param idProp - Property name for document ID
 * @param metaProp - Property name for metadata
 * @param joinProp - Property name for join field
 * @returns Formatted document
 */
export function mapGet<T = Record<string, unknown>>(
  item: ESHit<T>,
  idProp: string,
  metaProp: string,
  joinProp?: string
): T & Record<string, unknown> {
  return mapItem(item, idProp, metaProp, joinProp);
}

/**
 * Maps a patched Elasticsearch document to Feathers format
 * @param item - Raw Elasticsearch update response
 * @param idProp - Property name for document ID
 * @param metaProp - Property name for metadata
 * @param joinProp - Property name for join field
 * @returns Formatted document
 */
export function mapPatch<T = Record<string, unknown>>(
  item: Record<string, unknown>,
  idProp: string,
  metaProp: string,
  joinProp?: string
): T & Record<string, unknown> {
  const normalizedItem = removeProps(item, 'get');

  const itemWithGet = item as { get?: { _source?: unknown } };
  normalizedItem._source = itemWithGet.get && itemWithGet.get._source;

  return mapItem(normalizedItem, idProp, metaProp, joinProp);
}

/**
 * Maps bulk operation results to Feathers format
 * @param items - Array of bulk operation responses
 * @param idProp - Property name for document ID
 * @param metaProp - Property name for metadata
 * @param joinProp - Property name for join field
 * @returns Array of formatted documents
 */
export function mapBulk<T = Record<string, unknown>>(
  items: ESBulkResponseItem[],
  idProp: string,
  metaProp: string,
  joinProp?: string
): Array<T & Record<string, unknown>> {
  return items.map((item) => {
    if (item.update) {
      return mapPatch(item.update as unknown as Record<string, unknown>, idProp, metaProp, joinProp);
    }

    const operation = item.create || item.index || item.delete;
    if (operation) {
      return mapItem(operation as unknown as ESHit<T>, idProp, metaProp, joinProp);
    }
    return {} as T & Record<string, unknown>;
  });
}

/**
 * Internal function to map Elasticsearch item to Feathers format
 * @param item - Raw Elasticsearch item
 * @param idProp - Property name for document ID
 * @param metaProp - Property name for metadata
 * @param joinProp - Property name for join field
 * @returns Formatted document
 */
export function mapItem<T = Record<string, unknown>>(
  item: ESHit<T> | Record<string, unknown>,
  idProp: string,
  metaProp: string,
  joinProp?: string
): T & Record<string, unknown> {
  const meta = removeProps(item as Record<string, unknown>, '_source');
  const itemWithSource = item as { _source?: unknown };
  const result: Record<string, unknown> = Object.assign({ [metaProp]: meta }, itemWithSource._source);

  const metaWithId = meta as { _id?: unknown };
  if (metaWithId._id !== undefined) {
    result[idProp] = metaWithId._id;
  }

  if (joinProp && result[joinProp] && typeof result[joinProp] === 'object') {
    const joinValue = result[joinProp] as { parent?: string; name?: string };
    const metaObj = result[metaProp] as Record<string, unknown>;
    metaObj._parent = joinValue.parent;
    result[joinProp] = joinValue.name;
  }

  return result as T & Record<string, unknown>;
}
