"use strict";

import { ElasticsearchServiceParams } from '../types';

export function removeBulk(service: any, params: ElasticsearchServiceParams) {
  const { find } = service.core;

  return find(service, params).then((results: any) => {
    const found = Array.isArray(results) ? results : results.data;

    if (!found.length) {
      return found;
    }

    const bulkRemoveParams = Object.assign(
      {
        body: found.map((item: any) => {
          const {
            _id,
            _parent: parent,
            _routing: routing,
          } = item[service.meta];

          return { delete: { _id, routing: routing || parent } };
        }),
      },
      service.esParams
    );

    return service.Model.bulk(bulkRemoveParams).then((results: any) =>
      results.items
        .map((item: any, index: any) =>
          item.delete.status === 200 ? found[index] : false
        )
        .filter((item: any) => !!item)
    );
  });
}
