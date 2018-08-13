<template>
  <v-card flat class="pa-1">
    <v-layout fill-height>
      <v-flex xs12>
        <v-flex>
          <router-link :to="{ query: { v: video }}">{{ title }}</router-link>
        </v-flex>
        <v-flex>
          <router-link :to="{ query: { date }}">{{ date }}</router-link> |
          <router-link :to="{ query: { version }}">{{ version }}</router-link> |
          <router-link :to="{ query: { channel: channel.id }}">{{ channel.name }}</router-link>
        </v-flex>
        <v-flex v-for="(player, i) in players" :key=i>
          <v-layout row align-center>
            <div v-for="(character, j) in player.characters" :key=j>
              <router-link :to="'?p' + (i + 1) + 'chars=' + character.id">
                <v-avatar class="ma-1" size="35px">
                  <img :src="character.iconUrl" :alt="character.name">
                </v-avatar>
              </router-link>
            </div>
            <div>
              <router-link :to="'?p' + (i + 1) + '=' + player.name">{{ player.name }}</router-link>
            </div>
          </v-layout>
        </v-flex>
      </v-flex>
      <v-layout align-end justify-center column>
        <a target="_blank" :href="'https://www.youtube.com/watch?v=' + video + '&t=' + timestamp">
          <v-icon>mdi-youtube</v-icon>
        </a>
        <router-link :to="'edit?v=' + video">
          <v-icon>mdi-pencil</v-icon>
        </router-link>
      </v-layout>
    </v-layout>
  </v-card>
</template>

<script>
export default {
  name: 'MatchRow',
  props: {
    channel: Object,
    date: String,
    players: Array,
    timestamp: String,
    title: String,
    version: String,
    video: String
  }
}
</script>

<style scoped lang="scss">
a {
  text-decoration: none;
}
</style>
