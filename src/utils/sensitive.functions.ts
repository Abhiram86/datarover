import { createServerFn } from "@tanstack/react-start";

export const getSupabaseEnv = createServerFn({ method: "GET" }).handler(() => {
  return {
    success: true,
    data: {
      supabaseProjectUrl: process.env.SUPABASE_PROJECT_URL!,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
    },
  };
});
