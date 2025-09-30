/**
 * Elasticsearch version compatibility mappings
 */

export interface VersionMapping<T> {
  '5.0': T
  '6.0': T
  '7.0': T
  '8.0': T
  [key: string]: T
}

/**
 * Type field requirements by ES version
 */
export const ES_TYPE_REQUIREMENTS: VersionMapping<string | null> = {
  '5.0': 'default',
  '6.0': '_doc',
  '7.0': null,
  '8.0': null,
  '9.0': null
};

/**
 * Mapping path patterns by ES version
 */
export const ES_MAPPING_PATHS: VersionMapping<string[]> = {
  '5.0': ['test.mappings.aka._parent.type', 'people'],
  '6.0': ['test-people.mappings.doc.properties.aka.type', 'join'],
  '7.0': ['test-people.mappings.properties.aka.type', 'join'],
  '8.0': ['test-people.mappings.properties.aka.type', 'join'],
  '9.0': ['test-people.mappings.properties.aka.type', 'join']
};

/**
 * Supported ES versions for testing
 */
export const SUPPORTED_ES_VERSIONS = ['5.0', '6.0', '7.0', '8.0', '8.15', '9.0'];

/**
 * Default ES version if none specified
 */
export const DEFAULT_ES_VERSION = '8.0';
