import { expect } from 'chai'
import adapterTests from '@feathersjs/adapter-tests'

import { feathers } from '@feathersjs/feathers'
import { errors } from '@feathersjs/errors'
import service from '../lib/index.js'
import * as db from './test-db.js'
import * as coreTests from './core/index.js'
import { getCompatProp } from '../lib/utils/core.js'

describe('Elasticsearch Service', () => {
  const app = feathers()
  const serviceName = 'people'
  const esVersion = db.getApiVersion()

  before(async function () {
    this.timeout(10000)
    await db.resetSchema()
    app.use(
      `/${serviceName}`,
      service({
        Model: db.getClient(),
        id: 'id',
        esVersion,
        elasticsearch: db.getServiceConfig(serviceName),
        security: {
          // Enable raw methods for testing
          allowedRawMethods: ['search', 'indices.getMapping'],
        },
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
          allowedRawMethods: ['search', 'indices.getMapping'],
        },
      })
    )
  })

  after(async function () {
    this.timeout(10000)
    await db.deleteSchema()
  })

  it('is ESM compatible', () => {
    expect(typeof service).to.equal('function')
  })

  describe('Initialization', () => {
    it('throws an error when missing options', () => {
      expect(service.bind(null)).to.throw('Elasticsearch options have to be provided')
    })

    it('throws an error when missing `options.Model`', () => {
      expect(service.bind(null, {} as any)).to.throw(
        'Elasticsearch `Model` (client) needs to be provided'
      )
    })
  })

  adapterTests([
    '.id', '.options', '.events', '._get', '._find', '._create', '._update', '._patch', '._remove',
    '.$get', '.$find', '.$create', '.$update', '.$patch', '.$remove',
    '.get', '.get + $select', '.get + id + query', '.get + NotFound', '.find', '.remove',
    '.remove + $select', '.remove + id + query', '.remove + multi', '.update', '.update + $select',
    '.patch', '.patch + $select', '.patch multiple', '.create', '.create + $select', '.create multi',
    'internal .find', 'internal .get', 'internal .create', 'internal .update', 'internal .patch', 'internal .remove',
    '.find + equal', '.find + $sort', '.find + $limit', '.find + $skip', '.find + $select',
    '.find + $or', '.find + $in', '.find + $lt', '.find + $gt', '.find + $ne',
    '.find + paginate', 'params.adapter + paginate'
  ])(app, errors, 'people', 'id')

  describe('Specific Elasticsearch tests', () => {
    before(async () => {
      const service = app.service(serviceName) as any

      service.options.multi = true
      ;(app.service('aka') as any).options.multi = true

      await service.remove(null, { query: { $limit: 1000 } })
      await service.create([
        {
          id: 'bob',
          name: 'Bob',
          bio: 'I like JavaScript.',
          tags: ['javascript', 'programmer'],
          addresses: [{ street: '1 The Road' }, { street: 'Programmer Lane' }],
          aka: 'real',
        },
        {
          id: 'moody',
          name: 'Moody',
          bio: "I don't like .NET.",
          tags: ['programmer'],
          addresses: [{ street: '2 The Road' }, { street: 'Developer Lane' }],
          aka: 'real',
        },
        {
          id: 'douglas',
          name: 'Douglas',
          bio: 'A legend',
          tags: ['javascript', 'legend', 'programmer'],
          addresses: [{ street: '3 The Road' }, { street: 'Coder Alley' }],
          phone: '0123455567',
          aka: 'real',
        },
      ])

      await app.service('aka').create([
        {
          name: 'The Master',
          parent: 'douglas',
          id: 'douglasAka',
          aka: 'alias',
        },
        { name: 'Teacher', parent: 'douglas', aka: 'alias' },
        { name: 'Teacher', parent: 'moody', aka: 'alias' },
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
