'use strict';

import { getDocDescriptor } from '../utils/index';
import { ElasticsearchServiceParams } from '../types';

export function remove(service: any, id: any, params: ElasticsearchServiceParams = {}) {
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

  return service._get(id, params).then((result: any) =>
    service.Model.delete(removeParams).then(() => result)
  );
}
