'use strict';

import { mapGet } from '../utils/index';

export function getBulk(service, docs, params) {
  const { filters } = service.filterQuery(params);
  const bulkGetParams = Object.assign(
    {
      _source: filters.$select,
      body: { docs },
    },
    service.esParams
  );

  return service.Model.mget(bulkGetParams).then((fetched) =>
    fetched.docs.map((item) => mapGet(item, service.id, service.meta, service.join))
  );
}
