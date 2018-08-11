import '@babel/polyfill'
import Vue from 'vue'
import './plugins/vuetify'
import './plugins/globals'
import App from './App.vue'
import router from './router'

Vue.config.productionTip = false

new Vue({
  router,
  render: h => h(App)
}).$mount('#app')
