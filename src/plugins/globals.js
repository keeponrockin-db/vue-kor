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

let uri = config.cloudFn
let matchesMethods = {
  get: { method: 'GET' },
  save: { method: 'PUT' },
  delete: { method: 'DELETE' }
}
let matches = Vue.resource(`${uri}/matches/`, {}, matchesMethods)

let charactersMethods = {
  get: { method: 'GET' },
  save: { method: 'PUT' },
  delete: { method: 'DELETE' }
}
let characters = Vue.resource(`${uri}/characters/`, {}, charactersMethods)

let playersMethods = {
  get: { method: 'GET' },
  save: { method: 'PUT' },
  delete: { method: 'DELETE' },
  merge: { method: 'POST', url: `${uri}/players/merge/` }
}
let players = Vue.resource(`${uri}/players/`, {}, playersMethods)

let versionsMethods = {
  get: { method: 'GET' },
  save: { method: 'PUT' },
  delete: { method: 'DELETE' }
}
let versions = Vue.resource(`${uri}/versions/`, {}, versionsMethods)

let channelsMethods = {
  get: { method: 'GET' }
}
let channels = Vue.resource(`${uri}/channels/`, {}, channelsMethods)

let youtubeMethods = {
  get: { method: 'GET' }
}
let youtubeData = Vue.resource(`${uri}/youtube-data/`, {}, youtubeMethods)

Vue.use({
  install: () => {
    Object.defineProperty(Vue.prototype, '$matches', {
      get () { return matches }
    })
    Object.defineProperty(Vue.prototype, '$characters', {
      get () { return characters }
    })
    Object.defineProperty(Vue.prototype, '$players', {
      get () { return players }
    })
    Object.defineProperty(Vue.prototype, '$versions', {
      get () { return versions }
    })
    Object.defineProperty(Vue.prototype, '$channels', {
      get () { return channels }
    })
    Object.defineProperty(Vue.prototype, '$youtubeData', {
      get () { return youtubeData }
    })
    Object.defineProperty(Vue.prototype, '$firebase', {
      get () { return firebase }
    })
  }
})
