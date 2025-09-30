"use strict";

import { errors } from "@feathersjs/errors";
import { ElasticsearchServiceParams } from '../types';

export function raw(service: any, method: any, params: ElasticsearchServiceParams) {
  // handle client methods like indices.create
  const [primaryMethod, secondaryMethod] = method.split(".");

  if (typeof service.Model[primaryMethod] === "undefined") {
    return Promise.reject(
      new errors.MethodNotAllowed(`There is no query method ${primaryMethod}.`)
    );
  }

  if (
    secondaryMethod &&
    typeof service.Model[primaryMethod][secondaryMethod] === "undefined"
  ) {
    return Promise.reject(
      new errors.MethodNotAllowed(
        `There is no query method ${primaryMethod}.${secondaryMethod}.`
      )
    );
  }

  return typeof service.Model[primaryMethod][secondaryMethod] === "function"
    ? service.Model[primaryMethod][secondaryMethod](params)
    : service.Model[primaryMethod](params);
}
