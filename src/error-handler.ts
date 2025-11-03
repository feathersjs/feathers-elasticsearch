import { errors } from '@feathersjs/errors'
import { ElasticsearchError } from './types'

/**
 * Maps Elasticsearch error codes to Feathers error types
 */
const ERROR_MAP: Record<number, string> = {
  400: 'BadRequest',
  401: 'NotAuthenticated',
  403: 'Forbidden',
  404: 'NotFound',
  409: 'Conflict',
  422: 'Unprocessable',
  500: 'GeneralError',
  501: 'NotImplemented',
  502: 'BadGateway',
  503: 'Unavailable'
}

/**
 * Formats error message with additional context
 */
function formatErrorMessage(error: ElasticsearchError, context?: string): string {
  const baseMessage = error.message || 'An error occurred'
  const esMessage = error.meta?.body?.error?.reason || error.meta?.body?.error?.type || ''

  if (context && esMessage) {
    return `${context}: ${esMessage}`
  } else if (esMessage) {
    return esMessage
  }

  return context ? `${context}: ${baseMessage}` : baseMessage
}

/**
 * Extracts detailed error information from Elasticsearch response
 */
function extractErrorDetails(error: ElasticsearchError): Record<string, unknown> | undefined {
  const details: Record<string, unknown> = {}

  if (error.meta?.body?.error) {
    const esError = error.meta.body.error

    if (esError.caused_by) {
      details.causedBy = esError.caused_by.reason
    }

    if (esError.root_cause) {
      details.rootCause = esError.root_cause.map((cause: { type?: string; reason?: string }) => ({
        type: cause.type,
        reason: cause.reason
      }))
    }

    if (esError.failures) {
      details.failures = esError.failures
    }
  }

  return Object.keys(details).length > 0 ? details : undefined
}

/**
 * Handles Elasticsearch errors and converts them to Feathers errors
 * @param error - The Elasticsearch error
 * @param id - Optional document ID for context
 * @param context - Optional context string for better error messages
 * @returns Feathers error
 */
export function errorHandler(
  error: ElasticsearchError | Error,
  id?: string | number,
  context?: string
): Error {
  // If already a Feathers error, just return it
  if ((error as { className?: string }).className) {
    return error
  }

  // Type guard for ElasticsearchError
  const esError = error as ElasticsearchError

  // Check for specific error types first
  if (
    esError.meta?.body?.error?.type === 'version_conflict_engine_exception' ||
    (esError.name === 'ResponseError' && esError.meta?.statusCode === 409) ||
    esError.meta?.body?.status === 409
  ) {
    const message = formatErrorMessage(esError, context)
    return new errors.Conflict(message, { id })
  }

  // Extract status code from various error formats
  const statusCode =
    esError.statusCode || esError.status || esError.meta?.statusCode || esError.meta?.body?.status || 500

  // Get the appropriate error class
  const ErrorClass = ERROR_MAP[statusCode]

  type FeathersErrorConstructor = new (message: string, data?: Record<string, unknown>) => Error
  const errorsMap = errors as unknown as Record<string, FeathersErrorConstructor>

  if (!ErrorClass || !errorsMap[ErrorClass]) {
    // Fallback to GeneralError for unknown status codes
    const message = formatErrorMessage(error, context)
    const details = extractErrorDetails(error)

    return new errors.GeneralError(message, {
      statusCode,
      ...(details && { details }),
      ...(id && { id })
    })
  }

  // Create the appropriate Feathers error
  const message = formatErrorMessage(error, context)
  const details = extractErrorDetails(error)

  const FeathersError = errorsMap[ErrorClass]

  return new FeathersError(message, {
    ...(details && { details }),
    ...(id && { id })
  })
}

// Default export for backward compatibility
export default errorHandler
