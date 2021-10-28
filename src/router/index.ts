/**
 * 路由
 */
import {
  RouteRecordRaw,
  createRouter,
  createWebHistory,
  Router
} from 'vue-router'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/home/index.vue'),
    meta: {
      title: '首页'
    }
  }
]

const router: Router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
