/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */
const { parseQuery } = require('./parse-query');
const {
  removeProps,
  getDocDescriptor,
  getCompatVersion,
  getCompatProp,
  getQueryLength,
} = require('./core');

function mapFind(results, idProp, metaProp, joinProp, filters, hasPagination) {
  const data = results.hits.hits.map((result) => mapGet(result, idProp, metaProp, joinProp));

  if (hasPagination) {
    const total =
      typeof results.hits.total === 'object' ? results.hits.total.value : results.hits.total;

    return {
      total,
      skip: filters.$skip,
      limit: filters.$limit,
      data,
    };
  }

  return data;
}

function mapGet(item, idProp, metaProp, joinProp) {
  return mapItem(item, idProp, metaProp, joinProp);
}

function mapPatch(item, idProp, metaProp, joinProp) {
  const normalizedItem = removeProps(item, 'get');

  normalizedItem._source = item.get && item.get._source;

  return mapItem(normalizedItem, idProp, metaProp, joinProp);
}

function mapBulk(items, idProp, metaProp, joinProp) {
  return items.map((item) => {
    if (item.update) {
      return mapPatch(item.update, idProp, metaProp, joinProp);
    }

    return mapItem(item.create || item.index || item.delete, idProp, metaProp, joinProp);
  });
}

function mapItem(item, idProp, metaProp, joinProp) {
  const meta = removeProps(item, '_source');
  const result = { [metaProp]: meta, ...item._source };

  if (meta._id !== undefined) {
    result[idProp] = meta._id;
  }

  if (joinProp && result[joinProp] && typeof result[joinProp] === 'object') {
    const { parent, name } = result[joinProp];

    result[metaProp]._parent = parent;
    result[joinProp] = name;
  }

  return result;
}

module.exports = {
  removeProps,
  getDocDescriptor,
  getCompatVersion,
  getCompatProp,
  getQueryLength,
  parseQuery,
  mapFind,
  mapGet,
  mapPatch,
  mapBulk,
};
/* eslint-enable no-use-before-define */
/* eslint-enable no-underscore-dangle */
