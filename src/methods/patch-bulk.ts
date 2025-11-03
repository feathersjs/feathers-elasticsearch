'use strict'

import { mapBulk, removeProps, getDocDescriptor } from '../utils/index'
import { mergeESParamsWithRefresh } from '../utils/params'
import { validateQueryComplexity } from '../utils/security'
import { ElasticsearchServiceParams, ElasticAdapterInterface } from '../types'
import { errors } from '@feathersjs/errors'

/**
 * Prepares find parameters for bulk patch operation
 */
function prepareFindParams(_service: ElasticAdapterInterface, params: ElasticsearchServiceParams) {
  return Object.assign(removeProps(params as Record<string, unknown>, 'query'), {
    query: Object.assign({}, params.query, { $select: false })
  })
}

/**
 * Creates bulk update operations from found documents
 */
function createBulkOperations(
  service: ElasticAdapterInterface,
  found: Array<Record<string, unknown>>,
  data: Record<string, unknown>,
  index: string | undefined
): Array<Record<string, unknown>> {
  return found.reduce((result: Array<Record<string, unknown>>, item: Record<string, unknown>) => {
    const metaData = (item as Record<string, Record<string, unknown>>)[service.meta as string]
    const { _id, _parent: parent, _routing: routing } = metaData
    const { doc } = getDocDescriptor(service, data)

    const updateOp: Record<string, Record<string, unknown>> = {
      update: {
        _index: index as string,
        _id
      }
    }

    if (routing || parent) {
      updateOp.update.routing = routing || parent
    }

    result.push(updateOp)
    result.push({ doc, doc_as_upsert: false })

    return result
  }, [])
}

/**
 * Prepares bulk update parameters
 */
function prepareBulkUpdateParams(
  service: ElasticAdapterInterface,
  operations: Array<Record<string, unknown>>,
  index: string,
  requestParams: ElasticsearchServiceParams
): Record<string, unknown> {
  // PERFORMANCE: Merge esParams with per-operation refresh override
  // Note: Elasticsearch bulk API supports refresh parameter directly
  return Object.assign(
    {
      index,
      body: operations
    },
    mergeESParamsWithRefresh(service.esParams, requestParams)
  )
}

/**
 * Gets IDs of successfully updated documents
 */
function getUpdatedIds(bulkResult: Record<string, unknown>): string[] {
  return (bulkResult.items as Array<Record<string, unknown>>)
    .filter((item: Record<string, unknown>) => {
      const update = item.update as Record<string, unknown>
      return update && (update.result === 'updated' || update.result === 'noop')
    })
    .map((item: Record<string, unknown>) => (item.update as Record<string, unknown>)._id as string)
}

/**
 * Fetches updated documents with selected fields
 */
async function fetchUpdatedDocuments(
  service: ElasticAdapterInterface,
  updatedIds: string[],
  index: string,
  filters: Record<string, unknown>
): Promise<unknown> {
  const getParams: Record<string, unknown> = {
    index,
    body: {
      ids: updatedIds
    }
  }

  // Only add _source if $select is explicitly set
  if (filters.$select) {
    getParams._source = filters.$select
  }

  return service.Model.mget(getParams)
}

/**
 * Maps fetched documents to result format
 */
function mapFetchedDocuments(
  mgetResult: Record<string, unknown>,
  bulkResult: Record<string, unknown>,
  service: ElasticAdapterInterface
): unknown[] {
  // Create a map of fetched documents
  const docMap: Record<string, unknown> = {}
  ;(mgetResult.docs as Array<Record<string, unknown>>).forEach((doc: Record<string, unknown>) => {
    if (doc.found) {
      docMap[doc._id as string] = doc._source
    }
  })

  // Merge the selected fields with the bulk results
  return (bulkResult.items as Array<Record<string, unknown>>).map((item: Record<string, unknown>) => {
    const update = item.update as Record<string, unknown>
    if (update && docMap[update._id as string]) {
      const doc = docMap[update._id as string] as Record<string, unknown>
      // Add the id field
      doc[service.id] = update._id
      // Add metadata
      doc[service.meta as string] = {
        _id: update._id,
        _index: update._index,
        status: update.status || 200
      }
      return doc
    }
    return mapBulk([item], service.id, service.meta, service.join)[0]
  })
}

/**
 * Performs bulk patch operation on multiple documents
 * @param service - The Elasticsearch service instance
 * @param data - Data to patch
 * @param params - Service parameters
 * @returns Promise resolving to patched documents
 */
export async function patchBulk(
  service: ElasticAdapterInterface,
  data: Record<string, unknown>,
  params: ElasticsearchServiceParams
): Promise<unknown> {
  const { filters } = service.filterQuery(params)
  const index = (filters.$index as string) || service.index

  // PERFORMANCE: Validate query complexity budget
  validateQueryComplexity(params.query || {}, service.security.maxQueryComplexity)

  // Step 1: Find documents to patch
  const findParams = prepareFindParams(service, params)
  const results = await service._find(findParams)

  // Handle paginated results
  const found = Array.isArray(results)
    ? results
    : ((results as Record<string, unknown>).data as Array<Record<string, unknown>>)

  if (!found.length) {
    return found
  }

  // SECURITY: Enforce maximum bulk operation limit
  const maxBulkOps = service.security.maxBulkOperations
  if (found.length > maxBulkOps) {
    throw new errors.BadRequest(
      `Bulk operation would affect ${found.length} documents, maximum allowed is ${maxBulkOps}`
    )
  }

  // Step 2: Create bulk operations
  const operations = createBulkOperations(service, found, data, index)

  // Step 3: Prepare and execute bulk update
  const bulkUpdateParams = prepareBulkUpdateParams(service, operations, index, params)

  const bulkResult = (await service.Model.bulk(bulkUpdateParams as never)) as unknown as Record<
    string,
    unknown
  >

  // Step 4: Get updated document IDs
  const updatedIds = getUpdatedIds(bulkResult)

  if (updatedIds.length === 0) {
    return mapBulk(bulkResult.items as Array<Record<string, unknown>>, service.id, service.meta, service.join)
  }

  // PERFORMANCE: Lean mode - skip fetching full documents if requested
  if (params.lean) {
    return mapBulk(bulkResult.items as Array<Record<string, unknown>>, service.id, service.meta, service.join)
  }

  // Step 6: Fetch updated documents with selected fields
  const mgetResult = (await fetchUpdatedDocuments(service, updatedIds, index, filters)) as Record<
    string,
    unknown
  >

  // Step 7: Map and return results
  return mapFetchedDocuments(mgetResult, bulkResult, service)
}
