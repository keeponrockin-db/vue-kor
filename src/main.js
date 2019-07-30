import 'core-js/stable'
import 'regenerator-runtime/runtime'
import Vue from 'vue'
import './plugins/vuetify'
import './plugins/globals'
import App from './App.vue'
import router from './router'
import './registerServiceWorker'

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
