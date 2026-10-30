import type { Messages } from '../en';

export const pricing: Messages['pricing'] = {
  title: 'Priser',
  lead: 'En fotobok från Inbunden kostar {price} som tryckfärdig PDF, oavsett antal bilder eller sidor. Ingen prenumeration, ingen kontoavgift. Tryckta böcker är på väg.',
  cardsTitle: 'Det här kan du beställa',
  included: {
    title: 'Det här ingår i PDF:en',
    items: [
      'Upp till 999 bilder och hur många sidor som helst, för samma pris',
      'Automatisk layout i datumordning, sedan dina ändringar: en till fyra bilder per sida, utfallande eller med ram, textsidor, eget omslag och egen titel',
      'Kvadratisk (21 × 21 cm) eller stående (21 × 28 cm)',
      'Tryckfärdig: 4 mm utfall, skärmärken (trim box), dina originalbilder inbäddade utan ny komprimering och sRGB-färg',
      'Bildtexter och datum under bilderna om du vill',
      'En förhandsvisning av varje sida innan du betalar. Förhandsvisningen är exakt det som trycks',
      'Ladda ner den igen när som helst från Mina böcker, och dela en länk till PDF:en',
      'Dina bilder finns kvar i ditt bibliotek i 3 månader, så en andra bok kräver ingen ny import',
    ],
  },
  examples: {
    title: 'Samma pris, oavsett bok',
    intro:
      'De flesta fotobokstjänster tar betalt per sida. Det gör inte Inbunden, så en lång bok kostar inte mer än en kort:',
    rows: [
      { label: 'En resa, 30 bilder, cirka 16 sidor', value: '{price}' },
      { label: 'Ett första år, 150 bilder, cirka 60 sidor', value: '{price}' },
      { label: 'Tio år av Instagram, 900 bilder, cirka 300 sidor', value: '{price}' },
    ],
    note: 'Antalet sidor beror på vilka layouter du väljer. Förhandsvisningen visar det exakta antalet innan du betalar.',
  },
  printing: {
    title: 'Vad trycket kostar',
    paragraphs: [
      'PDF:en är din att trycka var du vill: ett tryckeri på orten, ett fotoboksföretag på nätet eller din egen skrivare. Du betalar tryckeriet för papper, bindning och frakt, och den delen beror på format, antal sidor och omslag. Vår [guide om att trycka fotoboken](guidePrint) listar vad du ska be om och hur du jämför offerter.',
      'Tryckta häftade och inbundna böcker från Inbunden kommer snart, till priserna ovan. Tills dess är PDF:en den enda produkten, och den finns kvar även när de tryckta böckerna kommer.',
    ],
  },
  compare: {
    title: 'Jämfört med andra fotobokstjänster',
    paragraphs: [
      'De flesta tjänster säljer en tryckt bok, sätter priset efter antal sidor och format, och låter dig bygga boken i deras redigerare. Inbunden bygger boken av dina Instagram-inlägg, i datumordning med bildtexter, och säljer dig filen. Du väljer tryckeri och papper. Guiden som [jämför fotobokstjänster för Instagram](guideCompare) går igenom alternativen och deras priser.',
    ],
  },
  payment: {
    title: 'Att betala',
    items: [
      'Kort, Apple Pay och Google Pay. Klarna i Sverige.',
      'Kronor på den svenska sidan, euro på den engelska. Sidans språk avgör valutan.',
      'Priserna är inklusive moms där det gäller. Du ser totalen innan du betalar.',
      'Rabattkoder fyller du i i kassan.',
      'Om PDF:en inte kan skapas, eller har ett fel som beror på oss, rättar vi till det eller betalar tillbaka hela beloppet. Skriv till hello@inbunden.com.',
    ],
  },
  faqTitle: 'Frågor om priset',
  faq: [
    {
      q: 'Finns det en prenumeration eller kontoavgift?',
      a: 'Nej. Du betalar {price} per bok när du beställer den, och inget före eller efter. Kontot, biblioteket och förhandsvisningen är gratis.',
    },
    {
      q: 'Varför beror priset inte på antalet sidor?',
      a: 'För att PDF:en kostar oss lika mycket att göra oavsett om den har 10 eller 300 sidor. Det är trycket som kostar per sida, och det betalar du direkt till tryckeriet.',
    },
    {
      q: 'Kan jag ändra boken efter att jag har köpt den?',
      a: 'Ja. Öppna boken i Mina böcker, duplicera den, ändra det du vill och beställ den nya versionen som en ny PDF för {price}. PDF:en du redan köpt går fortfarande att ladda ner.',
    },
    {
      q: 'Betalar jag innan jag ser boken?',
      a: 'Nej. Du importerar bilderna, väljer inläggen och förhandsgranskar varje sida först. Betalningen kommer sist, och förhandsvisningen är exakt det som trycks.',
    },
    {
      q: 'Vad kostar ett tryckt exemplar?',
      a: 'Det beror på tryckeriet, formatet, antalet sidor och omslaget. Be ett tryckeri om offert på en bok i 21 × 21 cm eller 21 × 28 cm med 4 mm utfall, eller ladda upp PDF:en hos ett fotoboksföretag på nätet och se deras pris. [Guiden om att trycka](guidePrint) förklarar valen.',
    },
    {
      q: 'Kan jag få pengarna tillbaka?',
      a: 'PDF:en är en digital nedladdning, så det finns ingen returrätt när den väl är skapad. Om den inte kan skapas eller har ett fel som beror på oss rättar vi till det eller betalar tillbaka hela beloppet.',
    },
  ],
  start: 'Skapa din bok',
  updated: (date: string) => `Uppdaterad ${date}`,
};
