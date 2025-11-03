// Retry logic utilities for Elasticsearch operations

/**
 * Configuration for retry logic
 */
export interface RetryConfig {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryableErrors?: string[]
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 100,
  maxDelay: 5000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ConnectionError',
    'TimeoutError',
    'NoLivingConnectionsError',
    'ResponseError', // Only for specific status codes
    'RequestAbortedError'
  ]
}

/**
 * Checks if an error is retryable based on its type and status
 * @param error - The error to check
 * @param config - Retry configuration
 * @returns True if the error is retryable
 */
export function isRetryableError(
  error: Error & { name?: string; meta?: { statusCode?: number }; statusCode?: number },
  config: RetryConfig = {}
): boolean {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config }

  // Check if it's a network/connection error
  if (error.name && mergedConfig.retryableErrors.includes(error.name)) {
    // For ResponseError, only retry on specific status codes
    if (error.name === 'ResponseError') {
      const statusCode = (error.meta as { statusCode?: number })?.statusCode || error.statusCode
      // Retry on 429 (Too Many Requests), 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout)
      return statusCode !== undefined && [429, 502, 503, 504].includes(statusCode)
    }
    return true
  }

  // Check for specific Elasticsearch error types
  const errorMeta = error.meta as { body?: { error?: { type?: string } } } | undefined
  if (errorMeta?.body?.error?.type) {
    const errorType = errorMeta.body.error.type
    const retryableESErrors = [
      'es_rejected_execution_exception',
      'cluster_block_exception',
      'unavailable_shards_exception',
      'node_disconnected_exception',
      'node_not_connected_exception'
    ]
    return retryableESErrors.includes(errorType)
  }

  return false
}

/**
 * Calculates the delay for the next retry attempt
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateDelay(attempt: number, config: RetryConfig = {}): number {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const delay = mergedConfig.initialDelay * Math.pow(mergedConfig.backoffMultiplier, attempt)
  return Math.min(delay, mergedConfig.maxDelay)
}

/**
 * Executes an operation with retry logic
 * @param operation - The async operation to execute
 * @param config - Retry configuration
 * @returns Promise resolving to the operation result
 * @throws The last error if all retries are exhausted
 */
export async function withRetry<T>(operation: () => Promise<T>, config: RetryConfig = {}): Promise<T> {
  const mergedConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error

      // Don't retry if we've exhausted attempts or error is not retryable
      if (
        attempt === mergedConfig.maxRetries ||
        !isRetryableError(
          error as Error & { name?: string; meta?: { statusCode?: number }; statusCode?: number },
          mergedConfig
        )
      ) {
        throw error
      }

      // Calculate and apply delay before next attempt
      const delay = calculateDelay(attempt, mergedConfig)
      await new Promise((resolve) => setTimeout(resolve, delay))

      // Log retry attempt (could be enhanced with proper logging)
      if (process.env.NODE_ENV !== 'test') {
        console.warn(
          `Retrying operation after ${delay}ms (attempt ${attempt + 1}/${mergedConfig.maxRetries})`
        )
      }
    }
  }

  throw lastError!
}

/**
 * Creates a retry wrapper for Elasticsearch operations
 * @param esClient - Elasticsearch client or operation
 * @param config - Retry configuration
 * @returns Wrapped operation with retry logic
 */
export function createRetryWrapper(esClient: Record<string, unknown>, config: RetryConfig = {}) {
  return new Proxy(esClient, {
    get(target, prop) {
      const original = target[prop as keyof typeof target]

      // Only wrap functions
      if (typeof original !== 'function') {
        return original
      }

      // Return wrapped function with retry logic
      return async function (...args: unknown[]) {
        return withRetry(
          () => (original as (...args: unknown[]) => Promise<unknown>).apply(target, args),
          config
        )
      }
    }
  })
}
