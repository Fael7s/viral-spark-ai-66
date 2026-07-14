import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
global.fetch = vi.fn();
Object.assign(navigator, { clipboard: { writeText: vi.fn(() => Promise.resolve()) } });
