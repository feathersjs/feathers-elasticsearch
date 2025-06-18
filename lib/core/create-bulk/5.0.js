const { getDocDescriptor } = require('../../utils');
const createBulkCore = require('./core');

// Elasticsearch bulk API takes two objects per index or create operation.
// First is the action descriptor, the second is usually the data.
// https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-bulk
// reduce() here is acting as a map() mapping one element into two.

function getBulkCreateParams(service, data) {
  return {
    body: data.reduce((result, item) => {
      const { id, parent, doc } = getDocDescriptor(service, item);
      const method = id !== undefined ? 'create' : 'index';

      result.push({ [method]: { _id: id, parent } });
      result.push(doc);

      return result;
    }, []),
    ...service.esParams,
  };
}

function createBulk(...args) {
  return createBulkCore(...args, { getBulkCreateParams });
}

module.exports = createBulk;
