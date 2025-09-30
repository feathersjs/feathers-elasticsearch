'use strict';

import { mapBulk, getDocDescriptor } from '../utils/index';
import { ElasticsearchServiceParams } from '../types';
import { getBulk } from './get-bulk';

function getBulkCreateParams(service: any, data: any, params: ElasticsearchServiceParams) {
  const { filters } = service.filterQuery(params);
  const index = filters?.$index || service.index;

  return Object.assign(
    {
      index,
      body: data.reduce((result: any, item: any) => {
        const { id, parent, routing, join, doc } = getDocDescriptor(service, item);
        const method = id !== undefined && !params.upsert ? 'create' : 'index';

        if (join) {
          doc[service.join] = {
            name: join,
            parent
          };
        }

        const op: any = { [method]: { _index: index, _id: id } };
        if (routing) {
          op[method].routing = routing;
        }

        result.push(op);
        result.push(doc);

        return result;
      }, [])
    },
    service.esParams
  );
}

export function createBulk(service: any, data: any, params: ElasticsearchServiceParams) {
  const bulkCreateParams = getBulkCreateParams(service, data, params);

  return service.Model.bulk(bulkCreateParams).then((results: any) => {
    const created = mapBulk(results.items, service.id, service.meta, service.join);
    // We are fetching only items which have been correctly created.
    const docs = created
      .map((item, index) =>
        Object.assign(
          {
            [service.routing]: data[index][service.routing] || data[index][service.parent]
          },
          item
        )
      )
      .filter((item) => item[service.meta].status === 201)
      .map((item) => ({
        _id: item[service.meta]._id,
        routing: item[service.routing]
      }));

    if (!docs.length) {
      return created;
    }

    return getBulk(service, docs, params).then((fetched: any) => {
      let fetchedIndex = 0;

      // We need to return responses for all items, either success or failure,
      // in the same order as the request.
      return created.map((createdItem) => {
        if ((createdItem as any)[service.meta].status === 201) {
          const fetchedItem = fetched[fetchedIndex];

          fetchedIndex += 1;

          return fetchedItem;
        }

        return createdItem;
      });
    });
  });
}
