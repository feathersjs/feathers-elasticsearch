const { Client } = require("@elastic/elasticsearch");
const { getCompatVersion, getCompatProp } = require("../lib/utils/core");

let apiVersion = null;
let client = null;
const schemaVersions = ["5.0", "6.0", "7.0", "8.0"];

const compatVersion = getCompatVersion(schemaVersions, getApiVersion());
const compatSchema = require(`./schema-${compatVersion}`);

function getServiceConfig(serviceName) {
  const configs = {
    "5.0": {
      index: "test",
      type: serviceName,
    },
    "6.0": {
      index: serviceName === "aka" ? "test-people" : `test-${serviceName}`,
      type: "doc",
    },
    "7.0": {
      index: serviceName === "aka" ? "test-people" : `test-${serviceName}`,
      type: "_doc",
    },
    "8.0": {
      index: serviceName === "aka" ? "test-people" : `test-${serviceName}`,
    },
  };

  return Object.assign(
    { refresh: true },
    getCompatProp(configs, getApiVersion())
  );
}

function getApiVersion() {
  if (!apiVersion) {
    const esVersion = process.env.ES_VERSION || "8.0.0";
    const [major, minor] = esVersion.split(".").slice(0, 2);

    apiVersion = `${major}.${minor}`;
  }

  return apiVersion;
}

function getClient() {
  if (!client) {
    client = new Client({
      node: process.env.ELASTICSEARCH_URL || "http://localhost:9201",
    });
  }

  return client;
}

async function deleteSchema() {
  const indices = compatSchema.map((indexSetup) => indexSetup.index);

  for (const index of indices) {
    try {
      await getClient().indices.delete({ index });
    } catch (err) {
      // Ignore 404 errors (index doesn't exist)
      if (err.meta && err.meta.statusCode !== 404) {
        throw err;
      }
    }
  }
}

async function createSchema() {
  for (const indexSetup of compatSchema) {
    try {
      await getClient().indices.create(indexSetup);
    } catch (err) {
      // Ignore 400 errors for index already exists
      if (err.meta && err.meta.statusCode !== 400) {
        throw err;
      }
    }
  }
}

async function resetSchema() {
  await deleteSchema();
  await createSchema();
}

module.exports = {
  getApiVersion,
  getClient,
  getServiceConfig,
  resetSchema,
  deleteSchema,
  createSchema,
};
