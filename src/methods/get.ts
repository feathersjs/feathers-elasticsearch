'use strict';

import { errors } from '@feathersjs/errors';
import { mapGet, getDocDescriptor, getQueryLength } from '../utils/index';

export function get(service, id, params: any = {}) {
  const { filters, query } = service.filterQuery(params);
  const queryLength = getQueryLength(service, query);

  if (queryLength >= 1) {
    return service.core
      .find(service, {
        ...params,
        query: {
          $and: [params.query, { [service.id]: id }],
        },
        paginate: false,
      })
      .then(([result]) => {
        if (!result) {
          throw new errors.NotFound(`No record found for id ${id}`);
        }

        return result;
      });
  }

  const { routing } = getDocDescriptor(service, query);
  const getParams = Object.assign(
    {
      index: filters.$index || service.index,
      _source: filters.$select,
      id: String(id),
    },
    service.esParams
  );
  
  if (routing !== undefined) {
    getParams.routing = routing;
  }

  return service.Model.get(getParams).then((result) =>
    mapGet(result, service.id, service.meta, service.join)
  );
}
