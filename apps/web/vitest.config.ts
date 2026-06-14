import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    server: {
      deps: {
        // `graphql` v16 ships both ESM and CJS builds. Vite resolves our
        // `import` to the ESM build, while @graphql-tools `require`s the CJS
        // build — two GraphQLSchema realms, so executing a tools-built schema
        // throws "Cannot use GraphQLSchema from another module or realm".
        // Inlining @graphql-tools routes its graphql resolution through Vite,
        // aligning both onto a single instance.
        inline: [/@graphql-tools\//],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` throws when imported without the react-server condition,
      // which Vitest does not set. Stub it so server-only modules are testable.
      "server-only": path.resolve(__dirname, "./test/server-only-stub.ts"),
    },
    // Force a single `graphql` instance. graphql-yoga's `createSchema` and the
    // top-level `graphql()` must share one realm, or executing the schema throws
    // "Cannot use GraphQLSchema from another module or realm".
    dedupe: ["graphql"],
  },
});
