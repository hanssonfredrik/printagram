import type { Messages } from '../en';

export const books: Messages['books'] = {
  yourEmail: 'din e-post',
  signOut: 'Logga ut',
  square: 'Kvadratisk',
  portrait: 'Stående',
  meta: (pages: number, format: string, photos: number) =>
    `${pages} ${pages === 1 ? 'sida' : 'sidor'} · ${format} · ${photos} ${photos === 1 ? 'bild' : 'bilder'}`,
  ordered: (date: string, generating: boolean) =>
    `Beställd ${date} · PDF${generating ? ' · skapas' : ''}`,
  downloadPdf: 'Ladda ned PDF',
  finishPdf: 'Gör klart PDF:en',
  draft: 'Utkast',
  continue: 'Fortsätt',
  duplicate: 'Duplicera',
  libraryTitle: 'Ditt bildbibliotek',
  libraryMeta: (photos: number, source: string, date: string) =>
    `${photos} ${photos === 1 ? 'bild' : 'bilder'} · ${source} · importerat ${date}`,
  exportSource: 'Instagram-export',
  keptUntilBefore: 'Sparas till',
  keptUntilAfter: '. Varje ny bok förlänger tiden med 3 månader.',
  newBook: 'Ny bok av de här bilderna',
  addPhotos: 'Lägg till fler bilder',
  deleteNow: 'Radera bilderna nu',
  deleteTitle: (photos: number, drafts: number) =>
    `Radera ${photos} ${photos === 1 ? 'bild' : 'bilder'} och ${drafts === 1 ? '1 utkast' : drafts > 1 ? `${drafts} utkast` : 'utkast'}?`,
  deleteBody:
    'Det går inte att ångra. Beställda PDF:er går fortfarande att ladda ned. Vill du göra en bok till senare får du importera dina bilder igen.',
  deleting: 'Raderar…',
  deleteConfirm: 'Ja, radera allt',
  keepPhotos: 'Behåll mina bilder',
  noPhotosTitle: 'Inga bilder sparade',
  libraryDeleted:
    'Ditt bibliotek har raderats. Hämta in bilder igen för att göra en ny bok – beställda PDF:er nedan är fortfarande dina.',
  bringInFirst: 'Hämta in dina Instagram-bilder och gör din första bok.',
  bringIn: 'Hämta bilder',
  yourBooks: 'Dina böcker',
  noBooks: 'Inga böcker än. Börja på en från ditt bibliotek ovan.',
};
