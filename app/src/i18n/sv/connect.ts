import type { Messages } from '../en';

export const connect: Messages['connect'] = {
  title: 'Anslut ditt Instagram',
  intro:
    'Du loggar in på instagram.com och ger Inbunden tillåtelse att läsa dina inlägg. Instagram låter bara kreatörs- och företagskonton ansluta, så först en snabb koll.',
  acctQuestion: 'Vilken typ av konto har du?',
  acct: {
    pro: 'Kreatör eller företag',
    personal: 'Personligt',
    unsure: 'Vet inte',
  },
  askFor: {
    title: 'Det här ber Inbunden om',
    profile: 'Ditt användarnamn och din profilbild',
    posts: 'Dina inlägg: bilder, bildtexter, datum och gilla-markeringar',
    readOnly:
      'Bara läsåtkomst. Inga inlägg, inga meddelanden, inga följare. Koppla från när du vill. Åtkomsten upphör också av sig själv efter 60 dagar.',
  },
  continue: 'Fortsätt med Instagram',
  opensWindow:
    'Öppnar instagram.com i ett nytt fönster. Du loggar in där. Vi ser aldrig ditt lösenord.',
  switchFirst: {
    title: 'Byt till ett professionellt konto först',
    text: 'Gratis, tar ungefär två minuter, går att ångra och ingen får någon avisering. En sak ändras: ett privat konto blir offentligt, och väntande följarförfrågningar godkänns. Vill du hellre vara privat? Använd exporten i stället. Den funkar för alla konton.',
  },
  switchSteps: [
    {
      title: 'Öppna Inställningar och aktivitet',
      text: 'Gå till din profil i Instagram-appen, tryck på menyn (☰) uppe till höger och sedan på Inställningar och aktivitet.',
    },
    {
      title: 'Kontotyp och verktyg',
      text: 'Scrolla ner till För professionella och tryck på Kontotyp och verktyg.',
    },
    {
      title: 'Byt till professionellt konto',
      text: 'Tryck på Byt till professionellt konto och fortsätt förbi introduktionsskärmarna.',
    },
    {
      title: 'Välj en kategori',
      text: 'Välj det som passar, till exempel Fotograf, Bloggare eller Personlig blogg. Du kan dölja den på din profil.',
    },
    {
      title: 'Välj Kreatör',
      text: 'Kreatör passar bäst för en personlig profil, men Företag funkar också. Hoppa över kontaktuppgifterna och Facebook-länken om du blir tillfrågad.',
    },
  ],
  goodToKnow: {
    title: 'Bra att veta',
    text: 'På en dator hittar du samma inställning på instagram.com → Mer → Inställningar → Kontotyp och verktyg. Har du precis bytt? Det kan ta några minuter innan Instagram registrerar ändringen. Byt tillbaka när du vill under Kontotyp och verktyg → Byt till personligt konto.',
  },
  switched: 'Jag har bytt. Fortsätt med Instagram',
  keepAccount: 'Använd exporten i stället',
  quickCheck: {
    title: 'Ett snabbt sätt att kolla',
    text: 'Öppna din egen profil i Instagram-appen. Finns knappen Professionell översikt under din bio har du ett kreatörs- eller företagskonto. Finns den inte är kontot personligt.',
  },
  seeButton: 'Jag ser knappen (kreatör eller företag)',
  noButton: 'Ingen knapp (personligt konto)',
  waiting: {
    title: 'Väntar på Instagram…',
    text: 'Ett fönster öppnades på instagram.com. Logga in där och tryck på Tillåt. Sidan uppdateras av sig själv.',
    reopen: 'Öppnades inget? Öppna Instagram igen',
  },
  errors: {
    personal: {
      title: 'Instagram lät oss inte ansluta',
      text: 'Instagram ansluter bara kreatörs- och företagskonton och visar ett otydligt fel när kontot är personligt. Om du precis har bytt, ge Instagram några minuter och försök igen.',
    },
    denied: {
      title: 'Ingen åtkomst gavs',
      text: 'Instagram-fönstret stängdes eller så tryckte du på Avbryt, så inget delades med Inbunden. Försök igen när du är redo, eller använd exporten i stället.',
    },
    expired: {
      title: 'Anslutningen tog för lång tid',
      text: 'Instagram svarade inte i tid. Försök igen, eller använd exporten i stället.',
    },
    unknown: {
      title: 'Något gick fel hos Instagram',
      text: 'Instagram svarade med ett fel vi inte väntade oss. Försök igen om en minut, eller använd exporten i stället.',
    },
  },
  showSwitch: 'Visa hur jag byter',
  tryAgain: 'Försök igen',
  useExport: 'Använd exporten i stället',
  importing: {
    account: 'Professionellt konto · anslutet nyss',
    connected: 'Ansluten',
    copying: 'Kopierar dina inlägg…',
    note: 'Vi kopierar dina bilder en gång, i full storlek, eftersom Instagrams länkar slutar fungera efter ett tag. Vi sparar kopiorna i 3 månader, och varje ny bok lägger till 3 månader till. Vi mejlar dig en vecka innan de raderas.',
  },
  found: (n: number) => (n === 1 ? 'Hittade 1 bild' : `Hittade ${n} bilder`),
  foundFrom: (n: number, years: string) =>
    n === 1 ? `Hittade 1 bild från ${years}` : `Hittade ${n} bilder från ${years}`,
  foundStats: (posts: number, carousels: number, videos: number) =>
    `${posts} inlägg · ${carousels} ${carousels === 1 ? 'karusell' : 'karuseller'} · ${videos} ${videos === 1 ? 'video' : 'videor'} hoppas över som standard · gilla-markeringar ingår`,
  backToBooks: 'Tillbaka till Mina böcker',
  choosePhotos: 'Välj bilder',
  readUntil: 'Inbunden kan läsa dina inlägg tills du kopplar från, eller som längst i 60 dagar.',
  disconnectNow: 'Koppla från nu',
  disconnected:
    'Frånkopplat. Dina kopierade bilder finns kvar i ditt bibliotek i 3 månader, och varje ny bok lägger till 3 månader till.',
  storage:
    'Vi sparar dina bilder i 3 månader, bara för att göra dina böcker. Du kan radera dem när du vill. Vi ser aldrig ditt Instagram-lösenord.',
  libraryReady: (id: string) => `Biblioteket ${id} är klart`,
};
