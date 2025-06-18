const { getDocDescriptor, getQueryLength, mapPatch } = require('../utils');

function patch(service, id, data, params) {
  const { get } = service.core;
  const { filters, query } = service.filterQuery(params);
  const { routing } = getDocDescriptor(service, query);
  const { doc } = getDocDescriptor(service, data);
  const updateParams = {
    id: String(id),
    routing,
    body: { doc },
    _source: filters.$select,
    ...service.esParams,
  };

  const queryPromise =
    getQueryLength(service, query) >= 1 ? get(service, updateParams.id, params) : Promise.resolve();

  return queryPromise
    .then(() => service.Model.update(updateParams))
    .then((result) => mapPatch(result, service.id, service.meta, service.join));
}

module.exports = patch;
