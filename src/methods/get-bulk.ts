'use strict';

import { mapGet } from '../utils/index';
import { ElasticsearchServiceParams, ElasticAdapterInterface } from '../types';

export function getBulk(
  service: ElasticAdapterInterface,
  docs: Array<Record<string, unknown>>,
  params: ElasticsearchServiceParams
) {
  const { filters } = service.filterQuery(params);
  const bulkGetParams = Object.assign(
    {
      _source: filters.$select,
      body: { docs }
    },
    service.esParams
  );

  return service.Model.mget(bulkGetParams as never).then((fetched) =>
    (fetched as unknown as { docs: Array<Record<string, unknown>> }).docs.map(
      (item: Record<string, unknown>) => mapGet(item as never, service.id, service.meta, service.join)
    )
  );
}
