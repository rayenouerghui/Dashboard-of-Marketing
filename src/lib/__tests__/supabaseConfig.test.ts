import { describe, expect, it } from "vitest";
import { hasSupabaseConfig, resolveSupabaseConfig } from "@/lib/supabase";

describe("supabase config detection", () => {
  it("detects a valid Supabase config from server env vars", () => {
    const previous = { ...process.env };

    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";

    expect(hasSupabaseConfig()).toBe(true);
    expect(resolveSupabaseConfig()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
      serviceRoleKey: undefined,
    });

    process.env = previous;
  });

  it("falls back to public env vars when present", () => {
    const previous = { ...process.env };

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://public.example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-anon-key";

    expect(hasSupabaseConfig()).toBe(true);
    expect(resolveSupabaseConfig()).toEqual({
      url: "https://public.example.supabase.co",
      anonKey: "public-anon-key",
      serviceRoleKey: undefined,
    });

    process.env = previous;
  });

  it("returns false when no Supabase config exists", () => {
    const previous = { ...process.env };

    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    expect(hasSupabaseConfig()).toBe(false);
    expect(resolveSupabaseConfig()).toEqual({
      url: undefined,
      anonKey: undefined,
      serviceRoleKey: undefined,
    });

    process.env = previous;
  });
});
