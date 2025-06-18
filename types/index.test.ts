/* eslint-disable import/no-named-default */
/* eslint-disable import/no-unresolved */
/* eslint-disable import/no-extraneous-dependencies */
import { default as service } from 'feathers-esx';
import * as elasticsearch from 'elasticsearch';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const messageService = service({
  Model: new elasticsearch.Client({
    host: 'localhost:9200',
    apiVersion: '6.0',
  }),
  paginate: {
    default: 10,
    max: 50,
  },
  elasticsearch: {
    index: 'test',
    type: 'messages',
  },
  esVersion: '6.0',
});
/* eslint-enable import/no-named-default */
/* eslint-enable import/no-unresolved */
/* eslint-enable import/no-extraneous-dependencies */
