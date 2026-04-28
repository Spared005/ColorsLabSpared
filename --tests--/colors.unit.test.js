
// ─── Helper functions mirrored from js/code.js ────────────────────────

function isValidColorName(name) {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.length > 100) return false;
  // Only letters, spaces, hyphens, and digits
  return /^[a-zA-Z0-9\s\-]+$/.test(trimmed);
}

function formatColorName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function buildAddColorPayload(color, userId) {
  return JSON.stringify({ color, userId });
}

function buildSearchPayload(search, userId) {
  return JSON.stringify({ search, userId });
}

// ─── isValidColorName ─────────────────────────────────────

describe("isValidColorName", () => {
  test("accepts a simple color name", () => {
    expect(isValidColorName("Red")).toBe(true);
  });

  test("accepts a multi-word color name", () => {
    expect(isValidColorName("Sky Blue")).toBe(true);
  });

  test("accepts a hyphenated color name", () => {
    expect(isValidColorName("Blue-Green")).toBe(true);
  });

  test("accepts a color name with digits", () => {
    expect(isValidColorName("Color1")).toBe(true);
  });

  test("rejects an empty string", () => {
    expect(isValidColorName("")).toBe(false);
  });

  test("rejects a whitespace-only string", () => {
    expect(isValidColorName("   ")).toBe(false);
  });

  test("rejects a name that is too long (> 100 chars)", () => {
    expect(isValidColorName("A".repeat(101))).toBe(false);
  });

  test("rejects special characters like @", () => {
    expect(isValidColorName("Red@Blue")).toBe(false);
  });

  test("rejects null / non-string input", () => {
    expect(isValidColorName(null)).toBe(false);
    expect(isValidColorName(42)).toBe(false);
    expect(isValidColorName(undefined)).toBe(false);
  });
});

// ─── formatColorName ───────────────────────────
describe("formatColorName", () => {
  test("title-cases a lowercase input", () => {
    expect(formatColorName("red")).toBe("Red");
  });

  test("title-cases each word", () => {
    expect(formatColorName("sky blue")).toBe("Sky Blue");
  });

  test("trims leading and trailing whitespace", () => {
    expect(formatColorName("  green  ")).toBe("Green");
  });

  test("lowercases an all-caps input before title-casing", () => {
    expect(formatColorName("PURPLE")).toBe("Purple");
  });
});

// ─── buildAddColorPayload ─────────────────────────────────────────────────────

describe("buildAddColorPayload", () => {
  test("produces valid JSON with color and userId fields", () => {
    const payload = buildAddColorPayload("Blue", 7);
    const obj = JSON.parse(payload);
    expect(obj.color).toBe("Blue");
    expect(obj.userId).toBe(7);
  });

  test("serialises the payload as a string", () => {
    expect(typeof buildAddColorPayload("Red", 1)).toBe("string");
  });
});

// ─── buildSearchPayload ───────────────────────────────────────

describe("buildSearchPayload", () => {
  test("produces valid JSON with search and userId fields", () => {
    const payload = buildSearchPayload("bl", 3);
    const obj = JSON.parse(payload);
    expect(obj.search).toBe("bl");
    expect(obj.userId).toBe(3);
  });

  test("accepts an empty search string (wildcard search)", () => {
    const payload = buildSearchPayload("", 2);
    const obj = JSON.parse(payload);
    expect(obj.search).toBe("");
  });
});
