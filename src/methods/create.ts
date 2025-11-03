import { getDocDescriptor } from '../utils/index';
import { prepareGetParams } from '../utils/params';
import { ElasticsearchServiceParams, ElasticAdapterInterface, DocDescriptor, IndexRequest } from '../types';
import { get } from './get';

function getCreateParams(service: ElasticAdapterInterface, docDescriptor: DocDescriptor): IndexRequest {
  let { id, parent, routing, join, doc } = docDescriptor;

  if (join) {
    doc = Object.assign(
      {
        [service.join as string]: {
          name: join,
          parent
        }
      },
      doc
    );
  }

  // Build params with required fields
  const params: IndexRequest = {
    index: service.index || '',
    document: doc
  };

  // Only add id if it's defined
  if (id !== undefined) {
    params.id = id;
  }

  // Only add routing if it's defined
  if (routing !== undefined) {
    params.routing = routing;
  }

  // Merge esParams but exclude index if it's already set
  const cleanEsParams = service.esParams ? { ...service.esParams } : {};
  delete (cleanEsParams as Record<string, unknown>).index;
  return Object.assign(params, cleanEsParams);
}

export function create(
  service: ElasticAdapterInterface,
  data: Record<string, unknown>,
  params: ElasticsearchServiceParams = {}
) {
  const docDescriptor = getDocDescriptor(service, data);
  const { id, routing } = docDescriptor;
  const createParams = getCreateParams(service, docDescriptor);
  const getParams = prepareGetParams(params, 'upsert');

  // If we have routing (parent document), pass it in the query for the get operation
  if (routing !== undefined) {
    getParams.query = Object.assign({}, getParams.query, { [service.parent as string]: routing });
  }
  // Elasticsearch `create` expects _id, whereas index does not.
  // Our `create` supports both forms.
  // Use 'create' when id is provided and upsert is not true to ensure conflicts are detected
  const method = id !== undefined && !params.upsert ? 'create' : 'index';

  const modelMethod = method === 'create' ? service.Model.create : service.Model.index;
  return (modelMethod as (params: never) => Promise<{ _id: string }>)
    .call(service.Model, createParams as never)
    .then((result: { _id: string }) => get(service, result._id, getParams))
    .catch((error: Error) => {
      // Re-throw the error so it can be caught by the adapter's error handler
      throw error;
    });
}
