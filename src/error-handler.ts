import { errors } from "@feathersjs/errors";

export function errorHandler(error, id) {
  if (error instanceof errors.FeathersError) {
    throw error;
  }
  const statusCode = error.statusCode;

  if (statusCode === 404 && id !== undefined) {
    throw new errors.NotFound(`No record found for id '${id}'`);
  }

  if (errors[statusCode]) {
    throw new errors[statusCode](error.message, error);
  }

  throw new errors.GeneralError(error.message, error);
}
