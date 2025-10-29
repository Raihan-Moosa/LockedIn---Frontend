import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPage from './page';

// Mock supabase auth (only getSession is used for token retrieval)
const mockGetSession = jest.fn().mockResolvedValue({
  data: { session: { access_token: 'fake_token' } },
});
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

describe('SearchPage', () => {
  const OLD_ENV = process.env;
  let alertSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, NEXT_PUBLIC_API_URL: 'http://api.local' };
    alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
  });
  afterAll(() => {
    process.env = OLD_ENV;
    alertSpy.mockRestore();
  });

  it('displays "No results" when the query is empty and no search has been performed', () => {
    // No need to mock any fetch for this test since no query triggers no fetch
    render(<SearchPage />);
    expect(screen.getByText(/No results/i)).toBeInTheDocument();
  });

  it('performs a search and displays results with invite buttons', async () => {
    // Set up initial fetchInvitations (sent & received) and search results
    const profile = {
      id: 'user2',
      full_name: 'John Doe',
      degree: 'Computer Science',
      modules: ['Math 101'],
      study_interest: 'AI',
    };
    global.fetch = jest.fn().mockResolvedValueOnce({
      // First two calls: invitations sent and received (empty for this test)
        ok: true,
        json: async () => ({ invitations: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: [] }),
      } as Response)
      // Third call: search results
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ profiles: [profile] }),
      } as Response);

    render(<SearchPage />);

    // Type a search query to trigger the search effect (default searchType "modules")
    const searchInput = screen.getByPlaceholderText(/Search by modules/i);
    await userEvent.type(searchInput, 'Math');

    // The search should call the API and eventually display the result
    const resultName = await screen.findByText('John Doe');
    expect(resultName).toBeInTheDocument();
    // Ensure the search fetch was called with the correct endpoint and payload
    expect(global.fetch).toHaveBeenCalledWith(
      'http://api.local/api/search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: expect.stringMatching(/^Bearer /),
        }),
        body: expect.stringContaining(`"searchTerm":"Math"`), // query term
      })
    );
    // The result should show relevant info based on search type (modules in this case)
    expect(screen.getByText('Math 101')).toBeInTheDocument();
    // An Invite button should be present for the result
    const inviteButton = screen.getByRole('button', { name: 'Invite' });
    expect(inviteButton).toBeInTheDocument();
  });

  it('can toggle the inbox and bell to view sent and received invitations', async () => {
    // Prepare some invitations for sent and received lists
    const sentInvites = [
      { id: 'inv1', recipient_name: 'Jane Smith', status: 'pending' },
      { id: 'inv2', recipient_name: 'Bob Lee', status: 'accepted' },
    ];
    const receivedInvites = [
      { id: 'inv3', sender_name: 'Alice', status: 'pending' },
    ];
    global.fetch = jest.fn().mockResolvedValueOnce({
      // Initial fetchInvitations (sent & received)
      
        ok: true,
        json: async () => ({ invitations: sentInvites }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: receivedInvites }),
      } as Response);

    render(<SearchPage />);

    // Wait for invitations fetch to complete
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

    // Locate the inbox and bell icon buttons (first two buttons in header)
    const buttons = screen.getAllByRole('button');
    const inboxBtn = buttons[0];
    const bellBtn = buttons[1];

    // Click inbox button to show sent invitations
    await userEvent.click(inboxBtn);
    // Sent Invitations section should appear with the list
    await screen.findByText('📩 Sent Invitations');
    expect(screen.getByText('To: Jane Smith — Status: pending')).toBeInTheDocument();
    expect(screen.getByText('To: Bob Lee — Status: accepted')).toBeInTheDocument();

    // Click bell button to show received invitations
    await userEvent.click(bellBtn);
    await screen.findByText('🔔 Received Invitations');
    // Received invite from Alice should be listed with action buttons
    expect(screen.getByText('From: Alice — Status: pending')).toBeInTheDocument();
    const acceptBtn = screen.getByRole('button', { name: /Accept/i });
    const declineBtn = screen.getByRole('button', { name: /Decline/i });
    expect(acceptBtn).toBeInTheDocument();
    expect(declineBtn).toBeInTheDocument();

    // Accept the invitation from Alice
    global.fetch=jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response) // PUT response
      .mockResolvedValueOnce({ ok: true, json: async () => ({ invitations: sentInvites }) } as Response) // refresh sent (unchanged)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ invitations: [] }) } as Response); // refresh received (empty after accepting)
    await userEvent.click(acceptBtn);

    // Should call the API to accept the invite
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/invitations\/inv3$/),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'accepted' }),
        })
      )
    );
    // User should be alerted of acceptance and the invites list updated
    expect(alertSpy).toHaveBeenCalledWith('Invitation accepted');
    // After accepting, the received invites section should indicate no invites
    await waitFor(() =>
      expect(screen.getByText('No invitations received yet.')).toBeInTheDocument()
    );
    // The accepted invite should no longer show Accept/Decline buttons
    expect(screen.queryByRole('button', { name: /Accept/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Decline/i })).toBeNull();
  });

  it('sends an invitation when clicking "Invite" on a search result', async () => {
    // No invites initially, one search result, then simulate sending invite
    const profile = { id: 'u2', full_name: 'New User', modules: ['Physics'], degree: 'BSc', study_interest: 'Robotics' };
    global.fetch = jest
      .fn()
      // Initial invites (empty)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ invitations: [] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ invitations: [] }) } as Response)
      // Search result
      .mockResolvedValueOnce({ ok: true, json: async () => ({ profiles: [profile] }) } as Response)
      // Invite API call response
      .mockResolvedValueOnce({ ok: true, json: async () => ({ /* success */ }) } as Response)
      // Refresh invites after sending (new invite appears in sent list)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          invitations: [{ id: 'new-inv', recipient_name: 'New User', status: 'pending' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invitations: [] }),
      } as Response);

    render(<SearchPage />);

    // Perform a search to get the result
    const searchInput = screen.getByPlaceholderText(/Search by modules/i);
    await userEvent.type(searchInput, 'Phys');
    await screen.findByText('New User');

    // Click Invite on the search result
    const inviteBtn = screen.getByRole('button', { name: 'Invite' });
    await userEvent.click(inviteBtn);

    // Should call the invite API with recipient_id
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        'http://api.local/api/invite',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ recipient_id: 'u2' }),
        })
      )
    );
    // User is alerted that invitation was sent
    expect(alertSpy).toHaveBeenCalledWith('Invitation sent!');
    // The sent invitations list should update with the new invite
    const buttons = screen.getAllByRole('button');
    const inboxBtn = buttons[0];
    await userEvent.click(inboxBtn);
    await screen.findByText('📩 Sent Invitations');
    expect(screen.getByText('To: New User — Status: pending')).toBeInTheDocument();
  });
});
