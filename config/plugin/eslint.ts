import eslint from '@rollup/plugin-eslint';

export function configEslintPlugin(): any {
  return {
    enforce: 'pre',
    apply: 'serve',
    ...eslint(),
  };
}
