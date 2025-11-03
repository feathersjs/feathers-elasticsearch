'use strict';

import { errors } from '@feathersjs/errors';
import { ElasticsearchServiceParams, ElasticAdapterInterface } from '../types';
import { validateRawMethod } from '../utils/security';

export function raw(service: ElasticAdapterInterface, method: string, params: ElasticsearchServiceParams) {
  // SECURITY: Validate method against whitelist
  // By default, all raw methods are disabled for security
  const fullMethod = method.replace('.', '.'); // Ensure it's a string
  validateRawMethod(fullMethod, service.security.allowedRawMethods);

  // handle client methods like indices.create
  const [primaryMethod, secondaryMethod] = method.split('.');

  // Cast to Record to allow dynamic property access
  const model = service.Model as unknown as Record<string, unknown>;

  if (typeof model[primaryMethod] === 'undefined') {
    return Promise.reject(new errors.MethodNotAllowed(`There is no query method ${primaryMethod}.`));
  }

  if (secondaryMethod) {
    const primaryObj = model[primaryMethod] as Record<string, unknown>;
    if (typeof primaryObj[secondaryMethod] === 'undefined') {
      return Promise.reject(
        new errors.MethodNotAllowed(`There is no query method ${primaryMethod}.${secondaryMethod}.`)
      );
    }

    return typeof primaryObj[secondaryMethod] === 'function'
      ? (primaryObj[secondaryMethod] as (params: unknown) => Promise<unknown>)(params)
      : Promise.resolve(primaryObj[secondaryMethod]);
  }

  return typeof model[primaryMethod] === 'function'
    ? (model[primaryMethod] as (params: unknown) => Promise<unknown>)(params)
    : Promise.resolve(model[primaryMethod]);
}
