import { removeProps, getDocDescriptor } from '../utils/index'
import { prepareGetParams } from '../utils/params'
import { ElasticsearchServiceParams, ElasticAdapterInterface, DocDescriptor } from '../types'

function getUpdateParams(
  service: ElasticAdapterInterface,
  docDescriptor: DocDescriptor,
  filters: Record<string, unknown>
) {
  const { id, routing, doc } = docDescriptor

  const params: Record<string, unknown> = {
    index: filters.$index || service.index,
    id: String(id),
    body: doc
  }

  if (routing !== undefined) {
    params.routing = routing
  }

  // Merge esParams but exclude index if it's already set
  const cleanEsParams = service.esParams ? { ...service.esParams } : {}
  delete cleanEsParams.index
  return Object.assign(params, cleanEsParams)
}

export function update(
  service: ElasticAdapterInterface,
  id: string | number,
  data: Record<string, unknown>,
  params: ElasticsearchServiceParams = {}
) {
  const { filters, query } = service.filterQuery(params)
  const docDescriptor = getDocDescriptor(service, data, query, {
    [service.id]: id
  })
  const updateParams = getUpdateParams(service, docDescriptor, filters)

  if (params.upsert) {
    return service.Model.index(updateParams as never).then((result: unknown) =>
      service._get(
        (result as { _id: string })._id,
        removeProps(params as Record<string, unknown>, 'upsert') as ElasticsearchServiceParams
      )
    )
  }

  const getParams = prepareGetParams(params)
  getParams.query = Object.assign({ $select: false }, getParams.query)

  // The first get is a bit of an overhead, as per the spec we want to update only existing elements.
  return service
    ._get(id, getParams)
    .then(() => service.Model.index(updateParams as never))
    .then((result: unknown) => service._get((result as { _id: string })._id, params))
}
