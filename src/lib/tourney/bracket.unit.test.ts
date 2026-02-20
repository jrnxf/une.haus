
import {
  decodeRider,
  decodeWinners,
  encodeOrderedRidersParam,
  encodeRider,
  encodeRidersParam,
  encodeWinners,
  parseRidersParam,
  parseRidersParamOrdered,
  riderKey,
} from "./bracket";

describe("encodeRider", () => {
  it("encodes userId as string number", () => {
    expect(encodeRider({ userId: 329, name: null })).toBe("329");
  });

  it("encodes custom name with ~ prefix", () => {
    expect(encodeRider({ userId: null, name: "John" })).toBe("~John");
  });

  it("prioritizes userId over name for resolved entries", () => {
    expect(encodeRider({ userId: 42, name: "John" })).toBe("42");
  });

  it("returns null for invalid entry with both null", () => {
    expect(encodeRider({ userId: null, name: null })).toBeNull();
  });

  it("encodes userId 0", () => {
    expect(encodeRider({ userId: 0, name: null })).toBe("0");
  });
});

describe("decodeRider", () => {
  it("decodes numeric string to userId", () => {
    expect(decodeRider("329")).toEqual({ userId: 329, name: null });
  });

  it("decodes ~prefixed string to name", () => {
    expect(decodeRider("~John")).toEqual({ userId: null, name: "John" });
  });

  it("returns null for empty string", () => {
    expect(decodeRider("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(decodeRider("   ")).toBeNull();
  });

  it("returns null for ~ with no name", () => {
    expect(decodeRider("~")).toBeNull();
  });

  it("trims whitespace before decoding", () => {
    expect(decodeRider("  329  ")).toEqual({ userId: 329, name: null });
    expect(decodeRider("  ~John  ")).toEqual({ userId: null, name: "John" });
  });

  it("returns null for non-numeric, non-tilde string", () => {
    expect(decodeRider("abc")).toBeNull();
  });

  it("returns null for floating point numbers", () => {
    expect(decodeRider("3.14")).toBeNull();
  });

  it("decodes negative numbers", () => {
    expect(decodeRider("-1")).toEqual({ userId: -1, name: null });
  });

  it("decodes zero", () => {
    expect(decodeRider("0")).toEqual({ userId: 0, name: null });
  });
});

describe("encodeRider / decodeRider round-trip", () => {
  it("round-trips userId entry", () => {
    const original = { userId: 329, name: null } as const;
    const encoded = encodeRider(original);
    expect(encoded).not.toBeNull();
    expect(decodeRider(encoded!)).toEqual(original);
  });

  it("round-trips custom name entry", () => {
    const original = { userId: null, name: "John" } as const;
    const encoded = encodeRider(original);
    expect(encoded).not.toBeNull();
    expect(decodeRider(encoded!)).toEqual(original);
  });
});

describe("encodeRidersParam", () => {
  it("encodes mixed riders to comma-separated string", () => {
    const riders = [
      { userId: 329, name: null },
      { userId: null, name: "John" },
      { userId: 160, name: null },
    ] as const;
    expect(encodeRidersParam([...riders])).toBe("329,~John,160");
  });

  it("returns undefined for empty array", () => {
    expect(encodeRidersParam([])).toBeUndefined();
  });

  it("filters out invalid entries", () => {
    const riders = [
      { userId: null, name: null },
      { userId: 1, name: null },
    ];
    expect(encodeRidersParam(riders)).toBe("1");
  });

  it("returns undefined when all entries are invalid", () => {
    expect(
      encodeRidersParam([{ userId: null, name: null }]),
    ).toBeUndefined();
  });
});

describe("parseRidersParam", () => {
  it("parses comma-separated string to rider entries", () => {
    expect(parseRidersParam("329,~John,160")).toEqual([
      { userId: 329, name: null },
      { userId: null, name: "John" },
      { userId: 160, name: null },
    ]);
  });

  it("returns empty array for undefined", () => {
    expect(parseRidersParam(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseRidersParam("")).toEqual([]);
  });

  it("filters out invalid segments", () => {
    expect(parseRidersParam("329,abc,~John")).toEqual([
      { userId: 329, name: null },
      { userId: null, name: "John" },
    ]);
  });
});

describe("encodeRidersParam / parseRidersParam round-trip", () => {
  it("round-trips mixed riders", () => {
    const original = [
      { userId: 329, name: null },
      { userId: null, name: "John" },
      { userId: 160, name: null },
    ] as const;
    const encoded = encodeRidersParam([...original]);
    expect(parseRidersParam(encoded)).toEqual(original);
  });

  it("round-trips single userId rider", () => {
    const original = [{ userId: 1, name: null }] as const;
    expect(parseRidersParam(encodeRidersParam([...original]))).toEqual(
      original,
    );
  });

  it("round-trips single name rider", () => {
    const original = [{ userId: null, name: "Sam" }] as const;
    expect(parseRidersParam(encodeRidersParam([...original]))).toEqual(
      original,
    );
  });
});

describe("parseRidersParamOrdered", () => {
  it("returns entries with orderId", () => {
    const result = parseRidersParamOrdered("329,~John");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ userId: 329, name: null });
    expect(result[0].orderId).toBeDefined();
    expect(result[1]).toMatchObject({ userId: null, name: "John" });
    expect(result[1].orderId).toBeDefined();
  });

  it("returns unique orderIds", () => {
    const result = parseRidersParamOrdered("1,2,3");
    const orderIds = new Set(result.map((r) => r.orderId));
    expect(orderIds.size).toBe(3);
  });

  it("returns empty array for undefined", () => {
    expect(parseRidersParamOrdered(undefined)).toEqual([]);
  });
});

describe("encodeOrderedRidersParam", () => {
  it("strips orderId and encodes", () => {
    const ordered = [
      { userId: 329, name: null, orderId: "abc-123" },
      { userId: null, name: "John", orderId: "def-456" },
    ];
    expect(encodeOrderedRidersParam(ordered)).toBe("329,~John");
  });
});

describe("riderKey", () => {
  it("returns string userId for userId entry", () => {
    expect(riderKey({ userId: 329, name: null })).toBe("329");
  });

  it("returns ~name for name entry", () => {
    expect(riderKey({ userId: null, name: "John" })).toBe("~John");
  });

  it("prioritizes userId for resolved entry", () => {
    expect(riderKey({ userId: 42, name: "John" })).toBe("42");
  });

  it("returns empty string for invalid entry", () => {
    expect(riderKey({ userId: null, name: null })).toBe("");
  });
});

describe("encodeWinners", () => {
  it("encodes match winners to compact string", () => {
    const matches = [
      { round: 0, position: 0, winner: 1 as const },
      { round: 0, position: 1, winner: 2 as const },
      { round: 1, position: 0, winner: null },
    ];
    expect(encodeWinners(matches)).toBe("12");
  });

  it("returns null when all undecided", () => {
    const matches = [
      { round: 0, position: 0, winner: null },
      { round: 0, position: 1, winner: null },
    ];
    expect(encodeWinners(matches)).toBeNull();
  });

  it("trims trailing dashes", () => {
    const matches = [
      { round: 0, position: 0, winner: 1 as const },
      { round: 0, position: 1, winner: null },
      { round: 1, position: 0, winner: null },
    ];
    expect(encodeWinners(matches)).toBe("1");
  });

  it("preserves interior dashes", () => {
    const matches = [
      { round: 0, position: 0, winner: 1 as const },
      { round: 0, position: 1, winner: null },
      { round: 1, position: 0, winner: 2 as const },
    ];
    expect(encodeWinners(matches)).toBe("1-2");
  });

  it("sorts by round then position", () => {
    const matches = [
      { round: 1, position: 0, winner: 2 as const },
      { round: 0, position: 1, winner: 1 as const },
      { round: 0, position: 0, winner: 1 as const },
    ];
    expect(encodeWinners(matches)).toBe("112");
  });

  it("handles empty matches array", () => {
    expect(encodeWinners([])).toBeNull();
  });
});

describe("decodeWinners", () => {
  it("decodes compact string to winner map", () => {
    const winners = decodeWinners("12");
    expect(winners.get(0)).toBe(1);
    expect(winners.get(1)).toBe(2);
  });

  it("returns empty map for null", () => {
    expect(decodeWinners(null).size).toBe(0);
  });

  it("returns empty map for empty string", () => {
    expect(decodeWinners("").size).toBe(0);
  });

  it("skips dashes (undecided)", () => {
    const winners = decodeWinners("1-2");
    expect(winners.get(0)).toBe(1);
    expect(winners.has(1)).toBe(false);
    expect(winners.get(2)).toBe(2);
  });

  it("skips unknown characters", () => {
    const winners = decodeWinners("1x2");
    expect(winners.get(0)).toBe(1);
    expect(winners.has(1)).toBe(false);
    expect(winners.get(2)).toBe(2);
  });
});

describe("encodeWinners / decodeWinners round-trip", () => {
  it("round-trips complete bracket", () => {
    const matches = [
      { round: 0, position: 0, winner: 1 as const },
      { round: 0, position: 1, winner: 2 as const },
      { round: 1, position: 0, winner: 1 as const },
    ];
    const encoded = encodeWinners(matches);
    const decoded = decodeWinners(encoded);
    expect(decoded.get(0)).toBe(1);
    expect(decoded.get(1)).toBe(2);
    expect(decoded.get(2)).toBe(1);
  });

  it("round-trips partial bracket (trailing undecided trimmed)", () => {
    const matches = [
      { round: 0, position: 0, winner: 1 as const },
      { round: 0, position: 1, winner: null },
    ];
    const encoded = encodeWinners(matches);
    expect(encoded).toBe("1");
    const decoded = decodeWinners(encoded);
    expect(decoded.get(0)).toBe(1);
    // match at index 1 was undecided and trimmed, so not in map
    expect(decoded.has(1)).toBe(false);
  });
});
