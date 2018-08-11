<template>
  <div>
    <v-stepper v-model="step">
      <v-stepper-items>
        <v-stepper-header>
          <v-stepper-step :complete="step > 1" step="1">Enter Link</v-stepper-step>
          <v-divider/>
          <v-stepper-step :complete="step > 2" step="2">Confirm Video Details</v-stepper-step>
          <v-divider/>
          <v-stepper-step :complete="step > 3" step="3">Timestamps</v-stepper-step>
        </v-stepper-header>
        <v-stepper-content step="1">
          <v-card>
            <v-card-text>
              <v-text-field
                prepend-icon="mdi-youtube"
                label="Link"
                hint="https://www.youtube.com/watch?v=***********"
                :rules="[validateYoutubeURL]"
                v-model="link"
              />
            </v-card-text>
          </v-card>
        </v-stepper-content>
        <v-stepper-content step="2">
          <v-progress-linear indeterminate v-show="waitingForYoutube"/>
          <v-layout column v-show="!waitingForYoutube">
            <v-text-field readonly label="Title" v-model="title"/>
            <v-text-field readonly label="Channel" v-model="channel"/>
            <v-text-field prepend-icon="event" readonly label="Date" v-model="date"/>
          </v-layout>
          <v-btn @click="step = 3">Next</v-btn>
          <v-btn @click="startOver">Start over</v-btn>
        </v-stepper-content>
        <v-stepper-content step="3">
          <v-card v-for="(match, i) in matches" :key="i">
            <v-layout>
              <v-text-field
                class="ma-2"
                label="Timestamp"
                hint="**h**m**s"
                :rules="[validateTimestamp]"
                v-model="match.timestamp"/>
              <v-layout v-for="j in [1, 2]" :key="j">
                <v-menu v-for="k in $numberOfChars" :key="k">
                  <v-btn class="mb-4" slot="activator" icon><v-icon>mdi-account-outline</v-icon></v-btn>
                  <v-list>
                    <v-list-tile>
                    </v-list-tile>
                  </v-list>
                </v-menu>
                <v-autocomplete class="ma-2" :label="'Player ' + j" v-model="match['p' + j]"/>
                <h2 class="mt-2" v-if="j === 1">vs</h2>
              </v-layout>
              <a target="_blank" :href="'https://www.youtube.com/watch?v=' + video + '&t=' + match.timestamp">
                <v-btn icon><v-icon>mdi-youtube</v-icon></v-btn>
              </a>
              <v-btn icon><v-icon>mdi-swap-horizontal</v-icon></v-btn>
              <v-btn icon @click="duplicateMatch(match)"><v-icon>mdi-content-duplicate</v-icon></v-btn>
              <v-btn icon @click="deleteMatch(match)"><v-icon>delete</v-icon></v-btn>
            </v-layout>
          </v-card>
          <v-btn @click="addMatch">Add Match</v-btn>
          <v-btn @click="startOver">Start over</v-btn>
        </v-stepper-content>
      </v-stepper-items>
    </v-stepper>
    <v-layout>
      <v-spacer/>
      <v-bottom-sheet>
        <v-btn slot="activator">
          Admin
        </v-btn>
        <v-card>
          <v-layout column>
            <v-form class="pa-4">
              <h3>Characters</h3>
              <v-layout row>
                <v-select label="Edit Character"/>
                <v-btn icon><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout row>
                <v-btn icon><v-icon>mdi-image-plus</v-icon></v-btn>
                <v-text-field class="ma-2" label="Name"/>
                <v-text-field class="ma-2" label="Id"/>
                <v-btn icon><v-icon>save</v-icon></v-btn>
              </v-layout>
              <h3>Players</h3>
              <v-layout row>
                <v-autocomplete class="ma-2" label="Edit Player"/>
                <v-btn icon><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout row>
                <v-select class="ma-2" label="Edit Alias"/>
                <v-text-field label="New Alias" class="ma-2"/>
                <v-btn icon><v-icon>save</v-icon></v-btn>
                <v-btn icon><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout row>
                <v-autocomplete label="Merge with Player" class="ma-2"/>
                <v-btn icon><v-icon>save</v-icon></v-btn>
              </v-layout>
              <h3>Versions</h3>
              <v-layout row>
                <v-select class="ma-2" label="Edit Version"/>
                <v-btn icon><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout row>
                <v-text-field label="Name" class="ma-2"/>
                <v-btn icon><v-icon>save</v-icon></v-btn>
              </v-layout>
            </v-form>
          </v-layout>
        </v-card>
      </v-bottom-sheet>
    </v-layout>
  </div>
</template>

<script>
export default {
  name: 'Edit',
  props: {
    v: String
  },
  data: () => ({
    step: 1,
    link: '',
    video: '',
    title: '',
    channel: '',
    date: '',
    matches: [],
    waitingForYoutube: false
  }),
  created: function () {
    if (this.v) {
      this.link = 'https://www.youtube.com/watch?v=' + this.v
      this.validateYoutubeURL(this.link)
    }
  },
  watch: {
    step: function (step) {
      if (step === 2) {

      } else if (step === 3) {

      }
    }
  },
  methods: {
    validateYoutubeURL: function (value) {
      let valid = false

      let pattern = /.*youtu(?:(?:.be\/)|(?:be.*\/watch\?v=))([a-zA-Z0-9_-]{11})/
      let matches = value.match(pattern)
      if (matches) {
        valid = true
        this.video = matches[1]
        this.step = 2
      }
      return valid || 'https://www.youtube.com/watch?v=***********'
    },
    validateTimestamp: function (value) {
      let pattern = /[0-9]{2}(?:h|H)[0-9]{2}(?:m|M)[0-9]{2}(?:s|S)/
      return pattern.test(value) || '**h**m**s'
    },
    startOver: function () {
      this.step = 1
      this.link = ''
      this.title = ''
      this.channel = ''
      this.date = ''
      this.$router.replace('edit')
    },
    addMatch: function () {
      let newMatch = {
        p1: '',
        p1chars: [],
        p2: '',
        p2chars: []
      }
      this.matches.push(newMatch)
    },
    duplicateMatch: function (match) {

    },
    deleteMatch: function (match) {
      this.matches.splice(this.matches.indexOf(match), 1)
    }
  }
}
</script>
