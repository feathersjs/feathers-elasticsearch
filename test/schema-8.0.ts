const schema = [
  {
    index: 'test-people',
    body: {
      settings: {
        // Make index changes immediately visible for tests
        refresh_interval: '1ms',
        number_of_shards: 1,
        number_of_replicas: 0
      },
      mappings: {
        properties: {
          name: { type: 'keyword' },
          tags: { type: 'keyword' },
          addresses: {
            type: 'nested',
            properties: {
              street: { type: 'keyword' },
            },
          },
          phone: { type: 'keyword' },
          aka: {
            type: 'join',
            relations: {
              real: 'alias',
            },
          },
        },
      },
    },
  },
  {
    index: 'test-todos',
    body: {
      settings: {
        // Make index changes immediately visible for tests
        refresh_interval: '1ms',
        number_of_shards: 1,
        number_of_replicas: 0
      },
      mappings: {
        properties: {
          text: { type: 'keyword' },
        },
      },
    },
  },
]

export default schema
