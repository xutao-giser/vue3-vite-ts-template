import type { Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

// @ts-ignore
import { ViteEnv } from '../env'
import { configHtmlPlugin } from './html'
import { configVisualizerConfig } from './visualizer'
import { configEslintPlugin } from './eslint'

// gen vite plugins
export function createVitePlugins(viteEnv: ViteEnv, isBuild: boolean) {
  const vitePlugins: (Plugin | Plugin[])[] = [vue()]

  // vite-plugin-html
  vitePlugins.push(configHtmlPlugin(viteEnv, isBuild))

  // rollup-plugin-visualizer
  vitePlugins.push(configVisualizerConfig())

  // eslint
  vitePlugins.push(configEslintPlugin())

  return vitePlugins
}
