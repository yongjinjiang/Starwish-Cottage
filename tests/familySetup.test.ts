import { describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
// The CLI helper is plain Node JavaScript and is not part of the browser build.
// @ts-expect-error JavaScript CLI helper intentionally has no declaration file.
import {
  normalizeServerKey,
  preflightAdmin,
  resolveProjectUrl,
  setupErrorMessage,
  validateServerKey,
} from "../scripts/lib/family-setup.mjs";
const url = "https://oejcmfuwvwblulbcsxyj.supabase.co";
const fakeSecret = "sb_secret_fake_value_for_automated_tests_only";
function legacy(role: string, ref: string) {
  return `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role, ref })).toString("base64url")}.not_a_real_signature`;
}
describe("family setup credential safety", () => {
  it("detects a mismatched project before sending credentials", () => {
    expect(() =>
      resolveProjectUrl({
        SUPABASE_URL: "https://other.supabase.co",
        VITE_SUPABASE_URL: url,
      }),
    ).toThrow("同一个项目");
    expect(resolveProjectUrl({ VITE_SUPABASE_URL: url })).toBe(url);
    expect(() =>
      resolveProjectUrl({ VITE_SUPABASE_URL: "http://untrusted.example" }),
    ).toThrow("HTTPS");
  });
  it("accepts a complete secret copied with surrounding whitespace or quotes", () => {
    expect(normalizeServerKey(`  "${fakeSecret}"\n`)).toBe(fakeSecret);
    expect(validateServerKey(` '${fakeSecret}' `, url)).toBe(fakeSecret);
  });
  it("rejects public keys, personal tokens, masked values and invisible paste characters", () => {
    expect(() =>
      validateServerKey("sb_publishable_fake_test_key", url),
    ).toThrow("Publishable");
    expect(() => validateServerKey("sbp_fake_personal_token", url)).toThrow(
      "个人访问令牌",
    );
    expect(() => validateServerKey("sb_secret_abc…xyz", url)).toThrow("掩码");
    expect(() => validateServerKey(`${fakeSecret}\u200b`, url)).toThrow(
      "不可见",
    );
    expect(() => validateServerKey("", url)).toThrow("没有读到");
  });
  it("checks the role and project of legacy keys without treating decoding as authentication", () => {
    expect(() =>
      validateServerKey(legacy("anon", "oejcmfuwvwblulbcsxyj"), url),
    ).toThrow("service_role");
    expect(() =>
      validateServerKey(legacy("service_role", "other"), url),
    ).toThrow("其他项目");
    expect(
      validateServerKey(legacy("service_role", "oejcmfuwvwblulbcsxyj"), url),
    ).toContain("eyJ");
  });
  it("turns gateway rejection into actionable guidance and never reveals the secret", () => {
    const message = setupErrorMessage(
      new Error("Invalid API key"),
      url,
      fakeSecret,
    );
    expect(message).toContain(url);
    expect(message).toContain("Secret keys");
    expect(message).not.toContain(fakeSecret);
    expect(
      setupErrorMessage(new Error(`Unexpected ${fakeSecret}`), url, fakeSecret),
    ).not.toContain(fakeSecret);
  });
  it("stops on a real SDK admin request rejection without accessing membership or writing anything", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "Invalid API key" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
    );
    const db = createClient(url, fakeSecret, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetcher },
    });
    await expect(preflightAdmin(db)).rejects.toThrow("Invalid API key");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [request, options] = fetcher.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(String(request)).toContain("/auth/v1/admin/users");
    expect(options.method).toBe("GET");
  });
  it("validates both Auth admin permission and database access using GET requests only", async () => {
    const requests: string[] = [];
    const methods: string[] = [];
    const fetcher = vi.fn(
      async (request: RequestInfo | URL, options?: RequestInit) => {
        const path = String(request);
        requests.push(path);
        methods.push(options?.method ?? "GET");
        return new Response(
          JSON.stringify(
            path.includes("/auth/v1/")
              ? { users: [], aud: "authenticated", next_page: null }
              : [],
          ),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    );
    const db = createClient(url, fakeSecret, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetcher },
    });
    expect(await preflightAdmin(db)).toEqual([]);
    expect(requests).toHaveLength(2);
    expect(requests[1]).toContain("/rest/v1/family_members");
    expect(methods).toEqual(["GET", "GET"]);
  });
});
