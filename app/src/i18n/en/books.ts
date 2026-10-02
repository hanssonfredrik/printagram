/** My books: the photo library card and the list of books. */
export const books = {
  yourEmail: 'your email',
  signOut: 'Sign out',
  square: 'Square',
  portrait: 'Portrait',
  meta: (pages: number, format: string, photos: number) =>
    `${pages} pages · ${format} · ${photos} photos`,
  ordered: (date: string, generating: boolean) =>
    `Ordered ${date} · PDF${generating ? ' · generating' : ''}`,
  downloadPdf: 'Download PDF',
  finishPdf: 'Finish PDF',
  draft: 'Draft',
  continue: 'Continue',
  duplicate: 'Duplicate',
  libraryTitle: 'Your photo library',
  libraryMeta: (photos: number, source: string, date: string) =>
    `${photos} photos · ${source} · imported ${date}`,
  exportSource: 'Instagram export',
  googleSource: 'Google Photos',
  keptUntilBefore: 'Kept until',
  keptUntilAfter: '. Each new book extends this by 3 months.',
  newBook: 'New book from these photos',
  addPhotos: 'Add more photos',
  deleteNow: 'Delete photos now',
  deleteTitle: (photos: number, drafts: number) =>
    `Delete ${photos} photos and ${drafts === 1 ? '1 draft' : drafts > 1 ? `${drafts} drafts` : 'drafts'}?`,
  deleteBody:
    "This can't be undone. Ordered PDFs stay downloadable. To make another book later you'd import your photos again.",
  deleting: 'Deleting…',
  deleteConfirm: 'Yes, delete everything',
  keepPhotos: 'Keep my photos',
  noPhotosTitle: 'No photos stored',
  libraryDeleted:
    'Your library was deleted. Bring in photos again to make a new book - ordered PDFs below are still yours.',
  bringInFirst: 'Bring in your Instagram photos to make your first book.',
  bringIn: 'Bring in photos',
  yourBooks: 'Your books',
  noBooks: 'No books yet. Start one from your library above.',
};
