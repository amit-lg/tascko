import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "@/components/ui/modal";

describe("Modal", () => {
  it("renders nothing when open is false", () => {
    render(<Modal open={false} onClose={jest.fn()} title="Test"><p>Content</p></Modal>);
    expect(screen.queryByText("Test")).toBeNull();
    expect(screen.queryByText("Content")).toBeNull();
  });

  it("renders title and children when open is true", () => {
    render(<Modal open={true} onClose={jest.fn()} title="My Modal"><p>Body text</p></Modal>);
    expect(screen.getByText("My Modal")).toBeInTheDocument();
    expect(screen.getByText("Body text")).toBeInTheDocument();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = jest.fn();
    render(<Modal open={true} onClose={onClose} title="Modal"><p>Content</p></Modal>);
    const backdrop = document.querySelector(".absolute.inset-0");
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when X button is clicked", () => {
    const onClose = jest.fn();
    render(<Modal open={true} onClose={onClose} title="Modal"><p>Content</p></Modal>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = jest.fn();
    render(<Modal open={true} onClose={onClose} title="Modal"><p>Content</p></Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose on non-Escape key press", () => {
    const onClose = jest.fn();
    render(<Modal open={true} onClose={onClose} title="Modal"><p>Content</p></Modal>);
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("removes keydown listener on unmount", () => {
    const onClose = jest.fn();
    const spy = jest.spyOn(document, "removeEventListener");
    const { unmount } = render(<Modal open={true} onClose={onClose} title="Modal"><p>Content</p></Modal>);
    unmount();
    expect(spy).toHaveBeenCalledWith("keydown", expect.any(Function));
    spy.mockRestore();
  });
});
