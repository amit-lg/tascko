import { render, screen } from "@testing-library/react";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";

describe("StatusBadge", () => {
  it("renders TODO label with gray classes", () => {
    render(<StatusBadge status="TODO" />);
    const badge = screen.getByText("Todo");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-gray-100/);
    expect(badge.className).toMatch(/text-gray-800/);
  });

  it("renders IN_PROGRESS label with blue classes", () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    const badge = screen.getByText("In Progress");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-blue-100/);
    expect(badge.className).toMatch(/text-blue-800/);
  });

  it("renders DONE label with green classes", () => {
    render(<StatusBadge status="DONE" />);
    const badge = screen.getByText("Done");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-green-100/);
    expect(badge.className).toMatch(/text-green-800/);
  });
});

describe("PriorityBadge", () => {
  it("renders LOW with green classes", () => {
    render(<PriorityBadge priority="LOW" />);
    const badge = screen.getByText("Low");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-green-100/);
  });

  it("renders MEDIUM with yellow classes", () => {
    render(<PriorityBadge priority="MEDIUM" />);
    const badge = screen.getByText("Medium");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-yellow-100/);
  });

  it("renders HIGH with red classes", () => {
    render(<PriorityBadge priority="HIGH" />);
    const badge = screen.getByText("High");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toMatch(/bg-red-100/);
  });

  it("capitalises label correctly", () => {
    render(<PriorityBadge priority="HIGH" />);
    expect(screen.getByText("High")).toBeInTheDocument();
  });
});
