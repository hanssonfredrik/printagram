import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { DEFAULT_LAYOUT, pickLang } from '@printagram/shared';
import { router as appRouter } from '@/router';
import { resetMockState, seedDemoExportLibrary, mockFlags } from '@/test/fakeApi';
import { useDraft } from '@/state/draft';
import { useLibrary } from '@/state/library';
import { useSession } from '@/state/session';
import { useLang } from '@/i18n';
import { api } from '@/services';

function renderAt(path: string) {
  const routes = appRouter.routes;
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return { router, ...render(<RouterProvider router={router} />) };
}

async function seedLibraryAndDraft() {
  resetMockState();
  const lib = seedDemoExportLibrary('instagram-test.zip', false);
  const photos = await api.listPhotos(lib.id);
  useLibrary.getState().setPhotos(lib.id, lib, photos);
  useDraft.getState().setSource('export');
  useDraft.getState().startLibrary(lib.id, photos);
  await useSession.getState().init();
  return { lib, photos };
}

beforeEach(() => {
  localStorage.clear();
  useLang.getState().setLang('en');
  resetMockState();
  useDraft.getState().resetAll();
  useLibrary.getState().clear();
  mockFlags.latencyMs = 0;
  mockFlags.connectMode = 'live';
  mockFlags.googleMode = 'live';
  mockFlags.emptyLibrary = false;
  mockFlags.payFails = false;
});

afterEach(() => cleanup());

describe('screens (against the in-memory test API)', () => {
  it('renders the landing page with pricing and FAQ', async () => {
    renderAt('/');
    expect(await screen.findByText('Your Instagram, as a real book.')).toBeTruthy();
    expect(screen.getByText('PDF €9')).toBeTruthy();
    expect(
      screen.getByText('One price for the PDF, however many photos and pages your book has.'),
    ).toBeTruthy();
    expect(screen.getByText('Is it safe?')).toBeTruthy();
  });

  it('landing → choose source → export guide → waiting → upload', async () => {
    const { router } = renderAt('/');
    fireEvent.click((await screen.findAllByText('Start your book'))[0]!);
    expect(await screen.findByText('Bring in your photos')).toBeTruthy();
    expect(screen.getByText('Connect Instagram', { selector: 'div' })).toBeTruthy();
    fireEvent.click(screen.getByText('Show me how'));
    expect(await screen.findByText('Get your photos from Instagram')).toBeTruthy();
    expect(screen.getByText('Choose Posts only')).toBeTruthy();
    fireEvent.click(screen.getByText('On a computer'));
    expect(await screen.findByText('Open Instagram settings')).toBeTruthy();
    fireEvent.click(screen.getByText("I've requested my export"));
    expect(await screen.findByText('Instagram is preparing your photos')).toBeTruthy();
    fireEvent.click(screen.getByText('I have my ZIP — upload it'));
    expect(await screen.findByText('Drop the ZIP here')).toBeTruthy();
    expect(router.state.location.pathname).toBe('/export/upload');
  });

  it('shows the coming-soon state when connect is disabled', async () => {
    mockFlags.connectMode = 'coming-soon';
    renderAt('/start');
    expect(await screen.findByText(/waiting for Instagram to approve Inbunden/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Connect Instagram' })).toBeNull();
  });

  it('connect: account picker, switch guide and personal-account error', async () => {
    renderAt('/connect');
    expect(await screen.findByText('What kind of account do you have?')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Personal' }));
    expect(await screen.findByText('Switch to a Professional account first')).toBeTruthy();
    expect(screen.getByText('Choose Creator')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'Not sure' }));
    expect(await screen.findByText('A quick way to check')).toBeTruthy();
    fireEvent.click(screen.getByText("I see the button — it's Professional"));
    expect(await screen.findByText('Continue with Instagram')).toBeTruthy();
  });

  it('connect: returning from Instagram with an error shows next steps', async () => {
    renderAt('/connect?error=personal');
    expect(await screen.findByText("Instagram didn't let us connect")).toBeTruthy();
    expect(screen.getByText('Show me how to switch')).toBeTruthy();
  });

  it('connect: allowed → import progress → found photos', async () => {
    const { router } = renderAt('/connect?connected=1');
    expect(await screen.findByText('Copying your posts…')).toBeTruthy();
    expect(
      await screen.findByText(/Found \d+ photos from 2023–2025/, {}, { timeout: 15000 }),
    ).toBeTruthy();
    expect(screen.getByText(/likes included/)).toBeTruthy();
    fireEvent.click(screen.getByText('Choose photos'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/select'));
  }, 20000);

  it('choose source: the Google Photos card follows its flag', async () => {
    mockFlags.googleMode = 'off';
    renderAt('/start');
    expect(await screen.findByText('Upload your export')).toBeTruthy();
    expect(screen.queryByText('Via Google Photos')).toBeNull();
    cleanup();
    mockFlags.googleMode = 'live';
    const { router } = renderAt('/start');
    expect(await screen.findByText('Via Google Photos')).toBeTruthy();
    expect(screen.getByText(/dates may be the transfer date/)).toBeTruthy();
    fireEvent.click(screen.getByText('Send via Google Photos'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/google'));
    expect(await screen.findByText('Bring in photos via Google Photos')).toBeTruthy();
    expect(
      screen.getByText('Have you already sent your Instagram photos to Google Photos?'),
    ).toBeTruthy();
    fireEvent.click(screen.getByText('Not yet — show me how'));
    expect(await screen.findByText('Choose Google Photos')).toBeTruthy();
    expect(screen.getByText(/captions and likes stay on Instagram/)).toBeTruthy();
    fireEvent.click(screen.getByText("I've started the transfer — continue"));
    expect(await screen.findByText('Next: sign in with Google')).toBeTruthy();
    expect(screen.getByText('Sign in with Google')).toBeTruthy();
    fireEvent.click(screen.getByText('Show the Instagram steps again'));
    expect(await screen.findByText('Choose Google Photos')).toBeTruthy();
  });

  it('google: "yes" skips straight to the sign-in step', async () => {
    renderAt('/google');
    fireEvent.click(await screen.findByText("Yes, they're in Google Photos"));
    expect(await screen.findByText('Next: sign in with Google')).toBeTruthy();
    expect(screen.queryByText('Choose Google Photos')).toBeNull();
  });

  it('google: back from Google → pick in the Picker → import → found photos', async () => {
    window.open = vi.fn(() => null) as never;
    const { router } = renderAt('/google?connected=1');
    expect(await screen.findByText('Signed in with Google')).toBeTruthy();
    fireEvent.click(screen.getByText('Pick photos in Google Photos'));
    expect(
      await screen.findByText(/Found \d+ photos from 2023–2025/, {}, { timeout: 15000 }),
    ).toBeTruthy();
    expect(screen.getByText(/no captions or likes/)).toBeTruthy();
    expect(window.open).toHaveBeenCalledWith(
      'mock://google-photos-picker/autoclose',
      '_blank',
      'noopener',
    );
    fireEvent.click(screen.getByText('Choose photos'));
    await waitFor(() => expect(router.state.location.pathname).toBe('/select'));
    expect(useDraft.getState().source).toBe('google');
  }, 20000);

  it('google: returning with an error shows next steps', async () => {
    renderAt('/google?error=denied');
    expect(await screen.findByText('No access was granted')).toBeTruthy();
    expect(screen.getByText('Use the export instead')).toBeTruthy();
  });

  it('about: the footer links to the About page with the name and founder', async () => {
    const { router } = renderAt('/');
    expect(await screen.findByText('Your Instagram, as a real book.')).toBeTruthy();
    fireEvent.click(screen.getByRole('link', { name: 'About' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/about'));
    expect(await screen.findByRole('heading', { name: 'About Inbunden' })).toBeTruthy();
    expect(screen.getByText(/Swedish word for a hardcover book/)).toBeTruthy();
    expect(screen.getByText(/made in Sweden by Fredrik Hansson/)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'hello@inbunden.app' })).toBeTruthy();
    cleanup();
    useLang.getState().setLang('sv');
    renderAt('/about');
    expect(await screen.findByRole('heading', { name: 'Om Inbunden' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Om Inbunden' })).toBeTruthy();
  });

  it('upload: shows the drop zone', async () => {
    renderAt('/export/upload');
    expect(await screen.findByText('Drop the ZIP here')).toBeTruthy();
  });

  it('select: grouping, filters, choose mode and footer price', async () => {
    const { photos } = await seedLibraryAndDraft();
    renderAt('/select');
    expect(await screen.findByText('Choose your photos')).toBeTruthy();
    expect(screen.getByText('2025')).toBeTruthy();
    // Carousels show all images by default; videos are never offered.
    const all = photos.filter((p) => !p.isVideo).length;
    expect(screen.getByText(`${all} photos selected`)).toBeTruthy();
    expect(screen.queryByText('Photos only')).toBeNull();
    fireEvent.click(screen.getByText('Carousels: all images'));
    const stills = photos.filter((p) => !p.isVideo && p.carouselIdx === 0).length;
    expect(await screen.findByText(`${stills} photos selected`)).toBeTruthy();
    fireEvent.click(screen.getByText('Carousels: first image'));
    expect(await screen.findByText(`${all} photos selected`)).toBeTruthy();
    // Choose mode: deselect a whole year.
    fireEvent.click(screen.getByRole('tab', { name: 'Choose photos' }));
    fireEvent.click((await screen.findAllByText('Deselect year'))[0]!);
    const y2025 = photos.filter((p) => !p.isVideo && p.year === 2025).length;
    expect(await screen.findByText(`${all - y2025} photos selected`)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });

  it('select: empty state', async () => {
    await seedLibraryAndDraft();
    mockFlags.emptyLibrary = true;
    useLibrary.getState().clear();
    renderAt('/select');
    expect(await screen.findByText('No photos found')).toBeTruthy();
  });

  it('preview: page navigation, format and captions', async () => {
    await seedLibraryAndDraft();
    renderAt('/preview');
    expect(await screen.findByText('Preview your book')).toBeTruthy();
    expect(screen.getByText('Cover')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(await screen.findByText('Title page')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(await screen.findByText(/Page 1 of/)).toBeTruthy();
    // Per-page layout tools appear on content pages.
    expect(screen.getByRole('radiogroup', { name: 'Page layout' })).toBeTruthy();
    fireEvent.click(screen.getByText('Portrait'));
    expect(await screen.findByText(/pages · Portrait/)).toBeTruthy();
    const captions = screen.getByRole('switch', { name: /Captions and dates/ });
    fireEvent.click(captions);
    expect(captions.getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeTruthy();
  });

  it('checkout (test payment): account validation, test card → done', async () => {
    await seedLibraryAndDraft();
    const { router } = renderAt('/checkout');
    expect(await screen.findByText('Test payment — no money is taken')).toBeTruthy();
    // No editable card fields in test mode.
    expect(screen.queryByPlaceholderText('Card number')).toBeNull();
    const place = await screen.findByRole('button', { name: 'Place test order' });
    fireEvent.click(place);
    expect(
      await screen.findByText('Please enter an email address so we can send your download link.'),
    ).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'mara@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Create a password (8+ characters)'), {
      target: { value: 'hunter2hunter2' },
    });
    fireEvent.click(place);
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/done\//), {
      timeout: 8000,
    });
  }, 20000);

  it('checkout (test payment): the decline card shows the reason and can be retried', async () => {
    await seedLibraryAndDraft();
    renderAt('/checkout');
    fireEvent.click(await screen.findByLabelText(/4000 0000 0000 0002/));
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'mara@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Create a password (8+ characters)'), {
      target: { value: 'hunter2hunter2' },
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Place test order' }));
    expect(await screen.findByText(/Your card was declined/, {}, { timeout: 8000 })).toBeTruthy();
  }, 20000);

  it('checkout: a 100 % discount code skips payment', async () => {
    await seedLibraryAndDraft();
    const { router } = renderAt('/checkout');
    await screen.findByText('Test payment — no money is taken');
    fireEvent.click(await screen.findByText('Have a discount code?'));
    fireEvent.change(screen.getByLabelText('Discount code'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText(/That code doesn't exist/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Discount code'), { target: { value: 'welcome100' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(await screen.findByText(/no payment needed/)).toBeTruthy();
    expect(screen.getByText(/Code/).textContent).toContain('WELCOME100');
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'mara@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Create a password (8+ characters)'), {
      target: { value: 'hunter2hunter2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Get my PDF' }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/done\//), {
      timeout: 8000,
    });
  }, 20000);

  it('sign in, my books (empty), return link and share pages render', async () => {
    renderAt('/signin');
    expect(await screen.findByText('Welcome back')).toBeTruthy();
    cleanup();
    await act(async () => {
      await api.login('mara@example.com', 'hunter2hunter2');
      await useSession.getState().init();
    });
    renderAt('/books');
    expect(await screen.findByText('No photos stored')).toBeTruthy();
    expect(screen.getByText('No books yet. Start one from your library above.')).toBeTruthy();
    cleanup();
    renderAt('/r/sometoken');
    expect(await screen.findByRole('button', { name: 'Continue' })).toBeTruthy();
    cleanup();
    renderAt('/s/unknown');
    expect(await screen.findByText('This link is not valid.')).toBeTruthy();
  });

  it('my books: library card, delete confirmation and draft listing', async () => {
    const { lib } = await seedLibraryAndDraft();
    await act(async () => {
      await api.login('mara@example.com', 'hunter2hunter2');
      await api.saveDraft({
        libraryId: lib.id,
        settings: {
          title: 'Draft one',
          format: 'square',
          showMeta: true,
          coverPhotoId: null,
          layout: DEFAULT_LAYOUT,
          lang: 'en',
        },
        pages: [{ template: '1-margin', photoIds: ['demo_0'] }],
        manualLayout: false,
      });
      await useSession.getState().init();
    });
    renderAt('/books');
    expect(await screen.findByText('Your photo library')).toBeTruthy();
    expect(await screen.findByText('Draft one')).toBeTruthy();
    fireEvent.click(screen.getByText('Delete photos now'));
    const dialog = await screen.findByRole('alert');
    expect(within(dialog).getByText(/Delete \d+ photos and 1 draft\?/)).toBeTruthy();
    fireEvent.click(within(dialog).getByText('Keep my photos'));
    expect(await screen.findByText('New book from these photos')).toBeTruthy();
  });

  it('my books → new book: Back on Choose your photos returns to My books', async () => {
    // The library came from an export, so the old flow state points at the upload screen.
    await seedLibraryAndDraft();
    await act(async () => {
      await api.login('mara@example.com', 'hunter2hunter2');
      await useSession.getState().init();
    });
    const { router } = renderAt('/books');
    fireEvent.click(await screen.findByText('New book from these photos'));
    expect(await screen.findByText('Choose your photos')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '← Back' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/books'));
    expect(await screen.findByText('Your photo library')).toBeTruthy();
  });
});

describe('languages', () => {
  it('follows a Swedish browser and falls back to English otherwise', () => {
    expect(pickLang(['sv-SE', 'en-US'])).toBe('sv');
    expect(pickLang(['de-DE', 'fr'])).toBe('en');
  });

  it('shows Swedish, switches with the picker and remembers the choice', async () => {
    useLang.getState().setLang('sv');
    renderAt('/');
    expect(await screen.findByText('Ditt Instagram som en riktig bok.')).toBeTruthy();
    expect(document.documentElement.lang).toBe('sv');

    const picker = screen.getAllByRole('combobox', { name: 'Språk' })[0]!;
    fireEvent.change(picker, { target: { value: 'en' } });
    expect(await screen.findByText('Your Instagram, as a real book.')).toBeTruthy();
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('printagram.lang')).toContain('"lang":"en"');
  });

  it('new books take the UI language; changing it renames a default title', async () => {
    useLang.getState().setLang('sv');
    const { photos, lib } = await seedLibraryAndDraft();
    useDraft.getState().resetForNewBook();
    useDraft.getState().startLibrary(lib.id, photos);
    const d = useDraft.getState();
    expect(d.lang).toBe('sv');
    expect(d.title.startsWith('Våra år')).toBe(true);
    d.setBookLang('en');
    expect(useDraft.getState().title.startsWith('Our years')).toBe(true);
    useDraft.getState().setBook({ title: 'Sommar' });
    useDraft.getState().setBookLang('sv');
    expect(useDraft.getState().title).toBe('Sommar');
  });
});
