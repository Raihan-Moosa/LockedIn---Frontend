import { render, waitFor } from '@testing-library/react';
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

describe('Login page - user not found', () => {
  const OLD_ENV = process.env;
  const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
    process.env.NEXT_PUBLIC_API_URL = 'http://api.local';
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';

    // Backend returns 404 with expected error message
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'User not found. Please sign up' }),
      text: async () => JSON.stringify({ error: 'User not found. Please sign up' }),
    } as Response);
  });

  afterAll(() => {
    process.env = OLD_ENV;
    alertSpy.mockRestore();
  });

  it('signs out and routes to /signup when backend says user not found', async () => {
    render(<Login />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith('/signup');
    });
  });
});
