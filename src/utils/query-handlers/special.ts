import { ESQuery, SQSQuery, NestedQuery, ChildParentQuery } from '../../types';
import { validateType, removeProps } from '../core';
import { parseQuery } from '../parse-query';

/**
 * Handles $or operator - creates should clauses with minimum_should_match
 */
export function $or(value: any[], esQuery: ESQuery, idProp: string): ESQuery {
  validateType(value, '$or', 'array');

  esQuery.should = esQuery.should || [];
  esQuery.should.push(
    ...value
      .map((subQuery) => parseQuery(subQuery, idProp))
      .filter((parsed): parsed is ESQuery => !!parsed)
      .map((parsed) => ({ bool: parsed }))
  );
  esQuery.minimum_should_match = 1;

  return esQuery;
}

/**
 * Handles $and operator - merges all conditions into must/filter/should sections
 */
export function $and(value: any[], esQuery: ESQuery, idProp: string): ESQuery {
  validateType(value, '$and', 'array');

  value
    .map((subQuery) => parseQuery(subQuery, idProp))
    .filter((parsed): parsed is ESQuery => !!parsed)
    .forEach((parsed) => {
      Object.keys(parsed).forEach((section) => {
        const key = section as keyof ESQuery;
        if (key === 'minimum_should_match') {
          esQuery[key] = parsed[key];
        } else if (Array.isArray(parsed[key])) {
          esQuery[key] = [...(esQuery[key] || []), ...(parsed[key] as any[])];
        }
      });
    });

  return esQuery;
}

/**
 * Handles $all operator - adds match_all query
 */
export function $all(value: any, esQuery: ESQuery): ESQuery {
  if (!value) {
    return esQuery;
  }

  esQuery.must = esQuery.must || [];
  esQuery.must.push({ match_all: {} });

  return esQuery;
}

/**
 * Handles $sqs (simple_query_string) operator
 */
export function $sqs(value: SQSQuery | null | undefined, esQuery: ESQuery): ESQuery {
  if (value === null || value === undefined) {
    return esQuery;
  }

  validateType(value, '$sqs', 'object');
  validateType(value.$fields, '$sqs.$fields', 'array');
  validateType(value.$query, '$sqs.$query', 'string');

  if (value.$operator) {
    validateType(value.$operator, '$sqs.$operator', 'string');
  }

  esQuery.must = esQuery.must || [];
  esQuery.must.push({
    simple_query_string: {
      fields: value.$fields,
      query: value.$query,
      default_operator: value.$operator || 'or',
    },
  });

  return esQuery;
}

/**
 * Handles $nested operator for nested document queries
 */
export function $nested(value: NestedQuery | null | undefined, esQuery: ESQuery, idProp: string): ESQuery {
  if (value === null || value === undefined) {
    return esQuery;
  }

  validateType(value, '$nested', 'object');
  validateType(value.$path, '$nested.$path', 'string');

  const subQuery = parseQuery(removeProps(value, '$path'), idProp);

  if (!subQuery) {
    return esQuery;
  }

  esQuery.must = esQuery.must || [];
  esQuery.must.push({
    nested: {
      path: value.$path,
      query: {
        bool: subQuery,
      },
    },
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
  idProp: string
): ESQuery {
  const queryName = queryType === '$child' ? 'has_child' : 'has_parent';
  const typeName = queryType === '$child' ? 'type' : 'parent_type';

  if (value === null || value === undefined) {
    return esQuery;
  }

  validateType(value, queryType, 'object');
  validateType(value.$type, `${queryType}.$type`, 'string');

  const subQuery = parseQuery(removeProps(value, '$type'), idProp);

  if (!subQuery) {
    return esQuery;
  }

  esQuery.must = esQuery.must || [];
  esQuery.must.push({
    [queryName]: {
      [typeName]: value.$type,
      query: {
        bool: subQuery,
      },
    },
  });

  return esQuery;
}

/**
 * Handles $exists and $missing operators
 */
export function $existsOr$missing(
  clause: 'must' | 'must_not',
  value: string[] | null | undefined,
  esQuery: ESQuery
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