'use strict';

import { ESQuery, CachedQuery } from '../types';
import { getType, validateType } from './core';
import {
  $or,
  $and,
  $all,
  $sqs,
  $nested,
  $childOr$parent,
  $existsOr$missing
} from './query-handlers/special';
import { processCriteria, processTermQuery } from './query-handlers/criteria';

// Query cache for performance
const queryCache = new WeakMap<any, CachedQuery>();

/**
 * Special query handlers mapped to their functions
 */
const specialQueryHandlers: Record<string, Function> = {
  $or,
  $and,
  $all,
  $sqs,
  $nested: (value: any, esQuery: ESQuery, idProp: string) => $nested(value, esQuery, idProp),
  $exists: (value: any, esQuery: ESQuery) => $existsOr$missing('must', value, esQuery),
  $missing: (value: any, esQuery: ESQuery) => $existsOr$missing('must_not', value, esQuery),
  $child: (value: any, esQuery: ESQuery, idProp: string) => $childOr$parent('$child', value, esQuery, idProp),
  $parent: (value: any, esQuery: ESQuery, idProp: string) => $childOr$parent('$parent', value, esQuery, idProp),
};

/**
 * Parses a query object into Elasticsearch bool query format
 * @param query - The query object to parse
 * @param idProp - The property name used as document ID
 * @returns Parsed Elasticsearch query or null if empty
 */
export function parseQuery(query: any, idProp: string): ESQuery | null {
  validateType(query, 'query', ['object', 'null', 'undefined']);

  if (query === null || query === undefined) {
    return null;
  }

  // Check cache first
  const cached = queryCache.get(query);
  if (cached && cached.query === query) {
    return cached.result;
  }

  const bool = Object.entries(query).reduce((result: ESQuery, [key, value]) => {
    const type = getType(value);

    // The search can be done by ids as well.
    // We need to translate the id prop used by the app to the id prop used by Es.
    if (key === idProp) {
      key = '_id';
    }

    // Handle special query operators
    if (specialQueryHandlers[key]) {
      return specialQueryHandlers[key](value, result, idProp);
    }

    validateType(value, key, ['number', 'string', 'boolean', 'undefined', 'object', 'array']);
    
    // Handle primitive values and arrays
    if (type !== 'object') {
      return processTermQuery(key, value, result);
    }

    // Handle criteria operators
    return processCriteria(key, value as Record<string, any>, result);
  }, {});

  const queryResult = Object.keys(bool).length ? bool : null;

  // Cache the result
  queryCache.set(query, { query, result: queryResult });

  return queryResult;
}