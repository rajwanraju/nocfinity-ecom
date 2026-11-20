import { describe, expect, it } from "vitest";
import { serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  it("escapes script-closing sequences without changing the data", () => {
    const payload = { name: "Mallory</script><script>alert(1)</script>" };
    const serialized = serializeJsonLd(payload);

    expect(serialized).not.toContain("</script>");
    expect(serialized).not.toContain("<script>");
    expect(serialized).toContain("\\u003c/script>");
    expect(JSON.parse(serialized)).toEqual(payload);
  });

  it("leaves ordinary values untouched", () => {
    expect(serializeJsonLd({ name: "Linen shirt", price: "49.00" })).toBe(
      '{"name":"Linen shirt","price":"49.00"}',
    );
  });
});
