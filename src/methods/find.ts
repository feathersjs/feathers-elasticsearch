'use strict';

import { parseQuery, mapFind } from '../utils/index';


export function find(service, params) {
  const { filters, query, paginate } = service.filterQuery(params);
  
  // Move Elasticsearch-specific operators from filters back to query for parseQuery
  const esOperators = ['$all', '$prefix', '$wildcard', '$regexp', '$exists', '$missing', 
                       '$match', '$phrase', '$phrase_prefix', '$sqs', '$child', '$parent', 
                       '$nested', '$and', '$or'];
  
  const enhancedQuery = { ...query };
  esOperators.forEach(op => {
    if (filters[op] !== undefined) {
      enhancedQuery[op] = filters[op];
      delete filters[op];
    }
  });
  
  let esQuery = parseQuery(enhancedQuery, service.id);
  
  
  const findParams = {
    index: filters.$index ?? service.index,
    from: filters.$skip,
    size: filters.$limit,
    sort: filters.$sort,
    routing: filters.$routing,
    query: esQuery ? { bool: esQuery } : undefined,
    ...service.esParams,
  };

  // The `refresh` param is not recognised for search in Es.
  delete findParams.refresh;


  return service.Model.search(findParams).then((result) =>
    mapFind(
      result,
      service.id,
      service.meta,
      service.join,
      filters,
      !!(paginate && paginate.default)
    )
  );
}
