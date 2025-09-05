import { ElasticAdapter } from "./adapter";
import * as errorHandler from "./error-handler";

class ElasticService extends ElasticAdapter {
  async find(params) {
    return this._find(params);
  }

  async get(id, params) {
    return this._get(id, params);
  }

  async create(data, params) {
    return this._create(data, params);
  }

  async update(id, data, params) {
    return this._update(id, data, params);
  }

  async patch(id, data, params) {
    return this._patch(id, data, params);
  }

  async remove(id, params) {
    return this._remove(id, params);
  }

  async raw(method, params) {
    return this._raw(method, params);
  }
}

function service(options: any) {
  return new ElasticService(options);
}

// Attach exports for backward compatibility
service.ElasticService = ElasticService;
service.ElasticAdapter = ElasticAdapter;
Object.assign(service, errorHandler);

export = service;
