'use strict';

import { parseQuery, mapFind } from '../utils/index';
import { ElasticsearchServiceParams, ElasticAdapterInterface, SearchRequest } from '../types';

export function find(service: ElasticAdapterInterface, params: ElasticsearchServiceParams) {
  const { filters, query, paginate } = service.filterQuery(params);

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
  ];

  const enhancedQuery = { ...query };
  esOperators.forEach((op) => {
    if (filters[op] !== undefined) {
      enhancedQuery[op] = filters[op];
      delete filters[op];
    }
  });

  // Parse query with security-enforced max depth
  let esQuery = parseQuery(enhancedQuery, service.id, service.security.maxQueryDepth);

  const findParams: SearchRequest = {
    index: (filters.$index as string) ?? service.index,
    from: filters.$skip as number | undefined,
    size: filters.$limit as number | undefined,
    sort: filters.$sort as string | string[] | undefined,
    routing: filters.$routing as string | undefined,
    query: esQuery ? { bool: esQuery } : undefined,
    ...(service.esParams as Record<string, unknown>)
  };

  // The `refresh` param is not recognised for search in Es.
  delete (findParams as Record<string, unknown>).refresh;

  return service.Model.search(findParams).then((result) =>
    mapFind(
      result as never,
      service.id,
      service.meta || '',
      service.join,
      filters,
      !!(paginate && paginate.default)
    )
  );
}
