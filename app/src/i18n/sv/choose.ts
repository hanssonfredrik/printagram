import type { Messages } from '../en';

export const choose: Messages['choose'] = {
  title: 'Hämta dina bilder',
  adding: (n: number) =>
    `Lägger till i ditt bibliotek. Bara inlägg som är nyare än din senaste import läggs till. ${n === 1 ? 'Bilden du redan har ligger kvar som den är.' : `De ${n} bilder du redan har ligger kvar som de är.`}`,
  intro:
    'Några sätt att få in dina inlägg i Inbunden. Alla ger bara läsåtkomst, och inget av dem delar ditt lösenord med oss.',
  instant: 'Direkt',
  comingSoon: 'Kommer snart',
  connect: {
    title: 'Anslut Instagram',
    text: 'Logga in på Instagrams egen webbplats och ge Inbunden tillåtelse att läsa dina inlägg. Dina bilder dyker upp här direkt.',
    needsPro:
      'Kräver ett kreatörs- eller företagskonto. Att byta är gratis, tar två minuter och går att ångra.',
    likes: 'Dina gilla-markeringar följer med, så att du kan skriva ut dina mest gillade inlägg.',
    public: 'Professionella konton är offentliga. Vill du vara privat? Använd exporten.',
    button: 'Anslut Instagram',
    waiting:
      'Vi väntar på att Instagram ska godkänna Inbunden. Tills dess kan du använda exporten. Den funkar för alla konton.',
  },
  export: {
    pill: 'Funkar för alla konton',
    title: 'Ladda upp din export',
    text: 'Be Instagram om en kopia av dina inlägg och släpp sedan ZIP-filen här. Inget ändras på ditt konto.',
    every: 'Personligt, privat, kreatör eller företag: alla konton funkar.',
    email:
      'Instagram mejlar dig filen inom några timmar, ibland efter en dag eller två. Vi skickar dig en returlänk.',
    noLikes: 'Gilla-markeringar brukar inte följa med i exporten.',
    button: 'Visa hur',
  },
  google: {
    pill: 'Funkar för alla konton',
    title: 'Via Google Foto',
    text: 'Låt Instagram skicka dina inlägg till Google Foto och välj dem där. Inget att ladda ner, så det är smidigt på mobilen.',
    every: 'Personligt, privat, kreatör eller företag: alla konton funkar.',
    background: 'Instagram kopierar bilderna i bakgrunden; du väljer dem när de är på plats.',
    noCaptions:
      'Bildtexter och gilla-markeringar följer inte med, och datumen kan bli överföringsdagen.',
    button: 'Skicka via Google Foto',
  },
  unsure: {
    title: 'Osäker på vilken kontotyp du har?',
    before: 'Öppna din egen profil i Instagram-appen. Finns knappen ',
    button: 'Professionell översikt',
    after:
      ' under din bio har du ett kreatörs- eller företagskonto. Finns ingen knapp är kontot personligt.',
  },
};
