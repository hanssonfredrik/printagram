import type { Messages } from '../en';

export const auth: Messages['auth'] = {
  signIn: {
    title: 'Välkommen tillbaka',
    lead: 'Dina bilder och böcker väntar.',
    email: 'E-post',
    password: 'Lösenord',
    submit: 'Logga in',
    busy: 'Loggar in…',
    wrongPassword: 'Fel e-postadress eller lösenord.',
    failed: 'Vi kunde inte logga in dig. Försök igen om en minut.',
    emailFirst: 'Fyll i din e-postadress ovan först och tryck sedan på Glömt lösenordet.',
    resetSent: 'Om det finns ett konto för den adressen är en återställningslänk på väg.',
    sentTitle: 'Kolla din e-post',
    sentTo: (email: string) =>
      `Vi har skickat en länk till ${email} där du väljer ett nytt lösenord.`,
    sentHelp:
      'Mejlet kommer från hello@inbunden.com inom en minut och länken gäller i en timme. Syns inget? Titta i skräpposten, eller kontrollera att det är adressen du registrerade dig med.',
    sentAgain: 'Skicka länken igen',
    sentAgainDone: 'Skickat igen ✓',
    backToSignIn: 'Tillbaka till inloggningen',
    sending: 'Skickar…',
    forgot: 'Glömt lösenordet?',
    newHere: 'Ny här?',
    start: 'Skapa din bok',
  },
  reset: {
    title: 'Välj ett nytt lösenord',
    newPlaceholder: 'Nytt lösenord (minst 8 tecken)',
    newLabel: 'Nytt lösenord',
    repeat: 'Upprepa lösenordet',
    tooShort: 'Använd minst 8 tecken.',
    mismatch: 'Lösenorden stämmer inte överens.',
    submit: 'Spara och logga in',
    busy: 'Sparar…',
  },
  returnLink: {
    title: 'Välkommen tillbaka',
    lead: 'Fortsätt där du slutade: ladda upp ZIP-filen som Instagram skickade dig och välj dina bilder.',
    submit: 'Fortsätt',
    busy: 'Ett ögonblick…',
  },
  linkInvalid: 'Länken är inte längre giltig.',
};
