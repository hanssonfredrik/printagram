/** Test-only replacement for '@/services' (see vite.config.ts test.alias). */
import type { Api } from '@/services/api';
import { mockApi } from './fakeApi';

export const api: Api = mockApi;

export { ApiClientError } from '@/services/api';
export type * from '@/services/api';
