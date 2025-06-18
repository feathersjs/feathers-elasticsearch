const createCore = require('./core');

function getCreateParams(service, docDescriptor) {
  const { id, parent, doc } = docDescriptor;

  return { id, parent, body: doc, ...service.esParams };
}

function create(...args) {
  return createCore(...args, { getCreateParams });
}

module.exports = create;
