import Vue from 'vue'
import Vuetify from 'vuetify'
import config from './../config'
import 'vuetify/dist/vuetify.min.css'
import '@mdi/font/css/materialdesignicons.css' // Ensure you are using css-loader

Vue.use(Vuetify, {
  theme: config.theme,
  iconfont: 'md' || 'mdi' // 'fa' || 'fa4'
})
