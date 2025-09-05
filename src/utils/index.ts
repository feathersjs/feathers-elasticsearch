'use strict';

import { removeProps } from './core';

export * from './core';
export * from './parse-query';

export function mapFind(results, idProp, metaProp, joinProp, filters, hasPagination) {
  const data = results.hits.hits.map((result) => mapGet(result, idProp, metaProp, joinProp))

  if (hasPagination) {
    const total = typeof results.hits.total === 'object' ? results.hits.total.value : results.hits.total

    return {
      total,
      skip: filters.$skip,
      limit: filters.$limit,
      data
    }
  }

  return data
}

export function mapGet(item, idProp, metaProp, joinProp) {
  return mapItem(item, idProp, metaProp, joinProp)
}

export function mapPatch(item, idProp, metaProp, joinProp) {
  const normalizedItem = removeProps(item, 'get')

  normalizedItem._source = item.get && item.get._source

  return mapItem(normalizedItem, idProp, metaProp, joinProp)
}

export function mapBulk(items, idProp, metaProp, joinProp) {
  return items.map((item) => {
    if (item.update) {
      return mapPatch(item.update, idProp, metaProp, joinProp)
    }

    return mapItem(item.create || item.index || item.delete, idProp, metaProp, joinProp)
  })
}

export function mapItem(item, idProp, metaProp, joinProp) {
  const meta = removeProps(item, '_source')
  const result = Object.assign({ [metaProp]: meta }, item._source)

  if (meta._id !== undefined) {
    result[idProp] = meta._id
  }

  if (joinProp && result[joinProp] && typeof result[joinProp] === 'object') {
    const { parent, name } = result[joinProp]

    result[metaProp]._parent = parent
    result[joinProp] = name
  }

  return result
}
