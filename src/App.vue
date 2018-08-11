<template>
  <v-app>
    <v-content>
      <v-toolbar dense dark color="primary">
        <router-link to="/">
          <v-btn icon><v-icon>mdi-home</v-icon></v-btn>
        </router-link>
        <router-link to="edit">
          <v-btn icon><v-icon>mdi-plus-box</v-icon></v-btn>
        </router-link>
        <v-spacer/>
        <v-toolbar-title class="white--text">keep on rockin'</v-toolbar-title>
      </v-toolbar>
      <router-view/>
    </v-content>
    <v-footer>
      <v-spacer/>
      <div><a href="https://twitter.com/keeponrockin_db">@keeponrockin_db</a></div>
      <v-spacer/>
    </v-footer>
  </v-app>
</template>

<script>
export default {
  name: 'App'
}
</script>
