import type { Messages } from '../en';

export const share: Messages['share'] = {
  invalid: 'Länken är inte giltig.',
  pages: (n: number) => (n === 1 ? '1 sida' : `${n} sidor`),
  portrait: 'Stående 21 × 28 cm',
  square: 'Kvadratisk 21 × 21 cm',
  size: (mb: number) => `${mb.toFixed(1).replace('.', ',')} MB`,
  download: 'Ladda ner PDF:en',
  notReady: 'Ägaren har inte skapat klart den här PDF:en än.',
  madeWith: 'Skapad med Printagram – ditt Instagram som en riktig bok.',
  makeOwn: 'Gör din egen',
};
