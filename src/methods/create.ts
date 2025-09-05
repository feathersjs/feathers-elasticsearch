import { removeProps, getDocDescriptor } from '../utils/index';
import { get } from './get';

function getCreateParams(service, docDescriptor) {
  let { id, parent, routing, join, doc } = docDescriptor;

  if (join) {
    doc = Object.assign(
      {
        [service.join]: {
          name: join,
          parent,
        },
      },
      doc
    );
  }

  return Object.assign({ id, routing, body: doc }, service.esParams);
}

export function create(service, data, params: any = {}) {
  const docDescriptor = getDocDescriptor(service, data);
  const { id, routing } = docDescriptor;
  const createParams = getCreateParams(service, docDescriptor);
  const getParams = Object.assign(removeProps(params, 'query', 'upsert'), {
    query: params.query || {}
  });
  
  // If we have routing (parent document), pass it in the query for the get operation
  if (routing !== undefined) {
    getParams.query = Object.assign({}, getParams.query, { [service.parent]: routing });
  }
  // Elasticsearch `create` expects _id, whereas index does not.
  // Our `create` supports both forms.
  const method = id !== undefined && !params.upsert ? 'create' : 'index';

  return service.Model[method](createParams).then((result) => get(service, result._id, getParams));
}
