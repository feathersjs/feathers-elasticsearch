'use strict';

import { removeProps, getType, validateType } from './core';

const queryCriteriaMap = {
  $nin: 'must_not.terms',
  $in: 'filter.terms',
  $gt: 'filter.range.gt',
  $gte: 'filter.range.gte',
  $lt: 'filter.range.lt',
  $lte: 'filter.range.lte',
  $ne: 'must_not.term',
  $prefix: 'filter.prefix',
  $wildcard: 'filter.wildcard',
  $regexp: 'filter.regexp',
  $match: 'must.match',
  $phrase: 'must.match_phrase',
  $phrase_prefix: 'must.match_phrase_prefix',
};

const specialQueryHandlers = {
  $or,
  $and,
  $all,
  $sqs,
  $nested: (value, esQuery, idProp) => $nested(value, esQuery, idProp),
  $exists: (...args: any[]) => $existsOr$missing('must', ...(args as [any, any])),
  $missing: (...args: any[]) => $existsOr$missing('must_not', ...(args as [any, any])),
  $child: (value, esQuery, idProp) => $childOr$parent('$child', value, esQuery, idProp),
  $parent: (value, esQuery, idProp) => $childOr$parent('$parent', value, esQuery, idProp),
};

function $or(value, esQuery, idProp) {
  validateType(value, '$or', 'array');

  esQuery.should = esQuery.should || [];
  esQuery.should.push(
    ...value
      .map((subQuery) => parseQuery(subQuery, idProp))
      .filter((parsed) => !!parsed)
      .map((parsed) => ({ bool: parsed }))
  );
  esQuery.minimum_should_match = 1;

  return esQuery;
}

function $all(value, esQuery) {
  if (!value) {
    return esQuery;
  }

  esQuery.must = esQuery.must || [];
  esQuery.must.push({ match_all: {} });

  return esQuery;
}

function $and(value, esQuery, idProp) {
  validateType(value, '$and', 'array');

  value
    .map((subQuery) => parseQuery(subQuery, idProp))
    .filter((parsed) => !!parsed)
    .forEach((parsed) => {
      Object.keys(parsed).forEach((section) => {
        esQuery[section] = esQuery[section] || [];
        esQuery[section].push(...parsed[section]);
      });
    });

  return esQuery;
}

function $sqs(value, esQuery) {
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

function $childOr$parent(queryType, value, esQuery, idProp) {
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

function $nested(value, esQuery, idProp) {
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

function $existsOr$missing(clause, value, esQuery) {
  if (value === null || value === undefined) {
    return esQuery;
  }

  validateType(value, `${clause}.exists`, 'array');

  const values = value.map((val, i) => {
    validateType(val, `${clause}.exists[${i}]`, 'string');
    return { exists: { field: val } };
  });

  esQuery[clause] = (esQuery[clause] || []).concat(values);

  return esQuery;
}

export function parseQuery(query, idProp) {
  validateType(query, 'query', ['object', 'null', 'undefined']);

  if (query === null || query === undefined) {
    return null;
  }

  const bool = Object.entries(query).reduce((result: any, [key, value]) => {
    const type = getType(value);

    // The search can be done by ids as well.
    // We need to translate the id prop used by the app to the id prop used by Es.
    if (key === idProp) {
      key = '_id';
    }

    if (specialQueryHandlers[key]) {
      return specialQueryHandlers[key](value, result, idProp);
    }

    validateType(value, key, ['number', 'string', 'boolean', 'undefined', 'object', 'array']);
    // The value is not an object, which means it's supposed to be a primitive or an array.
    // We need add simple filter[{term: {}}] query.
    if (type !== 'object') {
      result.filter = result.filter || [];
      if (type === 'array') {
        (value as any[]).forEach((value) => result.filter.push({ term: { [key]: value } }));
      } else {
        result.filter.push({ term: { [key]: value } });
      }

      return result;
    }

    // In this case the key is not $or and value is an object,
    // so we are most probably dealing with criteria.
    Object.keys(value)
      .filter((criterion) => queryCriteriaMap[criterion])
      .forEach((criterion) => {
        const [section, term, operand] = queryCriteriaMap[criterion].split('.');

        result[section] = result[section] || [];
        
        result[section].push({
          [term]: {
            [key]: operand ? { [operand]: value[criterion] } : value[criterion],
          },
        });
      });

    return result;
  }, {});

  if (!Object.keys(bool).length) {
    return null;
  }

  return bool;
}
