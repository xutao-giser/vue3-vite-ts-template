export function unitConversionWid(param: number): string {
  const designWidth = 1920
  // const width = document.body.clientWidth;
  return (((param / designWidth) * 1000000) / 1000000) * 100 + 'vw'
}
export function unitConversionHei(param: number): string {
  const designWidth = 1080
  // const width = document.body.clientWidth;
  return (((param / designWidth) * 1000000) / 1000000) * 100 + 'vh'
}

export const getValueByPath = (obj: any, paths = ''): any => {
  let ret: any = obj
  paths.split('.').map((path: string) => {
    ret = ret?.[path]
  })
  return ret
}

export const formatDateTime = function (date: Date,fmt = 'yyyy-MM-dd') {
  const o = {
    'M+': date.getMonth() + 1, //月份
    'd+': date.getDate(), //日
    'h+': date.getHours(), //小时
    'm+': date.getMinutes(), //分
    's+': date.getSeconds(), //秒
    'q+': Math.floor((date.getMonth() + 3) / 3), //季度
    S: date.getMilliseconds() //毫秒
  }

  if (/(y+)/i.test(fmt)) {
    fmt = fmt.replace(
      RegExp.$1,
      (date.getFullYear() + '').substr(4 - RegExp.$1.length)
    )
  }

  for (const k in o) {
    if (new RegExp('(' + k + ')','i').test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? o[k] : ('00' + o[k]).substr(('' + o[k]).length)
      )
    }
  }

  return fmt
}
