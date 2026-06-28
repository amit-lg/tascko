import { render, screen, fireEvent } from "@testing-library/react";
import Button from "@/components/ui/button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: /click me/i })).toBeInTheDocument();
  });

  it("applies primary variant classes by default", () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).toMatch(/bg-blue-600/);
  });

  it("applies danger variant classes", () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole("button").className).toMatch(/bg-red-600/);
  });

  it("applies ghost variant classes", () => {
    render(<Button variant="ghost">Cancel</Button>);
    expect(screen.getByRole("button").className).toMatch(/bg-transparent/);
  });

  it("applies sm size classes", () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole("button").className).toMatch(/px-3/);
  });

  it("is disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("is disabled when loading is true", () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows a spinner when loading", () => {
    render(<Button loading>Submit</Button>);
    const spinner = screen.getByRole("button").querySelector("span");
    expect(spinner).toBeInTheDocument();
    expect(spinner?.className).toMatch(/animate-spin/);
  });

  it("does not show spinner when not loading", () => {
    render(<Button>Submit</Button>);
    const spinner = screen.getByRole("button").querySelector("span.animate-spin");
    expect(spinner).toBeNull();
  });

  it("calls onClick handler", () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", () => {
    const onClick = jest.fn();
    render(<Button disabled onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not call onClick when loading", () => {
    const onClick = jest.fn();
    render(<Button loading onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwards additional className", () => {
    render(<Button className="w-full">Full</Button>);
    expect(screen.getByRole("button").className).toMatch(/w-full/);
  });

  it("forwards ref", () => {
    const ref = { current: null } as React.RefObject<HTMLButtonElement>;
    render(<Button ref={ref}>Ref</Button>);
    expect(ref.current).not.toBeNull();
  });
});
