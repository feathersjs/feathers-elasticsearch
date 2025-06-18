const updateCore = require('./core');

function getUpdateParams(service, docDescriptor) {
  const { id, parent, doc } = docDescriptor;

  return {
    id: String(id),
    parent,
    body: doc,
    ...service.esParams,
  };
}

function update(...args) {
  return updateCore(...args, { getUpdateParams });
}

module.exports = update;
