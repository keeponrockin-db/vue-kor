<template>
  <div>
    <v-card>
      <v-flex xs8 offset-xs2>
        <v-card-text>
          <v-layout v-for="i in [1, 2]" :key="i">
            <v-menu v-for="j in $config.teamSize" :key="j">
              <v-btn slot="activator" icon><v-icon>mdi-account-outline</v-icon></v-btn>
              <v-list>
                <v-list-tile>
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
      </v-flex>
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
    errorMessage: ''
  }),
  created: function () {
    this.getMatches(this.query)
    console.log(this.$config)
  },
  watch: {
    '$route.query': function (query) {
      this.query = query
    },
    page: function (page) {
      let query = {
        p1: this.query.p1,
        p1chars: this.query.p1chars,
        p2: this.query.p2,
        p2chars: this.query.p2chars,
        v: this.query.v,
        version: this.query.version,
        channel: this.query.channel,
        page: page
      }
      this.$router.replace({ path: '/', query: query })
    },
    query: function (query) {
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
    }
  }
}
</script>
