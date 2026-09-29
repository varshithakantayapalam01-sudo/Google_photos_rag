import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://mock-photos-rag.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "mock-anon-key-for-unit-testing",
      SUPABASE_SERVICE_ROLE_KEY: "mock-service-role-key-for-unit-testing",
      GEMINI_API_KEY: "mock-gemini-key",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
