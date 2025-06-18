const createCore = require('./core');

function getCreateParams(service, docDescriptor) {
  let { doc } = docDescriptor;
  const { id, parent, routing, join } = docDescriptor;

  if (join) {
    doc = {
      [service.join]: {
        name: join,
        parent,
      },
      ...doc,
    };
  }

  return { id, routing, body: doc, ...service.esParams };
}

function create(...args) {
  return createCore(...args, { getCreateParams });
}

module.exports = create;
