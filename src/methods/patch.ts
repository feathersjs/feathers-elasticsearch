'use strict';

import { getDocDescriptor, getQueryLength, mapPatch } from '../utils/index';
import { ElasticsearchServiceParams } from '../types';

export function patch(service: any, id: any, data: any, params: ElasticsearchServiceParams = {}) {
  const { filters, query } = service.filterQuery(params);
  const { routing } = getDocDescriptor(service, query);
  const { doc } = getDocDescriptor(service, data);
  
  const updateParams = {
    index: filters.$index || service.index,
    id: String(id),
    body: { doc },
    _source: filters.$select || true,
    ...service.esParams,
  };
  
  // Add routing if specified
  if (routing !== undefined) {
    updateParams.routing = routing;
  }

  // Check if document exists when query is provided
  const queryPromise =
    getQueryLength(service, query) >= 1 ? service._get(id, params) : Promise.resolve();

  return queryPromise
    .then(() => service.Model.update(updateParams))
    .then((result: any) => mapPatch(result, service.id, service.meta, service.join));
}
