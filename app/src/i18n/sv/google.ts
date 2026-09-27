import type { Messages } from '../en';

export const google: Messages['google'] = {
  title: 'Hämta bilder via Google Foto',
  intro:
    'Instagram kan skicka en kopia av dina inlägg direkt till Google Foto – för alla konton, privata också. Sedan väljer du bilderna i Google Foto och vi kopierar dem. Ingen ZIP-fil att ladda ner.',
  ask: {
    question: 'Har du redan skickat dina Instagram-bilder till Google Foto?',
    hint: 'Det gör du inne i Instagram, inte här. Det tar två minuter att starta, sedan kopierar Instagram i bakgrunden.',
    yes: 'Ja, de finns i Google Foto',
    no: 'Inte än – visa hur',
  },
  howTo: 'Så skickar du dina inlägg till Google Foto',
  started: 'Jag har startat överföringen – fortsätt',
  ready: {
    title: 'Nästa steg: logga in med Google',
    text: 'Logga in när bilderna har kommit fram i Google Foto (leta efter albumet Data Transfer). Startade du överföringen nyss? Kom tillbaka senare – inget går förlorat, och stegen finns i din inkorg om du mejlade dem.',
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
      text: 'Instagram kopierar dina bilder i bakgrunden – oftast inom en timme, ibland längre. I Google Foto hamnar de i en mapp eller ett album som heter Data Transfer.',
    },
  ],
  goodToKnow: {
    title: 'Bra att veta',
    text: 'Bara bilderna följer med: bildtexter och gilla-markeringar stannar på Instagram. Datumen är vad Google Foto vet om varje fil, ofta dagen för överföringen snarare än dagen du publicerade. Du kan ändå lägga sidorna i vilken ordning du vill när du arrangerar boken.',
  },
  emailSteps: 'Mejla mig stegen',
  sendToAddress: 'Skicka till den här adressen',
  sent: 'Skickat ✓',
  emailPlaceholder: 'din@epost.se',
  signIn: 'Logga in med Google',
  opensWindow: 'Öppnar accounts.google.com. Du loggar in där – vi ser aldrig ditt lösenord.',
  signedIn: {
    title: 'Inloggad med Google',
    text: 'Välj nu bilderna till din bok inne i Google Foto. Leta efter albumet Data Transfer – det är dit Instagram lade dem. Välj hur många du vill och tryck sedan på Klar.',
    pick: 'Välj bilder i Google Foto',
    note: 'Google delar bara de bilder du väljer. Printagram ser aldrig resten av ditt bibliotek.',
  },
  picking: {
    title: 'Väntar på ditt val…',
    text: 'Ett Google Foto-fönster öppnades. Välj dina bilder där och tryck på Klar. Den här sidan uppdateras av sig själv.',
    reopen: 'Öppnades inget? Öppna Google Foto igen',
  },
  errors: {
    denied: {
      title: 'Ingen åtkomst gavs',
      text: 'Google-fönstret stängdes eller du tryckte på Avbryt, så inget delades med Printagram. Försök igen när du vill, eller använd exporten i stället.',
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
    note: 'Vi kopierar bilderna du valde i full storlek och behåller dem tills din bok är klar – sedan raderas de.',
  },
  found: (n: number) => `Hittade ${n} bilder`,
  foundFrom: (n: number, years: string) => `Hittade ${n} bilder från ${years}`,
  foundStats: (videos: number) =>
    `${videos} videor hoppades över · inga bildtexter eller gilla-markeringar – de stannar på Instagram`,
  backToBooks: 'Tillbaka till Mina böcker',
  choosePhotos: 'Välj bilder',
  readUntil: 'Printagrams åtkomst till Google Foto upphör av sig själv inom en timme.',
  disconnectNow: 'Avsluta nu',
  disconnected:
    'Åtkomsten är avslutad. Dina kopierade bilder ligger kvar tills boken är klar, sedan raderas de.',
  storage:
    'Dina bilder lagras bara för att bygga dina böcker, sparas i 3 månader och kan raderas av dig när som helst. Google delar aldrig ditt lösenord med oss.',
  libraryReady: (id: string) => `Biblioteket ${id} är klart`,
};
