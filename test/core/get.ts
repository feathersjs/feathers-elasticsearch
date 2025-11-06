import { expect } from 'chai'

function get(app: any, _serviceName: string) {
  describe('get()', () => {
    it('should get an item with specified parent', () => {
      return app
        .service('aka')
        .get('douglasAka', { query: { parent: 'douglas' } })
        .then((result: any) => {
          expect(result.name).to.equal('The Master')
        })
    })
  })
}

export default get
