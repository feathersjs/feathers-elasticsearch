import { removeProps, getDocDescriptor } from '../utils/index';
import { prepareGetParams } from '../utils/params';
import { ElasticsearchServiceParams } from '../types';

function getUpdateParams(service: any, docDescriptor: any, filters: any) {
  const { id, routing, doc } = docDescriptor;

  const params: any = {
    index: filters.$index || service.index,
    id: String(id),
    body: doc
  };

  if (routing !== undefined) {
    params.routing = routing;
  }

  // Merge esParams but exclude index if it's already set
  const cleanEsParams = service.esParams ? { ...service.esParams } : {};
  delete cleanEsParams.index;
  return Object.assign(params, cleanEsParams);
}

export function update(service: any, id: any, data: any, params: ElasticsearchServiceParams = {}) {
  const { filters, query } = service.filterQuery(params);
  const docDescriptor = getDocDescriptor(service, data, query, {
    [service.id]: id
  });
  const updateParams = getUpdateParams(service, docDescriptor, filters);

  if (params.upsert) {
    return service.Model.index(updateParams).then((result: any) =>
      service._get(
        result._id,
        removeProps(params as Record<string, unknown>, 'upsert') as ElasticsearchServiceParams
      )
    );
  }

  const getParams = prepareGetParams(params);
  getParams.query = Object.assign({ $select: false }, getParams.query);

  // The first get is a bit of an overhead, as per the spec we want to update only existing elements.
  return service
    ._get(id, getParams)
    .then(() => service.Model.index(updateParams))
    .then((result: any) => service._get(result._id, params));
}
