import visualizer from 'rollup-plugin-visualizer';

export function configVisualizerConfig() {
  if (process.env.REPORT === 'true') {
    return visualizer({
      filename: './node_modules/.cache/visualizer/stats.html',
      open: true,
    }) as Plugin;
  }
  return [];
}
