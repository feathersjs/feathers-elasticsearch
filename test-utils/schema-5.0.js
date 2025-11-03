const schema = [
  {
    index: 'test',
    body: {
      mappings: {
        people: {
          properties: {
            name: { type: 'keyword' },
            tags: { type: 'keyword' },
            addresses: {
              type: 'nested',
              properties: {
                street: { type: 'keyword' }
              }
            },
            phone: { type: 'keyword' }
          }
        },
        aka: {
          _parent: {
            type: 'people'
          }
        },
        todos: {
          properties: {
            text: { type: 'keyword' }
          }
        }
      }
    }
  }
]

module.exports = schema
