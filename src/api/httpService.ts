import { AxiosInstance, AxiosRequestConfig } from 'axios'
import Interceptors from './interceptors'

class HttpServie {
  private axios: AxiosInstance
  constructor() {
    this.axios = new Interceptors().getInstance()
  }

  post(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.axios.post<any[]>(url, data, config)
  }

  get(url: string, config?: AxiosRequestConfig) {
    return this.axios.get<any[]>(url, config)
  }

  delete(url: string, config?: AxiosRequestConfig) {
    return this.axios.delete<any[]>(url, config)
  }

  put(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.axios.put<any[]>(url, data, config)
  }
  login(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.axios.post<{
      address: string
      company: string
      [key: string]: any
    }>(url, data, config)
  }
}

export default HttpServie
