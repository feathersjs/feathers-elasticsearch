import { AdapterServiceOptions } from '@feathersjs/adapter-commons';
import { Client } from '@elastic/elasticsearch';
export { estypes } from '@elastic/elasticsearch';

export interface ElasticAdapterServiceOptions extends AdapterServiceOptions {
  Model: Client
  index?: string
  elasticsearch?: Client | { index?: string } | Record<string, unknown>
  parent?: string
  routing?: string
  join?: string
  meta?: string
}
