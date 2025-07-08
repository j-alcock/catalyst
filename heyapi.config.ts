import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./src/lib/openapi/api-spec.yaml",
  output: "./src/lib/heyapi",
});
