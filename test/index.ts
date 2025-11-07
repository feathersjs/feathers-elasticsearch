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
        events: ['testing'],
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

    // Add global hook to delay after write operations for Elasticsearch consistency
    app.hooks({
      after: {
        all: async (context) => {
          if (['create', 'update', 'patch', 'remove'].includes(context.method)) {
            await new Promise(resolve => setTimeout(resolve, 20))
          }
          return context
        }
      }
    })
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

  describe('Adapter tests', () => {
    before(async function () {
      this.timeout(10000)
      // Clean up any existing data before running adapter tests
      const peopleService = app.service(serviceName) as any
      const originalMulti = peopleService.options.multi
      peopleService.options.multi = true
      try {
        await peopleService.remove(null, { query: { $limit: 1000 }, refresh: 'wait_for' })
      } catch (error) {
        // Ignore errors if no data exists
      }
      peopleService.options.multi = originalMulti
      // Force index refresh to ensure all changes are visible
      await db.getClient().indices.refresh({ index: 'test-people' })
    })

    adapterTests([
      // '.id',
      // '.options',
      // '.events',
      // '._get',
      // '._find',
      // '._create',
      // '._update',
      // '._patch',
      // '._remove',
      // '.$get',
      // '.$find',
      // '.$create',
      // '.$update',
      // '.$patch',
      // '.$remove',
      // '.get',
      // '.get + $select',
      // '.get + id + query',
      // '.get + NotFound',
      // '.get + NotFound (integer)',
      // '.get + id + query id',
      // '.find',
      // '.remove',
      // '.remove + $select',
      // '.remove + id + query',
      // '.remove + multi',
      // '.remove + NotFound',
      // '.remove + NotFound (integer)',
      // '.remove + id + query id',
      // '.update',
      // '.update + $select',
      // '.update + id + query',
      // '.update + NotFound',
      // '.update + NotFound (integer)',
      // '.update + query + NotFound',
      // '.update + id + query id',
      // '.patch',
      // '.patch + $select',
      // '.patch + id + query',
      // '.patch multi query changed',
      // '.patch + NotFound',
      // '.patch + NotFound (integer)',
      // '.patch + query + NotFound',
      // '.patch + id + query id',
      // '.create',
      // '.create + $select',
      // 'internal .find',
      // 'internal .get',
      // 'internal .create',
      // 'internal .update',
      // 'internal .patch',
      // 'internal .remove',
      // '.find + equal',
      // '.find + equal multiple',
      // '.find + $limit',
      // '.find + $limit 0',
      // '.find + $select',
      // '.find + $or',
      // '.find + $in',
      // '.find + $gt + $lt + $sort',
      // '.find + $or nested + $sort',
      // '.find + $and',
      // '.find + $and + $or',
      // 'params.adapter + multi',
      // '.find + paginate + query',
      // 'params.adapter + paginate',
      // Failing tests - moved to bottom due to Elasticsearch eventual consistency issues
      '.remove + multi no pagination',

    ])(app, errors, 'people', 'id')
  })

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
