import { describe, expect, it } from "vitest";

import { stringifySearch } from "../url";

describe("stringifySearch", () => {
  it("decodes commas in query values", () => {
    const result = stringifySearch({ riders: "1,2,3" });
    expect(result).toBe("?riders=1,2,3");
    expect(result).not.toContain("%2C");
  });

  it("decodes tildes in query values", () => {
    const result = stringifySearch({ riders: "1,~Sam,3" });
    expect(result).toBe("?riders=1,~Sam,3");
    expect(result).not.toContain("%7E");
  });

  it("handles mixed encoded characters", () => {
    const result = stringifySearch({ riders: "1,20,~CustomName,30" });
    expect(result).toBe("?riders=1,20,~CustomName,30");
  });

  it("handles multiple params with commas", () => {
    const result = stringifySearch({
      riders: "1,2,3",
      tags: "a,b,c",
    });
    expect(result).toContain("riders=1,2,3");
    expect(result).toContain("tags=a,b,c");
    expect(result).not.toContain("%2C");
  });

  it("preserves other encoded characters", () => {
    // Spaces should remain encoded as +
    const result = stringifySearch({ name: "John Doe" });
    expect(result).not.toBe("?name=John Doe");
  });

  it("handles empty search object", () => {
    const result = stringifySearch({});
    expect(result).toBe("");
  });

  it("handles numeric values", () => {
    const result = stringifySearch({
      riders: "1,2,3",
      prelimTime: 60,
      battleTime: 90,
    });
    expect(result).toContain("riders=1,2,3");
    expect(result).toContain("prelimTime=60");
    expect(result).toContain("battleTime=90");
  });

  it("handles uppercase encoded sequences", () => {
    // Some encoders use uppercase %2C, others lowercase %2c
    // Our regex uses /gi flag to handle both
    const result = stringifySearch({ riders: "A,B,C" });
    expect(result).toBe("?riders=A,B,C");
  });

  it("handles winners param format", () => {
    const result = stringifySearch({ w: "12-1" });
    expect(result).toBe("?w=12-1");
  });

  it("handles complex bracket URL", () => {
    const result = stringifySearch({
      riders: "1,446,151,~Custom,331",
      prelimTime: 60,
      battleTime: 90,
      finalsTime: 120,
      w: "121-2",
    });
    expect(result).toContain("riders=1,446,151,~Custom,331");
    expect(result).not.toContain("%2C");
    expect(result).not.toContain("%7E");
  });
});
