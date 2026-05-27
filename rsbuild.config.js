import { defineConfig, rspack } from '@rsbuild/core';

const requireShim = `import __rslib_shim_module__ from "node:module";
const require = /*#__PURE__*/ __rslib_shim_module__.createRequire(/*#__PURE__*/ (() => import.meta.url)());
`;

export default defineConfig({
  source: {
    entry: {
      index: './src/action.js',
    },
  },
  output: {
    target: 'node',
    module: true,
    legalComments: 'inline',
    distPath: './dist',
  },
  tools: {
    rspack: {
      output: {
        module: true,
      },
      module: {
        parser: {
          javascript: {
            importMeta: false,
            requireDynamic: false,
            requireAsExpression: false,
            importDynamic: false,
          },
        },
      },
      plugins: [
        new rspack.BannerPlugin({
          banner: requireShim,
          // Just before minify stage, to perform tree shaking
          stage: rspack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE - 1,
          raw: true,
          include: /\.(js|mjs)$/,
        }),
      ],
    },
  },
});
