import { Client } from '@elastic/elasticsearch'
import { getCompatVersion, getCompatProp } from '../lib/utils/core.js'

let apiVersion: string | null = null
let client: Client | null = null
const schemaVersions = ['8.0']

const compatVersion = getCompatVersion(schemaVersions, getApiVersion())
const compatSchemaModule = await import(`./schema-${compatVersion}.js`)
const compatSchema = compatSchemaModule.default

export function getServiceConfig(serviceName: string): any {
  const configs: Record<string, any> = {
    '8.0': {
      index: serviceName === 'aka' ? 'test-people' : `test-${serviceName}`,
    },
    '9.0': {
      index: serviceName === 'aka' ? 'test-people' : `test-${serviceName}`,
    },
  }

  // Use refresh: true to make changes immediately visible
  return Object.assign({ refresh: true }, getCompatProp(configs, getApiVersion()))
}

export function getApiVersion(): string {
  if (!apiVersion) {
    const esVersion = process.env.ES_VERSION || '8.0.0'
    const [major, minor] = esVersion.split('.').slice(0, 2)

    apiVersion = `${major}.${minor}`
  }

  return apiVersion
}

export function getClient(): Client {
  if (!client) {
    client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    })
  }

  return client
}

export async function deleteSchema(): Promise<void> {
  const indices = compatSchema.map((indexSetup: any) => indexSetup.index)

  for (const index of indices) {
    try {
      await getClient().indices.delete({ index })
    } catch (err: any) {
      // Ignore 404 errors (index doesn't exist)
      if (err.meta && err.meta.statusCode !== 404) {
        throw err
      }
    }
  }
}

export async function createSchema(): Promise<void> {
  for (const indexSetup of compatSchema) {
    try {
      await getClient().indices.create(indexSetup)
    } catch (err: any) {
      // Ignore 400 errors for index already exists
      if (err.meta && err.meta.statusCode !== 400) {
        throw err
      }
    }
  }
}

export async function resetSchema(): Promise<void> {
  await deleteSchema()
  await createSchema()
}
