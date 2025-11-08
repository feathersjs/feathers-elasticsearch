import { expect } from 'chai'
import { errors } from '@feathersjs/errors'

import {
  getType,
  validateType,
  removeProps,
  getDocDescriptor,
  getCompatVersion,
  getCompatProp,
} from '../../lib/utils/core.js'

export default function utilsCoreTests() {
  describe('getType', () => {
    it('should recognize number', () => {
      expect(getType(1)).to.equal('number')
    })

    it('should recognize string', () => {
      expect(getType('1')).to.equal('string')
    })

    it('should recognize boolean', () => {
      expect(getType(true)).to.equal('boolean')
      expect(getType(false)).to.equal('boolean')
    })

    it('should recognize undefined', () => {
      expect(getType(undefined)).to.equal('undefined')
    })

    it('should recognize null', () => {
      expect(getType(null)).to.equal('null')
    })

    it('should recognize NaN', () => {
      expect(getType(NaN)).to.equal('NaN')
    })

    it('should recognize object', () => {
      expect(getType({})).to.equal('object')
    })

    it('should recognize array', () => {
      expect(getType([])).to.equal('array')
    })
  })

  describe('validateType', () => {
    it('should accept one validator as a string', () => {
      expect(validateType(1, 'val', 'number')).to.be.ok
    })

    it('should accept multiple validators as an array', () => {
      expect(validateType(1, 'val', ['number', 'object'])).to.be.ok
    })

    it('should return the type', () => {
      expect(validateType(1, 'val', 'number')).to.equal('number')
      expect(validateType('abc', 'val', ['number', 'array', 'string'])).to.equal('string')
      expect(validateType(true, 'val', ['number', 'array', 'boolean'])).to.equal('boolean')
      expect(validateType(false, 'val', ['number', 'array', 'boolean'])).to.equal('boolean')
      expect(validateType(null, 'val', ['number', 'object', 'null'])).to.equal('null')
      expect(validateType(undefined, 'val', ['number', 'object', 'undefined'])).to.equal(
        'undefined'
      )
      expect(validateType(NaN, 'val', ['number', 'object', 'NaN'])).to.equal('NaN')
      expect(validateType([], 'val', ['number', 'array', 'undefined'])).to.equal('array')
      expect(validateType({}, 'val', ['number', 'object', 'undefined'])).to.equal('object')
    })

    it('should throw if none of the validators match', () => {
      expect(() => validateType(1, 'val', 'null')).to.throw(errors.BadRequest)
      expect(() => validateType(1, 'val', ['null', 'object', 'array'])).to.throw(
        errors.BadRequest
      )
      expect(() => validateType('abc', 'val', ['number', 'object', 'undefined'])).to.throw(
        errors.BadRequest
      )
      expect(() => validateType(true, 'val', ['number', 'object', 'array'])).to.throw(
        errors.BadRequest
      )
      expect(() => validateType(null, 'val', ['number', 'object', 'string'])).to.throw(
        errors.BadRequest
      )
      expect(() => validateType([], 'val', ['number', 'object', 'null'])).to.throw(
        errors.BadRequest
      )
    })
  })

  describe('removeProps', () => {
    let object: any

    beforeEach(() => {
      object = {
        _id: 12,
        _meta: {
          _index: 'test',
        },
        age: 13,
      }
    })

    it('should remove all properties from given list', () => {
      expect(removeProps(object, '_id', '_meta')).to.deep.equal({ age: 13 })
    })

    it('should not change the original object', () => {
      const objectSnapshot = JSON.stringify(object)

      removeProps(object)
      expect(JSON.stringify(object)).to.equal(objectSnapshot)
    })

    it('should work if some properties are not defined on the object', () => {
      expect(removeProps(object, '_meta', 'not_there')).to.deep.equal({
        _id: 12,
        age: 13,
      })
    })

    it('should work if there are no props to remove', () => {
      expect(removeProps(object)).to.deep.equal(object)
    })
  })

  describe('getDocDescriptor', () => {
    let service: any
    let doc: any

    beforeEach(() => {
      service = {
        id: 'id',
        parent: 'parent',
        routing: 'routing',
        join: 'aka',
        meta: 'meta',
      }

      doc = {
        id: 13,
        parent: 1,
        routing: 2,
        name: 'John',
        aka: 'alias',
        meta: { _id: 13 },
      }
    })

    it('should return doc descriptor', () => {
      expect(getDocDescriptor(service, doc)).to.deep.equal({
        id: '13',
        parent: '1',
        routing: '2',
        join: 'alias',
        doc: { name: 'John' },
      })
    })

    it('should use parent for routing if no routing specified', () => {
      delete doc.routing

      expect(getDocDescriptor(service, doc)).to.deep.equal({
        id: '13',
        parent: '1',
        routing: '1',
        join: 'alias',
        doc: { name: 'John' },
      })
    })

    it('should not interpret the join field if join not configured', () => {
      delete service.join

      expect(getDocDescriptor(service, doc)).to.deep.equal({
        id: '13',
        parent: '1',
        routing: '2',
        join: undefined,
        doc: { name: 'John', aka: 'alias' },
      })
    })

    it('should take overrides from the third parameter', () => {
      delete doc.parent
      delete doc.routing

      expect(getDocDescriptor(service, doc, { parent: 10 })).to.deep.equal({
        id: '13',
        parent: '10',
        routing: '10',
        join: 'alias',
        doc: { name: 'John' },
      })
    })
  })

  describe('getCompatVersion', () => {
    it('should return biggest version from the list, which is smaller than provided current', () => {
      const allVersions = ['1.2', '2.3', '2.4', '2.5', '5.0']

      expect(getCompatVersion(allVersions, '2.4')).to.equal('2.4')
      expect(getCompatVersion(allVersions, '2.6')).to.equal('2.5')
      expect(getCompatVersion(allVersions, '2.0')).to.equal('1.2')
      expect(getCompatVersion(allVersions, '6.0')).to.equal('5.0')
    })

    it('should return default version if no compatible version found', () => {
      expect(getCompatVersion([], '0.9', '1.0')).to.equal('1.0')
      expect(getCompatVersion(['1.2', '5.3'], '0.9', '1.0')).to.equal('1.0')
    })

    it("should set default value for default version to '5.0'", () => {
      expect(getCompatVersion([], '0.9')).to.equal('5.0')
    })
  })

  describe('getCompatProp', () => {
    it('should return the value identified by compatible version key', () => {
      const compatMap = {
        2.4: 'version 2.4',
        2.6: 'version 2.6',
        '6.0': 'version 6.0',
      }

      expect(getCompatProp(compatMap, '2.4')).to.equal('version 2.4')
      expect(getCompatProp(compatMap, '2.5')).to.equal('version 2.4')
      expect(getCompatProp(compatMap, '5.9')).to.equal('version 2.6')
      expect(getCompatProp(compatMap, '10.0')).to.equal('version 6.0')
    })
  })
}
