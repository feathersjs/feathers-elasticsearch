/* eslint-disable no-underscore-dangle */
const { expect } = require('chai');
const sinon = require('sinon');

function remove(app, serviceName) {
  describe('remove()', () => {
    it('should return empty array if no items have been removed (bulk)', () => {
      return app
        .service(serviceName)
        .remove(null, { query: { id: 'better-luck-next-time' } })
        .then((results) => {
          // eslint-disable-next-line no-unused-expressions
          expect(results).to.be.an('array').and.be.empty;
        });
    });

    it('should remove an item with a specified parent', () => {
      return app
        .service('aka')
        .create({ name: 'Bobster', parent: 'bob', id: 'bobAka' })
        .then(() => {
          return app.service('aka').remove('bobAka', { query: { parent: 'bob' } });
        })
        .then((result) => {
          expect(result.name).to.equal('Bobster');
        });
    });

    it('should remove items which have a parent (bulk)', () => {
      return app
        .service('aka')
        .create([
          { name: 'remove me', no: 1, parent: 'bob', aka: 'alias' },
          { name: 'remove me', no: 2, parent: 'moody', aka: 'alias' },
        ])
        .then(() =>
          app.service('aka').remove(null, { query: { name: 'remove me', $sort: { no: 1 } } }),
        )
        .then((results) => {
          expect(results.length).to.equal(2);
          expect(results[0].name).to.equal('remove me');
          expect(results[0]._meta._parent).to.equal('bob');
          expect(results[1].name).to.equal('remove me');
          expect(results[1]._meta._parent).to.equal('moody');
        });
    });

    it('should remove items selected with pagination (bulk)', () => {
      return app
        .service(serviceName)
        .create([
          { name: 'remove me', no: 1 },
          { name: 'remove me', no: 2 },
        ])
        .then(() =>
          app.service(serviceName).remove(null, {
            query: { name: 'remove me', $sort: { no: 1 } },
            paginate: { default: 10, max: 10 },
          }),
        )
        .then((results) => {
          expect(results).to.have.lengthOf(2);
          expect(results[0]).to.include({ name: 'remove me', no: 1 });
          expect(results[1]).to.include({ name: 'remove me', no: 2 });
        });
    });

    it('should return only removed items (bulk)', () => {
      // It's easier to stub `bulk` then to try and make ES not to delete selected item.
      const bulk = sinon.stub(app.service(serviceName).Model, 'bulk').returns(
        Promise.resolve({
          errors: true,
          items: [
            { delete: { _id: 'bob', status: 200 } },
            { delete: { _id: 'douglas', status: 400 } },
          ],
        }),
      );

      return app
        .service(serviceName)
        .remove(null, { query: { $all: 1 } })
        .then((results) => {
          expect(results).to.have.lengthOf(1);
        })
        .catch()
        .then(() => bulk.restore());
    });
  });
}

module.exports = remove;
/* eslint-enable no-underscore-dangle */
