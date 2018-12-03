<template>
  <v-app :dark="$config.dark">
    <v-content>
      <v-layout column align-center>
        <v-toolbar dense dark color="primary">
          <router-link to="/">
            <img src="img/icons/logo-icon-white.svg">
          </router-link>
          <v-spacer/>
          <v-toolbar-title class="white--text">{{ $config.title }}</v-toolbar-title>
          <router-link to="edit">
            <v-btn icon><v-icon>mdi-plus-box</v-icon></v-btn>
          </router-link>
          <v-btn icon @click="$firebase.auth().signOut()"><v-icon>logout</v-icon></v-btn>
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