<template>
  <v-layout class="px-3">
    <v-layout column fill-height>
      <v-divider/>
      <v-layout align-center class="mb-1" v-if="!consecutiveMatch">
        <v-layout column>
          <v-flex>
            <router-link :to="{ query: { v: video }}">{{ title }}</router-link>
          </v-flex>
          <v-flex>
            {{ date }} |
            <router-link :to="{ query: { version }}">{{ version }}</router-link> |
            <router-link :to="{ query: { channel: channel.id }}">{{ channel.name }}</router-link>
          </v-flex>
        </v-layout>
        <v-flex class="text-xs-right" xs1>
          <router-link :to="`edit?v=${ video }`">
            <v-icon>edit</v-icon>
          </router-link>
        </v-flex>
      </v-layout>
      <v-divider/>
      <v-layout align-center>
        <v-flex xs1 class="mr-3 hidden-xs-only"/>
        <div class="pr-2 hidden-sm-and-up"/>
        <v-layout :column="$vuetify.breakpoint.xsOnly">
          <v-flex xs6 v-for="(player, i) in players" :key=i>
            <v-layout row align-center :reverse="i === 0 && $vuetify.breakpoint.smAndUp">
              <div v-if="i === 0 && $vuetify.breakpoint.smAndUp">vs</div>
              <div v-for="(character, j) in player.characters" :key=j>
                <router-link :to="`?p${i + 1}chars=${character.id}`">
                  <v-avatar class="ma-1" size="36px">
                    <img :src="character.iconUrl" :alt="character.name">
                  </v-avatar>
                </router-link>
              </div>
              <div>
                <router-link :to="`?p${i + 1}=${player.name}`">{{ player.name }}</router-link>
              </div>
            </v-layout>
          </v-flex>
        </v-layout>
        <v-flex class="text-xs-right" xs1>
          <a target="_blank" :href="`https://www.youtube.com/watch?v=${video}&t=${timestamp}`">
            <v-icon>mdi-youtube</v-icon>
          </a>
        </v-flex>
      </v-layout>
    </v-layout>
  </v-layout>
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
    video: String,
    consecutiveMatch: Boolean
  }
}
</script>

<style scoped lang="scss">
a {
  text-decoration: none;
  color: inherit;
}
</style>
