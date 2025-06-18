const { expect } = require('chai');
const errors = require('@feathersjs/errors');

function update(app, serviceName) {
  describe('update()', () => {
    it('should update an item with provided id', () => {
      const service = app.service(serviceName);

      return service
        .create({ name: 'Bob', id: 'BobId' })
        .then(() => service.update('BobId', { name: 'Box', id: 'BobId' }))
        .then((result) => {
          expect(result.name).to.equal('Box');
          expect(result.id).to.equal('BobId');

          return service.get('BobId');
        })
        .then((result) => {
          expect(result.name).to.equal('Box');

          return service.remove('BobId');
        });
    });

    it('should throw NotFound when trying to update a non-existing element', () => {
      const service = app.service(serviceName);

      return service
        .update('BobId', { name: 'Bob', id: 'BobId' })
        .then(() => {
          throw new Error('Should never get here');
        })
        .catch((error) => {
          // eslint-disable-next-line no-unused-expressions
          expect(error instanceof errors.NotFound).to.be.true;
        });
    });

    it('should create document when trying to update a non-existing element using upsert', () => {
      const service = app.service(serviceName);

      return service
        .update('BobId', { name: 'Bob', id: 'BobId' }, { upsert: true })
        .then((result) => {
          expect(result.name).to.equal('Bob');
          expect(result.id).to.equal('BobId');

          return service.get('BobId');
        })
        .then((result) => {
          expect(result.name).to.equal('Bob');

          return service.remove('BobId');
        });
    });

    it('should update an item with specified parent', () => {
      return app
        .service('aka')
        .create({ name: 'Bobster', parent: 'bob', id: 'bobAka', aka: 'alias' })
        .then(() => {
          return app
            .service('aka')
            .update('bobAka', { name: 'Boberson' }, { query: { parent: 'bob' } });
        })
        .then((result) => {
          expect(result.name).to.equal('Boberson');

          return app.service('aka').remove('bobAka', { query: { parent: 'bob' } });
        });
    });
  });
}

module.exports = update;
