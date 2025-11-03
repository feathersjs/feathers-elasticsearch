import { ESQuery, SQSQuery, NestedQuery, ChildParentQuery } from '../../types';
import { validateType, removeProps } from '../core';
import { parseQuery } from '../parse-query';
import { sanitizeQueryString } from '../security';

/**
 * Handles $or operator - creates should clauses with minimum_should_match
 */
export function $or(
  value: unknown,
  esQuery: ESQuery,
  idProp: string,
  maxDepth: number = 50,
  currentDepth: number = 0
): ESQuery {
  const arrayValue = value as Array<Record<string, unknown>>;
  validateType(value, '$or', 'array');

  esQuery.should = esQuery.should || [];
  esQuery.should.push(
    ...arrayValue
      .map((subQuery) => parseQuery(subQuery, idProp, maxDepth, currentDepth + 1))
      .filter((parsed): parsed is ESQuery => !!parsed)
      .map((parsed) => ({ bool: parsed }))
  );
  esQuery.minimum_should_match = 1;

  return esQuery;
}

/**
 * Handles $and operator - merges all conditions into must/filter/should sections
 */
export function $and(
  value: unknown,
  esQuery: ESQuery,
  idProp: string,
  maxDepth: number = 50,
  currentDepth: number = 0
): ESQuery {
  const arrayValue = value as Array<Record<string, unknown>>;
  validateType(value, '$and', 'array');

  arrayValue
    .map((subQuery) => parseQuery(subQuery, idProp, maxDepth, currentDepth + 1))
    .filter((parsed): parsed is ESQuery => !!parsed)
    .forEach((parsed) => {
      Object.keys(parsed).forEach((section) => {
        const key = section as keyof ESQuery;
        if (key === 'minimum_should_match') {
          esQuery[key] = parsed[key];
        } else if (Array.isArray(parsed[key])) {
          esQuery[key] = [...(esQuery[key] || []), ...(parsed[key] as Array<Record<string, unknown>>)];
        }
      });
    });

  return esQuery;
}

/**
 * Handles $all operator - adds match_all query
 */
export function $all(
  value: unknown,
  esQuery: ESQuery,
  _idProp?: string,
  _maxDepth?: number,
  _currentDepth?: number
): ESQuery {
  if (!value) {
    return esQuery;
  }

  esQuery.must = esQuery.must || [];
  esQuery.must.push({ match_all: {} });

  return esQuery;
}

/**
 * Handles $sqs (simple_query_string) operator
 * SECURITY: Query string is sanitized to prevent regex DoS attacks
 */
export function $sqs(
  value: SQSQuery | null | undefined,
  esQuery: ESQuery,
  _idProp?: string,
  _maxDepth?: number,
  _currentDepth?: number
): ESQuery {
  if (value === null || value === undefined) {
    return esQuery;
  }

  validateType(value, '$sqs', 'object');
  validateType(value.$fields, '$sqs.$fields', 'array');
  validateType(value.$query, '$sqs.$query', 'string');

  if (value.$operator) {
    validateType(value.$operator, '$sqs.$operator', 'string');
  }

  // Sanitize query string to prevent catastrophic backtracking and limit length
  const sanitizedQuery = sanitizeQueryString(value.$query, 500);

  esQuery.must = esQuery.must || [];
  esQuery.must.push({
    simple_query_string: {
      fields: value.$fields,
      query: sanitizedQuery,
      default_operator: value.$operator || 'or'
    }
  });

  return esQuery;
}

/**
 * Handles $nested operator for nested document queries
 */
export function $nested(
  value: NestedQuery | null | undefined,
  esQuery: ESQuery,
  idProp: string,
  maxDepth: number = 50,
  currentDepth: number = 0
): ESQuery {
  if (value === null || value === undefined) {
    return esQuery;
  }

  validateType(value, '$nested', 'object');
  validateType(value.$path, '$nested.$path', 'string');

  const subQuery = parseQuery(removeProps(value, '$path'), idProp, maxDepth, currentDepth + 1);

  if (!subQuery) {
    return esQuery;
  }

  esQuery.must = esQuery.must || [];
  esQuery.must.push({
    nested: {
      path: value.$path,
      query: {
        bool: subQuery
      }
    }
  });

  return esQuery;
}

/**
 * Handles $child and $parent operators for join queries
 */
export function $childOr$parent(
  queryType: '$child' | '$parent',
  value: ChildParentQuery | null | undefined,
  esQuery: ESQuery,
  idProp: string,
  maxDepth: number = 50,
  currentDepth: number = 0
): ESQuery {
  const queryName = queryType === '$child' ? 'has_child' : 'has_parent';
  const typeName = queryType === '$child' ? 'type' : 'parent_type';

  if (value === null || value === undefined) {
    return esQuery;
  }

  validateType(value, queryType, 'object');
  validateType(value.$type, `${queryType}.$type`, 'string');

  const subQuery = parseQuery(removeProps(value, '$type'), idProp, maxDepth, currentDepth + 1);

  if (!subQuery) {
    return esQuery;
  }

  esQuery.must = esQuery.must || [];
  esQuery.must.push({
    [queryName]: {
      [typeName]: value.$type,
      query: {
        bool: subQuery
      }
    }
  });

  return esQuery;
}

/**
 * Handles $exists and $missing operators
 */
export function $existsOr$missing(
  clause: 'must' | 'must_not',
  value: string[] | null | undefined,
  esQuery: ESQuery,
  _idProp?: string,
  _maxDepth?: number,
  _currentDepth?: number
): ESQuery {
  if (value === null || value === undefined) {
    return esQuery;
  }

  const operatorName = clause === 'must' ? '$exists' : '$missing';
  validateType(value, operatorName, 'array');

  const values = value.map((val, i) => {
    validateType(val, `${operatorName}[${i}]`, 'string');
    return { exists: { field: val } };
  });

  esQuery[clause] = [...(esQuery[clause] || []), ...values];

  return esQuery;
}
