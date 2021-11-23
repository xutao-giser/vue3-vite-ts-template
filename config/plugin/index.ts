import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

// @ts-ignore
import { ViteEnv } from '../env'
import { configHtmlPlugin } from './html'
import { configVisualizerConfig } from './visualizer'
import { configEslintPlugin } from './eslint'
import styleImport from 'vite-plugin-style-import'
import cesium from 'vite-plugin-cesium'

// gen vite plugins
export function createVitePlugins(viteEnv: ViteEnv, isBuild: boolean) {
  const vitePlugins: (Plugin | Plugin[])[] = [vue()]

  // vite-plugin-html
  vitePlugins.push(configHtmlPlugin(viteEnv, isBuild))

  // rollup-plugin-visualizer
  vitePlugins.push(configVisualizerConfig())

  // eslint
  vitePlugins.push(configEslintPlugin())

  // cesium
  vitePlugins.push(cesium())

  // todo 按需加载存在打包问题
  vitePlugins.push(styleImport({
    libs: [
      {
        libraryName: 'ant-design-vue',
        esModule: true,
        resolveComponent: name => `ant-design-vue/es/${name}`,
        resolveStyle: (name) => {
          return `ant-design-vue/es/${name}/style/index`;
        },
      }
    ]
  }))

  return vitePlugins
}
