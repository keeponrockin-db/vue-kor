<template>
  <div>
    <v-card>
      <v-card-text>
        <v-layout v-for="i in [1, 2]" :key="i">
          <v-menu transition="slide-y-transition" v-for="j in $config.teamSize" :key="j">
            <v-btn slot="activator" icon>
              <v-icon v-if="!selectedCharacters[i - 1][j - 1]">
                mdi-account-outline
              </v-icon>
              <v-avatar class="mr-1" size="36px" v-if="selectedCharacters[i - 1][j - 1]">
                <img :src="selectedCharacters[i - 1][j - 1].iconUrl" :alt="selectedCharacters[i - 1][j - 1].name"/>
              </v-avatar>
            </v-btn>
            <v-list v-for="character in characters">
              <v-list-tile @click="selectCharacter(i, j, character.id)">
                <v-avatar class="mr-1" size="36px">
                  <img :src="character.iconUrl" :alt="character.name">
                </v-avatar>
                {{ character.name }}
              </v-list-tile>
            </v-list>
          </v-menu>
          <v-autocomplete :label="'Player ' + i"/>
        </v-layout>
        <v-layout column v-show="expandSearch">
          <v-text-field label="Title"/>
          <v-combobox label="Versions"/>
          <v-combobox label="Channels"/>
        </v-layout>
        <v-layout justify-center>
          <v-btn icon @click="expandSearch = !expandSearch">
            <v-icon v-if="!expandSearch">mdi-chevron-down</v-icon>
            <v-icon v-if="expandSearch">mdi-chevron-up</v-icon>
          </v-btn>
        </v-layout>
      </v-card-text>
    </v-card>
    <v-alert dismissible v-model="error" type="error">
      {{ this.errorMessage }}
    </v-alert>
    <v-alert dismissible type="info" :value="!loading && matches.length === 0">
      No matches were found
    </v-alert>
    <v-progress-linear indeterminate v-show="loading"/>
    <MatchRow v-if="!loading" v-for="(match, i) in matches" :key="i" v-bind="match"/>
    <v-footer class="mt-2">
      <v-spacer/>
      <v-pagination
        v-model="page"
        :length="resultsCount"
        :total-visible="7"
        circle
      />
      <v-spacer/>
    </v-footer>
  </div>
</template>

<script>
import MatchRow from './../components/MatchRow.vue'

export default {
  name: 'Matches',
  components: {
    MatchRow: MatchRow
  },
  props: {
    query: Object
  },
  data: () => ({
    expandSearch: false,
    page: 1,
    resultsCount: 15,
    matches: [],
    loading: false,
    error: false,
    errorMessage: '',
    characters: {},
    selectedCharacters: [[], []]
  }),
  created: function () {
    this.getMatches(this.query)
    this.$api.getCharacters().then(response => {
      let characters = {}
      response.body.forEach((character) => {
        characters[character.id] = character
      })
      this.characters = characters
      this.updateSelectedCharacters()
    })
  },
  watch: {
    '$route.query': function (query) {
      this.query = query
    },
    page: function (page) {
      let query = Object.assign({}, this.query)
      query.page = page
      this.$router.push({ path: '/', query: query })
    },
    query: function (query) {
      this.updateSelectedCharacters()
      this.getMatches(query)
      this.page = query.page || 1
    }
  },
  methods: {
    getMatches: function (query) {
      this.loading = true
      return this.$api.getMatches(query).then(response => {
        this.loading = false
        if (response.ok) {
          this.error = false
          this.matches = response.body
        } else {
          this.error = true
          this.errorMessage = response.status + ': ' + response.statusText
        }
      })
    },
    updateSelectedCharacters: function () {
      for (let i = 0; i < 2; i++) {
        if (this.query['p' + (i + 1) + 'chars']) {
          let queryCharacters = this.query['p' + (i + 1) + 'chars'].split(',')
          for (let j = 0; j < this.$config.teamSize; j++) {
            this.selectedCharacters[i][j] = this.characters[queryCharacters[j]]
          }
        } else {
          this.selectedCharacters[i] = []
        }
      }
    },
    selectCharacter: function (playerNumber, characterPosition, characterId) {
      let playerQuery = ''
      if (this.query['p' + playerNumber + 'chars']) {
        let queryCharacters = this.query['p' + playerNumber + 'chars'].split(',')
        queryCharacters[characterPosition - 1] = characterId
        playerQuery = queryCharacters.join(',')
      } else {
        playerQuery = characterId
      }
      let query = Object.assign({}, this.query)
      query['p' + playerNumber + 'chars'] = playerQuery
      this.$router.push({ path: '/', query: query })
    }
  }
}
</script>
