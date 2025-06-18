const { NotFound } = require('@feathersjs/errors');
const { mapGet, getDocDescriptor, getQueryLength } = require('../utils');

function get(service, id, params) {
  const { filters, query } = service.filterQuery(params);
  const queryLength = getQueryLength(service, query);

  if (queryLength >= 1) {
    return service.core
      .find(service, {
        ...params,
        query: {
          $and: [params.query, { [service.id]: id }],
        },
        paginate: false,
      })
      .then(([result]) => {
        if (!result) {
          throw new NotFound(`No record found for id ${id}`);
        }

        return result;
      });
  }

  const { routing } = getDocDescriptor(service, query);
  const getParams = {
    _source: filters.$select,
    id: String(id),
    routing,
    ...service.esParams,
  };

  return service.Model.get(getParams).then((result) =>
    mapGet(result, service.id, service.meta, service.join),
  );
}

module.exports = get;
