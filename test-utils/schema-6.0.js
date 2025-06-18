const schema = [
  {
    index: 'test-people',
    body: {
      mappings: {
        doc: {
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
  },
  {
    index: 'test-todos',
    body: {
      mappings: {
        doc: {
          properties: {
            text: { type: 'keyword' },
          },
        },
      },
    },
  },
];

module.exports = schema;
