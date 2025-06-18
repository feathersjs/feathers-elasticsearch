const { removeProps, getDocDescriptor } = require('../../utils');
const get = require('../get');

function createCore(service, data, params, { getCreateParams }) {
  const docDescriptor = getDocDescriptor(service, data);
  const { id, routing } = docDescriptor;
  const createParams = getCreateParams(service, docDescriptor);
  const getParams = Object.assign(removeProps(params, 'query', 'upsert'), {
    query: { [service.routing]: routing, ...params.query },
  });
  // Elasticsearch `create` expects _id, whereas index does not.
  // Our `create` supports both forms.
  const method = id !== undefined && !params.upsert ? 'create' : 'index';

  return service.Model[method](createParams).then((result) => get(service, result._id, getParams));
}

module.exports = createCore;
