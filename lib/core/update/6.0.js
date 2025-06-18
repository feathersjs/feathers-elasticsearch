const updateCore = require('./core');

function getUpdateParams(service, docDescriptor) {
  const { id, routing, doc } = docDescriptor;

  return {
    id: String(id),
    routing,
    body: doc,
    ...service.esParams,
  };
}

function update(...args) {
  return updateCore(...args, { getUpdateParams });
}

module.exports = update;
