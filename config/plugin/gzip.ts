import gzipPlugin from 'rollup-plugin-gzip';
// import {Plugin} from 'vite';

export function configGzipPlugin(isBuild: boolean): any {
  if (isBuild) {
    return gzipPlugin();
  }
  return [];
}
