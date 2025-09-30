'use strict';

import { mapBulk, removeProps, getDocDescriptor } from '../utils/index';
import { ElasticsearchServiceParams } from '../types';

/**
 * Prepares find parameters for bulk patch operation
 */
function prepareFindParams(_service: any, params: ElasticsearchServiceParams) {
  return Object.assign(removeProps(params as Record<string, unknown>, 'query'), {
    query: Object.assign({}, params.query, { $select: false })
  });
}

/**
 * Creates bulk update operations from found documents
 */
function createBulkOperations(service: any, found: any[], data: any, index: string): any[] {
  return found.reduce((result: any[], item: any) => {
    const { _id, _parent: parent, _routing: routing } = item[service.meta];
    const { doc } = getDocDescriptor(service, data);

    const updateOp: any = {
      update: {
        _index: index,
        _id
      }
    };

    if (routing || parent) {
      updateOp.update.routing = routing || parent;
    }

    result.push(updateOp);
    result.push({ doc, doc_as_upsert: false });

    return result;
  }, []);
}

/**
 * Prepares bulk update parameters
 */
function prepareBulkUpdateParams(service: any, operations: any[], index: string): any {
  const params = Object.assign(
    {
      index,
      body: operations
    },
    service.esParams
  );

  // Remove refresh from bulk params but return it separately
  const needsRefresh = params.refresh;
  delete params.refresh;

  return { params, needsRefresh };
}

/**
 * Handles refresh if needed after bulk operation
 */
async function handleRefresh(
  service: any,
  bulkResult: any,
  needsRefresh: boolean,
  index: string
): Promise<any> {
  if (needsRefresh) {
    await service.Model.indices.refresh({ index });
  }
  return bulkResult;
}

/**
 * Gets IDs of successfully updated documents
 */
function getUpdatedIds(bulkResult: any): string[] {
  return bulkResult.items
    .filter((item: any) => item.update && (item.update.result === 'updated' || item.update.result === 'noop'))
    .map((item: any) => item.update._id);
}

/**
 * Fetches updated documents with selected fields
 */
async function fetchUpdatedDocuments(
  service: any,
  updatedIds: string[],
  index: string,
  filters: any
): Promise<any> {
  const getParams: any = {
    index,
    body: {
      ids: updatedIds
    }
  };

  // Only add _source if $select is explicitly set
  if (filters.$select) {
    getParams._source = filters.$select;
  }

  return service.Model.mget(getParams);
}

/**
 * Maps fetched documents to result format
 */
function mapFetchedDocuments(mgetResult: any, bulkResult: any, service: any): any[] {
  // Create a map of fetched documents
  const docMap: any = {};
  mgetResult.docs.forEach((doc: any) => {
    if (doc.found) {
      docMap[doc._id] = doc._source;
    }
  });

  // Merge the selected fields with the bulk results
  return bulkResult.items.map((item: any) => {
    if (item.update && docMap[item.update._id]) {
      const doc = docMap[item.update._id];
      // Add the id field
      doc[service.id] = item.update._id;
      // Add metadata
      doc[service.meta] = {
        _id: item.update._id,
        _index: item.update._index,
        status: item.update.status || 200
      };
      return doc;
    }
    return mapBulk([item], service.id, service.meta, service.join)[0];
  });
}

/**
 * Performs bulk patch operation on multiple documents
 * @param service - The Elasticsearch service instance
 * @param data - Data to patch
 * @param params - Service parameters
 * @returns Promise resolving to patched documents
 */
export async function patchBulk(service: any, data: any, params: ElasticsearchServiceParams): Promise<any> {
  const { filters } = service.filterQuery(params);
  const index = filters.$index || service.index;

  // Step 1: Find documents to patch
  const findParams = prepareFindParams(service, params);
  const results = await service._find(findParams);

  // Handle paginated results
  const found = Array.isArray(results) ? results : results.data;

  if (!found.length) {
    return found;
  }

  // Step 2: Create bulk operations
  const operations = createBulkOperations(service, found, data, index);

  // Step 3: Prepare and execute bulk update
  const { params: bulkUpdateParams, needsRefresh } = prepareBulkUpdateParams(service, operations, index);

  let bulkResult = await service.Model.bulk(bulkUpdateParams);

  // Step 4: Handle refresh if needed
  bulkResult = await handleRefresh(service, bulkResult, needsRefresh, index);

  // Step 5: Get updated document IDs
  const updatedIds = getUpdatedIds(bulkResult);

  if (updatedIds.length === 0) {
    return mapBulk(bulkResult.items, service.id, service.meta, service.join);
  }

  // Step 6: Fetch updated documents with selected fields
  const mgetResult = await fetchUpdatedDocuments(service, updatedIds, index, filters);

  // Step 7: Map and return results
  return mapFetchedDocuments(mgetResult, bulkResult, service);
}
