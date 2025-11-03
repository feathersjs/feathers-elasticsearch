import { errors } from '@feathersjs/errors'
import { ValidatorType, DocDescriptor, ElasticAdapterInterface } from '../types'

/**
 * Gets the type of a value as a string
 * @param value - The value to check
 * @returns The type as a string
 */
export function getType(value: unknown): ValidatorType {
  const type = (Array.isArray(value) && 'array') || (value === null && 'null') || typeof value

  return (type === 'number' && isNaN(value as number) && 'NaN') || (type as ValidatorType)
}

/**
 * Validates that a value matches one of the expected types
 * @param value - The value to validate
 * @param name - The name of the field (for error messages)
 * @param validators - String or array of valid types
 * @returns The actual type of the value
 * @throws BadRequest if type doesn't match
 */
export function validateType(
  value: unknown,
  name: string,
  validators: ValidatorType | ValidatorType[]
): ValidatorType {
  const type = getType(value)

  if (typeof validators === 'string') {
    validators = [validators]
  }

  if (validators.indexOf(type) === -1) {
    throw new errors.BadRequest(
      `Invalid type for '${name}': expected ${validators.join(' or ')}, got '${type}'`
    )
  }

  return type
}

/**
 * Removes specified properties from an object
 * @param object - The source object
 * @param props - Properties to remove
 * @returns A new object without the specified properties
 */
export function removeProps<T extends Record<string, unknown>>(
  object: T,
  ...props: (keyof T | string)[]
): Partial<T> {
  const result = Object.assign({}, object)

  props.forEach((prop) => prop !== undefined && delete result[prop as keyof T])

  return result
}

/**
 * Creates a document descriptor from service data
 * @param service - The Elasticsearch service instance
 * @param data - The document data
 * @param supplementaryData - Additional data to merge
 * @returns Document descriptor with id, routing, and doc
 */
export function getDocDescriptor(
  service: ElasticAdapterInterface,
  data: Record<string, unknown>,
  ...supplementaryData: Record<string, unknown>[]
): DocDescriptor {
  const mergedData = supplementaryData.reduce((acc, dataObject) => Object.assign(acc, dataObject), {
    ...data
  })

  const id = mergedData[service.id] !== undefined ? String(mergedData[service.id]) : undefined
  const parent = service.parent && mergedData[service.parent] ? String(mergedData[service.parent]) : undefined
  const routing =
    service.routing && mergedData[service.routing] ? String(mergedData[service.routing]) : parent
  const join =
    service.join && mergedData[service.join]
      ? (mergedData[service.join] as Record<string, unknown>)
      : undefined
  const doc = removeProps(
    data,
    service.meta || '',
    service.id,
    service.parent || '',
    service.routing || '',
    service.join || ''
  )

  return { id, parent, routing, join, doc: doc as Record<string, unknown> }
}

/**
 * Gets the compatible version from a list of versions
 * @param allVersions - All available versions
 * @param curVersion - Current version
 * @param defVersion - Default version if no match found
 * @returns The compatible version string
 */
export function getCompatVersion(
  allVersions: string[],
  curVersion: string,
  defVersion: string = '5.0'
): string {
  const curVersionNum = Number(curVersion)
  const prevVersionsNum = allVersions
    .map((version) => Number(version))
    .filter((version) => version <= curVersionNum)

  if (!prevVersionsNum.length) {
    return defVersion
  }

  return Math.max(...prevVersionsNum).toFixed(1)
}

/**
 * Gets a property value based on version compatibility
 * @param versionMap - Map of versions to values
 * @param curVersion - Current version
 * @returns The value for the compatible version
 */
export function getCompatProp<T>(versionMap: Record<string, T>, curVersion: string): T {
  return versionMap[getCompatVersion(Object.keys(versionMap), curVersion)]
}

/**
 * Gets the length of a query after removing routing fields
 * @param service - The Elasticsearch service instance
 * @param query - The query object
 * @returns Number of query properties
 */
export function getQueryLength(service: ElasticAdapterInterface, query: Record<string, unknown>): number {
  return Object.keys(removeProps(query, service.routing || '', service.parent || '')).length
}
