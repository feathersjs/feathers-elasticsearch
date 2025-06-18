const { expect } = require('chai');
const sinon = require('sinon');
const { getCompatProp } = require('../../lib/utils');

function patch(app, serviceName, esVersion) {
  describe('patch()', () => {
    it('should return empty array if no items have been found (bulk)', () => {
      return app
        .service(serviceName)
        .patch(null, { name: 'John' }, { query: { id: 'better-luck-next-time' } })
        .then((results) => {
          // eslint-disable-next-line no-unused-expressions
          expect(results).to.be.an('array').and.be.empty;
        });
    });

    it('should return only raw response if no items were patched (bulk)', () => {
      const queries = {
        '5.0': { $all: true, $sort: { name: 1 } },
        '6.0': { aka: 'real', $sort: { name: 1 } },
      };

      return app
        .service(serviceName)
        .patch(null, { name: { first: 'Douglas' } }, { query: getCompatProp(queries, esVersion) })
        .then((results) => {
          expect(results).to.have.lengthOf(3);
          expect(results).to.have.nested.property('[0].id', 'bob');
          expect(results).to.have.nested.property('[0]._meta.error');
          expect(results).to.have.nested.property('[0]._meta.status', 400);
          expect(results).to.have.nested.property('[1].id', 'douglas');
          expect(results).to.have.nested.property('[1]._meta.error');
          expect(results).to.have.nested.property('[1]._meta.status', 400);
          expect(results).to.have.nested.property('[2].id', 'moody');
          expect(results).to.have.nested.property('[2]._meta.error');
          expect(results).to.have.nested.property('[2]._meta.status', 400);
        });
    });

    it('should return raw responses for items which were not patched (bulk)', () => {
      // It's easier to stub `bulk` then to try and make ES not to update selected item.
      const bulk = sinon.stub(app.service(serviceName).Model, 'bulk').returns(
        Promise.resolve({
          errors: true,
          items: [
            { update: { _id: 'bob', status: 200, get: { _source: { name: 'Whatever' } } } },
            { update: { _id: 'douglas', status: 400, error: {} } },
            { update: { _id: 'moody', status: 200, get: { _source: { name: 'Whatever' } } } },
          ],
        }),
      );

      return app
        .service(serviceName)
        .patch(null, { name: 'Whatever' }, { query: { $all: true, $sort: { name: 1 } } })
        .then((results) => {
          expect(results).to.have.lengthOf(3);
          expect(results[0]).to.include({ name: 'Whatever', id: 'bob' });
          expect(results[1]).to.have.property('id', 'douglas');
          expect(results[1]).to.have.nested.property('_meta.error');
          expect(results[1]).to.have.nested.property('_meta.status', 400);
          expect(results[2]).to.include({ name: 'Whatever', id: 'moody' });
        })
        .catch()
        .then(() => bulk.restore());
    });

    it('should patch items selected with pagination (bulk)', () => {
      return app
        .service(serviceName)
        .create([
          { name: 'Patch me a', id: 'patchMeA' },
          { name: 'Patch me b', id: 'patchMeB' },
        ])
        .then(() =>
          app.service(serviceName).patch(
            null,
            { name: 'Patched' },
            {
              query: { id: { $in: ['patchMeA', 'patchMeB'] }, $sort: { name: 1 } },
              paginate: { default: 10, max: 10 },
            },
          ),
        )
        .then((results) => {
          expect(results).to.have.lengthOf(2);
          expect(results[0]).to.include({ name: 'Patched', id: 'patchMeA' });
          expect(results[1]).to.include({ name: 'Patched', id: 'patchMeB' });
        })
        .then(() =>
          app
            .service(serviceName)
            .remove(null, { query: { id: { $in: ['patchMeA', 'patchMeB'] } } }),
        );
    });

    it('should patch an item with a specified parent', () => {
      return app
        .service('aka')
        .create({ name: 'Bobby McBobface', parent: 'bob', id: 'bobAka', aka: 'alias' })
        .then(() => {
          return app
            .service('aka')
            .patch('bobAka', { name: 'Bobster' }, { query: { parent: 'bob' } });
        })
        .then((result) => {
          expect(result.name).to.equal('Bobster');

          return app.service('aka').remove('bobAka', { query: { parent: 'bob' } });
        });
    });

    it('should patch items which have parents (bulk)', () => {
      return app
        .service('aka')
        .create([
          { name: 'patchme', parent: 'bob', aka: 'alias' },
          { name: 'patchme', parent: 'moody', aka: 'alias' },
        ])
        .then(() =>
          app.service('aka').patch(null, { name: 'patched' }, { query: { name: 'patchme' } }),
        )
        .then((results) => {
          expect(results.length).to.equal(2);
          expect(results[0].name).to.equal('patched');
          expect(results[1].name).to.equal('patched');

          return app.service('aka').remove(null, { query: { name: 'patched' } });
        });
    });

    it('should patch with $select (bulk)', () => {
      return app
        .service(serviceName)
        .create([
          { name: 'patchme', age: 20, tags: ['uninteresting'], id: 'patchMeA' },
          { name: 'patchme', age: 30, tags: ['boring'], id: 'patchMeB' },
        ])
        .then(() =>
          app.service(serviceName).patch(
            null,
            { name: 'Patched' },
            {
              query: {
                name: 'patchme',
                $sort: { age: 1 },
                $select: ['age'],
              },
              paginate: { default: 10, max: 10 },
            },
          ),
        )
        .then((results) => {
          const [{ _meta: meta1, ...result1 }, { _meta: meta2, ...result2 }] = results;

          expect(results).to.have.lengthOf(2);
          expect(result1).to.deep.equal({ age: 20, id: 'patchMeA' });
          expect(result2).to.deep.equal({ age: 30, id: 'patchMeB' });
        })
        .then(() =>
          app
            .service(serviceName)
            .remove(null, { query: { id: { $in: ['patchMeA', 'patchMeB'] } } }),
        );
    });
  });
}

module.exports = patch;
