
import { render, screen, fireEvent } from "@testing-library/react";
import LandingPage from "./page";
import { useRouter } from "next/navigation";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

// Mock next/image
jest.mock("next/image", () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    width,
    height,
    className,
  }: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
  }) => (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      data-testid={alt}
    />
  ),
}));

// Mock next/link - must use PascalCase to avoid Hook rule violation
jest.mock("next/link", () => ({
  __esModule: true,
  default: function MockLink({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) {
    const { push: mockPush } = useRouter();
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      mockPush(href);
    };
    return (
      <a href={href} onClick={handleClick}>
        {children}
      </a>
    );
  },
}));


describe("LandingPage", () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
  });

  it("renders header with logo and navigation buttons", () => {
    render(<LandingPage />);
    
    // Check logo - use getAllBy for multiple elements
    expect(screen.getByRole("heading", { name: /LockedIn/i, level: 1 })).toBeInTheDocument();
    const logos = screen.getAllByAltText("LockedIn Logo");
    expect(logos.length).toBe(3); // Header, Hero, Footer
    
    // Check navigation buttons
    expect(screen.getByRole("button", { name: /Log In/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Sign Up$/i })).toBeInTheDocument(); // Exact match for header button
  });

  it("renders hero section with main content", () => {
    render(<LandingPage />);
    
    // Check main title and subtitle
    expect(screen.getByRole("heading", { name: /Your Ultimate Study Buddy/i })).toBeInTheDocument();
    expect(screen.getByText(/LockedIn helps you/)).toBeInTheDocument();
    
    // Check CTA button
    expect(screen.getByRole("button", { name: /Get Started - Lock TF In!/i })).toBeInTheDocument();
  });

  it("renders Our Story section with content and image", () => {
    render(<LandingPage />);
    
    // Check section title
    expect(screen.getByRole("heading", { name: /Why We Created LockedIn/i })).toBeInTheDocument();
    
    // Check story content
    expect(screen.getByText(/University is already stressful enough/)).toBeInTheDocument();
    expect(screen.getByText(/We experienced this firsthand/)).toBeInTheDocument();
    
    // Check team photo
    expect(screen.getByAltText("LockedIn Team")).toBeInTheDocument();
  });

  it("renders Mission section", () => {
    render(<LandingPage />);
    
    expect(screen.getByRole("heading", { name: /Our Mission/i })).toBeInTheDocument();
    expect(screen.getByText(/LockedIn is the backbone for students/)).toBeInTheDocument();
    
    // Use getAllByText for duplicate text and check the specific context
    const lockTfInElements = screen.getAllByText(/Lock TF In/);
    expect(lockTfInElements.length).toBeGreaterThan(0);
    
    expect(screen.getByText(/From strangers to study partners/)).toBeInTheDocument();
  });

  it("renders Features section with all feature cards", () => {
    render(<LandingPage />);
    
    expect(screen.getByRole("heading", { name: /What Makes LockedIn Special/i })).toBeInTheDocument();
    
    // Check all feature cards
    expect(screen.getByRole("heading", { name: /Find Your Study Tribe/i })).toBeInTheDocument();
    expect(screen.getByText(/Connect with like-minded students/)).toBeInTheDocument();
    
    expect(screen.getByRole("heading", { name: /Smart Session Planning/i })).toBeInTheDocument();
    expect(screen.getByText(/Organize group study sessions/)).toBeInTheDocument();
    
    expect(screen.getByRole("heading", { name: /Track Your Success/i })).toBeInTheDocument();
    expect(screen.getByText(/Visualize your study habits/)).toBeInTheDocument();
    
    // Check emojis are present
    expect(screen.getByText("🤝")).toBeInTheDocument();
    expect(screen.getByText("📅")).toBeInTheDocument();
    expect(screen.getByText("📊")).toBeInTheDocument();
  });

  it("renders CTA section with buttons", () => {
    render(<LandingPage />);
    
    expect(screen.getByRole("heading", { name: /Ready to Lock In?/i })).toBeInTheDocument();
    expect(screen.getByText(/Join thousands of students/)).toBeInTheDocument();
    
    expect(screen.getByRole("button", { name: /Sign Up Free/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Learn More/i })).toBeInTheDocument();
  });

  it("renders Footer section", () => {
    render(<LandingPage />);
    
    expect(screen.getByText(/Helping university students/)).toBeInTheDocument();
    
    // Use getAllByText for duplicate "LockedIn" text and verify at least one exists
    const lockedInElements = screen.getAllByText(/LockedIn/);
    expect(lockedInElements.length).toBeGreaterThan(0);
  });

  it("navigates to login on Log In button click", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    render(<LandingPage />);
    
    fireEvent.click(screen.getByRole("button", { name: /Log In/i }));
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("navigates to signup on header Sign Up button click", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    render(<LandingPage />);
    
    // Get the header Sign Up button specifically (not the CTA one)
    const headerSignUpButton = screen.getByRole('button', { name: /^Sign Up$/ });
    fireEvent.click(headerSignUpButton);
    expect(push).toHaveBeenCalledWith("/signup");
  });

  it("navigates to signup on Get Started button click", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    render(<LandingPage />);
    
    fireEvent.click(screen.getByRole("button", { name: /Get Started - Lock TF In!/i }));
    expect(push).toHaveBeenCalledWith("/signup");
  });

  it("navigates to signup on Sign Up Free button click", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    render(<LandingPage />);
    
    fireEvent.click(screen.getByRole("button", { name: /Sign Up Free/i }));
    expect(push).toHaveBeenCalledWith("/signup");
  });

  it("navigates to about on Learn More button click", () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    render(<LandingPage />);
    
    fireEvent.click(screen.getByRole("button", { name: /Learn More/i }));
    expect(push).toHaveBeenCalledWith("/about");
  });

  it("renders all images with correct alt texts", () => {
    render(<LandingPage />);
    
    const logos = screen.getAllByAltText("LockedIn Logo");
    expect(logos.length).toBe(3); // Header, Hero, Footer
    
    const teamPhoto = screen.getByAltText("LockedIn Team");
    expect(teamPhoto).toBeInTheDocument();
  });

  it("renders all key sections", () => {
    render(<LandingPage />);
    
    // Verify all main sections are present
    expect(screen.getByRole("banner")).toBeInTheDocument(); // header
    expect(screen.getByText(/Your Ultimate Study Buddy/)).toBeInTheDocument(); // hero
    expect(screen.getByText(/Why We Created LockedIn/)).toBeInTheDocument(); // story
    expect(screen.getByText(/Our Mission/)).toBeInTheDocument(); // mission
    expect(screen.getByText(/What Makes LockedIn Special/)).toBeInTheDocument(); // features
    expect(screen.getByText(/Ready to Lock In?/)).toBeInTheDocument(); // cta
    expect(screen.getByText(/Helping university students/)).toBeInTheDocument(); // footer
  });
});
