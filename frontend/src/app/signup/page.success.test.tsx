import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignUp from './page'; // Changed from './SignUp'
import { supabase } from '@/lib/supabaseClient';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      getSession: jest.fn(),
      signOut: jest.fn(),
    },
  },
}));

// Mock the react-icons
jest.mock('react-icons/fc', () => ({
  FcGoogle: () => <div>GoogleIcon</div>,
}));

jest.mock('react-icons/fa', () => ({
  FaGraduationCap: () => <div>GraduationCapIcon</div>,
  FaBook: () => <div>BookIcon</div>,
  FaLightbulb: () => <div>LightbulbIcon</div>,
  FaPlus: () => <div>PlusIcon</div>,
  FaMinus: () => <div>MinusIcon</div>,
}));

// Mock Next.js Link component
jest.mock('next/link', () => {
  const Link= ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
  Link.displayName = 'NextLink';
  return Link;
});

global.alert = jest.fn();
global.fetch = jest.fn();

describe('SignUp Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful session fetch
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: null },
    });
    
    // Set up environment variables
    process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
  });

  it('renders signup form correctly', async () => {
    render(<SignUp />);
    
    expect(screen.getByRole('heading', { name: /Create Your LockedIn Account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Degree/i)).toBeInTheDocument();
    expect(screen.getByText(/Add Module/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Study Interest/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Complete Signup/i })).toBeInTheDocument();
  });

  it('loads degree and module options', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        text: () => Promise.resolve('Computer Science\nMathematics'),
      })
      .mockResolvedValueOnce({
        text: () => Promise.resolve('Algorithms\nData Structures'),
      });

    render(<SignUp />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/data/degrees.txt');
      expect(fetch).toHaveBeenCalledWith('/data/modules.txt');
    });
  });

  it('validates form before submission', async () => {
    render(<SignUp />);
    
    const submitButton = screen.getByRole('button', { name: /Complete Signup/i });
    await userEvent.click(submitButton);

    expect(alert).toHaveBeenCalledWith('Please select a degree.');
    expect(supabase.auth.signInWithOAuth).not.toHaveBeenCalled();
  });

  it('allows adding and removing modules', async () => {
    render(<SignUp />);
    
    const addButton = screen.getByText(/Add Module/i);
    await userEvent.click(addButton);
    await userEvent.click(addButton);

    // Wait for the new selects to appear
    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(3); // Two modules + degree
    });

    const removeButtons = screen.getAllByTitle(/Remove module/i);
    await userEvent.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(2);
    });
  });

  it('submits form with valid data', async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        text: () => Promise.resolve('Computer Science\nMathematics'),
      })
      .mockResolvedValueOnce({
        text: () => Promise.resolve('Algorithms\nData Structures'),
      });

    // Mock successful OAuth sign-in
    (supabase.auth.signInWithOAuth as jest.Mock).mockResolvedValue({ error: null });

    render(<SignUp />);
    
    // Wait for options to load
    await waitFor(() => {
      expect(screen.getByText(/Computer Science/i)).toBeInTheDocument();
    });

    // Fill form
    await userEvent.selectOptions(screen.getByLabelText(/Degree/i), 'Computer Science');
    await userEvent.click(screen.getByText(/Add Module/i));
    
    // Wait for the module select to appear
    await waitFor(() => {
      expect(screen.getAllByRole('combobox')).toHaveLength(2);
    });
    
    await userEvent.selectOptions(screen.getAllByRole('combobox')[1], 'Algorithms');
    await userEvent.type(screen.getByLabelText(/Study Interest/i), 'Machine Learning');

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /Complete Signup/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:3000/signup',
          queryParams: { prompt: 'select_account' },
        },
      });
    });
  });
});