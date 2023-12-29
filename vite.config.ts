import { defineConfig } from "vite";
import marko from "@marko/run/vite";
import staticAdapter from "@marko/run-adapter-static";
import inlineAll from "./tools/vite-inline-all";

console.log("ip", inlineAll);

export default defineConfig({
  plugins: [
    marko({
      adapter: staticAdapter(),
    }),
    inlineAll(),
    // viteSingleFile({}),
  ],
});
