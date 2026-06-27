import { signToken, verifyToken } from "@/lib/auth";
import jwt from "jsonwebtoken";

const TEST_SECRET = "test-secret-at-least-32-chars-long!!";

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.JWT_EXPIRES_IN = "7d";
});

describe("signToken", () => {
  it("returns a non-empty string", () => {
    const token = signToken({ userId: "user_123" });
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("produces a valid JWT with three dot-separated segments", () => {
    const token = signToken({ userId: "user_123" });
    expect(token.split(".")).toHaveLength(3);
  });

  it("encodes the userId in the payload", () => {
    const token = signToken({ userId: "user_abc" });
    const decoded = jwt.decode(token) as { userId: string };
    expect(decoded.userId).toBe("user_abc");
  });

  it("includes an expiry (exp) claim", () => {
    const token = signToken({ userId: "user_123" });
    const decoded = jwt.decode(token) as { exp: number };
    expect(decoded.exp).toBeDefined();
    expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });
});

describe("verifyToken", () => {
  it("returns the correct payload for a valid token", () => {
    const token = signToken({ userId: "user_123" });
    const payload = verifyToken(token);
    expect(payload.userId).toBe("user_123");
  });

  it("sign → verify round-trip preserves userId", () => {
    const userId = "round-trip-user";
    const token = signToken({ userId });
    const payload = verifyToken(token);
    expect(payload.userId).toBe(userId);
  });

  it("throws on a tampered token", () => {
    const token = signToken({ userId: "user_123" });
    const [header, , signature] = token.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ userId: "attacker" })).toString("base64url");
    const tampered = `${header}.${tamperedPayload}.${signature}`;

    expect(() => verifyToken(tampered)).toThrow();
  });

  it("throws on a token signed with a different secret", () => {
    const foreignToken = jwt.sign({ userId: "user_123" }, "completely-different-secret");
    expect(() => verifyToken(foreignToken)).toThrow();
  });

  it("throws on an expired token", () => {
    const expiredToken = jwt.sign({ userId: "user_123" }, TEST_SECRET, { expiresIn: -1 });
    expect(() => verifyToken(expiredToken)).toThrow();
  });

  it("throws on a malformed token string", () => {
    expect(() => verifyToken("not.a.token")).toThrow();
  });

  it("throws on an empty string", () => {
    expect(() => verifyToken("")).toThrow();
  });
});
