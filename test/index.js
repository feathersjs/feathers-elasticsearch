const { expect } = require('chai');
const adapterTests = require('@feathersjs/adapter-tests');

const feathers = require('@feathersjs/feathers');
const errors = require('@feathersjs/errors');
const { before, after } = require('mocha');
const service = require('../lib');
const db = require('../test-utils/test-db');
const coreTests = require('./core');
const { getCompatProp } = require('../lib/utils/core');

const testSuite = adapterTests([
  '.options',
  '.events',
  '._get',
  '._find',
  '._create',
  '._update',
  '._patch',
  '._remove',
  '.get',
  '.get + $select',
  '.get + id + query',
  '.get + id + query id',
  '.get + NotFound',
  '.find',
  '.remove',
  '.remove + $select',
  '.remove + id + query',
  '.remove + multi',
  '.remove + id + query id',
  '.update',
  '.update + $select',
  '.update + id + query',
  '.update + NotFound',
  '.patch',
  '.patch + $select',
  '.patch + id + query',
  '.patch multiple',
  '.patch multi query',
  '.patch + NotFound',
  '.create',
  '.create + $select',
  '.create multi',
  'internal .find',
  'internal .get',
  'internal .create',
  'internal .update',
  'internal .patch',
  'internal .remove',
  '.find + equal',
  '.find + equal multiple',
  '.find + $sort',
  '.find + $sort + string',
  '.find + $limit',
  '.find + $limit 0',
  '.find + $skip',
  '.find + $select',
  '.find + $or',
  '.find + $in',
  '.find + $nin',
  '.find + $lt',
  '.find + $lte',
  '.find + $gt',
  '.find + $gte',
  '.find + $ne',
  '.find + $gt + $lt + $sort',
  '.find + $or nested + $sort',
  '.find + paginate',
  '.find + paginate + $limit + $skip',
  '.find + paginate + $limit 0',
  '.find + paginate + params',
  '.remove + id + query id',
  '.update + id + query id',
  '.patch + id + query id',
]);

describe('Elasticsearch Service', () => {
  const app = feathers();
  const serviceName = 'people';
  const esVersion = db.getApiVersion();

  before(() => {
    return db.resetSchema().then(() => {
      app.use(
        `/${serviceName}`,
        service({
          Model: db.getClient(),
          events: ['testing'],
          id: 'id',
          esVersion,
          elasticsearch: db.getServiceConfig(serviceName),
        }),
      );
      app.use(
        '/aka',
        service({
          Model: db.getClient(),
          id: 'id',
          parent: 'parent',
          esVersion,
          elasticsearch: db.getServiceConfig('aka'),
          join: getCompatProp({ '6.0': 'aka' }, esVersion),
        }),
      );
    });
  });

  after(() => db.deleteSchema());

  it('is CommonJS compatible', () => {
    // eslint-disable-next-line global-require
    expect(typeof require('../lib')).to.equal('function');
  });

  describe('Initialization', () => {
    it('throws an error when missing options', () => {
      expect(service.bind(null)).to.throw('Elasticsearch options have to be provided');
    });

    it('throws an error when missing `options.Model`', () => {
      expect(service.bind(null, {})).to.throw(
        'Elasticsearch `Model` (client) needs to be provided',
      );
    });
  });

  testSuite(app, errors, 'people', 'id');

  describe('Specific Elasticsearch tests', () => {
    before(async () => {
      const serviceInstance = app.service(serviceName);

      serviceInstance.options.multi = true;
      app.service('aka').options.multi = true;

      await serviceInstance.remove(null, { query: { $limit: 1000 } });
      await serviceInstance.create([
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
      ]);

      await app.service('aka').create([
        { name: 'The Master', parent: 'douglas', id: 'douglasAka', aka: 'alias' },
        { name: 'Teacher', parent: 'douglas', aka: 'alias' },
        { name: 'Teacher', parent: 'moody', aka: 'alias' },
      ]);
    });

    after(async () => {
      await app.service(serviceName).remove(null, { query: { $limit: 1000 } });
    });

    coreTests.find(app, serviceName, esVersion);
    coreTests.get(app, serviceName);
    coreTests.create(app, serviceName);
    coreTests.patch(app, serviceName, esVersion);
    coreTests.remove(app, serviceName);
    coreTests.update(app, serviceName);
    coreTests.raw(app, serviceName, esVersion);
  });
});
