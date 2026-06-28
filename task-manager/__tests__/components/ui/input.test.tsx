import { render, screen, fireEvent } from "@testing-library/react";
import Input from "@/components/ui/input";

describe("Input", () => {
  it("renders without label or error", () => {
    render(<Input placeholder="Enter value" />);
    expect(screen.getByPlaceholderText("Enter value")).toBeInTheDocument();
  });

  it("renders label and associates it with input via htmlFor", () => {
    render(<Input label="Email" />);
    const label = screen.getByText("Email");
    const input = screen.getByRole("textbox");
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute("for", "email");
    expect(input).toHaveAttribute("id", "email");
  });

  it("renders error message", () => {
    render(<Input label="Email" error="Invalid email" />);
    expect(screen.getByText("Invalid email")).toBeInTheDocument();
  });

  it("applies error border classes when error is present", () => {
    render(<Input label="Email" error="Required" />);
    const input = screen.getByRole("textbox");
    expect(input.className).toMatch(/border-red-400/);
  });

  it("applies normal border classes when no error", () => {
    render(<Input label="Email" />);
    expect(screen.getByRole("textbox").className).toMatch(/border-gray-300/);
  });

  it("does not render label element when label is not provided", () => {
    render(<Input placeholder="no label" />);
    expect(screen.queryByRole("label")).toBeNull();
  });

  it("does not render error element when error is not provided", () => {
    render(<Input />);
    expect(screen.queryByText(/.+/)).toBeNull();
  });

  it("uses provided id over generated one", () => {
    render(<Input id="custom-id" label="Name" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("id", "custom-id");
    expect(screen.getByText("Name")).toHaveAttribute("for", "custom-id");
  });

  it("forwards onChange handler", () => {
    const onChange = jest.fn();
    render(<Input onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("forwards ref", () => {
    const ref = { current: null } as React.RefObject<HTMLInputElement>;
    render(<Input ref={ref} />);
    expect(ref.current).not.toBeNull();
  });

  it("passes through type attribute", () => {
    render(<Input type="password" />);
    const input = document.querySelector("input");
    expect(input).toHaveAttribute("type", "password");
  });

  it("forwards additional className to input element", () => {
    render(<Input className="custom-class" />);
    expect(document.querySelector("input")?.className).toMatch(/custom-class/);
  });
});
