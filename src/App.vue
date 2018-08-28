<template>
  <v-app :dark="$config.dark">
    <v-content>
      <v-layout column align-center>
        <v-toolbar dense dark color="primary">
          <router-link to="/">
            <v-btn icon><v-icon>mdi-home</v-icon></v-btn>
          </router-link>
          <router-link to="edit">
            <v-btn icon><v-icon>mdi-plus-box</v-icon></v-btn>
          </router-link>
          <v-btn icon @click="$firebase.auth().signOut()"><v-icon>logout</v-icon></v-btn>
          <v-spacer/>
          <v-toolbar-title class="white--text">{{ $config.title }}</v-toolbar-title>
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