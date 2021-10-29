import gzipPlugin from 'rollup-plugin-gzip';

export function configGzipPlugin(isBuild: boolean): any {
  if (isBuild) {
    return gzipPlugin();
  }
  return [];
}
