import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { router as appRouter } from '@/router';
import { resetMockState, seedDemoExportLibrary, mockFlags } from '@/test/fakeApi';
import { useDraft } from '@/state/draft';
import { useLibrary } from '@/state/library';
import { useSession } from '@/state/session';
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
  resetMockState();
  useDraft.getState().resetAll();
  useLibrary.getState().clear();
  mockFlags.latencyMs = 0;
  mockFlags.connectMode = 'live';
  mockFlags.emptyLibrary = false;
  mockFlags.payFails = false;
});

afterEach(() => cleanup());

describe('screens (mock mode)', () => {
  it('renders the landing page with pricing and FAQ', async () => {
    renderAt('/');
    expect(await screen.findByText('Your Instagram, as a real book.')).toBeTruthy();
    expect(screen.getByText('PDF from €9')).toBeTruthy();
    expect(
      screen.getByText('Every price includes 40 pages. Extra pages are €0,15 each.'),
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
    expect(await screen.findByText(/waiting for Instagram to approve Printagram/)).toBeTruthy();
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

  it('upload: shows the drop zone', async () => {
    renderAt('/export/upload');
    expect(await screen.findByText('Drop the ZIP here')).toBeTruthy();
  });

  it('select: grouping, filters, choose mode and footer price', async () => {
    const { photos } = await seedLibraryAndDraft();
    renderAt('/select');
    expect(await screen.findByText('Choose your photos')).toBeTruthy();
    expect(screen.getByText('2025')).toBeTruthy();
    const stills = photos.filter((p) => !p.isVideo && p.carouselIdx === 0).length;
    expect(screen.getByText(`${stills} photos selected`)).toBeTruthy();
    // Carousels: all images increases the count.
    fireEvent.click(screen.getByText('Carousels: first image'));
    const all = photos.filter((p) => !p.isVideo).length;
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
    expect(await screen.findByText(/Page 1 of/)).toBeTruthy();
    fireEvent.click(screen.getByText('Portrait'));
    expect(await screen.findByText(/pages · Portrait/)).toBeTruthy();
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('button', { name: 'Checkout' })).toBeTruthy();
  });

  it('checkout: validation, account creation and mock payment → done', async () => {
    await seedLibraryAndDraft();
    const { router } = renderAt('/checkout');
    expect(await screen.findByText('Choose a format')).toBeTruthy();
    expect(
      await screen.findByText('Card number', { selector: 'input' }).catch(() => null),
    ).toBeNull();
    const card = await screen.findByPlaceholderText('Card number');
    const payButtons = await screen.findAllByRole('button', { name: /^Pay €/ });
    fireEvent.click(payButtons[0]!);
    expect(await screen.findByText('Please complete all card details.')).toBeTruthy();
    fireEvent.change(card, { target: { value: '4242 4242 4242 4242' } });
    fireEvent.change(screen.getByPlaceholderText('MM / YY'), { target: { value: '12/30' } });
    fireEvent.change(screen.getByPlaceholderText('CVC'), { target: { value: '123' } });
    fireEvent.change(screen.getByPlaceholderText('Name on card'), {
      target: { value: 'Mara Linde' },
    });
    fireEvent.click(payButtons[0]!);
    expect(
      await screen.findByText('Please enter an email address so we can send your download link.'),
    ).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'mara@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Create a password (8+ characters)'), {
      target: { value: 'hunter2hunter2' },
    });
    fireEvent.click(payButtons[0]!);
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/done\//), {
      timeout: 8000,
    });
  }, 20000);

  it('checkout: declined card shows the error banner', async () => {
    await seedLibraryAndDraft();
    mockFlags.payFails = true;
    renderAt('/checkout');
    const card = await screen.findByPlaceholderText('Card number');
    fireEvent.change(card, { target: { value: '4000 0000 0000 0002' } });
    fireEvent.change(screen.getByPlaceholderText('MM / YY'), { target: { value: '12/30' } });
    fireEvent.change(screen.getByPlaceholderText('CVC'), { target: { value: '123' } });
    fireEvent.change(screen.getByPlaceholderText('Name on card'), { target: { value: 'Mara' } });
    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'mara@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Create a password (8+ characters)'), {
      target: { value: 'hunter2hunter2' },
    });
    fireEvent.click((await screen.findAllByRole('button', { name: /^Pay €/ }))[0]!);
    expect(await screen.findByText(/Your card was declined/, {}, { timeout: 8000 })).toBeTruthy();
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
        settings: { title: 'Draft one', format: 'square', showMeta: true, coverPhotoId: null },
        photoIds: ['demo_0'],
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
});
