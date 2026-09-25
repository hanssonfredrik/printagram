import type { Api } from './api';
import { realApi } from './api.real';

export const api: Api = realApi;

export { ApiClientError } from './api';
export type * from './api';
