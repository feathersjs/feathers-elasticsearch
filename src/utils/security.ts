/**
 * Security utilities for input validation, sanitization, and protection
 * against common attack vectors.
 */

import { errors } from '@feathersjs/errors';

/**
 * Keys that could be used for prototype pollution attacks
 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Default security configuration
 */
export interface SecurityConfig {
  /**
   * Maximum depth for nested queries ($or, $and, $nested, etc.)
   * @default 50
   */
  maxQueryDepth?: number

  /**
   * Maximum number of items in array operators ($in, $nin, etc.)
   * @default 10000
   */
  maxArraySize?: number

  /**
   * Maximum number of documents affected by bulk operations
   * @default 10000
   */
  maxBulkOperations?: number

  /**
   * Maximum size of a single document in bytes
   * @default 10485760 (10MB)
   */
  maxDocumentSize?: number

  /**
   * Maximum length of query strings for $sqs operator
   * @default 500
   */
  maxQueryStringLength?: number

  /**
   * Allowed indices for cross-index queries via $index filter
   * Empty array means only the default index is allowed
   * @default []
   */
  allowedIndices?: string[]

  /**
   * Allowed methods for raw() API calls
   * Empty array means raw() is completely disabled
   * @default []
   */
  allowedRawMethods?: string[]

  /**
   * Searchable fields for $sqs queries
   * Empty array means all fields are searchable
   * @default []
   */
  searchableFields?: string[]

  /**
   * Enable detailed error messages (for development)
   * Should be false in production
   * @default false in production, true in development
   */
  enableDetailedErrors?: boolean

  /**
   * Enable sanitization of input objects to prevent prototype pollution
   * @default true
   */
  enableInputSanitization?: boolean
}

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: Required<SecurityConfig> = {
  maxQueryDepth: 50,
  maxArraySize: 10000,
  maxBulkOperations: 10000,
  maxDocumentSize: 10 * 1024 * 1024, // 10MB
  maxQueryStringLength: 500,
  allowedIndices: [],
  allowedRawMethods: [],
  searchableFields: [],
  enableDetailedErrors: process.env.NODE_ENV !== 'production',
  enableInputSanitization: true
};

/**
 * Sanitizes an object by removing dangerous keys that could be used
 * for prototype pollution attacks.
 *
 * @param obj - Object to sanitize
 * @returns Sanitized object without dangerous keys
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item as Record<string, unknown>) as unknown) as unknown as T;
  }

  // Create clean object without prototype
  const sanitized = Object.create(null);

  for (const key of Object.keys(obj)) {
    // Skip dangerous keys
    if (DANGEROUS_KEYS.includes(key)) {
      continue;
    }

    const value = obj[key];

    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

/**
 * Validates the depth of a nested query structure
 *
 * @param query - Query object to validate
 * @param maxDepth - Maximum allowed depth
 * @param currentDepth - Current depth (for recursion)
 * @throws BadRequest if query exceeds maximum depth
 */
export function validateQueryDepth(query: unknown, maxDepth: number, currentDepth: number = 0): void {
  if (!query || typeof query !== 'object') {
    return;
  }

  if (currentDepth > maxDepth) {
    throw new errors.BadRequest(`Query nesting exceeds maximum depth of ${maxDepth}`);
  }

  // Check for nested query operators
  const nestedOperators = ['$or', '$and', '$nested', '$child', '$parent'];

  for (const key of Object.keys(query as object)) {
    const value = (query as Record<string, unknown>)[key];

    if (nestedOperators.includes(key)) {
      if (Array.isArray(value)) {
        // $or and $and contain arrays of queries
        for (const item of value) {
          validateQueryDepth(item, maxDepth, currentDepth + 1);
        }
      } else if (typeof value === 'object' && value !== null) {
        // $nested, $child, $parent contain nested objects
        validateQueryDepth(value, maxDepth, currentDepth + 1);
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recurse into nested objects
      validateQueryDepth(value, maxDepth, currentDepth + 1);
    }
  }
}

/**
 * Validates array size for operators like $in, $nin
 *
 * @param array - Array to validate
 * @param fieldName - Name of the field (for error messages)
 * @param maxSize - Maximum allowed array size
 * @throws BadRequest if array exceeds maximum size
 */
export function validateArraySize(array: unknown[], fieldName: string, maxSize: number): void {
  if (array.length > maxSize) {
    throw new errors.BadRequest(
      `Array size for '${fieldName}' (${array.length}) exceeds maximum of ${maxSize}`
    );
  }
}

/**
 * Validates document size
 *
 * @param data - Document data
 * @param maxSize - Maximum allowed size in bytes
 * @throws BadRequest if document exceeds maximum size
 */
export function validateDocumentSize(data: unknown, maxSize: number): void {
  const size = JSON.stringify(data).length;

  if (size > maxSize) {
    throw new errors.BadRequest(`Document size (${size} bytes) exceeds maximum allowed (${maxSize} bytes)`);
  }
}

/**
 * Validates index name against whitelist
 *
 * @param requestedIndex - Index name to validate
 * @param defaultIndex - Default index name
 * @param allowedIndices - Array of allowed index names
 * @returns Validated index name
 * @throws Forbidden if index is not in whitelist
 */
export function validateIndexName(
  requestedIndex: string,
  defaultIndex: string,
  allowedIndices: string[]
): string {
  // If no whitelist specified, only allow default index
  const whitelist = allowedIndices.length > 0 ? allowedIndices : [defaultIndex];

  if (!whitelist.includes(requestedIndex)) {
    throw new errors.Forbidden(`Access to index '${requestedIndex}' is not allowed`);
  }

  return requestedIndex;
}

/**
 * Validates raw method name against whitelist
 *
 * @param method - Method name to validate (e.g., 'search' or 'indices.delete')
 * @param allowedMethods - Array of allowed method names
 * @throws MethodNotAllowed if method is not in whitelist
 */
export function validateRawMethod(method: string, allowedMethods: string[]): void {
  if (allowedMethods.length === 0) {
    throw new errors.MethodNotAllowed('Raw Elasticsearch API calls are disabled for security reasons');
  }

  if (!allowedMethods.includes(method)) {
    throw new errors.MethodNotAllowed(
      `Raw method '${method}' is not allowed. Allowed methods: ${allowedMethods.join(', ')}`
    );
  }
}

/**
 * Sanitizes query string for $sqs operator
 *
 * @param queryString - Query string to sanitize
 * @param maxLength - Maximum allowed length
 * @throws BadRequest if query contains dangerous patterns
 */
export function sanitizeQueryString(queryString: string, maxLength: number): string {
  // Validate length
  if (queryString.length > maxLength) {
    throw new errors.BadRequest(`Query string length (${queryString.length}) exceeds maximum of ${maxLength}`);
  }

  // Check for catastrophic backtracking patterns
  const dangerousPatterns = [
    /\/\.\*(\.\*)+/, // Regex with multiple .*
    /\(\.\*\)\+/, // (.*)+
    /\(\.\+\)\+/ // (.+)+
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(queryString)) {
      throw new errors.BadRequest('Query string contains potentially dangerous regex pattern');
    }
  }

  return queryString;
}

/**
 * Validates searchable fields for $sqs operator
 *
 * @param requestedFields - Fields requested by user
 * @param allowedFields - Whitelist of allowed fields (empty = all allowed)
 * @throws BadRequest if requested field is not in whitelist
 */
export function validateSearchableFields(requestedFields: string[], allowedFields: string[]): void {
  // If no whitelist, allow all fields
  if (allowedFields.length === 0) {
    return;
  }

  for (const field of requestedFields) {
    // Remove boost notation (e.g., "name^2" -> "name")
    const cleanField = field.replace(/\^.*$/, '');

    if (!allowedFields.includes(cleanField)) {
      throw new errors.BadRequest(
        `Field '${field}' is not searchable. Allowed fields: ${allowedFields.join(', ')}`
      );
    }
  }
}

/**
 * Sanitizes error for production use
 * Removes sensitive information from error messages
 *
 * @param error - Error to sanitize
 * @param enableDetailedErrors - Whether to include detailed error information
 * @returns Sanitized error message
 */
export function sanitizeError(
  error: Error & { statusCode?: number; code?: number; details?: unknown; stack?: string; meta?: unknown },
  enableDetailedErrors: boolean
): Error & { statusCode?: number; code?: number; message: string } {
  if (enableDetailedErrors) {
    // In development, return full error details
    return error;
  }

  // In production, return generic error messages
  const genericMessages: Record<number, string> = {
    400: 'Invalid request parameters',
    404: 'Resource not found',
    409: 'Resource conflict',
    500: 'Internal server error'
  };

  const statusCode = error.statusCode || error.code || 500;
  const sanitized = { ...error };

  sanitized.message = genericMessages[statusCode] || genericMessages[500];

  // Remove sensitive fields
  delete sanitized.details;
  delete sanitized.stack;
  delete sanitized.meta;

  return sanitized;
}

/**
 * Calculates the complexity score of a query
 * Used for rate limiting or rejection of overly complex queries
 *
 * @param query - Query object
 * @returns Complexity score (higher = more complex)
 */
export function calculateQueryComplexity(query: unknown): number {
  if (!query || typeof query !== 'object') {
    return 0;
  }

  let complexity = 0;

  for (const key of Object.keys(query as object)) {
    const value = (query as Record<string, unknown>)[key];

    // Each operator adds to complexity
    complexity += 1;

    // Nested operators are more expensive
    if (key === '$or' || key === '$and') {
      if (Array.isArray(value)) {
        for (const item of value) {
          complexity += calculateQueryComplexity(item) * 2;
        }
      }
    } else if (key === '$nested' || key === '$child' || key === '$parent') {
      if (typeof value === 'object') {
        complexity += calculateQueryComplexity(value) * 3;
      }
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      complexity += calculateQueryComplexity(value);
    } else if (Array.isArray(value)) {
      // Arrays add to complexity based on length
      complexity += Math.min(value.length, 100);
    }
  }

  return complexity;
}
