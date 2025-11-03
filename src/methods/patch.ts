'use strict'

import { getDocDescriptor, getQueryLength, mapPatch } from '../utils/index'
import { ElasticsearchServiceParams, ElasticAdapterInterface } from '../types'

export function patch(
  service: ElasticAdapterInterface,
  id: string | number,
  data: Record<string, unknown>,
  params: ElasticsearchServiceParams = {}
) {
  const { filters, query } = service.filterQuery(params)
  const { routing } = getDocDescriptor(service, query)
  const { doc } = getDocDescriptor(service, data)

  const updateParams: Record<string, unknown> = {
    index: filters.$index || service.index,
    id: String(id),
    body: { doc },
    _source: filters.$select || true,
    ...service.esParams
  }

  // Add routing if specified
  if (routing !== undefined) {
    updateParams.routing = routing
  }

  // Check if document exists when query is provided
  const queryPromise = getQueryLength(service, query) >= 1 ? service._get(id, params) : Promise.resolve()

  return queryPromise
    .then(() => service.Model.update(updateParams as never))
    .then((result: unknown) => mapPatch(result as never, service.id, service.meta, service.join))
}
