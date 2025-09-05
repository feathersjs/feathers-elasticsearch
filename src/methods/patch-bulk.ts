'use strict';

import { mapBulk, removeProps, getDocDescriptor } from '../utils/index';

export function patchBulk(service, data, params) {
  const { filters } = service.filterQuery(params);

  // Poor man's semi-deep object extension. We only want to override params.query.$select here.
  const findParams = Object.assign(removeProps(params, 'query'), {
    query: Object.assign({}, params.query, { $select: false }),
  });

  // Elasticsearch provides update by query, which is quite sadly somewhat unfit for our purpose here.
  // Hence the find / bulk-update duo. We need to be aware, that the pagination rules apply here,
  // therefore the update will be perform on max items at any time (Es default is 5).
  return service._find(findParams).then((results) => {
    // The results might be paginated.
    const found = Array.isArray(results) ? results : results.data;

    if (!found.length) {
      return found;
    }

    const bulkUpdateParams = Object.assign(
      {
        index: filters.$index || service.index,
        body: found.reduce((result, item) => {
          const { _id, _parent: parent, _routing: routing } = item[service.meta];
          const { doc } = getDocDescriptor(service, data);
          
          const updateOp: any = { 
            update: { 
              _index: filters.$index || service.index,
              _id 
            } 
          };
          
          if (routing || parent) {
            updateOp.update.routing = routing || parent;
          }

          result.push(updateOp);
          result.push({ doc, doc_as_upsert: false });

          return result;
        }, []),
      },
      service.esParams
    );
    
    // Remove refresh from bulk params but keep it for later
    const needsRefresh = bulkUpdateParams.refresh;
    delete bulkUpdateParams.refresh;

    return service.Model.bulk(bulkUpdateParams).then((bulkResult) => {
      // If refresh was requested, do it now
      if (needsRefresh) {
        return service.Model.indices.refresh({ index: filters.$index || service.index })
          .then(() => bulkResult);
      }
      return bulkResult;
    }).then((bulkResult) => {
      // Get the updated documents with the requested $select fields
      const updatedIds = bulkResult.items
        .filter(item => item.update && (item.update.result === 'updated' || item.update.result === 'noop'))
        .map(item => item.update._id);
      
      if (updatedIds.length === 0) {
        return mapBulk(bulkResult.items, service.id, service.meta, service.join);
      }
      
      // Fetch the updated documents with selected fields
      const getParams: any = {
        index: filters.$index || service.index,
        body: {
          ids: updatedIds
        }
      };
      
      // Only add _source if $select is explicitly set
      if (filters.$select) {
        getParams._source = filters.$select;
      }
      
      return service.Model.mget(getParams).then((mgetResult) => {
        // Map the fetched documents back to the bulk result format
        const docMap = {};
        mgetResult.docs.forEach(doc => {
          if (doc.found) {
            docMap[doc._id] = doc._source;
          }
        });
        
        // Merge the selected fields with the bulk results
        return bulkResult.items.map(item => {
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
      });
    });
  });
}
