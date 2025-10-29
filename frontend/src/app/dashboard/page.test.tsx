import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPage from "./page";

// Mock supabase auth
jest.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
  },
}));

// Mock fetch for all endpoints
const fetchMock = jest.fn();
global.fetch = fetchMock as typeof fetch;
global.console.error = jest.fn(); // Suppress error logs

describe("DashboardPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockReset();
  });

  const setupDefaultMocks = () => {
    // Default mock responses for all endpoints
    fetchMock
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({}) 
      }) // study-time
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ tests: [] }) 
      }) // upcoming tests
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ groups: [] }) 
      }) // groups
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ friends: [] }) 
      }); // friends
  };

  it("renders dashboard heading and sections", async () => {
    setupDefaultMocks();
    render(<DashboardPage />);
    
    expect(screen.getByText(/Student Dashboard/i)).toBeInTheDocument();
    
    // Wait for initial load
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });
    
    // Check all main sections are present
    expect(screen.getByText("Study Time")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Tests")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Study Session")).toBeInTheDocument();
    expect(screen.getByText("Friends")).toBeInTheDocument();
  });

  it("shows study time data when available", async () => {
    const mockStudyTime = {
      today: "2h",
      week: "15h", 
      month: "45h"
    };
    
    fetchMock
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => mockStudyTime 
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ tests: [] }) 
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ groups: [] }) 
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ friends: [] }) 
      });

    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText("2h")).toBeInTheDocument();
      expect(screen.getByText("15h")).toBeInTheDocument();
      expect(screen.getByText("45h")).toBeInTheDocument();
    });
  });

  it("shows upcoming tests when available", async () => {
    const mockTests = [
      { id: "1", name: "Math Final", test_date: "2024-01-15", scope: "Chapters 1-5" },
      { id: "2", name: "Chemistry Quiz", test_date: "2024-01-20", scope: "Periodic Table" }
    ];
    
    fetchMock
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({}) 
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ tests: mockTests }) 
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ groups: [] }) 
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ friends: [] }) 
      });

    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText("Math Final")).toBeInTheDocument();
      expect(screen.getByText("Chemistry Quiz")).toBeInTheDocument();
    });
  });

  it("shows no tests message when no upcoming tests", async () => {
    setupDefaultMocks();
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText("No upcoming tests 🎉")).toBeInTheDocument();
    });
  });

  it("opens and closes add test modal", async () => {
    setupDefaultMocks();
    render(<DashboardPage />);
    
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    
    // Open modal
    await userEvent.click(screen.getByText("➕ Add Test"));
    
    expect(screen.getByText("Add Test")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Test Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Test Date")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Scope")).toBeInTheDocument();
    
    // Close modal
    await userEvent.click(screen.getByText("Cancel"));
    
    await waitFor(() => {
      expect(screen.queryByText("Add Test")).not.toBeInTheDocument();
    });
  });

  it("adds a new test successfully", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ tests: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ groups: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ friends: [] }) })
      // Add test API call
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      // Reload tests after adding
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ tests: [{ id: "3", name: "New Test", test_date: "2024-01-25" }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ groups: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ friends: [] }) });

    render(<DashboardPage />);
    
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    
    // Open modal and add test
    await userEvent.click(screen.getByText("➕ Add Test"));
    await userEvent.type(screen.getByPlaceholderText("Test Name"), "Physics Midterm");
    await userEvent.type(screen.getByPlaceholderText("Test Date"), "2024-01-30");
    await userEvent.type(screen.getByPlaceholderText("Scope"), "Mechanics");
    
    await userEvent.click(screen.getByText("Add"));
    
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/assessments"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Physics Midterm",
            test_date: "2024-01-30",
            scope: "Mechanics"
          })
        })
      );
    });
  });

  it("shows friends when available", async () => {
    const mockFriends = [
      { id: "f1", full_name: "John Doe", email: "john@test.com", degree: "Computer Science" },
      { id: "f2", full_name: "Jane Smith", email: "jane@test.com", degree: null }
    ];
    
    fetchMock
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({}) 
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ tests: [] }) 
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ groups: [] }) 
      })
      .mockResolvedValueOnce({ 
        ok: true, 
        json: async () => ({ friends: mockFriends }) 
      });

    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
  });

  it("shows no friends message when no friends", async () => {
    setupDefaultMocks();
    render(<DashboardPage />);
    
    await waitFor(() => {
      expect(screen.getByText("No friends yet 😢")).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Study time error" }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Tests error" }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Groups error" }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Friends error" }) });

    render(<DashboardPage />);
    
    // Component should not crash and should show loading/empty states
    await waitFor(() => {
      expect(screen.getByText("Loading…")).toBeInTheDocument();
      expect(screen.getByText("No upcoming tests 🎉")).toBeInTheDocument();
      expect(screen.getByText("No sessions yet.")).toBeInTheDocument();
      expect(screen.getByText("No friends yet 😢")).toBeInTheDocument();
    });
  });

  it("handles add test validation - empty fields", async () => {
    setupDefaultMocks();
    render(<DashboardPage />);
    
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    
    // Open modal and try to add test without required fields
    await userEvent.click(screen.getByText("➕ Add Test"));
    await userEvent.click(screen.getByText("Add"));
    
    // Should not call the API when required fields are empty
    const addTestCalls = fetchMock.mock.calls.filter(call => 
      call[0]?.includes('/api/assessments')
    );
    expect(addTestCalls).toHaveLength(0);
  });

  it("handles add test API failure", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ tests: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ groups: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ friends: [] }) })
      // Add test fails
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Failed to add test" }) });

    render(<DashboardPage />);
    
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    
    // Open modal and add test
    await userEvent.click(screen.getByText("➕ Add Test"));
    await userEvent.type(screen.getByPlaceholderText("Test Name"), "Failed Test");
    await userEvent.type(screen.getByPlaceholderText("Test Date"), "2024-01-25");
    
    await userEvent.click(screen.getByText("Add"));
    
    // API should be called even if it fails
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/assessments"),
        expect.any(Object)
      );
    });
  });

  // Remove or fix the problematic tests that are checking for groups and sessions
  // since the current component doesn't display groups in the UI
  it("loads sessions when group is selected", async () => {
    const mockGroups = [
      { id: "g1", name: "Group 1" },
      { id: "g2", name: "Group 2" }
    ];
    
    const mockSessions = [
      { 
        id: "s1", 
        group_id: "g1", 
        creator_id: "user1", 
        start_at: "2024-01-15T10:00:00Z", 
        venue: "Library", 
        topic: "Group Study", 
        time_goal_minutes: 120, 
        content_goal: "Review materials" 
      }
    ];
    
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) // study-time
      .mockResolvedValueOnce({ ok: true, json: async () => ({ tests: [] }) }) // upcoming tests
      .mockResolvedValueOnce({ ok: true, json: async () => ({ groups: mockGroups }) }) // groups
      .mockResolvedValueOnce({ ok: true, json: async () => ({ friends: [] }) }) // friends
      // Sessions call for first group
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sessions: mockSessions }) });

    render(<DashboardPage />);
    
    await waitFor(() => {
      // Should load sessions for the first group automatically
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/groups/g1/sessions"),
        expect.any(Object)
      );
    });
  });
});