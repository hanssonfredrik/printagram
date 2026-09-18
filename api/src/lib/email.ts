import { config } from './config.js';

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

const consoleMailer: Mailer = {
  async send(mail) {
    console.log(
      `\n=== EMAIL (console driver) ===\nTo: ${mail.to}\nSubject: ${mail.subject}\n\n${mail.text}\n==============================\n`,
    );
  },
};

const resendMailer: Mailer = {
  async send(mail) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.email.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: config.email.from,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    });
    if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
  },
};

export function mailer(): Mailer {
  return config.email.provider === 'resend' && config.email.resendApiKey
    ? resendMailer
    : consoleMailer;
}

/* ------------------------------------------------------------------ */
/* Templates (mirror the design's email mock)                            */
/* ------------------------------------------------------------------ */

function layout(title: string, bodyHtml: string, footer: string): string {
  return `<!doctype html><html><body style="margin:0;background:#EFE9DF;padding:32px 16px;font-family:'Albert Sans',Helvetica,Arial,sans-serif;color:#2A2622">
  <div style="max-width:560px;margin:0 auto;background:#FAF7F2;border-radius:6px;padding:36px 32px;border:1px solid #E6DFD3">
    <div style="font-family:Lora,Georgia,serif;font-weight:600;font-size:20px;margin-bottom:20px">Printagram</div>
    <h1 style="font-family:Lora,Georgia,serif;font-weight:500;font-size:26px;line-height:1.2;margin:0 0 16px">${title}</h1>
    ${bodyHtml}
    <p style="margin:24px 0 0;font-size:13px;color:#6F675E">${footer}</p>
  </div></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${href}" style="display:inline-block;background:#4A5FA8;color:#fff;text-decoration:none;border-radius:999px;padding:14px 22px;font-size:16px;font-weight:500">${label}</a></p>`;

const p = (s: string) =>
  `<p style="margin:0 0 12px;color:#6F675E;font-size:16px;line-height:1.5">${s}</p>`;

export const templates = {
  returnLink(to: string, url: string): Mail {
    return {
      to,
      subject: 'Your Printagram return link',
      html: layout(
        'Pick up where you left off',
        p(
          'When the ZIP from Instagram arrives, open this link on any device and upload it. It works for 30 days.',
        ) + button(url, 'Continue to Printagram'),
        'You asked for this link on printagram.app. If that was not you, you can ignore this email.',
      ),
      text: `Pick up where you left off.\n\nWhen the ZIP from Instagram arrives, open this link on any device and upload it (valid 30 days):\n${url}\n`,
    };
  },
  exportSteps(to: string, url: string): Mail {
    const steps = [
      'Instagram app: profile → menu (☰) → Settings and activity → Accounts Center → Your information and permissions → Export your information → Create export.',
      'Select your Instagram profile only, then Export to device.',
      'Customize information: untick everything except Posts (under Your Instagram activity).',
      'Date range: All time · Format: JSON · Media quality: Higher → Start export.',
      'Instagram emails you a download link (hours to a couple of days). Download the ZIP within 4 days.',
    ];
    return {
      to,
      subject: 'How to get your photos from Instagram',
      html: layout(
        'Get your photos from Instagram',
        steps.map((s, i) => p(`<strong>${i + 1}.</strong> ${s}`)).join('') +
          button(url, 'Upload the ZIP when it arrives'),
        'Sent from printagram.app at your request.',
      ),
      text: `How to get your photos from Instagram\n\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nUpload it here when it arrives: ${url}\n`,
    };
  },
  passwordReset(to: string, url: string): Mail {
    return {
      to,
      subject: 'Reset your Printagram password',
      html: layout(
        'Choose a new password',
        p('This link works for one hour.') + button(url, 'Reset password'),
        'If you did not ask for this, ignore this email — your password stays the same.',
      ),
      text: `Choose a new password (link valid for one hour):\n${url}\n`,
    };
  },
  orderReady(to: string, title: string, url: string): Mail {
    return {
      to,
      subject: `Your book “${title}” is ready`,
      html: layout(
        'Your book is ready',
        p(
          'Your print-ready PDF is waiting in your Printagram account. Ordered PDFs stay downloadable — whatever happens to your photo library.',
        ) + button(url, 'Open My books'),
        'Thanks for making a book with Printagram.',
      ),
      text: `Your book "${title}" is ready.\n\nDownload it from My books: ${url}\n`,
    };
  },
  libraryReminder(
    to: string,
    count: number,
    until: string,
    keepUrl: string,
    deleteUrl: string,
  ): Mail {
    return {
      to,
      subject: 'Your photos are deleted in 7 days',
      html: layout(
        `Still want your ${count} photos? They'll be deleted on ${until}.`,
        p(
          'Three months ago you brought your Instagram photos into Printagram. As promised, we keep them for 3 months and then delete them. Making another book keeps them for 3 more months. Your ordered PDFs stay downloadable whatever you decide.',
        ) +
          button(keepUrl, 'Make another book') +
          `<p style="margin:0"><a href="${deleteUrl}" style="color:#4A5FA8">Delete them now</a></p>`,
        "Nothing to do if you're happy to let them go. You're receiving this because you have a Printagram account.",
      ),
      text: `Still want your ${count} photos? They'll be deleted on ${until}.\n\nMake another book (keeps them 3 more months): ${keepUrl}\nDelete them now: ${deleteUrl}\n`,
    };
  },
  libraryDeleted(to: string, url: string): Mail {
    return {
      to,
      subject: 'Your Printagram photo library was deleted',
      html: layout(
        'Your photos were deleted',
        p(
          'As promised, we removed your photo library after 3 months. Your ordered PDFs are still available in My books.',
        ) + button(url, 'Open My books'),
        'You can bring in photos again anytime to make a new book.',
      ),
      text: `Your photo library was deleted after 3 months. Ordered PDFs are still available: ${url}\n`,
    };
  },
};
