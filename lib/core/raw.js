const errors = require('@feathersjs/errors');

function raw(service, method, params) {
  // handle client methods like indices.create
  const [primaryMethod, secondaryMethod] = method.split('.');

  if (typeof service.Model[primaryMethod] === 'undefined') {
    return Promise.reject(errors.MethodNotAllowed(`There is no query method ${primaryMethod}.`));
  }

  if (secondaryMethod && typeof service.Model[primaryMethod][secondaryMethod] === 'undefined') {
    return Promise.reject(
      errors.MethodNotAllowed(`There is no query method ${primaryMethod}.${secondaryMethod}.`),
    );
  }

  return typeof service.Model[primaryMethod][secondaryMethod] === 'function'
    ? service.Model[primaryMethod][secondaryMethod](params)
    : service.Model[primaryMethod](params);
}

module.exports = raw;
