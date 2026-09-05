import "@testing-library/jest-dom";
import { vi } from "vitest";

// jsdom does not implement matchMedia; components using use-is-mobile and
// friends call it during render/effects.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});
