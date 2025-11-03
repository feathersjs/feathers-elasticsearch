'use strict'

import { mergeESParamsWithRefresh } from '../utils/params'
import { validateQueryComplexity } from '../utils/security'
import { ElasticsearchServiceParams, ElasticAdapterInterface } from '../types'
import { errors } from '@feathersjs/errors'

export function removeBulk(service: ElasticAdapterInterface, params: ElasticsearchServiceParams) {
  // PERFORMANCE: Validate query complexity budget
  validateQueryComplexity(params.query || {}, service.security.maxQueryComplexity)

  const { find } = service.core as Record<
    string,
    (svc: ElasticAdapterInterface, params: ElasticsearchServiceParams) => Promise<unknown>
  >

  return find(service, params).then((results: unknown) => {
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

    // PERFORMANCE: Merge esParams with per-operation refresh override
    const bulkRemoveParams = Object.assign(
      {
        body: found.map((item: Record<string, unknown>) => {
          const meta = item[service.meta as string] as Record<string, unknown>
          const { _id, _parent: parent, _routing: routing } = meta

          return { delete: { _id, routing: routing || parent } }
        })
      },
      mergeESParamsWithRefresh(service.esParams, params)
    )

    return service.Model.bulk(bulkRemoveParams).then((results: unknown) => {
      const resultItems = (results as Record<string, unknown>).items as Array<Record<string, unknown>>

      // PERFORMANCE: Lean mode - return minimal info without full documents
      if (params.lean) {
        return resultItems
          .filter((item: Record<string, unknown>) => {
            const deleteResult = item.delete as Record<string, unknown>
            return deleteResult.status === 200
          })
          .map((item: Record<string, unknown>) => {
            const deleteResult = item.delete as Record<string, unknown>
            return { [service.id]: deleteResult._id }
          })
      }

      return resultItems
        .map((item: Record<string, unknown>, index: number) => {
          const deleteResult = item.delete as Record<string, unknown>
          return deleteResult.status === 200 ? found[index] : false
        })
        .filter((item: unknown) => !!item)
    })
  })
}
