import { describe, expect, it } from 'vitest';
import { templates } from '../src/lib/email.js';
import { bookContentHash } from '../src/lib/orderService.js';

describe('emails in the user language', () => {
  it('writes every template in Swedish and marks the html language', () => {
    const ready = templates.orderReady('a@b.se', 'Våra år', 'https://x/books', 'sv');
    expect(ready.subject).toBe('Din bok ”Våra år” är klar');
    expect(ready.html).toContain('<html lang="sv">');
    expect(ready.text).toContain('Mina böcker');

    const reminder = templates.libraryReminder(
      'a@b.se',
      42,
      '2026-10-03T00:00:00Z',
      7,
      'https://x/books',
      'https://x/books?delete=1',
      'sv',
    );
    expect(reminder.subject).toBe('Dina bilder raderas om 7 dagar');
    expect(reminder.html).toContain('De raderas den 3 okt 2026.');
  });

  it('defaults to English', () => {
    const reset = templates.passwordReset('a@b.com', 'https://x/reset/1');
    expect(reset.subject).toBe('Reset your Printagram password');
    expect(reset.html).toContain('<html lang="en">');
    const reminder = templates.libraryReminder('a@b.com', 3, '2026-10-03T00:00:00Z', 5, 'k', 'd');
    expect(reminder.subject).toBe('Your photos are deleted in 5 days');
    expect(reminder.text).toContain("They'll be deleted on 3 Oct 2026.");
  });
});

describe('book content hash', () => {
  const book = {
    photoIds: ['a', 'b'],
    format: 'square' as const,
    showMeta: true,
    title: 'Our years',
    coverPhotoId: 'a',
    pages: [],
    layout: { density: '1', fullBleed: false },
  };

  it('is unchanged for English books, including rows saved before languages', () => {
    expect(bookContentHash({ ...book, lang: 'en' })).toBe(bookContentHash(book));
  });

  it('changes when the book language changes', () => {
    expect(bookContentHash({ ...book, lang: 'sv' })).not.toBe(bookContentHash(book));
  });
});
