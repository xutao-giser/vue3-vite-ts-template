import { createApp } from 'vue'
import App from '@/App.vue'
import router from '@/router/index'
import installElement from './plugins/element';
import { init } from '@/utils/init'
import '@/styles/index.less'
import '@/permission' // permission control

init().then(() => {
  const app = createApp(App)
  installElement(app);
  app.use(router).mount('#app')
})


