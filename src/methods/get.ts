'use strict';

import { errors } from '@feathersjs/errors';
import { mapGet, getDocDescriptor, getQueryLength } from '../utils/index';
import { ElasticsearchServiceParams, ElasticAdapterInterface } from '../types';

export function get(
  service: ElasticAdapterInterface,
  id: string | number,
  params: ElasticsearchServiceParams = {}
) {
  const { filters, query } = service.filterQuery(params);
  const queryLength = getQueryLength(service, query);

  if (queryLength >= 1) {
    return (service.core as any)
      ?.find(service, {
        ...params,
        query: {
          $and: [params.query, { [service.id]: id }]
        },
        paginate: false
      })
      .then(([result]: any) => {
        if (!result) {
          throw new errors.NotFound(`No record found for id ${id}`);
        }

        return result;
      });
  }

  const { routing } = getDocDescriptor(service, query);
  const getParams = Object.assign(
    {
      index: (filters.$index as string) || service.index || '',
      _source: filters.$select as string[] | boolean | undefined,
      id: String(id)
    },
    service.esParams
  );

  if (routing !== undefined) {
    getParams.routing = routing;
  }

  return service.Model.get(getParams).then((result: any) =>
    mapGet(result, service.id, service.meta || '', service.join)
  );
}
