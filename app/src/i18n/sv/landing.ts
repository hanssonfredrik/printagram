import type { Messages } from '../en';

export const landing: Messages['landing'] = {
  myBooks: 'Mina böcker',
  signIn: 'Logga in',
  start: 'Skapa din bok',
  testMode: 'Testläge',
  testModeTitle: 'Betalningarna är i testläge. Inga pengar dras.',
  hero: {
    title: 'Ditt Instagram som en riktig bok.',
    lead: 'Inbunden gör dina Instagram-inlägg till en tryckfärdig fotobok. Välj bilderna från ett år, en resa eller ett första år. Vi gör layouten och du får en PDF att spara. Tryckta böcker kommer snart.',
    price: (price: string) => `PDF ${price}`,
    noPassword:
      'Vi ber aldrig om ditt Instagram-lösenord. Du laddar ner dina bilder från Instagram och laddar upp filen här.',
  },
  how: {
    title: 'Så funkar det',
    steps: [
      {
        title: 'Hämta dina bilder',
        text: 'Be Instagram om en kopia av dina inlägg och ladda upp ZIP-filen du får via mejl. Eller skicka inläggen till Google Foto och välj dem där.',
      },
      {
        title: 'Välj',
        text: 'Välj hela månader eller år, eller enstaka bilder. Alla bilder i en karusell följer med.',
      },
      {
        title: 'Skriv ut',
        text: 'Förhandsgranska varje sida och ladda sedan ner din tryckfärdiga PDF.',
      },
    ],
  },
  samples: {
    title: 'Exempeluppslag',
    intro:
      'Riktiga sidor gjorda med Inbunden: en till fyra bilder per sida, utfallande eller med marginal, textsidor och bildtexter om du vill.',
    bookTitle: 'Vårt år · 2025',
    yearText: '2025\ni 84 bilder',
    spreads: {
      trip: 'En resa',
      summer: 'En sommar',
      year: 'Året som gått',
    },
    captions: {
      sunset: 'Sista ljuset i Costa Nova',
      rooftops: 'Hustaken i Alfama',
      beach: 'Lissabon i mars',
      mountains: 'Tidigt uppe för den här',
      flowers: 'Trädgården, äntligen',
      coffee: 'Söndag',
      forest: 'Lång promenad',
      city: 'Nattbussen hem',
    },
  },
  pricing: {
    title: 'Priser',
    intro: 'Ett pris för PDF:en, oavsett hur många bilder och sidor boken har.',
    from: (price: string) => `från ${price}`,
    comingSoon: 'Kommer snart',
    pdf: {
      title: 'Digital PDF',
      text: 'Tryckfärdig PDF, ladda ner direkt.',
      note: 'Finns nu',
    },
    softcover: {
      title: 'Häftad bok',
      text: 'Tryckt och levererad hem till dig.',
    },
    hardcover: {
      title: 'Inbunden bok',
      text: 'Linneklädd, sidor som ligger platt.',
    },
  },
  faqTitle: 'Frågor',
  guidesTeaser: 'Mer om att exportera från Instagram och trycka PDF:en:',
  guidesLink: 'läs guiderna',
  faq: [
    {
      q: 'Vad kostar det?',
      a: '{price} per bok för den tryckfärdiga PDF:en, oavsett antal bilder eller sidor. Ingen prenumeration. Tryckta häftade och inbundna böcker kommer snart.',
    },
    {
      q: 'Är det säkert?',
      a: 'Ja. Du laddar själv ner dina bilder från Instagram och laddar upp filen här. Vi loggar aldrig in på ditt konto, ser aldrig ditt lösenord och kan aldrig publicera något.',
    },
    {
      q: 'Kan jag ansluta mitt Instagram direkt?',
      a: 'Inte än. Vi väntar på att Instagram ska godkänna Inbunden. Använd exporten så länge. Den funkar för alla konton, men Instagram behöver några timmar till ett par dagar för att ta fram filen.',
    },
    {
      q: 'Fungerar privata konton?',
      a: 'Ja. Exporten fungerar för privata konton också, och ditt konto förblir privat.',
    },
    {
      q: 'Hur lång tid tar exporten från Instagram?',
      a: 'Oftast några timmar, ibland en dag eller två. Instagram mejlar dig en nedladdningslänk när den är klar. Vi skickar dig en returlänk så att du kan fortsätta där du slutade.',
    },
    {
      q: 'Vad händer med mina bilder?',
      a: 'De ligger kvar i ditt Inbunden-bibliotek i 3 månader, så att du kan göra fler böcker utan att importera igen. Varje ny bok förlänger tiden med 3 månader. Du kan radera dem själv när du vill. Annars raderar vi dem när de 3 månaderna har gått, och mejlar dig en vecka innan. Beställda PDF:er går att ladda ner oavsett.',
    },
    {
      q: 'Vad får jag just nu?',
      a: 'En högupplöst PDF som du kan skriva ut på vilket tryckeri som helst. Tryckta böcker som skickas hem till dig kommer snart.',
    },
    {
      q: 'Vad innehåller PDF:en?',
      a: 'En sida per boksida, med omslaget först. Kvadratisk (21 × 21 cm) eller stående (21 × 28 cm), med 4 mm utfall och trimbox, dina originalbilder inbäddade utan omkomprimering och sRGB-färg. Upp till 999 bilder per bok, en till fyra per sida.',
    },
    {
      q: 'Var kan jag trycka den?',
      a: 'På valfritt tryckeri eller hos en fotobokstjänst på nätet som tar emot PDF-filer. Vår utskriftsguide går igenom vad du ska be om: format, utfall, papper och bindning.',
    },
    {
      q: 'Kan jag använda Google Foto?',
      a: 'Ja. Instagram kan skicka en kopia av dina inlägg till Google Foto, och sedan väljer du dem i Googles egen bildväljare. Du kan också välja andra bilder du har där. Vi ser bara de bilder du väljer.',
    },
    {
      q: 'Kan jag ändra layouten?',
      a: 'Ja. Vi gör layouten åt dig, sedan kan du välja layout för varje sida (en, två, tre eller fyra bilder, eller utfallande), dra bilder mellan sidor, lägga till textsidor och välja omslag, titel, format och bildtexter. Förhandsvisningen är exakt det som trycks.',
    },
  ],
};
