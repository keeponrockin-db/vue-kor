import Vue from 'vue'
import VueResource from 'vue-resource'
import firebase from 'firebase'
import config from './../config'

firebase.initializeApp(config.firebaseConfig)

Vue.use(VueResource)

let uri = config.cloudFn
let apiMethods = {
  getMatches: {
    method: 'GET',
    url: uri + 'matches'
  },
  saveMatches: {
    method: 'PUT',
    url: uri + 'matches'
  },
  getCharacters: {
    method: 'GET',
    url: uri + 'characters'
  },
  saveCharacter: {
    method: 'PUT',
    url: uri + 'character'
  },
  getPlayers: {
    method: 'GET',
    url: uri + 'players'
  },
  getVersions: {
    method: 'GET',
    url: uri + 'versions'
  },
  saveVersion: {
    method: 'PUT',
    url: uri + 'version'
  },
  getChannels: {
    method: 'GET',
    url: uri + 'channels'
  },
  getYoutubeData: {
    method: 'GET',
    url: uri + 'youtubeData'
  }
}
let api = Vue.resource(uri, {}, apiMethods)

Vue.prototype.$config = config

Vue.use({
  install: () => {
    Object.defineProperty(Vue.prototype, '$api', {
      get () { return api }
    })
    Object.defineProperty(Vue.prototype, '$firebase', {
      get () { return firebase }
    })
  }
})
