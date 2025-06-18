const { mapBulk, removeProps, getDocDescriptor } = require('../utils');

function patchBulk(service, data, params) {
  const { find } = service.core;
  const { filters } = service.filterQuery(params);

  // Poor man's semi-deep object extension. We only want to override params.query.$select here.
  const findParams = Object.assign(removeProps(params, 'query'), {
    query: { ...params.query, $select: false },
  });

  // Elasticsearch provides update by query, which is quite sadly somewhat unfit for our purpose here.
  // Hence the find / bulk-update duo. We need to be aware, that the pagination rules apply here,
  // therefore the update will be perform on max items at any time (Es default is 5).
  return find(service, findParams).then((results) => {
    // The results might be paginated.
    const found = Array.isArray(results) ? results : results.data;

    if (!found.length) {
      return found;
    }

    const bulkUpdateParams = {
      _source: filters.$select,
      body: found.reduce((result, item) => {
        const { _id, _parent: parent, _routing: routing } = item[service.meta];
        const { doc } = getDocDescriptor(service, data);

        result.push({ update: { _id, routing: routing || parent } });
        result.push({ doc });

        return result;
      }, []),
      ...service.esParams,
    };

    return service.Model.bulk(bulkUpdateParams).then((result) =>
      mapBulk(result.items, service.id, service.meta, service.join),
    );
  });
}

module.exports = patchBulk;
