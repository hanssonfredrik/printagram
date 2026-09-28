import { fmtDate, type Lang } from '@printagram/shared';
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

function layout(lang: Lang, title: string, bodyHtml: string, footer: string): string {
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#EFE9DF;padding:32px 16px;font-family:'Albert Sans',Helvetica,Arial,sans-serif;color:#2A2622">
  <div style="max-width:560px;margin:0 auto;background:#FAF7F2;border-radius:6px;padding:36px 32px;border:1px solid #E6DFD3">
    <div style="font-family:Lora,Georgia,serif;font-weight:600;font-size:20px;margin-bottom:20px">Inbunden</div>
    <h1 style="font-family:Lora,Georgia,serif;font-weight:500;font-size:26px;line-height:1.2;margin:0 0 16px">${title}</h1>
    ${bodyHtml}
    <p style="margin:24px 0 0;font-size:13px;color:#6F675E">${footer}</p>
  </div></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${href}" style="display:inline-block;background:#4A5FA8;color:#fff;text-decoration:none;border-radius:999px;padding:14px 22px;font-size:16px;font-weight:500">${label}</a></p>`;

const p = (s: string) =>
  `<p style="margin:0 0 12px;color:#6F675E;font-size:16px;line-height:1.5">${s}</p>`;

/** Every user-facing string in the emails, per language. */
const TEXT = {
  en: {
    returnLink: {
      subject: 'Your Inbunden return link',
      title: 'Pick up where you left off',
      body: 'When the ZIP from Instagram arrives, open this link on any device and upload it. It works for 30 days.',
      button: 'Continue to Inbunden',
      footer:
        'You asked for this link on inbunden.com. If that was not you, you can ignore this email.',
      text: (url: string) =>
        `Pick up where you left off.\n\nWhen the ZIP from Instagram arrives, open this link on any device and upload it (valid 30 days):\n${url}\n`,
    },
    exportSteps: {
      subject: 'How to get your photos from Instagram',
      title: 'Get your photos from Instagram',
      steps: [
        'Instagram app: profile → menu (☰) → Settings and activity → Accounts Center → Your information and permissions → Export your information → Create export.',
        'Select your Instagram profile only, then Export to device.',
        'Customize information: untick everything except Posts (under Your Instagram activity).',
        'Date range: All time · Format: JSON · Media quality: Higher → Start export.',
        'Instagram emails you a download link (hours to a couple of days). Download the ZIP within 4 days.',
      ],
      button: 'Upload the ZIP when it arrives',
      footer: 'Sent from inbunden.com at your request.',
      uploadHere: 'Upload it here when it arrives:',
    },
    googleSteps: {
      subject: 'How to send your Instagram photos to Google Photos',
      title: 'Send your Instagram photos to Google Photos',
      steps: [
        'Instagram app: profile → menu (☰) → Settings and activity → Accounts Center → Your information and permissions → Transfer a copy of your information.',
        'Pick your Instagram profile, then Posts (all, or a date range).',
        'Choose Google Photos as the destination, sign in to Google and allow the transfer.',
        'Instagram copies the photos in the background (usually within an hour). They land in a Data Transfer album in Google Photos.',
        'Back in Inbunden, sign in with Google and pick the photos for your book.',
      ],
      button: 'Continue in Inbunden',
      footer: 'Sent from inbunden.com at your request.',
      uploadHere: 'Continue here once the photos are in Google Photos:',
    },
    passwordReset: {
      subject: 'Reset your Inbunden password',
      title: 'Choose a new password',
      body: 'This link works for one hour.',
      button: 'Reset password',
      footer: 'If you did not ask for this, ignore this email — your password stays the same.',
      text: (url: string) => `Choose a new password (link valid for one hour):\n${url}\n`,
    },
    orderReady: {
      subject: (title: string) => `Your book “${title}” is ready`,
      title: 'Your book is ready',
      body: 'Your print-ready PDF is waiting in your Inbunden account. Ordered PDFs stay downloadable — whatever happens to your photo library.',
      button: 'Open My books',
      footer: 'Thanks for making a book with Inbunden.',
      text: (title: string, url: string) =>
        `Your book "${title}" is ready.\n\nDownload it from My books: ${url}\n`,
    },
    libraryReminder: {
      subject: (days: number) => `Your photos are deleted in ${days} days`,
      title: (count: number, until: string) =>
        `Still want your ${count} photos? They'll be deleted on ${until}.`,
      body: 'Three months ago you brought your Instagram photos into Inbunden. As promised, we keep them for 3 months and then delete them. Making another book keeps them for 3 more months. Your ordered PDFs stay downloadable whatever you decide.',
      button: 'Make another book',
      deleteNow: 'Delete them now',
      footer:
        "Nothing to do if you're happy to let them go. You're receiving this because you have a Inbunden account.",
      keepText: 'Make another book (keeps them 3 more months):',
    },
    libraryDeleted: {
      subject: 'Your Inbunden photo library was deleted',
      title: 'Your photos were deleted',
      body: 'As promised, we removed your photo library after 3 months. Your ordered PDFs are still available in My books.',
      button: 'Open My books',
      footer: 'You can bring in photos again anytime to make a new book.',
      text: (url: string) =>
        `Your photo library was deleted after 3 months. Ordered PDFs are still available: ${url}\n`,
    },
  },
  sv: {
    returnLink: {
      subject: 'Din returlänk till Inbunden',
      title: 'Fortsätt där du slutade',
      body: 'När ZIP-filen från Instagram kommer öppnar du den här länken på valfri enhet och laddar upp den. Länken fungerar i 30 dagar.',
      button: 'Fortsätt till Inbunden',
      footer:
        'Du bad om den här länken på inbunden.com. Om det inte var du kan du strunta i det här mejlet.',
      text: (url: string) =>
        `Fortsätt där du slutade.\n\nNär ZIP-filen från Instagram kommer öppnar du den här länken på valfri enhet och laddar upp den (gäller i 30 dagar):\n${url}\n`,
    },
    exportSteps: {
      subject: 'Så hämtar du dina bilder från Instagram',
      title: 'Hämta dina bilder från Instagram',
      steps: [
        'Instagram-appen: profil → meny (☰) → Inställningar och aktivitet → Kontocenter → Din information och dina behörigheter → Exportera din information → Skapa export.',
        'Välj bara din Instagram-profil och sedan Exportera till enhet.',
        'Anpassa information: avmarkera allt utom Inlägg (under Din aktivitet på Instagram).',
        'Datumintervall: Hela tiden · Format: JSON · Mediekvalitet: Högre → Starta export.',
        'Instagram mejlar dig en nedladdningslänk (efter några timmar upp till ett par dagar). Ladda ner ZIP-filen inom 4 dagar.',
      ],
      button: 'Ladda upp ZIP-filen när den kommer',
      footer: 'Skickat från inbunden.com på din begäran.',
      uploadHere: 'Ladda upp den här när den kommer:',
    },
    googleSteps: {
      subject: 'Så skickar du dina Instagram-bilder till Google Foto',
      title: 'Skicka dina Instagram-bilder till Google Foto',
      steps: [
        'Instagram-appen: profil → meny (☰) → Inställningar och aktivitet → Kontocenter → Din information och dina behörigheter → Överför en kopia av din information.',
        'Välj din Instagram-profil och sedan Inlägg (alla, eller ett datumintervall).',
        'Välj Google Foto som destination, logga in på Google och tillåt överföringen.',
        'Instagram kopierar bilderna i bakgrunden (oftast inom en timme). De hamnar i albumet Data Transfer i Google Foto.',
        'Tillbaka i Inbunden: logga in med Google och välj bilderna till din bok.',
      ],
      button: 'Fortsätt i Inbunden',
      footer: 'Skickat från inbunden.com på din begäran.',
      uploadHere: 'Fortsätt här när bilderna finns i Google Foto:',
    },
    passwordReset: {
      subject: 'Återställ ditt lösenord till Inbunden',
      title: 'Välj ett nytt lösenord',
      body: 'Länken fungerar i en timme.',
      button: 'Återställ lösenord',
      footer: 'Om du inte bad om det här kan du strunta i mejlet – ditt lösenord förblir detsamma.',
      text: (url: string) => `Välj ett nytt lösenord (länken gäller i en timme):\n${url}\n`,
    },
    orderReady: {
      subject: (title: string) => `Din bok ”${title}” är klar`,
      title: 'Din bok är klar',
      body: 'Din tryckfärdiga PDF väntar på ditt Inbunden-konto. Beställda PDF:er går alltid att ladda ner – oavsett vad som händer med ditt fotobibliotek.',
      button: 'Öppna Mina böcker',
      footer: 'Tack för att du gjorde en bok med Inbunden.',
      text: (title: string, url: string) =>
        `Din bok ”${title}” är klar.\n\nLadda ner den från Mina böcker: ${url}\n`,
    },
    libraryReminder: {
      subject: (days: number) => `Dina bilder raderas om ${days} dagar`,
      title: (count: number, until: string) =>
        `Vill du fortfarande ha dina ${count} bilder? De raderas den ${until}.`,
      body: 'För tre månader sedan tog du in dina Instagram-bilder i Inbunden. Som vi lovade sparar vi dem i 3 månader och raderar dem sedan. Gör du en bok till sparas de i 3 månader till. Dina beställda PDF:er går att ladda ner vad du än bestämmer dig för.',
      button: 'Gör en bok till',
      deleteNow: 'Radera dem nu',
      footer:
        'Du behöver inte göra något om du är nöjd med att de raderas. Du får det här mejlet för att du har ett konto hos Inbunden.',
      keepText: 'Gör en bok till (sparar dem i 3 månader till):',
    },
    libraryDeleted: {
      subject: 'Ditt fotobibliotek hos Inbunden har raderats',
      title: 'Dina bilder har raderats',
      body: 'Som vi lovade har vi tagit bort ditt fotobibliotek efter 3 månader. Dina beställda PDF:er finns kvar under Mina böcker.',
      button: 'Öppna Mina böcker',
      footer: 'Du kan ta in bilder igen när du vill och göra en ny bok.',
      text: (url: string) =>
        `Ditt fotobibliotek raderades efter 3 månader. Beställda PDF:er finns kvar: ${url}\n`,
    },
  },
} satisfies Record<Lang, unknown>;

export const templates = {
  returnLink(to: string, url: string, lang: Lang = 'en'): Mail {
    const t = TEXT[lang].returnLink;
    return {
      to,
      subject: t.subject,
      html: layout(lang, t.title, p(t.body) + button(url, t.button), t.footer),
      text: t.text(url),
    };
  },
  exportSteps(to: string, url: string, lang: Lang = 'en'): Mail {
    const t = TEXT[lang].exportSteps;
    return {
      to,
      subject: t.subject,
      html: layout(
        lang,
        t.title,
        t.steps.map((s, i) => p(`<strong>${i + 1}.</strong> ${s}`)).join('') +
          button(url, t.button),
        t.footer,
      ),
      text: `${t.subject}\n\n${t.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${t.uploadHere} ${url}\n`,
    };
  },
  googleSteps(to: string, url: string, lang: Lang = 'en'): Mail {
    const t = TEXT[lang].googleSteps;
    return {
      to,
      subject: t.subject,
      html: layout(
        lang,
        t.title,
        t.steps.map((s, i) => p(`<strong>${i + 1}.</strong> ${s}`)).join('') +
          button(url, t.button),
        t.footer,
      ),
      text: `${t.subject}\n\n${t.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n${t.uploadHere} ${url}\n`,
    };
  },
  passwordReset(to: string, url: string, lang: Lang = 'en'): Mail {
    const t = TEXT[lang].passwordReset;
    return {
      to,
      subject: t.subject,
      html: layout(lang, t.title, p(t.body) + button(url, t.button), t.footer),
      text: t.text(url),
    };
  },
  orderReady(to: string, title: string, url: string, lang: Lang = 'en'): Mail {
    const t = TEXT[lang].orderReady;
    return {
      to,
      subject: t.subject(title),
      html: layout(lang, t.title, p(t.body) + button(url, t.button), t.footer),
      text: t.text(title, url),
    };
  },
  libraryReminder(
    to: string,
    count: number,
    expiresAt: string,
    daysLeft: number,
    keepUrl: string,
    deleteUrl: string,
    lang: Lang = 'en',
  ): Mail {
    const t = TEXT[lang].libraryReminder;
    const title = t.title(count, fmtDate(expiresAt, lang));
    return {
      to,
      subject: t.subject(daysLeft),
      html: layout(
        lang,
        title,
        p(t.body) +
          button(keepUrl, t.button) +
          `<p style="margin:0"><a href="${deleteUrl}" style="color:#4A5FA8">${t.deleteNow}</a></p>`,
        t.footer,
      ),
      text: `${title}\n\n${t.keepText} ${keepUrl}\n${t.deleteNow}: ${deleteUrl}\n`,
    };
  },
  libraryDeleted(to: string, url: string, lang: Lang = 'en'): Mail {
    const t = TEXT[lang].libraryDeleted;
    return {
      to,
      subject: t.subject,
      html: layout(lang, t.title, p(t.body) + button(url, t.button), t.footer),
      text: t.text(url),
    };
  },
};
