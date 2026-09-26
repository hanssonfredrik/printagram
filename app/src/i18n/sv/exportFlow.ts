import type { Messages } from '../en';

export const exportFlow: Messages['exportFlow'] = {
  guide: {
    title: 'Hämta dina bilder från Instagram',
    intro:
      'Instagram låter dig ladda ned allt du har lagt upp. Det tar ungefär två minuter att begära, sedan mejlar Instagram dig en länk.',
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
          text: 'Tryck på Exportera din information och sedan på Skapa export. I äldre versioner av appen heter det Ladda ned din information → Ladda ned eller överför information.',
        },
        {
          title: 'Välj profil och mål',
          text: 'Välj din Instagram-profil (bocka ur eventuella Facebook-konton) och välj sedan Exportera till enhet.',
        },
        {
          title: 'Välj bara Inlägg',
          text: 'Tryck på Anpassa information (eller En del av din information), bocka ur allt och bocka i Inlägg under Din Instagram-aktivitet.',
        },
        {
          title: 'Välj inställningar och starta',
          text: 'Datumintervall: Hela tiden. Format: JSON. Mediekvalitet: Högre. Kontrollera e-postadressen för aviseringen, tryck på Starta export och bekräfta med ditt Instagram-lösenord.',
        },
      ],
      desktop: [
        {
          title: 'Öppna Instagrams inställningar',
          text: 'Gå till instagram.com, klicka på Mer (längst ned i vänstermenyn) och sedan på Inställningar.',
        },
        {
          title: 'Kontocenter',
          text: 'Klicka på Kontocenter och sedan på Din information och dina behörigheter i vänsterspalten. Du kan också gå direkt till accountscenter.instagram.com.',
        },
        {
          title: 'Exportera din information',
          text: 'Klicka på Exportera din information och sedan på Skapa export. I äldre versioner heter det Ladda ned din information → Ladda ned eller överför information.',
        },
        {
          title: 'Välj profil och mål',
          text: 'Välj bara din Instagram-profil och välj sedan Exportera till enhet.',
        },
        {
          title: 'Välj bara Inlägg',
          text: 'Under Anpassa information (eller En del av din information) bockar du ur allt utom Inlägg under Din Instagram-aktivitet.',
        },
        {
          title: 'Välj inställningar och starta',
          text: 'Datumintervall: Hela tiden. Format: JSON. Mediekvalitet: Högre. Klicka på Starta export och bekräfta med ditt Instagram-lösenord.',
        },
      ],
    },
    nextTitle: 'Vad händer sen?',
    nextBody:
      'Instagram mejlar dig en nedladdningslänk – oftast inom några timmar, ibland efter en dag eller två (officiellt kan det ta upp till 30 dagar). Nedladdningen finns bara kvar i fyra dagar, så hämta ZIP-filen så fort den kommer och kom tillbaka hit. Dyker mejlet inte upp? Kolla skräpposten eller titta under Exportera din information i Kontocenter.',
    requested: 'Jag har begärt min export',
    emailPlaceholder: 'du@exempel.se',
    sent: 'Skickat – kolla inkorgen',
    sendToAddress: 'Skicka stegen till den här adressen',
    emailSteps: 'Mejla mig stegen',
    haveZip: 'Har du redan ZIP-filen? Ladda upp den',
  },
  waiting: {
    title: 'Snart klart',
    heading: 'Instagram förbereder dina bilder',
    body: 'Det brukar ta några timmar. Du får ett mejl från Instagram med en nedladdningslänk. Kom sedan tillbaka hit och ladda upp ZIP-filen.',
    returnTitle: 'Få en länk hit',
    returnText: 'Fortsätt på vilken enhet du vill – mobil, dator, där ZIP-filen hamnar.',
    emailPlaceholder: 'du@exempel.se',
    emailLabel: 'E-postadress',
    sending: 'Skickar…',
    sendLink: 'Skicka länk',
    linkSent: (email: string) => `Länken är skickad till ${email}. Kolla din inkorg.`,
    comingUp: 'Snart: din bok, som du vill ha den',
    squareOrPortrait: 'Kvadratisk eller stående',
    anyCover: 'Valfri omslagsbild',
    captionsDates: 'Bildtexter och datum',
    haveZip: 'Jag har ZIP-filen – ladda upp den',
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
        text: 'Den kan vara ofullständig, eller så har Instagrams nedladdningslänk gått ut. Ladda ned den igen från Instagrams mejl, eller begär en ny export.',
      },
      large: {
        title: 'Filen är för stor',
        text: 'Du kan ladda upp högst 8 GB. Prova att begära exporten i delar (per år), eller med Mediekvalitet: Medel.',
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
    files: (n: number) => `${n} filer`,
    reading: 'Läser din export…',
    readingDetail: (name: string, size: string) =>
      `${name} · ${size}. Letar efter dina inlägg – inget laddas upp än.`,
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
        `${n} ligger i en del av exporten som du inte lade till – släpp alla ZIP-delar samtidigt`,
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
      'Dina bilder sparas bara för att skapa dina böcker, i 3 månader, och du kan radera dem när du vill. Vi ser aldrig dina inloggningsuppgifter till Instagram.',
  },
};
