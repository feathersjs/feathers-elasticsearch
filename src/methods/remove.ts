'use strict';

import { getDocDescriptor } from '../utils/index';

export function remove(service, id, params: any = {}) {
  const { filters, query } = service.filterQuery(params);
  const { routing } = getDocDescriptor(service, query);
  const removeParams = Object.assign(
    { 
      index: filters.$index || service.index,
      id: String(id)
    }, 
    service.esParams
  );
  
  if (routing !== undefined) {
    removeParams.routing = routing;
  }

  return service._get(id, params).then((result) =>
    service.Model.delete(removeParams).then(() => result)
  );
}
