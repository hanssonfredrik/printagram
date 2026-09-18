import type { Api } from './api';
import { mockApi } from './api.mock';
import { realApi } from './api.real';

export const API_MODE: 'mock' | 'real' = __API_MODE__;

export const api: Api = API_MODE === 'real' ? realApi : mockApi;

export { ApiClientError } from './api';
export type * from './api';
