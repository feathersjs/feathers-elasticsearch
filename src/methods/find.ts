'use strict'

import { parseQuery, mapFind } from '../utils/index'
import { validateQueryComplexity } from '../utils/security'
import { ElasticsearchServiceParams, ElasticAdapterInterface, SearchRequest } from '../types'

export function find(service: ElasticAdapterInterface, params: ElasticsearchServiceParams) {
  const { filters, query, paginate } = service.filterQuery(params)

  // PERFORMANCE: Validate query complexity budget
  validateQueryComplexity(query, service.security.maxQueryComplexity)

  // Move Elasticsearch-specific operators from filters back to query for parseQuery
  const esOperators = [
    '$all',
    '$prefix',
    '$wildcard',
    '$regexp',
    '$exists',
    '$missing',
    '$match',
    '$phrase',
    '$phrase_prefix',
    '$sqs',
    '$child',
    '$parent',
    '$nested',
    '$and',
    '$or'
  ]

  const enhancedQuery = { ...query }
  esOperators.forEach((op) => {
    if (filters[op] !== undefined) {
      enhancedQuery[op] = filters[op]
      delete filters[op]
    }
  })

  // Parse query with security-enforced max depth
  let esQuery = parseQuery(enhancedQuery, service.id, service.security.maxQueryDepth)

  // When paginate is false and no explicit limit, use Elasticsearch's default max_result_window (10000)
  // Without this, Elasticsearch defaults to only 10 results
  // Note: For >10k results, users must either:
  // 1. Set explicit query.$limit, 2. Configure higher index.max_result_window, or 3. Use scroll API
  // Important: from + size must not exceed max_result_window (10000)
  const skip = (filters.$skip as number) || 0
  const maxWindow = 10000
  const limit = filters.$limit !== undefined
    ? (filters.$limit as number)
    : (paginate === false ? Math.max(0, maxWindow - skip) : undefined)

  const findParams: SearchRequest = {
    index: (filters.$index as string) ?? service.index,
    from: filters.$skip as number | undefined,
    size: limit,
    sort: filters.$sort as string | string[] | undefined,
    routing: filters.$routing as string | undefined,
    query: esQuery ? { bool: esQuery } : undefined,
    _source: filters.$select as string[] | boolean | undefined,
    ...(service.esParams as Record<string, unknown>)
  }

  // The `refresh` param is not recognised for search in Es.
  delete (findParams as Record<string, unknown>).refresh

  return service.Model.search(findParams).then((result) =>
    mapFind(
      result as never,
      service.id,
      service.meta || '',
      service.join,
      filters,
      !!(paginate && paginate.default)
    )
  )
}
