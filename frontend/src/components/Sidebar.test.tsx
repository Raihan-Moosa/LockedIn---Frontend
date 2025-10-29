import { render, screen } from "@testing-library/react";
import Sidebar from "./Sidebar";

jest.mock("next/navigation", () => ({
  usePathname: () => "/groups",
}));

describe("Sidebar", () => {
  it("renders menu items and highlights active", () => {
    render(<Sidebar />);
    ["Dashboard", "Partner Finder", "Groups", "Progress", "Profile"].forEach(lbl => {
      expect(screen.getByText(lbl)).toBeInTheDocument();
    });
    const groupsLink = screen.getByRole("link", { name: /Groups/i });
    expect(groupsLink.className).toMatch(/menuButtonActive/);
  });
});
