/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-use-before-define */
/* eslint-disable import/no-extraneous-dependencies */
const elasticsearch = require('elasticsearch');
const { getCompatVersion, getCompatProp } = require('../lib/utils/core');

let apiVersion = null;
let client = null;
const schemaVersions = ['5.0', '6.0', '7.0'];

const compatVersion = getCompatVersion(schemaVersions, getApiVersion());
const compatSchema = require(`./schema-${compatVersion}`);

function getServiceConfig(serviceName) {
  const configs = {
    '5.0': {
      index: 'test',
      type: serviceName,
    },
    '6.0': {
      index: serviceName === 'aka' ? 'test-people' : `test-${serviceName}`,
      type: 'doc',
    },
    '7.0': {
      index: serviceName === 'aka' ? 'test-people' : `test-${serviceName}`,
      type: '_doc',
    },
  };

  return { refresh: true, ...getCompatProp(configs, getApiVersion()) };
}

function getApiVersion() {
  if (!apiVersion) {
    const esVersion = process.env.ES_VERSION || '5.0.0';
    const [major, minor] = esVersion.split('.').slice(0, 2);

    // elasticsearch client 15.5 does not support api 5.0 - 5.5
    apiVersion = +major === 5 && +minor < 6 ? '5.6' : `${major}.${minor}`;
  }

  return apiVersion;
}

function getClient() {
  if (!client) {
    client = new elasticsearch.Client({
      host: 'localhost:9200',
      apiVersion: getApiVersion(),
    });
  }

  return client;
}

function deleteSchema() {
  const index = compatSchema.map((indexSetup) => indexSetup.index);

  return getClient()
    .indices.delete({ index })
    .catch((err) => err.status !== 404 && Promise.reject(err));
}

function createSchema() {
  return compatSchema.reduce(
    (result, indexSetup) => result.then(() => getClient().indices.create(indexSetup)),
    Promise.resolve(),
  );
}

function resetSchema() {
  return deleteSchema().then(createSchema);
}

module.exports = {
  getApiVersion,
  getClient,
  getServiceConfig,
  resetSchema,
  deleteSchema,
  createSchema,
};
/* eslint-enable import/no-dynamic-require */
/* eslint-enable no-use-before-define */
/* eslint-enable import/no-extraneous-dependencies */
