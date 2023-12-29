import {
  HtmlTagDescriptor,
  IndexHtmlTransformContext,
  IndexHtmlTransformResult,
  Plugin,
} from "vite";
import { OutputAsset, OutputChunk } from "rollup";

import Debug, { type Debugger } from "debug";

export type Debuggers = {
  inline: Debugger & {
    js: Debugger;
    css: Debugger;
  };
  transform: Debugger & {
    index: Debugger;
  };
};

export const debug = Debug("marko-figma") as Debugger & Debuggers;

debug.inline = debug.extend("inline") as any;
debug.inline.js = debug.inline.extend("js") as any;
debug.inline.css = debug.inline.extend("css") as any;

debug.transform = debug.extend("transform") as any;
debug.transform.index = debug.transform.extend("index") as any;

function createInlineScriptTag(code: string): HtmlTagDescriptor {
  return {
    tag: "script",
    attrs: { type: "module" },
    children: code,
    injectTo: "body",
  };
}

function inlineJs(html: string, chunk: OutputChunk): string {
  const regExp = new RegExp(`<script.*${chunk.fileName}.*script>`);
  const code = `<script type="module">${chunk.code}</script>`;

  debug.inline.js(
    `      ${chunk.fileName} ${
      html.includes(chunk.fileName) ? "found" : "NOT FOUND"
    }`
  );

  return html.replace(regExp, () => code);
}

function inlineCss(html: string, asset: OutputAsset): string {
  const regExp = new RegExp(
    `<link rel="stylesheet"[^>]*?href="/?${asset.fileName}"[^>]*?>`
  );
  const code = `<style>${asset.source}</style>`;
  debug.inline.css(
    `      ${asset.fileName} ${
      html.includes(asset.fileName) ? "found" : "NOT FOUND"
    }`
  );
  return html.replace(regExp, () => code);
}

export function inline(): Plugin {
  return {
    name: "figma-plugin-sdk:vite-inline-assets",
    transform(code, id, options) {
      if (!id.includes("node_modules")) {
        debug.transform(
          `    ${id.substring(id.lastIndexOf("/"))} - ${code.length} bytes`,
          options
        );
      }

      return null;
    },

    transformIndexHtml: {
      enforce: "post",
      transform(
        html: string,
        ctx?: IndexHtmlTransformContext
      ): IndexHtmlTransformResult {
        // debug(`Index - ${html.length} bytes`, ctx);
        if (!ctx || !ctx.bundle) return html;

        // const tags = [];
        debug.transform.index("HTML: ", ctx.path);
        debug.transform.index("  bundle:");
        Object.keys(ctx.bundle).forEach((k) =>
          debug.transform.index(`    ${k}`)
        );

        for (const value of Object.values(ctx.bundle)) {
          debug.transform.index(`    processing ${value.fileName}`);

          if (!value.fileName.endsWith(".html")) {
            debug.transform.index(
              `===> inlining [${value.type}] ${value.fileName}`
            );

            const { type, fileName, isEntry } = value as any;

            debug.transform.index({ type, fileName, isEntry });

            if ("chunk" === value.type && value.isEntry) {
              if (value.isEntry) {
                html = inlineJs(html, value);
              }
            } else if ("asset" === value.type) {
              if (value.fileName.endsWith(".css")) {
                html = inlineCss(html, value);
              }
            }
            // prevent rollup from outputting inline bundles
            // delete ctx.bundle[value.fileName];
          }
        }

        return { html, tags: [] };
      },
    },
  };
}

export default inline;
