import { deleteUserData } from '../lib/accountService.js';
import { clearedCookie } from '../lib/auth.js';
import { json, route } from '../lib/http.js';

/** GDPR / Meta data-deletion: removes photos, PDFs, drafts, orders and personal data. */
route(
  'accountDelete',
  { methods: ['DELETE'], route: 'account', auth: 'required' },
  async ({ user }) => {
    await deleteUserData(user);
    return json({ deleted: true }, 202, { cookies: [clearedCookie()] });
  },
);
