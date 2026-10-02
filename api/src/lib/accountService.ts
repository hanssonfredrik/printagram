import { deleteBlob, PDF_CONTAINER } from './blobs.js';
import { destroyLibrary } from './libraryService.js';
import { deletePartition, libraries, lookups, orders, users, type UserRow } from './tables.js';

/**
 * Deletes a user and everything they own: photos, PDFs, drafts, orders, lookups and the user row.
 * Used by DELETE /api/account (GDPR / Meta data deletion) and by the admin app.
 * Stripe keeps its own payment records; accounting rows outside this table are not touched.
 */
export async function deleteUserData(user: UserRow): Promise<void> {
  await users.merge(user.userId, { status: 'deleting', sessionVersion: user.sessionVersion + 1 });
  for (const l of await libraries.list(user.userId)) await destroyLibrary(l, false);
  for (const o of await orders.list(user.userId)) {
    if (o.pdfBlob) await deleteBlob(PDF_CONTAINER, o.pdfBlob);
    if (o.shareToken) await lookups.delete('share', o.shareToken);
  }
  if (user.email) await lookups.delete('email', user.email);
  // Promo redemptions are keyed CODE:userId.
  for await (const p of lookups.scan('promo_use'))
    if (p.key.endsWith(`:${user.userId}`)) await lookups.delete('promo_use', p.key);
  await deletePartition(user.userId);
}
