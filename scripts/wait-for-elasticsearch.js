#!/usr/bin/env node

import http from 'http'

const url = process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
const maxAttempts = 60 // 5 minutes with 5-second intervals
let attempts = 0

function checkElasticsearch() {
  return new Promise((resolve, reject) => {
    const request = http.get(`${url}/_cluster/health`, (res) => {
      if (res.statusCode === 200) {
        resolve()
      } else {
        reject(new Error(`HTTP ${res.statusCode}`))
      }
    })

    request.on('error', reject)
    request.setTimeout(5000, () => {
      request.destroy()
      reject(new Error('Timeout'))
    })
  })
}

async function waitForElasticsearch() {
  console.log(`Waiting for Elasticsearch at ${url}...`)

  while (attempts < maxAttempts) {
    try {
      await checkElasticsearch()
      console.log('✅ Elasticsearch is ready!')
      process.exit(0)
    } catch (error) {
      attempts++
      console.log(`⏳ Attempt ${attempts}/${maxAttempts} failed: ${error.message}`)

      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }

  console.error('❌ Elasticsearch failed to start within the timeout period')
  process.exit(1)
}

waitForElasticsearch()
