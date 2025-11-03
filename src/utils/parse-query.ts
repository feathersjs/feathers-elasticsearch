'use strict'

import { ESQuery } from '../types'
import { getType, validateType } from './core'
import { errors } from '@feathersjs/errors'
import { $or, $and, $all, $sqs, $nested, $childOr$parent, $existsOr$missing } from './query-handlers/special'
import { processCriteria, processTermQuery } from './query-handlers/criteria'
import { createHash } from 'crypto'

// Content-based query cache for performance
// Uses Map with hash keys for better hit rate vs WeakMap with object references
const queryCache = new Map<string, { result: ESQuery | null; timestamp: number }>()
const CACHE_MAX_SIZE = 1000
const CACHE_MAX_AGE = 5 * 60 * 1000 // 5 minutes

/**
 * Recursively sort object keys for deterministic JSON serialization
 * @param obj - Object to normalize
 * @returns Normalized object with sorted keys
 */
function normalizeObject(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(normalizeObject)
  }

  const sorted: Record<string, unknown> = {}
  Object.keys(obj as object)
    .sort()
    .forEach((key) => {
      sorted[key] = normalizeObject((obj as Record<string, unknown>)[key])
    })

  return sorted
}

/**
 * Generate a stable hash for a query object
 * @param query - Query object to hash
 * @param idProp - ID property name
 * @returns Hash string
 */
function hashQuery(query: Record<string, unknown>, idProp: string): string {
  // Create deterministic string representation with deep key sorting
  const normalized = JSON.stringify(normalizeObject(query))
  return createHash('sha256').update(`${normalized}:${idProp}`).digest('hex').slice(0, 16)
}

/**
 * Clean expired cache entries
 */
function cleanCache(): void {
  const now = Date.now()
  const toDelete: string[] = []

  for (const [key, entry] of queryCache.entries()) {
    if (now - entry.timestamp > CACHE_MAX_AGE) {
      toDelete.push(key)
    }
  }

  toDelete.forEach((key) => queryCache.delete(key))

  // If still over max size, remove oldest entries
  if (queryCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(queryCache.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp)

    const toRemove = entries.slice(0, queryCache.size - CACHE_MAX_SIZE)
    toRemove.forEach(([key]) => queryCache.delete(key))
  }
}

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
}

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
  validateType(query, 'query', ['object', 'null', 'undefined'])

  if (query === null || query === undefined) {
    return null
  }

  // Check content-based cache first (only for root level queries)
  if (currentDepth === 0) {
    const cacheKey = hashQuery(query, idProp)
    const cached = queryCache.get(cacheKey)

    if (cached) {
      // Return cached result (deep clone to prevent mutations)
      return cached.result ? JSON.parse(JSON.stringify(cached.result)) : null
    }
  }

  // Validate query depth to prevent stack overflow attacks
  if (currentDepth > maxDepth) {
    throw new errors.BadRequest(`Query nesting exceeds maximum depth of ${maxDepth}`)
  }

  // Periodically clean cache (every ~100 queries)
  if (currentDepth === 0 && Math.random() < 0.01) {
    cleanCache()
  }

  const bool = Object.entries(query).reduce((result: ESQuery, [key, value]) => {
    const type = getType(value)

    // The search can be done by ids as well.
    // We need to translate the id prop used by the app to the id prop used by Es.
    if (key === idProp) {
      key = '_id'
    }

    // Handle special query operators
    if (specialQueryHandlers[key]) {
      return specialQueryHandlers[key](value, result, idProp, maxDepth, currentDepth)
    }

    validateType(value, key, ['number', 'string', 'boolean', 'undefined', 'object', 'array'])

    // Handle primitive values and arrays
    if (type !== 'object') {
      return processTermQuery(key, value, result)
    }

    // Handle criteria operators
    return processCriteria(key, value as Record<string, unknown>, result)
  }, {})

  const queryResult = Object.keys(bool).length ? bool : null

  // Cache the result (only for root level queries)
  if (currentDepth === 0) {
    const cacheKey = hashQuery(query, idProp)
    queryCache.set(cacheKey, {
      result: queryResult,
      timestamp: Date.now()
    })
  }

  return queryResult
}
