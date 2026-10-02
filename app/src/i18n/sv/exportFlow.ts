import type { Messages } from '../en';

export const exportFlow: Messages['exportFlow'] = {
  guide: {
    title: 'Hämta dina bilder från Instagram',
    intro:
      'Instagram låter dig ladda ner allt du har lagt upp. Det tar ungefär två minuter att begära, sedan mejlar Instagram dig en länk.',
    onPhone: 'I mobilen',
    onComputer: 'På en dator',
    steps: {
      mobile: [
        {
          title: 'Öppna din profil och menyn',
          text: 'Tryck på din profilbild (nere till höger), sedan på menyn (☰) uppe till höger och sedan på Inställningar och aktivitet.',
        },
        {
          title: 'Kontocenter',
          text: 'Tryck på Kontocenter högst upp i listan och sedan på Din information och dina behörigheter.',
        },
        {
          title: 'Exportera din information',
          text: 'Tryck på Exportera din information och sedan på Skapa export. I äldre versioner av appen heter det Ladda ner din information.',
        },
        {
          title: 'Välj profil och mål',
          text: 'Välj din Instagram-profil (bocka ur eventuella Facebook-konton) och tryck på Nästa. Välj sedan Exportera till enhet.',
        },
        {
          title: 'Välj bara Inlägg',
          text: 'Tryck på Anpassa information, bocka ur allt och bocka sedan i Inlägg under Din Instagram-aktivitet. I vissa versioner heter det Media.',
        },
        {
          title: 'Välj inställningar och starta',
          text: 'Välj hela perioden under Datumintervall, JSON under Format och den högsta kvaliteten under Mediekvalitet. Kontrollera e-postadressen för aviseringen och tryck på Starta export. Instagram kan be om ditt lösenord för att bekräfta.',
        },
      ],
      desktop: [
        {
          title: 'Öppna Instagrams inställningar',
          text: 'Gå till instagram.com, klicka på Mer (längst ner i vänstermenyn) och sedan på Inställningar.',
        },
        {
          title: 'Kontocenter',
          text: 'Klicka på Kontocenter och sedan på Din information och dina behörigheter i vänsterspalten. Du kan också gå direkt till accountscenter.instagram.com.',
        },
        {
          title: 'Exportera din information',
          text: 'Klicka på Exportera din information och sedan på Skapa export. I äldre versioner heter det Ladda ner din information.',
        },
        {
          title: 'Välj profil och mål',
          text: 'Välj bara din Instagram-profil och klicka på Nästa. Välj sedan Exportera till enhet.',
        },
        {
          title: 'Välj bara Inlägg',
          text: 'Klicka på Anpassa information, bocka ur allt och bocka sedan i Inlägg under Din Instagram-aktivitet. I vissa versioner heter det Media.',
        },
        {
          title: 'Välj inställningar och starta',
          text: 'Välj hela perioden under Datumintervall, JSON under Format och den högsta kvaliteten under Mediekvalitet. Klicka på Starta export. Instagram kan be om ditt lösenord för att bekräfta.',
        },
      ],
    },
    nextTitle: 'Vad händer sedan?',
    nextBody:
      'Instagram mejlar dig en nedladdningslänk, oftast inom några timmar. Ibland tar det en dag eller två, och officiellt kan det ta upp till 30 dagar. Länken fungerar bara i fyra dagar, så ladda ner ZIP-filen så fort den kommer och kom tillbaka hit. Inget mejl? Kolla skräpposten, eller titta under Tillgängliga nedladdningar i Exportera din information.',
    requested: 'Jag har begärt min export',
    emailPlaceholder: 'du@exempel.se',
    sent: 'Skickat. Kolla inkorgen.',
    sendToAddress: 'Skicka stegen till den här adressen',
    emailSteps: 'Mejla mig stegen',
    haveZip: 'Har du redan ZIP-filen? Ladda upp den',
  },
  waiting: {
    title: 'Begäran skickad',
    heading: 'Instagram förbereder dina bilder',
    body: 'Det brukar ta några timmar. Instagram mejlar dig en nedladdningslänk. Ladda ner ZIP-filen, kom sedan tillbaka hit och ladda upp den.',
    returnTitle: 'Få en returlänk',
    returnText: 'Fortsätt på den enhet där ZIP-filen hamnar, mobil eller dator.',
    emailPlaceholder: 'du@exempel.se',
    emailLabel: 'E-postadress',
    sending: 'Skickar…',
    sendLink: 'Skicka länk',
    linkSent: (email: string) => `Länken är skickad till ${email}. Kolla din inkorg.`,
    comingUp: 'Sedan väljer du',
    squareOrPortrait: 'Kvadratisk eller stående',
    anyCover: 'Valfri omslagsbild',
    captionsDates: 'Bildtexter och datum',
    haveZip: 'Jag har ZIP-filen. Ladda upp den',
  },
  upload: {
    title: 'Ladda upp din Instagram-export',
    errors: {
      html: {
        title: 'Exporten är i HTML-format',
        text: 'Vi behöver JSON-versionen för att kunna läsa dina inlägg och datum. Begär exporten igen och välj Format: JSON.',
      },
      empty: {
        title: 'Inga inlägg i exporten',
        text: 'Filen innehåller inga inlägg. När du begär exporten, se till att Inlägg är ibockat under Din Instagram-aktivitet.',
      },
      corrupt: {
        title: 'Vi kunde inte öppna filen',
        text: 'Den kan vara ofullständig, eller så har Instagrams nedladdningslänk gått ut. Ladda ner den igen från Instagrams mejl, eller begär en ny export.',
      },
      large: {
        title: 'Filen är för stor',
        text: 'Du kan ladda upp högst 8 GB. Begär exporten igen för ett år i taget, eller med lägre mediekvalitet.',
      },
      unsupported: {
        title: 'Vissa bilder har ett format vi inte kan läsa',
        text: 'De bilderna hoppades över. Allt annat importerades. Instagram-exporter innehåller normalt bara JPEG- och WebP-filer.',
      },
      generic: {
        title: 'Något gick fel',
        text: 'Vi kunde inte importera filen. Försök igen, och begär en ny export om det fortsätter att krångla.',
      },
    },
    showSteps: 'Visa exportstegen igen',
    dropTitle: 'Släpp ZIP-filen här',
    dropBefore:
      'Filen som Instagram skickade dig, precis som den är. Du behöver inte packa upp den. Den heter oftast',
    dropFileName: 'instagram-dittnamn-….zip',
    dropAfter: '. Har du flera delar? Släpp alla på en gång.',
    chooseFiles: 'Eller välj filer',
    files: (n: number) => `${n} ${n === 1 ? 'fil' : 'filer'}`,
    reading: 'Läser din export…',
    readingDetail: (name: string, size: string) =>
      `${name} · ${size}. Letar efter dina inlägg. Inget laddas upp än.`,
    adding: (done: number, total: number) => `Lägger till bilder · ${done} av ${total}`,
    keepOpen: 'Bara dina bilder laddas upp · håll fliken öppen',
    stop: 'Stoppa här',
    finishing: 'Gör klart…',
    sorting: 'Sorterar dina bilder efter datum.',
    added: (n: number) => `La till ${n} ${n === 1 ? 'ny bild' : 'nya bilder'}`,
    found: (n: number, years: string) =>
      `Hittade ${n} ${n === 1 ? 'bild' : 'bilder'} från ${years}`,
    stats: (posts: number, carousels: number, videos: number, cancelled: boolean) =>
      `${posts} inlägg · ${carousels} ${carousels === 1 ? 'karusell' : 'karuseller'} · ${videos} ${videos === 1 ? 'video' : 'videor'} hoppades över${cancelled ? ' · avbröts tidigt' : ''}`,
    notes: {
      alreadyThere: (n: number) => `${n} fanns redan i ditt bibliotek`,
      missing: (n: number) =>
        `${n} ligger i en del av exporten som du inte lade till. Släpp alla ZIP-delar samtidigt`,
      unsupported: (n: number) => `${n} har ett format vi inte kan skriva ut`,
      failed: (n: number) => `${n} kunde inte läsas eller laddas upp`,
      intro: (list: string) => `Av bilderna i din export: ${list}.`,
    },
    archived: (n: number) =>
      `Exporten innehåller också ${n} ${n === 1 ? 'arkiverat inlägg' : 'arkiverade inlägg'}.`,
    addIt: 'Lägg till det också',
    addThem: 'Lägg till dem också',
    backToBooks: 'Tillbaka till Mina böcker',
    choosePhotos: 'Välj bilder',
    privacy:
      'Vi sparar dina bilder i 3 månader, bara för att göra dina böcker. Du kan radera dem när du vill. Vi ser aldrig ditt Instagram-lösenord.',
  },
};
