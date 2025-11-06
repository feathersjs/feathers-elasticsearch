import { expect } from 'chai'

import { mapFind, mapGet, mapPatch, mapBulk } from '../../lib/utils/index.js'

import parseQueryTests from './parse-query.js'
import coreUtilsTests from './core.js'

describe('Elasticsearch utils', () => {
  describe('mapFind', () => {
    let sourceResults: any
    let mappedResults: any

    beforeEach(() => {
      sourceResults = {
        hits: {
          max_score: 0.677,
          total: 2,
          hits: [
            {
              _id: 12,
              _type: 'people',
              _source: {
                name: 'Andy',
              },
            },
            {
              _id: 15,
              _type: 'people',
              _source: {
                name: 'Duke',
              },
            },
          ],
        },
      }
      mappedResults = [
        {
          _id: 12,
          name: 'Andy',
          _meta: {
            _id: 12,
            _type: 'people',
          },
        },
        {
          _id: 15,
          name: 'Duke',
          _meta: {
            _id: 15,
            _type: 'people',
          },
        },
      ]
    })

    it('should swap around meta and the docs', () => {
      const expectedResult = mappedResults

      expect(mapFind(sourceResults, '_id', '_meta')).to.deep.equal(expectedResult)
    })

    it('should returned paginated results when hasPagination is true', () => {
      const filters = {
        $skip: 10,
        $limit: 25,
      }
      const expectedResult = {
        total: 2,
        skip: filters.$skip,
        limit: filters.$limit,
        data: mappedResults,
      }

      expect(mapFind(sourceResults, '_id', '_meta', undefined, filters, true)).to.deep.equal(
        expectedResult
      )
    })

    it('should support `hits.total` as an object in the response', () => {
      const filters = {
        $skip: 10,
        $limit: 25,
      }
      const expectedResult = {
        total: 2,
        skip: filters.$skip,
        limit: filters.$limit,
        data: mappedResults,
      }
      const { total } = sourceResults.hits

      sourceResults.hits.total = { value: total }

      expect(mapFind(sourceResults, '_id', '_meta', undefined, filters, true)).to.deep.equal(
        expectedResult
      )
    })
  })

  describe('mapGet', () => {
    let item: any

    beforeEach(() => {
      item = {
        _id: 12,
        _type: 'people',
        _index: 'test',
        _source: {
          name: 'John',
          age: 13,
          aka: {
            name: 'alias',
            parent: 1,
          },
        },
        found: true,
      }
    })

    it('should swap around meta and the doc', () => {
      const expectedResult = {
        name: 'John',
        age: 13,
        aka: {
          name: 'alias',
          parent: 1,
        },
        _id: 12,
        _meta: {
          _id: 12,
          _type: 'people',
          _index: 'test',
          found: true,
        },
      }

      expect(mapGet(item, '_id', '_meta')).to.deep.equal(expectedResult)
    })

    it('should extract parent from join field when join prop provided', () => {
      const expectedResult = {
        name: 'John',
        age: 13,
        aka: 'alias',
        _id: 12,
        _meta: {
          _id: 12,
          _type: 'people',
          _index: 'test',
          found: true,
          _parent: 1,
        },
      }

      expect(mapGet(item, '_id', '_meta', 'aka')).to.deep.equal(expectedResult)
    })

    it('should not change the original item', () => {
      const itemSnapshot = JSON.stringify(item)

      mapGet(item, '_id', '_meta')
      expect(item).to.deep.equal(JSON.parse(itemSnapshot))
    })
  })

  describe('mapPatch', () => {
    let item: any

    beforeEach(() => {
      item = {
        _id: 12,
        _type: 'people',
        _index: 'test',
        get: {
          _source: {
            name: 'John',
            age: 13,
          },
          found: true,
        },
        result: 'updated',
      }
    })

    it('should swap around meta and the doc', () => {
      const expectedResult = {
        _id: 12,
        name: 'John',
        age: 13,
        _meta: {
          _id: 12,
          _type: 'people',
          _index: 'test',
          result: 'updated',
        },
      }

      expect(mapPatch(item, '_id', '_meta')).to.deep.equal(expectedResult)
    })

    it('should return just meta if patched document not present', () => {
      delete item.get
      const expectedResult = {
        _id: 12,
        _meta: {
          _id: 12,
          _type: 'people',
          _index: 'test',
          result: 'updated',
        },
      }

      expect(mapPatch(item, '_id', '_meta')).to.deep.equal(expectedResult)
    })

    it('should not change the original item', () => {
      const itemSnapshot = JSON.stringify(item)

      mapPatch(item, '_id', '_meta')
      expect(item).to.deep.equal(JSON.parse(itemSnapshot))
    })
  })

  describe('mapBulk', () => {
    it('should get rid of action name property swap around meta and the doc', () => {
      const items: any[] = [
        { create: { status: 409, _id: '12' } },
        { index: { result: 'created', _id: '13' } },
        { delete: { result: 'deleted' } },
        { update: { result: 'updated', get: { _source: { name: 'Bob' } } } },
        {
          update: {
            result: 'updated',
            get: {
              _source: {
                name: 'Sunshine',
                aka: { name: 'alias', parent: '12' },
              },
            },
          },
        },
      ]
      const expectedResult = [
        { id: '12', _meta: { status: 409, _id: '12' } },
        { id: '13', _meta: { result: 'created', _id: '13' } },
        { _meta: { result: 'deleted' } },
        { _meta: { result: 'updated' }, name: 'Bob' },
        {
          _meta: { result: 'updated', _parent: '12' },
          name: 'Sunshine',
          aka: 'alias',
        },
      ]

      expect(mapBulk(items, 'id', '_meta', 'aka')).to.deep.equal(expectedResult)
    })

    it('should not change original items', () => {
      const items: any[] = [{ create: { status: 409, _id: '12' } }]
      const itemsSnapshot = JSON.stringify(items)

      mapBulk(items, 'id', '_meta')
      expect(items).to.deep.equal(JSON.parse(itemsSnapshot))
    })
  })

  parseQueryTests()
  coreUtilsTests()
})
