import type { ServerOptions } from 'http-proxy';

type ProxyItem = [string, string];

type ProxyList = ProxyItem[];

type ProxyTargetList = Record<string, ServerOptions & { rewrite: (path: string) => string }>;

const httpsRE = /^https:\/\//;
import proxyData  from './proxyData';
// interface proxyProps {
//   development: ProxyList;
// }
/**
 * Generate proxyConfig
 * @param list
 */

export function createProxy(mode: string):object {
  // @ts-ignore
  const list :ProxyList = proxyData[mode] || [];
  if(list.length<1) return  {};
  const ret: ProxyTargetList = {};
  for (const [prefix, target] of list) {
    const isHttps = httpsRE.test(target);

    // https://github.com/http-party/node-http-proxy#options
    ret[prefix] = {
      target: target,
      changeOrigin: true,
      ws: true,
      rewrite: (path:string) => path.replace(new RegExp(`^${prefix}`), ''),
      // https is require secure=false
      ...(isHttps ? { secure: false } : {}),
    };
  }
  return ret;
}
