/** Public share page for an ordered PDF. */
export const share = {
  invalid: 'This link is not valid.',
  pages: (n: number) => `${n} pages`,
  portrait: 'Portrait 21 × 28 cm',
  square: 'Square 21 × 21 cm',
  size: (mb: number) => `${mb.toFixed(1)} MB`,
  download: 'Download the PDF',
  notReady: 'The owner has not finished generating this PDF yet.',
  madeWith: 'Made with Inbunden — your Instagram, as a real book.',
  makeOwn: 'Make your own',
};
