import { defineConfig } from '@rsbuild/core';

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
    },
  },
});
