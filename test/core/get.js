const { expect } = require('chai');

function get(app, _serviceName) {
  describe('get()', () => {
    it('should get an item with specified parent', () => {
      return app
        .service('aka')
        .get('douglasAka', { query: { parent: 'douglas' } })
        .then((result) => {
          expect(result.name).to.equal('The Master');
        });
    });
  });
}

module.exports = get;
