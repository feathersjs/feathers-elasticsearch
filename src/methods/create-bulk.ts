'use strict'

import { mapBulk, getDocDescriptor } from '../utils/index'
import { ElasticsearchServiceParams, ElasticAdapterInterface } from '../types'
import { getBulk } from './get-bulk'

function getBulkCreateParams(
  service: ElasticAdapterInterface,
  data: Record<string, unknown>[],
  params: ElasticsearchServiceParams
) {
  const { filters } = service.filterQuery(params)
  const index = filters?.$index || service.index

  return Object.assign(
    {
      index,
      body: data.reduce((result: Array<Record<string, unknown>>, item: Record<string, unknown>) => {
        const { id, parent, routing, join, doc } = getDocDescriptor(service, item)
        const method = id !== undefined && !params.upsert ? 'create' : 'index'

        if (join) {
          ;(doc as Record<string, unknown>)[service.join as string] = {
            name: join,
            parent
          }
        }

        const op: Record<string, Record<string, unknown>> = { [method]: { _index: index as string, _id: id } }
        if (routing) {
          op[method].routing = routing
        }

        result.push(op)
        result.push(doc)

        return result
      }, [])
    },
    service.esParams
  )
}

export function createBulk(
  service: ElasticAdapterInterface,
  data: Record<string, unknown>[],
  params: ElasticsearchServiceParams
) {
  const bulkCreateParams = getBulkCreateParams(service, data, params)

  return service.Model.bulk(bulkCreateParams as never).then(
    (results: { items: Array<Record<string, unknown>> }) => {
      const created = mapBulk(results.items, service.id, service.meta, service.join)
      // We are fetching only items which have been correctly created.
      const docs = created
        .map((item, index) =>
          Object.assign(
            {
              [service.routing as string]:
                (data[index] as Record<string, unknown>)[service.routing as string] ||
                (data[index] as Record<string, unknown>)[service.parent as string]
            },
            item
          )
        )
        .filter(
          (item) => (item as Record<string, Record<string, unknown>>)[service.meta as string].status === 201
        )
        .map((item) => ({
          _id: (item as Record<string, Record<string, unknown>>)[service.meta as string]._id,
          routing: (item as Record<string, unknown>)[service.routing as string]
        }))

      if (!docs.length) {
        return created
      }

      return getBulk(service, docs, params).then((fetched: unknown[]) => {
        let fetchedIndex = 0

        // We need to return responses for all items, either success or failure,
        // in the same order as the request.
        return created.map((createdItem) => {
          if (
            (createdItem as Record<string, Record<string, unknown>>)[service.meta as string].status === 201
          ) {
            const fetchedItem = fetched[fetchedIndex]

            fetchedIndex += 1

            return fetchedItem
          }

          return createdItem
        })
      })
    }
  )
}
