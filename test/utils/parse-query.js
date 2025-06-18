/* eslint-disable no-unused-expressions */
const { expect } = require('chai');
const errors = require('@feathersjs/errors');

const { parseQuery } = require('../../lib/utils');

module.exports = function parseQueryTests() {
  describe('parseQuery', () => {
    it('should return null if query is null or undefined', () => {
      expect(parseQuery(null, '_id')).to.be.null;
      expect(parseQuery()).to.be.null;
    });

    it('should return null if query has no own properties', () => {
      const query = Object.create({ hello: 'world' });

      expect(parseQuery({}, '_id')).to.be.null;
      expect(parseQuery(query, '_id')).to.be.null;
    });

    it('should throw BadRequest if query is not an object, null or undefined', () => {
      expect(() => parseQuery(12, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery(true, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery('abc', '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery([], '_id')).to.throw(errors.BadRequest);
    });

    it('should throw BadRequest if $or is not an array', () => {
      expect(() => parseQuery({ $or: 12 }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $or: true }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $or: 'abc' }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $or: {} }, '_id')).to.throw(errors.BadRequest);
    });

    it('should throw BadRequest if $and is not an array', () => {
      expect(() => parseQuery({ $and: 12 }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $and: true }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $and: 'abc' }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $and: {} }, '_id')).to.throw(errors.BadRequest);
    });

    it('should throw BadRequest if $sqs is not an object, null or undefined', () => {
      expect(() => parseQuery({ $sqs: 12 }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $sqs: true }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $sqs: 'abc' }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $sqs: {} }, '_id')).to.throw(errors.BadRequest);
    });

    it('should return null if $sqs is null or undefined', () => {
      expect(parseQuery({ $sqs: null }, '_id')).to.be.null;
      expect(parseQuery({ $sqs: undefined }, '_id')).to.be.null;
    });

    it('should throw BadRequest if $sqs does not have (array)$fields property', () => {
      expect(() => parseQuery({ $sqs: { $query: '' } })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $sqs: { $query: '', $fields: 123 } })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $sqs: { $query: '', $fields: true } })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $sqs: { $query: '', $fields: {} } })).to.throw(errors.BadRequest);
    });

    it('should throw BadRequest if $sqs does not have (string)$query property', () => {
      expect(() => parseQuery({ $sqs: { $fields: [] } })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $sqs: { $fields: [], $query: 123 } })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $sqs: { $fields: [], $query: true } })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $sqs: { $fields: [], $query: {} } })).to.throw(errors.BadRequest);
    });

    it('should throw BadRequest if $sqs has non-string $operator property', () => {
      expect(() => parseQuery({ $sqs: { $fields: [], $query: '', $operator: [] } })).to.throw(
        errors.BadRequest,
      );
      expect(() => parseQuery({ $sqs: { $fields: [], $query: '', $operator: 123 } })).to.throw(
        errors.BadRequest,
      );
      expect(() => parseQuery({ $sqs: { $fields: [], $query: '', $operator: true } })).to.throw(
        errors.BadRequest,
      );
      expect(() => parseQuery({ $sqs: { $fields: [], $query: '', $operator: {} } })).to.throw(
        errors.BadRequest,
      );
    });

    it('should throw BadRequest if $child is not an object, null or undefined', () => {
      expect(() => parseQuery({ $child: 12 })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $child: true })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $child: 'abc' })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $child: [] })).to.throw(errors.BadRequest);
    });

    it('should return null if $child is null or undefined', () => {
      expect(parseQuery({ $child: null }, '_id')).to.be.null;
      expect(parseQuery({ $child: undefined }, '_id')).to.be.null;
    });

    it('should return null if $child has no criteria', () => {
      expect(parseQuery({ $child: { $type: 'hello' } })).to.be.null;
    });

    it('should throw BadRequest if $parent is not an object, null or undefined', () => {
      expect(() => parseQuery({ $parent: 12 })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $parent: true })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $parent: 'abc' })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $parent: [] })).to.throw(errors.BadRequest);
    });

    it('should return null if $parent is null or undefined', () => {
      expect(parseQuery({ $parent: null }, '_id')).to.be.null;
      expect(parseQuery({ $parent: undefined }, '_id')).to.be.null;
    });

    it('should return null if $parent has no criteria', () => {
      expect(parseQuery({ $parent: { $type: 'hello' } })).to.be.null;
    });

    it('should throw BadRequest if $parent does not have (string)$type property', () => {
      expect(() => parseQuery({ $parent: {} })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $parent: { $type: 123 } })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $parent: { $type: true } })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $parent: { $type: {} } })).to.throw(errors.BadRequest);
    });

    it('should throw BadRequest if $nested is not an object, null or undefined', () => {
      expect(() => parseQuery({ $nested: 12 })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $nested: true })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $nested: 'abc' })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $nested: [] })).to.throw(errors.BadRequest);
    });

    it('should return null if $nested is null or undefined', () => {
      expect(parseQuery({ $nested: null })).to.be.null;
      expect(parseQuery({ $nested: undefined })).to.be.null;
    });

    it('should throw BadRequest if $nested does not have (string)$path property', () => {
      expect(() => parseQuery({ $nested: {} })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $nested: { $path: 12 } })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $nested: { $path: true } })).to.throw(errors.BadRequest);
      expect(() => parseQuery({ $nested: { $path: {} } })).to.throw(errors.BadRequest);
    });

    it('should return null if $nested has no critera', () => {
      expect(parseQuery({ $nested: { $path: 'hello' } })).to.be.null;
    });

    it('should throw BadRequest if criteria is not a valid primitive, array or an object', () => {
      expect(() => parseQuery({ age: null }, '_id')).to.throw(errors.BadRequest);
      expect(() => parseQuery({ age: NaN }, '_id')).to.throw(errors.BadRequest);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      expect(() => parseQuery({ age: () => {} }, '_id')).to.throw(errors.BadRequest);
    });

    ['$exists', '$missing'].forEach((query) => {
      it(`should throw BadRequest if ${query} values are not arrays with (string)field property`, () => {
        expect(() => parseQuery({ [query]: 'foo' }, '_id')).to.throw(errors.BadRequest);
        expect(() => parseQuery({ [query]: [1234] }, '_id')).to.throw(errors.BadRequest);
        expect(() => parseQuery({ [query]: { foo: 'bar' } }, '_id')).to.throw(errors.BadRequest);
        expect(() => parseQuery({ [query]: [{ foo: 'bar' }] }, '_id')).to.throw(errors.BadRequest);
      });
    });

    it('should return term query for each primitive param', () => {
      const query = {
        user: 'doug',
        age: 23,
        active: true,
      };
      const expectedResult = {
        filter: [{ term: { user: 'doug' } }, { term: { age: 23 } }, { term: { active: true } }],
      };

      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return term query for each value from an array', () => {
      const query = {
        tags: ['javascript', 'nodejs'],
        user: 'doug',
      };
      const expectedResult = {
        filter: [
          { term: { tags: 'javascript' } },
          { term: { tags: 'nodejs' } },
          { term: { user: 'doug' } },
        ],
      };

      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should convert provided id property name to _id', () => {
      const query = { id: 12 };
      const expectedResult = {
        filter: [{ term: { _id: 12 } }],
      };
      expect(parseQuery(query, 'id')).to.deep.equal(expectedResult);
    });

    it('should return terms query for each $in param', () => {
      const query = {
        user: { $in: ['doug', 'bob'] },
        age: { $in: [23, 24, 50] },
      };
      const expectedResult = {
        filter: [{ terms: { user: ['doug', 'bob'] } }, { terms: { age: [23, 24, 50] } }],
      };

      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return term and terms query together', () => {
      const query = {
        user: 'doug',
        age: { $in: [23, 24] },
      };
      const expectedResult = {
        filter: [{ term: { user: 'doug' } }, { terms: { age: [23, 24] } }],
      };

      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return must_not terms query for each $nin param', () => {
      const query = {
        user: { $nin: ['doug', 'bob'] },
        age: { $nin: [23, 24, 50] },
      };
      const expectedResult = {
        must_not: [{ terms: { user: ['doug', 'bob'] } }, { terms: { age: [23, 24, 50] } }],
      };

      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return range query for $lt, $lte, $gt, $gte', () => {
      const query = {
        age: { $gt: 30, $lt: 40 },
        likes: { $lte: 100 },
        cars: { $gte: 2, $lt: 5 },
      };
      const expectedResult = {
        filter: [
          { range: { age: { gt: 30 } } },
          { range: { age: { lt: 40 } } },
          { range: { likes: { lte: 100 } } },
          { range: { cars: { gte: 2 } } },
          { range: { cars: { lt: 5 } } },
        ],
      };
      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return "should" subquery for $or', () => {
      const query = {
        $or: [{ user: 'Adam', age: { $gt: 40 } }, { age: { $gt: 40 } }],
      };
      const expectedResult = {
        should: [
          {
            bool: {
              filter: [{ term: { user: 'Adam' } }, { range: { age: { gt: 40 } } }],
            },
          },
          {
            bool: {
              filter: [{ range: { age: { gt: 40 } } }],
            },
          },
        ],
        minimum_should_match: 1,
      };
      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return all queries for $and', () => {
      const query = {
        $and: [
          { tags: 'javascript' },
          { tags: { $ne: 'legend' } },
          { age: { $nin: [23, 24] } },
          { age: { $in: [25, 26] } },
        ],
        name: 'Doug',
      };
      const expectedResult = {
        filter: [
          { term: { tags: 'javascript' } },
          { terms: { age: [25, 26] } },
          { term: { name: 'Doug' } },
        ],
        must_not: [{ term: { tags: 'legend' } }, { terms: { age: [23, 24] } }],
      };

      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return "simple_query_string" for $sqs with default_operator "or" by default', () => {
      const query = {
        $sqs: {
          $fields: ['description', 'title^5'],
          $query: '-(track another)',
        },
      };
      const expectedResult = {
        must: [
          {
            simple_query_string: {
              fields: ['description', 'title^5'],
              query: '-(track another)',
              default_operator: 'or',
            },
          },
        ],
      };

      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return "simple_query_string" for $sqs with specified default_operator', () => {
      const query = {
        $sqs: {
          $fields: ['description'],
          $query: '-(track another)',
          $operator: 'and',
        },
      };
      const expectedResult = {
        must: [
          {
            simple_query_string: {
              fields: ['description'],
              query: '-(track another)',
              default_operator: 'and',
            },
          },
        ],
      };

      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return "prefix" query for $prefix', () => {
      const query = {
        user: { $prefix: 'ada' },
      };
      const expectedResult = {
        filter: [{ prefix: { user: 'ada' } }],
      };
      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return "wildcard" query for $wildcard', () => {
      const query = {
        user: { $wildcard: 'ada' },
      };
      const expectedResult = {
        filter: [{ wildcard: { user: 'ada' } }],
      };
      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return "regexp" query for $regexp', () => {
      const query = {
        user: { $regexp: 'ada' },
      };
      const expectedResult = {
        filter: [{ regexp: { user: 'ada' } }],
      };
      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return "match_all" query for $all: true', () => {
      const query = {
        $all: true,
      };
      const expectedResult = {
        must: [{ match_all: {} }],
      };
      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should not return "match_all" query for $all: false', () => {
      const query = {
        $all: false,
      };
      const expectedResult = null;
      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return "match" query for $match', () => {
      const query = {
        text: { $match: 'javascript' },
      };
      const expectedResult = {
        must: [{ match: { text: 'javascript' } }],
      };
      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return "match_phrase" query for $phrase', () => {
      const query = {
        text: { $phrase: 'javascript' },
      };
      const expectedResult = {
        must: [{ match_phrase: { text: 'javascript' } }],
      };
      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return "match_phrase_prefix" query for $phrase_prefix', () => {
      const query = {
        text: { $phrase_prefix: 'javasc' },
      };
      const expectedResult = {
        must: [{ match_phrase_prefix: { text: 'javasc' } }],
      };
      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return "has_child" query for $child', () => {
      const query = {
        $child: {
          $type: 'address',
          city: 'Ashford',
        },
      };
      const expectedResult = {
        must: [
          {
            has_child: {
              type: 'address',
              query: {
                bool: {
                  filter: [{ term: { city: 'Ashford' } }],
                },
              },
            },
          },
        ],
      };
      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return "has_parent" query for $parent', () => {
      const query = {
        $parent: {
          $type: 'people',
          name: 'Douglas',
        },
      };
      const expectedResult = {
        must: [
          {
            has_parent: {
              parent_type: 'people',
              query: {
                bool: {
                  filter: [{ term: { name: 'Douglas' } }],
                },
              },
            },
          },
        ],
      };
      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    it('should return "nested" query for $nested', () => {
      const query = {
        $nested: {
          '$path': 'legend',
          'legend.name': 'Douglas',
        },
      };
      const expectedResult = {
        must: [
          {
            nested: {
              path: 'legend',
              query: {
                bool: {
                  filter: [{ term: { 'legend.name': 'Douglas' } }],
                },
              },
            },
          },
        ],
      };
      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });

    [
      ['$exists', 'must'],
      ['$missing', 'must_not'],
    ].forEach(([q, clause]) => {
      it(`should return "${clause}" query for ${q}`, () => {
        const query = {
          [q]: ['phone', 'address'],
        };
        const expectedResult = {
          [clause]: [
            {
              exists: { field: 'phone' },
            },
            {
              exists: { field: 'address' },
            },
          ],
        };
        expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
      });
    });

    it('should return all types of queries together', () => {
      const query = {
        $or: [
          { likes: { $gt: 9, $lt: 12 }, age: { $ne: 10 } },
          { user: { $nin: ['Anakin', 'Luke'] } },
          { user: { $prefix: 'ada' } },
          { $all: true },
        ],
        age: { $in: [12, 13] },
        user: 'Obi Wan',
        country: { $nin: ['us', 'pl', 'ae'] },
        bio: { $match: 'javascript', $phrase: 'the good parts' },
        $child: { $type: 'address', city: 'Ashford' },
        $parent: { $type: 'people', name: 'Douglas' },
        $nested: { '$path': 'legend', 'legend.name': { $match: 'Douglas' } },
        $and: [{ tags: 'javascript' }, { tags: 'legend' }],
        $exists: ['phone'],
        $missing: ['address'],
      };
      const expectedResult = {
        should: [
          {
            bool: {
              filter: [{ range: { likes: { gt: 9 } } }, { range: { likes: { lt: 12 } } }],
              must_not: [{ term: { age: 10 } }],
            },
          },
          {
            bool: {
              must_not: [{ terms: { user: ['Anakin', 'Luke'] } }],
            },
          },
          {
            bool: {
              filter: [{ prefix: { user: 'ada' } }],
            },
          },
          {
            bool: {
              must: [{ match_all: {} }],
            },
          },
        ],
        minimum_should_match: 1,
        filter: [
          { terms: { age: [12, 13] } },
          { term: { user: 'Obi Wan' } },
          { term: { tags: 'javascript' } },
          { term: { tags: 'legend' } },
        ],
        must_not: [{ terms: { country: ['us', 'pl', 'ae'] } }, { exists: { field: 'address' } }],
        must: [
          { match: { bio: 'javascript' } },
          { match_phrase: { bio: 'the good parts' } },
          {
            has_child: {
              type: 'address',
              query: {
                bool: {
                  filter: [{ term: { city: 'Ashford' } }],
                },
              },
            },
          },
          {
            has_parent: {
              parent_type: 'people',
              query: {
                bool: {
                  filter: [{ term: { name: 'Douglas' } }],
                },
              },
            },
          },
          {
            nested: {
              path: 'legend',
              query: {
                bool: {
                  must: [{ match: { 'legend.name': 'Douglas' } }],
                },
              },
            },
          },
          { exists: { field: 'phone' } },
        ],
      };

      expect(parseQuery(query, '_id')).to.deep.equal(expectedResult);
    });
  });
};
/* eslint-enable no-unused-expressions */
