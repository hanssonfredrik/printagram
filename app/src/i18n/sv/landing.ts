import type { Messages } from '../en';

export const landing: Messages['landing'] = {
  myBooks: 'Mina böcker',
  signIn: 'Logga in',
  start: 'Skapa din bok',
  testMode: 'Testläge',
  testModeTitle: 'Betalningarna är simulerade. Inga pengar dras.',
  hero: {
    title: 'Ditt Instagram som en riktig bok.',
    lead: 'Välj bilderna, vi gör layouten. Ett år, en resa, ett första år – som en tryckfärdig PDF som du har för alltid. Tryckta böcker kommer snart.',
    price: (price: string) => `PDF ${price}`,
    noPassword:
      'Vi ber aldrig om ditt lösenord. Anslut via Instagrams egen inloggning, eller ladda upp din export.',
  },
  how: {
    title: 'Så funkar det',
    steps: [
      {
        title: 'Hämta dina bilder',
        text: 'Anslut ditt Instagram på några sekunder, eller ladda upp exporten som Instagram skickar dig. Hur du än gör ser vi aldrig ditt lösenord.',
      },
      {
        title: 'Välj',
        text: 'Välj per månad eller år (eller mest gillade, om du ansluter). Karuseller ingår.',
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
      'Riktiga sidor från layoutmotorn: en till fyra bilder per sida, utfallande eller med marginal, textsidor och bildtexter om du vill.',
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
  faq: [
    {
      q: 'Är det säkert?',
      a: 'Ja. Om du ansluter loggar du in på Instagrams egen webbplats, och Instagram låter oss läsa dina inlägg – inget mer. Vi kan inte publicera, skicka meddelanden eller se ditt lösenord. Om du laddar upp hämtar du själv dina bilder från Instagram och släpper filen här. Vi rör aldrig ditt konto.',
    },
    {
      q: 'Ansluta eller ladda upp – vilket ska jag välja?',
      a: 'Anslut om du har ett kreatörs- eller företagskonto: det tar några sekunder och dina gilla-markeringar följer med. Ladda upp exporten om du har ett personligt konto och vill behålla det så. Det funkar för alla konton, men Instagram behöver några timmar till ett par dagar för att ta fram filen.',
    },
    {
      q: 'Fungerar privata konton?',
      a: 'Ja, med exporten. För att ansluta krävs ett professionellt konto, och sådana gör Instagram offentliga – så om du vill vara privat, använd exporten.',
    },
    {
      q: 'Hur lång tid tar exporten från Instagram?',
      a: 'Oftast några timmar, ibland en dag eller två. Instagram mejlar dig en nedladdningslänk när den är klar. Vi skickar dig en returlänk så att du kan fortsätta där du slutade.',
    },
    {
      q: 'Vad händer med mina bilder?',
      a: 'De ligger kvar i ditt Inbunden-bibliotek i 3 månader, så att du kan göra fler böcker utan att importera igen. Varje ny bok förlänger tiden med 3 månader. Radera dem själv när du vill, annars raderar vi dem när de 3 månaderna har gått – efter ett påminnelsemejl. Beställda PDF:er går att ladda ner oavsett.',
    },
    {
      q: 'Vad får jag just nu?',
      a: 'En högupplöst PDF som du kan skriva ut på vilket tryckeri som helst. Tryckta böcker som skickas hem till dig kommer snart.',
    },
    {
      q: 'Kan jag ändra layouten?',
      a: 'Ja. Vi gör layouten åt dig, sedan kan du välja layout för varje sida (en, två, tre eller fyra bilder, eller utfallande), dra bilder mellan sidor, lägga till textsidor och välja omslag, titel, format och bildtexter. Förhandsvisningen är exakt det som trycks.',
    },
  ],
};
