'use strict'

import { errors } from '@feathersjs/errors'
import { mapGet, getDocDescriptor, getQueryLength } from '../utils/index'
import { ElasticsearchServiceParams, ElasticAdapterInterface, QueryValue, QueryOperators } from '../types'

export function get(
  service: ElasticAdapterInterface,
  id: string | number,
  params: ElasticsearchServiceParams = {}
) {
  const { filters, query } = service.filterQuery(params)
  const queryLength = getQueryLength(service, query)

  if (queryLength >= 1) {
    const coreFind = (service.core as Record<string, unknown>)?.find as
      | ((svc: ElasticAdapterInterface, params: ElasticsearchServiceParams) => Promise<unknown[]>)
      | undefined

    return coreFind?.(service, {
      ...params,
      query: {
        $and: [params.query ?? {}, { [service.id]: id }]
      } as Record<string, QueryValue> & QueryOperators,
      paginate: false
    }).then(([result]: unknown[]) => {
      if (!result) {
        throw new errors.NotFound(`No record found for id ${id}`)
      }

      return result
    })
  }

  const { routing } = getDocDescriptor(service, query)
  const getParams = Object.assign(
    {
      index: (filters.$index as string) || service.index || '',
      _source: filters.$select as string[] | boolean | undefined,
      id: String(id)
    },
    service.esParams
  )

  if (routing !== undefined) {
    getParams.routing = routing
  }

  return service.Model.get(getParams).then((result) =>
    mapGet(result as never, service.id, service.meta || '', service.join)
  )
}
