import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './page';

// Mock router
const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: jest.fn(), prefetch: jest.fn() }),
}));

// Mock supabase auth used by the page
const mockSignInWithOAuth = jest.fn().mockResolvedValue({ error: null });
const mockSignOut = jest.fn().mockResolvedValue({});
const mockGetSession = jest.fn().mockResolvedValue({
  data: { session: { access_token: 'fake_token' } }, // make the effect run
});
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

describe('Login page - success flow', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    process.env.NEXT_PUBLIC_API_URL = 'http://api.local';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

    // Backend verify returns 200 (success)
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      text: async () => JSON.stringify({ ok: true }),
    } as Response);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('routes to /dashboard on successful verify, and Google button triggers OAuth', async () => {
    const user = userEvent.setup();
    render(<Login />);

    // Click the Google button to ensure OAuth flow is triggered
    const googleBtn = await screen.findByRole('button', { name: /continue with google/i });
    await user.click(googleBtn);
    expect(mockSignInWithOAuth).toHaveBeenCalledTimes(1);
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: expect.objectContaining({
        redirectTo: expect.stringContaining('/login'),
        queryParams: { prompt: 'select_account' },
      }),
    });

    // The effect should post to backend and redirect to /dashboard (not /researcher-dashboard)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://api.local/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Bearer /),
          }),
        })
      );
      expect(push).toHaveBeenCalledWith('/dashboard');
    });
  });
});
