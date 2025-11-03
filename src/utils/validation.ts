import { errors as feathersErrors } from '@feathersjs/errors';
import { ElasticsearchServiceParams } from '../types';

/**
 * Validation schema for different operations
 */
export interface ValidationSchema {
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean'
  required?: string[]
  properties?: Record<string, ValidationSchema>
  items?: ValidationSchema
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  enum?: unknown[]
  custom?: (_value: unknown) => boolean | string
}

/**
 * Validates a value against a schema
 * @param value - Value to validate
 * @param schema - Validation schema
 * @param path - Current path for error messages
 * @returns Validation errors or null if valid
 */
export function validate(value: unknown, schema: ValidationSchema, path: string = 'data'): string[] | null {
  const errors: string[] = [];

  // Check type
  if (schema.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== schema.type) {
      errors.push(`${path} must be of type ${schema.type}, got ${actualType}`);
      return errors; // Stop validation if type is wrong
    }
  }

  // Check enum values
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path} must be one of: ${schema.enum.join(', ')}`);
  }

  // Object validation
  if (schema.type === 'object' && value && schema.properties) {
    const valueObj = value as Record<string, unknown>;
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in valueObj) || valueObj[field] === undefined) {
          errors.push(`${path}.${field} is required`);
        }
      }
    }

    // Validate properties
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (key in valueObj) {
        const propErrors = validate(valueObj[key], propSchema, `${path}.${key}`);
        if (propErrors) {
          errors.push(...propErrors);
        }
      }
    }
  }

  // Array validation
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path} must have at least ${schema.minLength} items`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path} must have at most ${schema.maxLength} items`);
    }

    // Validate items
    if (schema.items) {
      value.forEach((item, index) => {
        const itemErrors = validate(item, schema.items!, `${path}[${index}]`);
        if (itemErrors) {
          errors.push(...itemErrors);
        }
      });
    }
  }

  // String validation
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path} must be at least ${schema.minLength} characters`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path} must be at most ${schema.maxLength} characters`);
    }
    if (schema.pattern && !schema.pattern.test(value)) {
      errors.push(`${path} does not match required pattern`);
    }
  }

  // Number validation
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      errors.push(`${path} must be at least ${schema.min}`);
    }
    if (schema.max !== undefined && value > schema.max) {
      errors.push(`${path} must be at most ${schema.max}`);
    }
  }

  // Custom validation
  if (schema.custom) {
    const result = schema.custom(value);
    if (result !== true) {
      errors.push(typeof result === 'string' ? result : `${path} failed custom validation`);
    }
  }

  return errors.length > 0 ? errors : null;
}

/**
 * Common validation schemas for Elasticsearch operations
 */
export const schemas = {
  /**
   * Schema for document creation
   */
  create: {
    single: {
      type: 'object' as const,
      required: [],
      custom: (value: unknown) => {
        if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
          return 'Document cannot be empty';
        }
        return true;
      }
    },
    bulk: {
      type: 'array' as const,
      minLength: 1,
      items: {
        type: 'object' as const,
        custom: (value: unknown) => {
          if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
            return 'Document cannot be empty';
          }
          return true;
        }
      }
    }
  },

  /**
   * Schema for document update
   */
  update: {
    type: 'object' as const,
    required: [],
    custom: (value: unknown) => {
      if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
        return 'Update data cannot be empty';
      }
      return true;
    }
  },

  /**
   * Schema for document patch
   */
  patch: {
    type: 'object' as const,
    custom: (value: unknown) => {
      if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
        return 'Patch data cannot be empty';
      }
      return true;
    }
  },

  /**
   * Schema for ID validation
   */
  id: {
    custom: (value: unknown) => {
      if (value === null || value === undefined) {
        return 'ID cannot be null or undefined';
      }
      if (typeof value !== 'string' && typeof value !== 'number') {
        return 'ID must be a string or number';
      }
      if (value === '') {
        return 'ID cannot be empty';
      }
      return true;
    }
  }
};

/**
 * Validates create operation data
 * @param data - Data to create
 * @throws {BadRequest} If validation fails
 */
export function validateCreate(data: unknown): void {
  const schema = Array.isArray(data) ? schemas.create.bulk : schemas.create.single;
  const errors = validate(data, schema);

  if (errors) {
    throw new feathersErrors.BadRequest('Validation failed', { errors });
  }
}

/**
 * Validates update operation data
 * @param id - Document ID
 * @param data - Update data
 * @throws {BadRequest} If validation fails
 */
export function validateUpdate(id: unknown, data: unknown): void {
  const idErrors = validate(id, schemas.id, 'id');
  const dataErrors = validate(data, schemas.update);

  const allErrors = [...(idErrors || []), ...(dataErrors || [])];

  if (allErrors.length > 0) {
    throw new feathersErrors.BadRequest('Validation failed', { errors: allErrors });
  }
}

/**
 * Validates patch operation data
 * @param id - Document ID (can be null for bulk)
 * @param data - Patch data
 * @throws {BadRequest} If validation fails
 */
export function validatePatch(id: unknown, data: unknown): void {
  const errors: string[] = [];

  // For single patch, validate ID
  if (id !== null) {
    const idErrors = validate(id, schemas.id, 'id');
    if (idErrors) {
      errors.push(...idErrors);
    }
  }

  // Validate patch data
  const dataErrors = validate(data, schemas.patch);
  if (dataErrors) {
    errors.push(...dataErrors);
  }

  if (errors.length > 0) {
    throw new feathersErrors.BadRequest('Validation failed', { errors });
  }
}

/**
 * Validates remove operation
 * @param id - Document ID (can be null for bulk)
 * @throws {BadRequest} If validation fails
 */
export function validateRemove(id: unknown): void {
  if (id !== null) {
    const errors = validate(id, schemas.id, 'id');
    if (errors) {
      throw new feathersErrors.BadRequest('Validation failed', { errors });
    }
  }
}

/**
 * Validates query parameters
 * @param params - Query parameters
 * @throws {BadRequest} If validation fails
 */
export function validateQueryParams(params: ElasticsearchServiceParams): void {
  if (params.query) {
    // Check for invalid operators
    const invalidOperators = Object.keys(params.query).filter((key) => {
      return (
        key.startsWith('$') &&
        ![
          '$in',
          '$nin',
          '$gt',
          '$gte',
          '$lt',
          '$lte',
          '$ne',
          '$or',
          '$and',
          '$not',
          '$nor',
          '$exists',
          '$missing',
          '$match',
          '$phrase',
          '$phrase_prefix',
          '$prefix',
          '$wildcard',
          '$regexp',
          '$all',
          '$sqs',
          '$nested',
          '$child',
          '$parent',
          '$select',
          '$sort',
          '$limit',
          '$skip',
          '$index'
        ].includes(key)
      );
    });

    if (invalidOperators.length > 0) {
      throw new feathersErrors.BadRequest(`Invalid query operators: ${invalidOperators.join(', ')}`);
    }
  }

  // Validate pagination parameters
  if (params.paginate !== false) {
    if (params.query?.$limit !== undefined) {
      const limit = params.query.$limit;
      if (typeof limit !== 'number' || limit < 0) {
        throw new feathersErrors.BadRequest('$limit must be a positive number');
      }
    }

    if (params.query?.$skip !== undefined) {
      const skip = params.query.$skip;
      if (typeof skip !== 'number' || skip < 0) {
        throw new feathersErrors.BadRequest('$skip must be a positive number');
      }
    }
  }
}
