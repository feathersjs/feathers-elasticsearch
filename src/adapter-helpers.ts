import { ElasticsearchServiceOptions } from './types';
import { errors } from '@feathersjs/errors';
import { Client } from '@elastic/elasticsearch';

/**
 * Validates adapter options and throws errors for missing required fields
 * @param options - Service options to validate
 * @throws BadRequest if required options are missing
 */
export function validateOptions(options: Partial<ElasticsearchServiceOptions>): void {
  if (!options) {
    throw new errors.BadRequest('Elasticsearch service requires `options`');
  }

  if (!options.Model && !options.elasticsearch) {
    throw new errors.BadRequest(
      'Elasticsearch service requires `options.Model` or `options.elasticsearch` to be provided'
    );
  }

  const esConfig = options.elasticsearch as { index?: string } | undefined;
  if (!options.index && (!options.elasticsearch || !esConfig?.index)) {
    throw new errors.BadRequest(
      'Elasticsearch service requires `options.index` or `options.elasticsearch.index` to be provided'
    );
  }
}

/**
 * Sets up property aliases for backward compatibility
 * @param instance - The service instance
 * @param properties - Property names to alias
 */
export function setupPropertyAliases(
  instance: Record<string, unknown> & { options: Record<string, unknown> },
  properties: string[]
): void {
  properties.forEach((name) =>
    Object.defineProperty(instance, name, {
      get() {
        return this.options[name];
      }
    })
  );
}

/**
 * Extracts Model and index from options
 * @param options - Service options
 * @returns Object with Model and index
 */
export function extractModelAndIndex(options: ElasticsearchServiceOptions): {
  Model: Client | Record<string, unknown>
  index: string
} {
  const Model = options.Model || options.elasticsearch;
  const esConfig = options.elasticsearch as { index?: string } | undefined;
  const index = options.index || esConfig?.index;

  return { Model: Model as Client, index: index as string };
}
