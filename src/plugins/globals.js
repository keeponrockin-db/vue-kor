import Vue from 'vue'
import VueResource from 'vue-resource'

Vue.use(VueResource)

let uri = 'https://us-central1-test-keeponrockin.cloudfunctions.net/api/'
let apiMethods = {
  getMatches: {
    method: 'GET',
    url: uri + 'matches'
  }
}
let api = Vue.resource(uri, {}, apiMethods)

Vue.use({
  install: () => {
    Object.defineProperty(Vue.prototype, '$api', {
      get () { return api }
    })
  }
})

Vue.prototype.$numberOfChars = 3
