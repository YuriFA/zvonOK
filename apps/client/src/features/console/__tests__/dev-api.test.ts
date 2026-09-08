import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthError, ValidationError } from "@/lib/api/api.errors";

import { devApi } from "../services/dev-api";

describe("DevApi", () => {
  afterEach(() => {
    devApi.clearToken();
    vi.unstubAllGlobals();
  });
  it("stores, reads, and clears the session token", () => {
    expect(devApi.getToken()).toBeNull();
    devApi.setToken("tok-1");
    expect(devApi.getToken()).toBe("tok-1");
    devApi.clearToken();
    expect(devApi.getToken()).toBeNull();
  });

  it("throws AuthError and announces expiry on a 401 response", async () => {
    const events: string[] = [];
    const onExpired = () => events.push("expired");
    window.addEventListener("zvonok:dev-auth-expired", onExpired);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid credentials" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(devApi.login("dev", "Password1")).rejects.toThrow(AuthError);
    expect(events).toEqual(["expired"]);

    window.removeEventListener("zvonok:dev-auth-expired", onExpired);
  });

  it("maps validation failures to ValidationError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "password too weak" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(devApi.register("dev", "weak")).rejects.toThrow(ValidationError);
  });
});
