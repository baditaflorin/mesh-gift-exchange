import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMockRoom } from "@baditaflorin/mesh-common/testing";
import { Feature, buildAssignments, sanitizeWish } from "../../src/Feature";
import { config } from "../../src/config";

describe("gift draw", () => {
  it("cycles a shuffled order so nobody draws themselves", () => {
    const assignments = buildAssignments(["a", "b", "c"], ["b", "a", "c"]);
    expect(assignments).toEqual({ b: "a", a: "c", c: "b" });
    Object.entries(assignments).forEach(([giver, recipient]) => expect(giver).not.toBe(recipient));
  });
  it("trims and bounds wish notes", () =>
    expect(sanitizeWish("  a   cozy   book  ")).toBe("a cozy book"));
});

describe("Feature", () => {
  it("renders the private draw surface", () => {
    render(<Feature room={createMockRoom()} config={config} />);
    expect(
      screen.getByRole("heading", { name: "A draw worth keeping secret." }),
    ).toBeInTheDocument();
  });
  it("renders while connecting", () => {
    render(<Feature room={null} config={config} />);
    expect(screen.getByText("Used only to encrypt wish notes.")).toBeInTheDocument();
  });
});
