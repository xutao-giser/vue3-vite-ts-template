import axios, { AxiosInstance } from 'axios'
import { ElMessage } from 'element-plus'
import { getToken } from '@/utils/auth'
import { mainConfig } from '@/store'

class Interceptors {
  private instance: AxiosInstance
  private whiteList: string[] = ['login']
  constructor() {
    this.instance = axios.create({
      baseURL: mainConfig.baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
    this.initRequest(this.instance)
    this.initInterceptors(this.instance)
  }
  initRequest(instance: AxiosInstance): any {
    instance.interceptors.request.use(
      config => {
        if (getToken()) {
          config.headers['Authorization'] = getToken()
        }
        return config
      },
      error => {
        return Promise.reject(error)
      }
    )
  }
  initInterceptors(instance: AxiosInstance): any {
    instance.interceptors.response.use(
      response => {
        if (response.data.code) {
          if (
            this.whiteList.find(
              item => response.config.url?.indexOf(item) != -1
            )
          ) {
            return response
          } else {
            return response.data
          }
        } else {
          ElMessage.error(response.data.msg)
          return Promise.reject(new Error(response.data.msg))
        }
      },
      error => {
        return Promise.reject(error)
      }
    )
  }

  /* 获取带header的response */
  getHeader() {
    this.instance.interceptors.response.use(
      response => {
        if (response.data.code === 1) {
          return response
        } else {
          ElMessage.error(response.data.msg)
          return Promise.reject(new Error(response.data.msg))
        }
      },
      error => {
        return Promise.reject(error)
      }
    )
  }
  /**
   * 获取实例
   */
  getInstance() {
    return this.instance
  }
}
export default Interceptors
