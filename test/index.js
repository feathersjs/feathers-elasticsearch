const { expect } = require('chai')
const adapterTests = require('@feathersjs/adapter-tests')

const feathers = require('@feathersjs/feathers')
const errors = require('@feathersjs/errors')
const service = require('../lib')
const db = require('../test-utils/test-db')
const coreTests = require('./core')
const { getCompatProp } = require('../lib/utils/core')

describe('Elasticsearch Service', () => {
  const app = feathers()
  const serviceName = 'people'
  const esVersion = db.getApiVersion()

  before(async () => {
    await db.resetSchema()
    app.use(
      `/${serviceName}`,
      service({
        Model: db.getClient(),
        events: ['testing'],
        id: 'id',
        esVersion,
        elasticsearch: db.getServiceConfig(serviceName),
        security: {
          // Enable raw methods for testing
          allowedRawMethods: ['search', 'indices.getMapping']
        }
      })
    )
    app.use(
      '/aka',
      service({
        Model: db.getClient(),
        id: 'id',
        parent: 'parent',
        esVersion,
        elasticsearch: db.getServiceConfig('aka'),
        join: getCompatProp({ '6.0': 'aka' }, esVersion),
        security: {
          // Enable raw methods for testing
          allowedRawMethods: ['search', 'indices.getMapping']
        }
      })
    )
  })

  after(async () => {
    await db.deleteSchema()
  })

  it('is CommonJS compatible', () => {
    expect(typeof require('../lib')).to.equal('function')
  })

  describe('Initialization', () => {
    it('throws an error when missing options', () => {
      expect(service.bind(null)).to.throw('Elasticsearch options have to be provided')
    })

    it('throws an error when missing `options.Model`', () => {
      expect(service.bind(null, {})).to.throw('Elasticsearch `Model` (client) needs to be provided')
    })
  })

  adapterTests(app, errors, 'people', 'id')

  describe('Specific Elasticsearch tests', () => {
    before(async () => {
      const service = app.service(serviceName)

      service.options.multi = true
      app.service('aka').options.multi = true

      await service.remove(null, { query: { $limit: 1000 } })
      await service.create([
        {
          id: 'bob',
          name: 'Bob',
          bio: 'I like JavaScript.',
          tags: ['javascript', 'programmer'],
          addresses: [{ street: '1 The Road' }, { street: 'Programmer Lane' }],
          aka: 'real'
        },
        {
          id: 'moody',
          name: 'Moody',
          bio: "I don't like .NET.",
          tags: ['programmer'],
          addresses: [{ street: '2 The Road' }, { street: 'Developer Lane' }],
          aka: 'real'
        },
        {
          id: 'douglas',
          name: 'Douglas',
          bio: 'A legend',
          tags: ['javascript', 'legend', 'programmer'],
          addresses: [{ street: '3 The Road' }, { street: 'Coder Alley' }],
          phone: '0123455567',
          aka: 'real'
        }
      ])

      await app.service('aka').create([
        {
          name: 'The Master',
          parent: 'douglas',
          id: 'douglasAka',
          aka: 'alias'
        },
        { name: 'Teacher', parent: 'douglas', aka: 'alias' },
        { name: 'Teacher', parent: 'moody', aka: 'alias' }
      ])
    })

    after(async () => {
      await app.service(serviceName).remove(null, { query: { $limit: 1000 } })
    })

    coreTests.find(app, serviceName, esVersion)
    coreTests.get(app, serviceName)
    coreTests.create(app, serviceName)
    coreTests.patch(app, serviceName, esVersion)
    coreTests.remove(app, serviceName)
    coreTests.update(app, serviceName)
    coreTests.raw(app, serviceName, esVersion)
  })
})
