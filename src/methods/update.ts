import { removeProps, getDocDescriptor } from '../utils/index';

function getUpdateParams(service, docDescriptor, filters) {
  const { id, routing, doc } = docDescriptor;

  const params = {
    index: filters.$index || service.index,
    id: String(id),
    body: doc,
    ...service.esParams,
  };
  
  if (routing !== undefined) {
    params.routing = routing;
  }
  
  return params;
}

export function update(service, id, data, params: any = {}) {
  const { filters, query } = service.filterQuery(params);
  const docDescriptor = getDocDescriptor(service, data, query, {
    [service.id]: id,
  });
  const updateParams = getUpdateParams(service, docDescriptor, filters);

  if (params.upsert) {
    return service.Model.index(updateParams).then((result) =>
      service._get(result._id, removeProps(params, 'upsert'))
    );
  }

  const getParams = Object.assign(removeProps(params, 'query'), {
    query: Object.assign({ $select: false }, params.query),
  });

  // The first get is a bit of an overhead, as per the spec we want to update only existing elements.
  return service._get(id, getParams)
    .then(() => service.Model.index(updateParams))
    .then((result) => service._get(result._id, params));
}
