import { expect } from 'chai'
import { errors } from '@feathersjs/errors'

function create(app: any, serviceName: string) {
  describe('create()', () => {
    it('should create an item with provided id', () => {
      return app
        .service(serviceName)
        .create({ name: 'Bob', id: 'BobId' })
        .then((result: any) => {
          expect(result.name).to.equal('Bob')
          expect(result.id).to.equal('BobId')

          return app.service(serviceName).get('BobId')
        })
        .then((result: any) => {
          expect(result.name).to.equal('Bob')

          return app.service(serviceName).remove('BobId')
        })
    })

    it('should throw Conflict when trying to create an element with existing id', () => {
      return app
        .service(serviceName)
        .create({ name: 'Bob', id: 'BobId' })
        .then(() => app.service(serviceName).create({ name: 'Bob', id: 'BobId' }))
        .then(() => {
          throw new Error('Should never get here')
        })
        .catch((error: any) => {
          expect(error instanceof errors.Conflict).to.be.true

          return app.service(serviceName).remove('BobId')
        })
    })

    it('should update when trying to create an element with existing id using upsert', () => {
      const service = app.service(serviceName)

      return service
        .create({ name: 'Bob', id: 'BobId' })
        .then(() => service.create({ name: 'Box', id: 'BobId' }, { upsert: true }))
        .then((result: any) => {
          expect(result.name).to.equal('Box')
          expect(result.id).to.equal('BobId')

          return service.get('BobId')
        })
        .then((result: any) => {
          expect(result.name).to.equal('Box')

          return service.remove('BobId')
        })
    })

    it('should create items with provided ids (bulk)', () => {
      return app
        .service(serviceName)
        .create([
          { name: 'Cal', id: 'CalId' },
          { name: 'Max', id: 'MaxId' },
        ])
        .then((results: any[]) => {
          expect(results[0].name).to.equal('Cal')
          expect(results[1].name).to.equal('Max')

          return app.service(serviceName).find({
            query: {
              id: { $in: ['CalId', 'MaxId'] },
            },
          })
        })
        .then((results: any[]) => {
          expect(results[0].name).to.equal('Cal')
          expect(results[1].name).to.equal('Max')

          return app
            .service(serviceName)
            .remove(null, { query: { id: { $in: ['CalId', 'MaxId'] } } })
        })
    })

    it('should return created items in the same order as requested ones along with the errors (bulk)', () => {
      return app
        .service(serviceName)
        .create([
          { name: 'Catnis', id: 'CatnisId' },
          { name: 'Catnis', id: 'CatnisId' },
          { name: 'Mark', id: 'MarkId' },
        ])
        .then((results: any[]) => {
          expect(results[0].name).to.equal('Catnis')
          expect(results[1]._meta.status).to.equal(409)
          expect(results[2].name).to.equal('Mark')

          return app
            .service(serviceName)
            .remove(null, { query: { id: { $in: ['CatnisId', 'MarkId'] } } })
        })
    })

    it('should create an item with provided parent', () => {
      return app
        .service('aka')
        .create({ name: 'Bobster McBobface', parent: 'bob', aka: 'alias' })
        .then((result: any) => {
          expect(result.name).to.equal('Bobster McBobface')
          expect(result._meta._parent).to.equal('bob')
          return app.service('aka').remove(result.id, { query: { parent: 'bob' } })
        })
    })

    it('should create items with provided parents (bulk)', () => {
      return app
        .service('aka')
        .create([
          { name: 'Bobster', parent: 'bob', id: 'bobAka', aka: 'alias' },
          { name: 'Sunshine', parent: 'moody', aka: 'alias' },
        ])
        .then((results: any[]) => {
          const [bobAka, moodyAka] = results

          expect(results.length).to.equal(2)
          expect(bobAka.name).to.equal('Bobster')
          expect(bobAka._meta._parent).to.equal('bob')
          expect(moodyAka.name).to.equal('Sunshine')
          expect(moodyAka._meta._parent).to.equal('moody')

          return app
            .service('aka')
            .remove(null, { query: { id: { $in: [bobAka.id, moodyAka.id] } } })
        })
    })

    it('should return only raw response if no items were created (bulk)', () => {
      return app
        .service(serviceName)
        .create([
          { name: { first: 'Douglas' }, id: 'wrongDouglas' },
          { name: { first: 'Bob' }, id: 'wrongBob' },
        ])
        .then((results: any[]) => {
          expect(results).to.have.lengthOf(2)
          expect(results).to.have.nested.property('[0].id', 'wrongDouglas')
          expect(results).to.have.nested.property('[0]._meta.error')
          expect(results).to.have.nested.property('[0]._meta.status', 400)
          expect(results).to.have.nested.property('[1].id', 'wrongBob')
          expect(results).to.have.nested.property('[1]._meta.error')
          expect(results).to.have.nested.property('[1]._meta.status', 400)
        })
    })
  })
}

export default create
