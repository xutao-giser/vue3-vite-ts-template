import { resolve } from 'path';
import type { UserConfig, ConfigEnv } from 'vite';
import { wrapperEnv } from './config/env';
import { loadEnv } from 'vite';
import { createVitePlugins } from './config/plugin';
import { createProxy } from './config/proxyConfig/proxy';

function pathResolve(dir: string) {
  return resolve(__dirname, '.', dir);
}

const root: string = process.cwd();
export default ({ command, mode }: ConfigEnv): UserConfig => {
  const env = loadEnv(mode, root);
  const configEnv: string = process.env.NODE_ENV || 'development';
  const viteEnv = wrapperEnv(env);
  const {
    VITE_PORT,
    VITE_PUBLIC_PATH,
    VITE_DROP_CONSOLE,
    VITE_LEGACY = false,
  } = viteEnv;
  const isBuild = command === 'build';
  console.log(isBuild,mode);
  const proxy: Object = isBuild
    ? {}
    : {
        server: {
          port: VITE_PORT,
          open: '',
          proxy: createProxy(configEnv),
          hmr: {
            overlay: false,
          },
          watch: {},
        },
      };
  return {
    base: VITE_PUBLIC_PATH,
    resolve: {
      alias: {
        '@': pathResolve('src'),
      },
      extensions: ['.ts', '.tsx', '.js', '.json', '.d.ts'],
    },
    optimizeDeps: {
      include: ['axios'],
      exclude: [],
    },
    ...proxy,
    build: {
      target: 'esnext',
      sourcemap: !isBuild,
      outDir: mode === 'test'?`dist-test`:'dist',
      polyfillDynamicImport: VITE_LEGACY,
      terserOptions: {
        compress: {
          keep_infinity: true,
          drop_console: VITE_DROP_CONSOLE,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
          },
        },
      },
      // Turning off brotliSize display can slightly reduce packaging time
      brotliSize: false,
    },
    css: {
      preprocessorOptions: {
        less: {
          additionalData:  `@import "${pathResolve('src/styles/index.less')}";`,
          javascriptEnabled: true
        }
      },
    },
    define: {},
    plugins: createVitePlugins(viteEnv, isBuild),
  };
};
