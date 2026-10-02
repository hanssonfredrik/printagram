/**
 * Admin access for the Inbunden admin app (admin/). The first admin can only be made here;
 * after that, admins can grant and revoke access from the admin app itself.
 *
 *   npx tsx scripts/admin.ts list
 *   npx tsx scripts/admin.ts grant you@example.com        # needs an Inbunden account with a password
 *   npx tsx scripts/admin.ts reset-totp you@example.com   # lost phone: set up the authenticator again
 *   npx tsx scripts/admin.ts revoke you@example.com
 *
 * Uses STORAGE_CONNECTION_STRING (default: Azurite). For production, take the connection string
 * from the storage account (Access keys) and pass it only in your own shell.
 */
import { lookups, users, type UserRow } from '../api/src/lib/tables.js';

process.env.STORAGE_CONNECTION_STRING ??= 'UseDevelopmentStorage=true';

async function byEmail(raw: string | undefined): Promise<UserRow> {
  const email = (raw ?? '').trim().toLowerCase();
  if (!email) throw new Error('usage: admin.ts <command> <email>');
  const lookup = await lookups.get('email', email);
  const user = lookup?.userId ? await users.get(lookup.userId) : null;
  if (!user) throw new Error(`No Inbunden account for ${email}. Register on the site first.`);
  return user;
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  const target =
    process.env.STORAGE_CONNECTION_STRING!.match(/AccountName=([^;]+)/)?.[1] ?? 'Azurite';
  console.log(`storage: ${target}`);
  switch (cmd) {
    case 'list': {
      let n = 0;
      for await (const u of users.scanAll()) {
        if (u.isAdmin !== true) continue;
        n++;
        console.log(
          `${u.email}  ${u.adminTotpSecret ? 'authenticator set up' : 'authenticator NOT set up'}`,
        );
      }
      if (!n) console.log('No admins.');
      break;
    }
    case 'grant': {
      const u = await byEmail(arg);
      if (!u.passwordHash)
        throw new Error(`${u.email} has no password. Set one on the site first.`);
      if (u.status !== 'active') throw new Error(`${u.email} is not active.`);
      await users.merge(u.userId, {
        isAdmin: true,
        adminSessionVersion: (u.adminSessionVersion ?? 0) + 1,
      });
      console.log(`${u.email} is now an admin.`);
      if (!u.adminTotpSecret)
        console.log(
          'Sign in to the admin app now: the first sign-in sets up the authenticator, and until then the password alone is enough to do so.',
        );
      break;
    }
    case 'reset-totp': {
      const u = await byEmail(arg);
      await users.merge(u.userId, {
        adminTotpSecret: null,
        adminTotpLastStep: 0,
        adminSessionVersion: (u.adminSessionVersion ?? 0) + 1,
      });
      console.log(
        `Authenticator reset for ${u.email}. Sign in to the admin app now to set it up again.`,
      );
      break;
    }
    case 'revoke': {
      const u = await byEmail(arg);
      await users.merge(u.userId, {
        isAdmin: false,
        adminTotpSecret: null,
        adminSessionVersion: (u.adminSessionVersion ?? 0) + 1,
      });
      console.log(`${u.email} is no longer an admin; their admin sessions have ended.`);
      break;
    }
    default:
      throw new Error('usage: admin.ts list | grant <email> | reset-totp <email> | revoke <email>');
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
