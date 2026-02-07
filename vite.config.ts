import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { fileURLToPath, URL } from "url";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { resolve } from "path";

const config = defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  optimizeDeps: {
    include: [
      "streamdown",
      "@streamdown/code",
      "shiki",
    ],
  },
  plugins: [
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),

    tanstackStart(),
    viteReact(),
    viteStaticCopy({
      targets: [
        {
          src: resolve(
            __dirname,
            "node_modules/@duckdb/duckdb-wasm/dist/*worker*.js",
          ),
          dest: "assets/duckdb",
        },
        {
          src: resolve(
            __dirname,
            "node_modules/@duckdb/duckdb-wasm/dist/*.wasm",
          ),
          dest: "assets/duckdb",
        },
      ],
    }),
    tailwindcss(),
  ],
});

export default config;
