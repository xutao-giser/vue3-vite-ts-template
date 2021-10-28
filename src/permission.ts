import { getToken } from '@/utils/auth'
import router from '@/router'
import { message } from 'ant-design-vue'

const whiteList = ['/login']

router.beforeEach(async (to, from, next) => {
  const isToken = getToken()
  if (isToken) {
    next()
  } else {
    if (whiteList.indexOf(to.path) !== -1) {
      next()
    } else {
      next(`/login?redirect=${to.path}`)
      message.warning('请先登录')
    }
  }
})
