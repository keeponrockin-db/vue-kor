<template>
  <div v-scroll="onScroll">
    <v-layout column class="pa-3">
      <v-layout v-for="i in [1, 2]" :key="i">
        <v-menu v-for="j in $config.teamSize" :key="j"
          max-height="400px"
          transition="slide-y-transition"
        >
          <v-btn slot="activator" icon>
            <v-icon color="secondary" v-if="!selectedCharacters[i - 1][j - 1]">
              mdi-help-circle
            </v-icon>
            <v-avatar size="40px" v-if="selectedCharacters[i - 1][j - 1]">
              <img :src="selectedCharacters[i - 1][j - 1].iconUrl" :alt="selectedCharacters[i - 1][j - 1].name"/>
            </v-avatar>
          </v-btn>
          <v-list>
            <v-list-tile @click="selectCharacter(i, j, undefined)">
              <v-avatar class="mr-1" size="36px"><v-icon>mdi-account-question</v-icon></v-avatar>
              Any Character
            </v-list-tile>
            <v-list-tile v-for="character in characters" :key="character.id" @click="selectCharacter(i, j, character.id)">
              <v-avatar class="mr-1" size="36px">
                <img :src="character.iconUrl" :alt="character.name">
              </v-avatar>
              {{ character.name }}
            </v-list-tile>
          </v-list>
        </v-menu>
        <v-autocomplete clearable :label="`Player ${i}`" :items="players" v-model="selectedPlayers[i - 1]"/>
      </v-layout>
      <v-layout column v-show="expandSearch">
        <v-select clearable label="Versions" multiple :items="versions" item-text="name" v-model="selectedVersions"/>
        <v-select clearable label="Channels" multiple :items="channels" item-text="name" item-value="id" v-model="selectedChannels"/>
        <v-layout align-center>
          <v-text-field clearable label="Title" v-model="title"/>
        </v-layout>
      </v-layout>
      <v-layout justify-center>
        <v-btn icon @click="expandSearch = !expandSearch">
          <v-icon v-if="!expandSearch" color="secondary">keyboard_arrow_down</v-icon>
          <v-icon v-if="expandSearch" color="secondary">keyboard_arrow_up</v-icon>
        </v-btn>
      </v-layout>
    </v-layout>
    <v-alert type="error"
      dismissible
      v-model="error"
      transition="slide-x-transition"
    >
      {{ this.errorMessage }}
    </v-alert>
    <v-alert type="info"
      dismissible
      :value="!loading && matches.length === 0"
      transition="slide-x-transition"
    >
      No matches were found
    </v-alert>
    <v-progress-linear indeterminate v-show="loading"/>
    <v-layout column v-if="!loading">
    <MatchRow
      v-for="(match, i) in matches"
      :key="i"
      v-bind="match"
      :consecutiveMatch="(i > 0) && (matches[i - 1].video === match.video)"
    />
    </v-layout>
    <v-layout class="mt-3">
      <v-spacer/>
      <v-pagination
        v-model="page"
        :length="Math.floor(resultsCount / this.$config.itemsPerPage) + 1"
        :total-visible="$vuetify.breakpoint.smAndUp ? 7 : 5"
        circle
      />
      <v-spacer/>
    </v-layout>
    <v-slide-y-reverse-transition>
      <v-btn @click="$vuetify.goTo(0)"
        small fab
        fixed bottom right
        color="primary"
        :light="$config.lightPrimary"
        v-show="showToTop"
      >
        <v-icon>keyboard_arrow_up</v-icon>
      </v-btn>
    </v-slide-y-reverse-transition>
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
    resultsCount: -1,
    matches: [],
    loading: false,
    error: false,
    errorMessage: '',
    characters: {},
    selectedCharacters: [[], []],
    players: [],
    selectedPlayers: [],
    versions: [],
    selectedVersions: [],
    channels: [],
    selectedChannels: [],
    title: '',
    showToTop: false
  }),
  mounted: function () {
    this.getMatches(this.query)
    this.loadCharacters()
    this.loadPlayers()
    this.loadVersions()
    this.loadChannels()
  },
  watch: {
    selectedPlayers: function (player) {
      let query = Object.assign({}, this.query)
      for (let i = 0; i < 2; i++) {
        if (player[i]) {
          query[`p${i + 1}`] = player[i]
        } else {
          delete query[`p${i + 1}`]
        }
      }
      delete query.page
      this.$router.push({ path: '/', query: query })
    },
    '$route.query': function (query) {
      this.query = query
    },
    selectedVersions: function (versions) {
      let query = Object.assign({}, this.query)
      query.versions = versions.filter((version) => version).join(',')
      delete query.page
      this.$router.push({ path: '/', query: query })
    },
    selectedChannels: function (channels) {
      let query = Object.assign({}, this.query)
      query.channels = channels.filter((channel) => channel).join(',')
      delete query.page
      this.$router.push({ path: '/', query: query })
    },
    title: function (title) {
      let query = Object.assign({}, this.query)
      query.title = title
      delete query.page
      this.$router.push({ path: '/', query: query })
    },
    page: function (page) {
      let query = Object.assign({}, this.query)
      query.page = page
      this.$router.push({ path: '/', query: query })
    },
    query: function (query) {
      this.updateSelectedPlayers()
      this.updateSelectedCharacters()
      this.getMatches(query)
      this.page = query.page || 1
    }
  },
  methods: {
    loadCharacters: function () {
      this.$characters.get()
        .then((response) => {
          let characters = {}
          response.body.forEach((character) => {
            characters[character.id] = character
          })
          this.characters = characters
          this.updateSelectedCharacters()
        })
    },
    updateSelectedCharacters: function () {
      for (let i = 0; i < 2; i++) {
        if (this.query[`p${i + 1}chars`]) {
          let queryCharacters = this.query[`p${i + 1}chars`].split(',')
          for (let j = 0; j < this.$config.teamSize; j++) {
            this.selectedCharacters[i][j] = this.characters[queryCharacters[j]]
          }
        } else {
          this.selectedCharacters[i] = []
        }
      }
    },
    selectCharacter: function (playerNumber, characterPosition, characterId) {
      let characterQuery = ''
      if (this.query[`p${playerNumber}chars`]) {
        let characters = this.query[`p${playerNumber}chars`].split(',')
        characters[characterPosition - 1] = characterId
        characterQuery = characters.filter((character) => character).join(',')
      } else {
        characterQuery = characterId
      }
      let query = Object.assign({}, this.query)
      query[`p${playerNumber}chars`] = characterQuery
      delete query.page
      this.$router.push({ path: '/', query: query })
    },
    loadPlayers: function () {
      this.$players.get()
        .then((response) => {
          response.body.forEach((player) => {
            player.aliases.forEach((alias) => {
              this.players.push(alias)
            })
          })
          this.players.sort()
          this.updateSelectedPlayers()
        })
    },
    updateSelectedPlayers: function () {
      for (let i = 0; i < 2; i++) {
        if (this.query[`p${i + 1}`]) {
          this.selectedPlayers[i] = this.query[`p${i + 1}`]
        } else {
          this.selectedPlayers[i] = undefined
        }
      }
    },
    loadVersions: function () {
      this.$versions.get()
        .then((response) => {
          this.versions = (response.body).map((version) => version.name)
        })
    },
    loadChannels: function () {
      this.$channels.get()
        .then((response) => {
          this.channels = response.body
          this.updateSelectedChannels()
        })
    },
    updateSelectedChannels: function () {
      if (this.query.channels) {
        this.selectedChannels = this.query.channels.split(',')
      }
    },
    getMatches: function (query) {
      this.loading = true
      return this.$matches.get(query)
        .then((response) => {
          this.loading = false
          if (response.ok) {
            this.error = false
            this.matches = response.body.matches
            this.resultsCount = response.body.count
          } else {
            this.error = true
            this.errorMessage = `${response.status}: ${response.statusText}`
          }
        })
    },
    onScroll: function (event) {
      this.showToTop = event.currentTarget.scrollY >= 250
    }
  }
}
</script>
