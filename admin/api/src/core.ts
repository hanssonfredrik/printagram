/**
 * The admin API reuses the main API's data layer (api/src/lib) so both apps read and write the
 * same rows the same way. Import it only through this file.
 *
 * Deliberately NOT re-exported: authenticate/issueSession/sessionCookie (the customer session),
 * encrypt/decrypt (TOKEN_ENC_KEY) and config.jwtSecret. The admin has its own session, secrets
 * and cookie (src/lib/session.ts).
 */
export {
  audit,
  books,
  libraries,
  lookups,
  nowIso,
  orders,
  promos,
  users,
  visits,
  type AuditRow,
  type BookRow,
  type LibraryRow,
  type OrderRow,
  type UserRow,
  type VisitRow,
} from '../../../api/src/lib/tables.js';
export { deleteUserData } from '../../../api/src/lib/accountService.js';
export { verifyPassword, hashPassword } from '../../../api/src/lib/auth.js';
export { readSasUrl, PDF_CONTAINER } from '../../../api/src/lib/blobs.js';
export {
  badRequest,
  clientIp,
  conflict,
  email as parseEmail,
  forbidden,
  HttpError,
  json,
  notFound,
  readJson,
  str,
  unauthorized,
} from '../../../api/src/lib/http.js';
export { newId } from '../../../api/src/lib/ids.js';
