<template>
  <v-app :dark="$config.dark">
    <v-content>
      <v-layout column align-center>
        <v-toolbar dense flat :light="$config.lightPrimary" :dark="!$config.lightPrimary" color="primary">
          <router-link to="/">
            <img v-if="$config.lightPrimary" src="img/icons/logo-icon-black.svg">
            <img v-if="!$config.lightPrimary" src="img/icons/logo-icon-white.svg">
          </router-link>
          <v-toolbar-title>{{ $config.title }}</v-toolbar-title>
          <router-link to="edit" class="ml-1">
            <v-btn icon :light="$config.lightPrimary"><v-icon>mdi-plus-box</v-icon></v-btn>
          </router-link>
          <v-spacer/>
          <v-btn icon :light="$config.lightPrimary"
            v-show="$firebase.auth().currentUser"
            @click="$firebase.auth().signOut()">
            <v-icon>logout</v-icon>
          </v-btn>
        </v-toolbar>
        <div id="router-view"><router-view/></div>
      </v-layout>
    </v-content>
    <v-footer>
      <v-spacer/>
      <div><a :href="$config.contact.url">{{ $config.contact.name }}</a></div>
      <v-spacer/>
    </v-footer>
  </v-app>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style scoped lang="scss">
#router-view {
  width: 100%;
  max-width: 960px;
}
</style>
