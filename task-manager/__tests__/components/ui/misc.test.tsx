import { render, screen } from "@testing-library/react";
import Card from "@/components/ui/card";
import Spinner from "@/components/ui/spinner";
import ProgressBar from "@/components/ui/progress-bar";

describe("Card", () => {
  it("renders children", () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("includes padding classes by default", () => {
    const { container } = render(<Card>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toMatch(/p-6/);
  });

  it("omits padding when padding=false", () => {
    const { container } = render(<Card padding={false}>Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toMatch(/p-6/);
  });

  it("forwards additional className", () => {
    const { container } = render(<Card className="shadow-xl">Content</Card>);
    const card = container.firstChild as HTMLElement;
    expect(card.className).toMatch(/shadow-xl/);
  });

  it("forwards additional HTML attributes", () => {
    render(<Card data-testid="my-card">Content</Card>);
    expect(screen.getByTestId("my-card")).toBeInTheDocument();
  });
});

describe("Spinner", () => {
  it("renders the spinning element", () => {
    const { container } = render(<Spinner />);
    const spinner = container.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("applies extra className to wrapper", () => {
    const { container } = render(<Spinner className="py-20" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toMatch(/py-20/);
  });
});

describe("ProgressBar", () => {
  it("renders with correct width for given value", () => {
    const { container } = render(<ProgressBar value={60} />);
    const bar = container.querySelector(".bg-blue-600") as HTMLElement;
    expect(bar.style.width).toBe("60%");
  });

  it("clamps value to 100 when above 100", () => {
    const { container } = render(<ProgressBar value={150} />);
    const bar = container.querySelector(".bg-blue-600") as HTMLElement;
    expect(bar.style.width).toBe("100%");
  });

  it("clamps value to 0 when below 0", () => {
    const { container } = render(<ProgressBar value={-10} />);
    const bar = container.querySelector(".bg-blue-600") as HTMLElement;
    expect(bar.style.width).toBe("0%");
  });

  it("renders 0% bar for value 0", () => {
    const { container } = render(<ProgressBar value={0} />);
    const bar = container.querySelector(".bg-blue-600") as HTMLElement;
    expect(bar.style.width).toBe("0%");
  });

  it("renders 100% bar for value 100", () => {
    const { container } = render(<ProgressBar value={100} />);
    const bar = container.querySelector(".bg-blue-600") as HTMLElement;
    expect(bar.style.width).toBe("100%");
  });
});
