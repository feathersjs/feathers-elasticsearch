'use strict';

import { getDocDescriptor, getQueryLength, mapPatch } from '../utils/index';

export function patch(service, id, data, params: any = {}) {
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
    .then((result) => mapPatch(result, service.id, service.meta, service.join));
}
