import { createApp } from 'vue'
import App from '@/App.vue'
import router from '@/router/index'
import installAntd from './plugins/antd';
import { init } from '@/utils/init'
//import '@/permission' // permission control

init().then(() => {
  const app = createApp(App)
  app.config.globalProperties.$map = {}
  installAntd(app);
  app.use(router).mount('#app')
})


