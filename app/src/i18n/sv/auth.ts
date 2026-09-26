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
    failed: 'Det gick inte att logga in.',
    emailFirst: 'Fyll i din e-postadress ovan först och tryck sedan på Glömt lösenordet.',
    resetSent: 'Om det finns ett konto för den adressen är en återställningslänk på väg.',
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
