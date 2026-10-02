import type { Messages } from '../en';

export const google: Messages['google'] = {
  title: 'Hämta bilder via Google Foto',
  intro:
    'Instagram kan skicka en kopia av dina inlägg direkt till Google Foto. Det funkar för alla konton, privata också. Sedan väljer du bilderna i Google Foto och vi kopierar dem. Ingen ZIP-fil att ladda ner.',
  ask: {
    question: 'Har du redan skickat dina Instagram-bilder till Google Foto?',
    hint: 'Det gör du inne i Instagram, inte här. Det tar två minuter att starta, sedan kopierar Instagram i bakgrunden.',
    yes: 'Ja, de finns i Google Foto',
    no: 'Inte än. Visa hur',
  },
  howTo: 'Så skickar du dina inlägg till Google Foto',
  started: 'Jag har startat överföringen. Fortsätt',
  ready: {
    title: 'Nästa steg: logga in med Google',
    text: 'Logga in när bilderna har kommit fram i Google Foto (leta efter albumet Data Transfer). Startade du överföringen nyss? Kom tillbaka senare. Inget går förlorat, och stegen finns i din inkorg om du mejlade dem.',
    back: 'Visa Instagram-stegen igen',
  },
  steps: [
    {
      title: 'Öppna Kontocenter',
      text: 'I Instagram-appen: profil → meny (☰) → Inställningar och aktivitet → Kontocenter → Din information och dina behörigheter.',
    },
    {
      title: 'Överför en kopia av din information',
      text: 'Tryck på Överför en kopia av din information (äldre versioner: Ladda ner eller överför information → Överför till en destination). Välj din Instagram-profil.',
    },
    {
      title: 'Välj Google Foto',
      text: 'Välj Inlägg (alla, eller ett datumintervall) och sedan Google Foto som destination. Logga in på Google när du blir ombedd och tillåt överföringen.',
    },
    {
      title: 'Vänta på Instagram',
      text: 'Instagram kopierar dina bilder i bakgrunden, oftast inom en timme, ibland längre. I Google Foto hamnar de i en mapp eller ett album som heter Data Transfer.',
    },
  ],
  goodToKnow: {
    title: 'Bra att veta',
    text: 'Bara bilderna följer med: bildtexter och gilla-markeringar stannar på Instagram. Varje bilds datum kommer från Google Foto och är ofta dagen för överföringen, inte dagen du publicerade. Du kan ändå lägga sidorna i vilken ordning du vill när du arrangerar boken.',
  },
  emailSteps: 'Mejla mig stegen',
  sendToAddress: 'Skicka till den här adressen',
  sent: 'Skickat ✓',
  emailPlaceholder: 'din@epost.se',
  signIn: 'Logga in med Google',
  opensWindow: 'Öppnar accounts.google.com. Du loggar in där. Vi ser aldrig ditt lösenord.',
  signedIn: {
    title: 'Inloggad med Google',
    text: 'Välj nu bilderna till din bok inne i Google Foto. Leta efter albumet Data Transfer. Det är dit Instagram lade dem. Välj hur många du vill och tryck sedan på Klar.',
    pick: 'Välj bilder i Google Foto',
    note: 'Google delar bara de bilder du väljer. Inbunden ser aldrig resten av ditt bibliotek.',
  },
  picking: {
    title: 'Väntar på ditt val…',
    text: 'Ett Google Foto-fönster öppnades. Välj dina bilder där och tryck på Klar. Den här sidan uppdateras av sig själv.',
    reopen: 'Öppnades inget? Öppna Google Foto igen',
  },
  errors: {
    denied: {
      title: 'Ingen åtkomst gavs',
      text: 'Google-fönstret stängdes eller du tryckte på Avbryt, så inget delades med Inbunden. Försök igen när du vill, eller använd exporten i stället.',
    },
    expired: {
      title: 'Inloggningen tog för lång tid',
      text: 'Google svarade inte i tid, eller så har timmen Google tillåter gått ut. Logga in igen, eller använd exporten i stället.',
    },
    unknown: {
      title: 'Något gick fel hos Google',
      text: 'Google svarade med ett fel vi inte väntade oss. Försök igen om en minut, eller använd exporten i stället.',
    },
  },
  tryAgain: 'Försök igen',
  useExport: 'Använd exporten i stället',
  importing: {
    account: 'Google Foto · inloggad nyss',
    connected: 'Ansluten',
    copying: 'Kopierar dina bilder…',
    note: 'Vi kopierar bilderna du valde i full storlek. Vi sparar dem i 3 månader, och varje ny bok lägger till 3 månader till. Vi mejlar dig en vecka innan de raderas.',
  },
  found: (n: number) => (n === 1 ? 'Hittade 1 bild' : `Hittade ${n} bilder`),
  foundFrom: (n: number, years: string) =>
    n === 1 ? `Hittade 1 bild från ${years}` : `Hittade ${n} bilder från ${years}`,
  foundStats: (videos: number) =>
    `${videos} ${videos === 1 ? 'video' : 'videor'} hoppades över · inga bildtexter eller gilla-markeringar (de stannar på Instagram)`,
  backToBooks: 'Tillbaka till Mina böcker',
  choosePhotos: 'Välj bilder',
  readUntil: 'Inbundens åtkomst till Google Foto upphör av sig själv inom en timme.',
  disconnectNow: 'Avsluta nu',
  disconnected:
    'Åtkomsten är avslutad. Dina kopierade bilder ligger kvar i ditt bibliotek i 3 månader, och varje ny bok lägger till 3 månader till.',
  storage:
    'Vi sparar dina bilder i 3 månader, bara för att göra dina böcker. Du kan radera dem när du vill. Vi ser aldrig ditt Google-lösenord.',
  libraryReady: (id: string) => `Biblioteket ${id} är klart`,
};
