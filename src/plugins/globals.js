import Vue from 'vue'
import VueResource from 'vue-resource'
import firebase from 'firebase'
import config from './../config'
Vue.prototype.$config = config

firebase.initializeApp(config.firebaseConfig)

Vue.prototype.$providers = {
  twitter: new firebase.auth.TwitterAuthProvider(),
  google: new firebase.auth.GoogleAuthProvider()
}

Vue.use(VueResource)

let uri = config.localCloudFn
let matchesMethods = {
  get: { method: 'GET' },
  save: { method: 'PUT' },
  delete: { method: 'DELETE' }
}
let matchesRes = Vue.resource(`${uri}/matches/`, {}, matchesMethods)

let importMethods = {
  get: { method: 'GET' },
  save: { method: 'PUT' }
}
let importRes = Vue.resource(`${uri}/import/`, {}, importMethods)

let charactersMethods = {
  get: { method: 'GET' },
  save: { method: 'PUT' },
  delete: { method: 'DELETE' }
}
let charactersRes = Vue.resource(`${uri}/characters/`, {}, charactersMethods)

let playersMethods = {
  get: { method: 'GET' },
  save: { method: 'PUT' },
  delete: { method: 'DELETE' },
  merge: { method: 'POST', url: `${uri}/players/merge/` }
}
let playersRes = Vue.resource(`${uri}/players/`, {}, playersMethods)

let versionsMethods = {
  get: { method: 'GET' },
  save: { method: 'PUT' },
  delete: { method: 'DELETE' }
}
let versionsRes = Vue.resource(`${uri}/versions/`, {}, versionsMethods)

let channelsMethods = {
  get: { method: 'GET' }
}
let channelsRes = Vue.resource(`${uri}/channels/`, {}, channelsMethods)

let userMethods = {
  get: { method: 'GET' },
  save: { method: 'PUT' }
}
let usersRes = Vue.resource(`${uri}/users/`, {}, userMethods)

let youtubeMethods = {
  get: { method: 'GET' }
}
let youtubeDataRes = Vue.resource(`${uri}/youtube-data/`, {}, youtubeMethods)

Vue.use({
  install: () => {
    Object.defineProperty(Vue.prototype, '$matches', {
      get () { return matchesRes }
    })
    Object.defineProperty(Vue.prototype, '$import', {
      get () { return importRes }
    })
    Object.defineProperty(Vue.prototype, '$characters', {
      get () { return charactersRes }
    })
    Object.defineProperty(Vue.prototype, '$players', {
      get () { return playersRes }
    })
    Object.defineProperty(Vue.prototype, '$versions', {
      get () { return versionsRes }
    })
    Object.defineProperty(Vue.prototype, '$channels', {
      get () { return channelsRes }
    })
    Object.defineProperty(Vue.prototype, '$users', {
      get () { return usersRes }
    })
    Object.defineProperty(Vue.prototype, '$youtubeData', {
      get () { return youtubeDataRes }
    })
    Object.defineProperty(Vue.prototype, '$firebase', {
      get () { return firebase }
    })
    Object.defineProperty(Vue.prototype, '$httpInterceptors', {
      get () { return Vue.http.interceptors }
    })
  }
})
