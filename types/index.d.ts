/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable  @typescript-eslint/no-explicit-any */
// TypeScript Version: 3.0
import { Params, Paginated, Id, NullableId, Query, Hook } from '@feathersjs/feathers';
import {
  AdapterService,
  ServiceOptions,
  InternalServiceMethods,
} from '@feathersjs/adapter-commons';
import { Client } from 'elasticsearch';

export interface ElasticsearchServiceOptions extends ServiceOptions {
  Model: Client;
  elasticsearch: any;
  esVersion: string;
  parent: string;
  routing: string;
  join: string;
  meta: string;
}

export class Service<T = any> extends AdapterService implements InternalServiceMethods<T> {
  Model: Client;

  options: ElasticsearchServiceOptions;

  constructor(config?: Partial<ElasticsearchServiceOptions>);

  getModel(params: Params): any;

  _find(params?: Params): Promise<T | T[] | Paginated<T>>;

  _get(id: Id, params?: Params): Promise<T>;

  _create(data: Partial<T> | Array<Partial<T>>, params?: Params): Promise<T | T[]>;

  _update(id: NullableId, data: T, params?: Params): Promise<T>;

  _patch(id: NullableId, data: Partial<T>, params?: Params): Promise<T>;

  _remove(id: NullableId, params?: Params): Promise<T>;
}

declare const elasticsearch: (config?: Partial<ElasticsearchServiceOptions>) => Service;
export default elasticsearch;
/* eslint-enable @typescript-eslint/no-explicit-any */
/* eslint-enable import/no-extraneous-dependencies */
/* eslint-enable  @typescript-eslint/no-unused-vars */
