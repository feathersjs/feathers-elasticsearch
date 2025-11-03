'use strict';

import { ESQuery, CachedQuery } from '../types';
import { getType, validateType } from './core';
import { errors } from '@feathersjs/errors';
import { $or, $and, $all, $sqs, $nested, $childOr$parent, $existsOr$missing } from './query-handlers/special';
import { processCriteria, processTermQuery } from './query-handlers/criteria';

// Query cache for performance
const queryCache = new WeakMap<Record<string, unknown>, CachedQuery>();

type QueryHandler = (
  value: unknown,
  esQuery: ESQuery,
  idProp: string,
  maxDepth: number,
  currentDepth: number
) => ESQuery

/**
 * Special query handlers mapped to their functions
 */
const specialQueryHandlers: Record<string, QueryHandler> = {
  $or: $or as QueryHandler,
  $and: $and as QueryHandler,
  $all: $all as QueryHandler,
  $sqs: $sqs as QueryHandler,
  $nested: (value: unknown, esQuery: ESQuery, idProp: string, maxDepth: number, currentDepth: number) =>
    $nested(value as never, esQuery, idProp, maxDepth, currentDepth),
  $exists: (value: unknown, esQuery: ESQuery, idProp: string, maxDepth: number, currentDepth: number) =>
    $existsOr$missing('must', value as never, esQuery, idProp, maxDepth, currentDepth),
  $missing: (value: unknown, esQuery: ESQuery, idProp: string, maxDepth: number, currentDepth: number) =>
    $existsOr$missing('must_not', value as never, esQuery, idProp, maxDepth, currentDepth),
  $child: (value: unknown, esQuery: ESQuery, idProp: string, maxDepth: number, currentDepth: number) =>
    $childOr$parent('$child', value as never, esQuery, idProp, maxDepth, currentDepth),
  $parent: (value: unknown, esQuery: ESQuery, idProp: string, maxDepth: number, currentDepth: number) =>
    $childOr$parent('$parent', value as never, esQuery, idProp, maxDepth, currentDepth)
};

/**
 * Parses a query object into Elasticsearch bool query format
 * @param query - The query object to parse
 * @param idProp - The property name used as document ID
 * @param maxDepth - Maximum allowed query nesting depth (for security)
 * @param currentDepth - Current nesting depth (for recursion)
 * @returns Parsed Elasticsearch query or null if empty
 */
export function parseQuery(
  query: Record<string, unknown>,
  idProp: string,
  maxDepth: number = 50,
  currentDepth: number = 0
): ESQuery | null {
  validateType(query, 'query', ['object', 'null', 'undefined']);

  if (query === null || query === undefined) {
    return null;
  }

  // Check cache first
  const cached = queryCache.get(query);
  if (cached && cached.query === query) {
    return cached.result;
  }

  // Validate query depth to prevent stack overflow attacks
  if (currentDepth > maxDepth) {
    throw new errors.BadRequest(`Query nesting exceeds maximum depth of ${maxDepth}`);
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
      return specialQueryHandlers[key](value, result, idProp, maxDepth, currentDepth);
    }

    validateType(value, key, ['number', 'string', 'boolean', 'undefined', 'object', 'array']);

    // Handle primitive values and arrays
    if (type !== 'object') {
      return processTermQuery(key, value, result);
    }

    // Handle criteria operators
    return processCriteria(key, value as Record<string, unknown>, result);
  }, {});

  const queryResult = Object.keys(bool).length ? bool : null;

  // Cache the result
  queryCache.set(query, { query: query as never, result: queryResult });

  return queryResult;
}
