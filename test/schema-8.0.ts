const schema = [
  {
    index: 'test-people',
    body: {
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
      mappings: {
        properties: {
          text: { type: 'keyword' },
        },
      },
    },
  },
]

export default schema
