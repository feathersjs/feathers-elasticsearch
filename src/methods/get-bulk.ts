'use strict';

import { mapGet } from '../utils/index';
import { ElasticsearchServiceParams } from '../types';

export function getBulk(service: any, docs: any, params: ElasticsearchServiceParams) {
  const { filters } = service.filterQuery(params);
  const bulkGetParams = Object.assign(
    {
      _source: filters.$select,
      body: { docs },
    },
    service.esParams
  );

  return service.Model.mget(bulkGetParams).then((fetched: any) =>
    fetched.docs.map((item: any) => mapGet(item, service.id, service.meta, service.join))
  );
}
