import { ESQuery } from '../../types'

/**
 * Map of query criteria to their Elasticsearch query paths
 */
export const queryCriteriaMap: Record<string, string> = {
  $nin: 'must_not.terms',
  $in: 'filter.terms',
  $gt: 'filter.range.gt',
  $gte: 'filter.range.gte',
  $lt: 'filter.range.lt',
  $lte: 'filter.range.lte',
  $ne: 'must_not.term',
  $prefix: 'filter.prefix',
  $wildcard: 'filter.wildcard',
  $regexp: 'filter.regexp',
  $match: 'must.match',
  $phrase: 'must.match_phrase',
  $phrase_prefix: 'must.match_phrase_prefix'
}

/**
 * Processes criteria operators like $gt, $in, $match, etc.
 */
export function processCriteria(key: string, value: Record<string, unknown>, esQuery: ESQuery): ESQuery {
  Object.keys(value)
    .filter((criterion) => queryCriteriaMap[criterion])
    .forEach((criterion) => {
      const [section, term, operand] = queryCriteriaMap[criterion].split('.')
      const querySection = section as keyof ESQuery

      if (!Array.isArray(esQuery[querySection])) {
        esQuery[querySection] = [] as never
      }

      ;(esQuery[querySection] as Array<Record<string, unknown>>).push({
        [term]: {
          [key]: operand ? { [operand]: value[criterion] } : value[criterion]
        }
      })
    })

  return esQuery
}

/**
 * Processes simple term queries for primitive values
 */
export function processTermQuery(key: string, value: unknown, esQuery: ESQuery): ESQuery {
  esQuery.filter = esQuery.filter || []

  if (Array.isArray(value)) {
    value.forEach((val) => {
      esQuery.filter!.push({ term: { [key]: val } })
    })
  } else {
    esQuery.filter.push({ term: { [key]: value } })
  }

  return esQuery
}
