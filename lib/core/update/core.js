const { removeProps, getDocDescriptor } = require('../../utils');

function updateCore(service, id, data, params, { getUpdateParams }) {
  const { get } = service.core;
  const { query } = service.filterQuery(params);
  const docDescriptor = getDocDescriptor(service, data, query, { [service.id]: id });
  const updateParams = getUpdateParams(service, docDescriptor);

  if (params.upsert) {
    return service.Model.index(updateParams).then((result) =>
      get(service, result._id, removeProps(params, 'upsert')),
    );
  }

  const getParams = Object.assign(removeProps(params, 'query'), {
    query: { $select: false, ...params.query },
  });

  // The first get is a bit of an overhead, as per the spec we want to update only existing elements.
  return get(service, id, getParams)
    .then(() => service.Model.index(updateParams))
    .then((result) => get(service, result._id, params));
}

module.exports = updateCore;
