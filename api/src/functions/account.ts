import { clearedCookie } from '../lib/auth.js';
import { deleteBlob, PDF_CONTAINER } from '../lib/blobs.js';
import { json, route } from '../lib/http.js';
import { destroyLibrary } from '../lib/libraryService.js';
import { deletePartition, libraries, lookups, orders, users } from '../lib/tables.js';

/** GDPR / Meta data-deletion: removes photos, PDFs, drafts, orders and personal data. */
route(
  'accountDelete',
  { methods: ['DELETE'], route: 'account', auth: 'required' },
  async ({ user }) => {
    await users.merge(user.userId, { status: 'deleting', sessionVersion: user.sessionVersion + 1 });
    for (const l of await libraries.list(user.userId)) await destroyLibrary(l, false);
    for (const o of await orders.list(user.userId)) {
      if (o.pdfBlob) await deleteBlob(PDF_CONTAINER, o.pdfBlob);
      if (o.shareToken) await lookups.delete('share', o.shareToken);
    }
    if (user.email) await lookups.delete('email', user.email);
    await deletePartition(user.userId);
    return json({ deleted: true }, 202, { cookies: [clearedCookie()] });
  },
);
