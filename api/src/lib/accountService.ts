import { deleteBlob, listBlobs, PDF_CONTAINER } from './blobs.js';
import { destroyLibrary } from './libraryService.js';
import {
  books,
  deletePartition,
  libraries,
  lookups,
  orders,
  promos,
  users,
  type OrderRow,
  type UserRow,
} from './tables.js';

/**
 * Deletes one order (admin: removing test orders). Removes every PDF version, the share link and
 * the promo use, and gives the code its redemption back. The book goes back to being a draft, or is
 * deleted when its photo library is gone. Stripe keeps its own payment record.
 */
export async function deleteOrder(
  o: Pick<OrderRow, 'userId' | 'orderId' | 'bookId' | 'shareToken' | 'promoCode'>,
): Promise<void> {
  try {
    for await (const b of listBlobs(PDF_CONTAINER, `${o.orderId}/`))
      await deleteBlob(PDF_CONTAINER, b.name);
  } catch (e) {
    // No pdfs container yet means there are no PDFs to delete.
    if ((e as { statusCode?: number }).statusCode !== 404) throw e;
  }
  if (o.shareToken) await lookups.delete('share', o.shareToken);
  if (o.promoCode) {
    const key = `${o.promoCode}:${o.userId}`;
    const use = await lookups.get('promo_use', key);
    if (use?.value === o.orderId) {
      await lookups.delete('promo_use', key);
      await promos.unredeem(o.promoCode);
    }
  }
  const book = await books.get(o.userId, o.bookId);
  if (book?.orderId === o.orderId) {
    const lib = await libraries.get(o.userId, book.libraryId);
    if (lib?.status === 'ready' || lib?.status === 'importing')
      await books.merge(o.userId, o.bookId, { status: 'draft', orderId: null });
    else await books.delete(o.userId, o.bookId);
  }
  await orders.delete(o.userId, o.orderId);
}

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
