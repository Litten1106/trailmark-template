import { defineConfig, loadEnv } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

const { publicVars } = loadEnv({ prefixes: ['PUBLIC_'] });

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'development',
      ),
      'process.env.PUBLIC_MAPBOX_ACCESS_TOKEN': JSON.stringify(
        process.env.PUBLIC_MAPBOX_ACCESS_TOKEN || '',
      ),
      'process.env.PUBLIC_MAPBOX_STYLE': JSON.stringify(
        process.env.PUBLIC_MAPBOX_STYLE || '',
      ),
      ...publicVars,
    },
  },
});
