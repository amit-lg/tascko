import { render, screen, fireEvent } from "@testing-library/react";
import Select from "@/components/ui/select";

const OPTIONS = [
  { value: "a", label: "Option A" },
  { value: "b", label: "Option B" },
  { value: "c", label: "Option C" },
];

describe("Select", () => {
  it("renders all options", () => {
    render(<Select options={OPTIONS} />);
    expect(screen.getByRole("option", { name: "Option A" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Option B" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Option C" })).toBeInTheDocument();
  });

  it("renders placeholder option when provided", () => {
    render(<Select options={OPTIONS} placeholder="Choose one" />);
    const placeholder = screen.getByRole("option", { name: "Choose one" });
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toHaveValue("");
  });

  it("does not render placeholder when not provided", () => {
    render(<Select options={OPTIONS} />);
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("renders label and associates it with select", () => {
    render(<Select options={OPTIONS} label="Priority" />);
    const label = screen.getByText("Priority");
    expect(label).toHaveAttribute("for", "priority");
    expect(screen.getByRole("combobox")).toHaveAttribute("id", "priority");
  });

  it("renders error message", () => {
    render(<Select options={OPTIONS} error="Selection required" />);
    expect(screen.getByText("Selection required")).toBeInTheDocument();
  });

  it("applies error border classes when error present", () => {
    render(<Select options={OPTIONS} error="Error" />);
    expect(screen.getByRole("combobox").className).toMatch(/border-red-400/);
  });

  it("applies normal border classes with no error", () => {
    render(<Select options={OPTIONS} />);
    expect(screen.getByRole("combobox").className).toMatch(/border-gray-300/);
  });

  it("uses provided id over generated one", () => {
    render(<Select options={OPTIONS} id="my-select" label="Status" />);
    expect(screen.getByRole("combobox")).toHaveAttribute("id", "my-select");
  });

  it("calls onChange when selection changes", () => {
    const onChange = jest.fn();
    render(<Select options={OPTIONS} onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "b" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("forwards ref", () => {
    const ref = { current: null } as React.RefObject<HTMLSelectElement>;
    render(<Select options={OPTIONS} ref={ref} />);
    expect(ref.current).not.toBeNull();
  });
});
