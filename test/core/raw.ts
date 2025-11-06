import { expect } from 'chai'
import { getCompatProp } from '../../lib/utils/index.js'

function raw(app: any, serviceName: string, esVersion: string) {
  describe('raw()', () => {
    it('should search documents in index with syntax term', () => {
      return app
        .service(serviceName)
        .raw('search', {
          size: 50,
          body: {
            query: {
              term: {
                name: 'Bob',
              },
            },
          },
        })
        .then((results: any) => {
          expect(results.hits.hits.length).to.equal(1)
        })
    })

    it('should search documents in index with syntax match', () => {
      return app
        .service(serviceName)
        .raw('search', {
          size: 50,
          body: {
            query: {
              match: {
                bio: 'javascript',
              },
            },
          },
        })
        .then((results: any) => {
          expect(results.hits.hits.length).to.equal(1)
        })
    })

    it('should show the mapping of index test', () => {
      const mappings = {
        '5.0': ['test.mappings.aka._parent.type', 'people'],
        '6.0': ['test-people.mappings.doc.properties.aka.type', 'join'],
        '7.0': ['test-people.mappings.properties.aka.type', 'join'],
      }

      return app
        .service('aka')
        .raw('indices.getMapping', {})
        .then((results: any) => {
          expect(results).to.have.nested.property(...getCompatProp(mappings, esVersion))
        })
    })

    it('should return a promise when the passed in method is not defined', () => {
      app
        .service(serviceName)
        .raw(undefined, {})
        .catch((err: any) => {
          expect(err.message === 'params.method must be defined.')
        })
    })

    it('should return a promise when service.method is not a function', () => {
      app
        .service(serviceName)
        .raw('notafunction', {})
        .catch((err: any) => {
          expect(err.message === 'There is no query method notafunction.')
        })
    })

    it('should return a promise when service.method.extention is not a function', () => {
      app
        .service(serviceName)
        .raw('indices.notafunction', {})
        .catch((err: any) => {
          expect(err.message === 'There is no query method indices.notafunction.')
        })
    })
  })
}

export default raw
