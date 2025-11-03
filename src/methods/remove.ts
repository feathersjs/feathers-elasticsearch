'use strict'

import { getDocDescriptor } from '../utils/index'
import { mergeESParamsWithRefresh } from '../utils/params'
import { ElasticsearchServiceParams, ElasticAdapterInterface } from '../types'

export function remove(
  service: ElasticAdapterInterface,
  id: string | number,
  params: ElasticsearchServiceParams = {}
) {
  const { filters, query } = service.filterQuery(params)
  const { routing } = getDocDescriptor(service, query)

  // PERFORMANCE: Merge esParams with per-operation refresh override
  const removeParams = Object.assign(
    {
      index: filters.$index || service.index,
      id: String(id)
    },
    mergeESParamsWithRefresh(service.esParams, params)
  )

  if (routing !== undefined) {
    removeParams.routing = routing
  }

  return service
    ._get(id, params)
    .then((result: unknown) => service.Model.delete(removeParams as never).then(() => result))
}
