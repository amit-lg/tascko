import { hashPassword, comparePassword } from "@/lib/password";

describe("hashPassword", () => {
  it("returns a string", async () => {
    const hash = await hashPassword("mypassword");
    expect(typeof hash).toBe("string");
  });

  it("produces a different string from the plaintext", async () => {
    const hash = await hashPassword("mypassword");
    expect(hash).not.toBe("mypassword");
  });

  it("produces a different hash each time (salted)", async () => {
    const hash1 = await hashPassword("mypassword");
    const hash2 = await hashPassword("mypassword");
    expect(hash1).not.toBe(hash2);
  });

  it("generates a bcrypt hash (starts with $2", async () => {
    const hash = await hashPassword("mypassword");
    expect(hash.startsWith("$2")).toBe(true);
  });
});

describe("comparePassword", () => {
  it("returns true when password matches the hash", async () => {
    const hash = await hashPassword("correctpassword");
    const result = await comparePassword("correctpassword", hash);
    expect(result).toBe(true);
  });

  it("returns false when password does not match the hash", async () => {
    const hash = await hashPassword("correctpassword");
    const result = await comparePassword("wrongpassword", hash);
    expect(result).toBe(false);
  });

  it("returns false for an empty string against a real hash", async () => {
    const hash = await hashPassword("correctpassword");
    const result = await comparePassword("", hash);
    expect(result).toBe(false);
  });

  it("is case-sensitive", async () => {
    const hash = await hashPassword("Password123");
    const result = await comparePassword("password123", hash);
    expect(result).toBe(false);
  });

  it("returns false when compared against a different password's hash", async () => {
    const hash = await hashPassword("somepassword");
    const result = await comparePassword("otherpassword", hash);
    expect(result).toBe(false);
  });
});
