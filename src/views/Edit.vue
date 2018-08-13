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
                <v-menu v-for="k in $config.teamSize" :key="k">
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
      <v-dialog v-model="admin" fullscreen hide-overlay transition="dialog-bottom-transition">
        <v-btn slot="activator">
          Admin Settings
        </v-btn>
        <v-card>
          <v-toolbar dark color="primary">
            <v-toolbar-title>Admin Settings</v-toolbar-title>
            <v-spacer/>
            <v-btn icon dark @click.native="admin = false">
              <v-icon>close</v-icon>
            </v-btn>
          </v-toolbar>
          <v-alert dismissible v-model="adminError" type="error">
            {{ this.adminErrorMessage }}
          </v-alert>
          <v-alert dismissible v-model="adminSuccess" type="success">
            {{ this.adminSuccessMessage }}
          </v-alert>
          <v-progress-linear indeterminate v-show="adminLoading"/>
          <v-layout column>
            <v-form class="pa-4">
              <h3>Characters</h3>
              <v-layout row>
                <v-select label="Edit Character"/>
                <v-btn icon><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout row>
                <input
                  type="file"
                  style="display: none"
                  ref="characterIcon"
                  accept="image/*"
                  @change="onCharacterIconPicked"
                />
                <v-btn icon @click="pickCharacterIcon">
                  <v-icon v-if="!character.url">mdi-image-plus</v-icon>
                  <v-avatar v-if="character.url" size="35px">
                    <img :src="character.url" alt="avatar">
                  </v-avatar>
                </v-btn>
                <v-text-field class="ma-2" label="Name" v-model="character.name"/>
                <v-text-field class="ma-2" label="Id" v-model="character.newId"/>
                <v-btn icon @click="saveCharacter"><v-icon>save</v-icon></v-btn>
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
      </v-dialog>
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
    waitingForYoutube: false,
    admin: false,
    adminLoading: false,
    adminSuccess: false,
    adminSuccessMessage: '',
    adminError: false,
    adminErrorMessage: '',
    character: {
      filename: '',
      file: '',
      url: '',
      name: '',
      oldId: '',
      newId: ''
    }
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
    },
    pickCharacterIcon: function () {
      this.$refs.characterIcon.click()
    },
    onCharacterIconPicked (event) {
      let files = event.target.files
      if (files[0] !== undefined) {
        this.character.filename = files[0].name
        if (this.character.filename.lastIndexOf('.') <= 0) {
          return
        }
        let fr = new FileReader()
        fr.readAsDataURL(files[0])
        fr.addEventListener('load', () => {
          this.character.url = fr.result
          this.character.file = files[0]
        })
      } else {
        this.character.filename = ''
        this.character.file = ''
        this.character.url = ''
      }
    },
    saveCharacter: function () {
      let character = {
        oldId: this.character.oldId,
        name: this.character.name,
        newId: this.character.newId
      }
      this.adminLoading = true
      return this.uploadCharacterIcon()
        .then((url) => {
          character.iconUrl = url
          return this.$api.saveCharacter(character).then(response => {
            this.adminLoading = false
            if (response.ok) {
              this.adminSuccessMessage = 'Character saved'
              this.adminSuccess = true
              this.adminErrorMessage = ''
              this.adminError = false
              this.matches = response.body
            } else {
              this.adminSuccessMessage = ''
              this.adminSuccess = false
              this.adminErrorMessage = response.status + ': ' + response.statusText
              this.adminError = true
            }
          })
        })
    },
    uploadCharacterIcon: function () {
      if (!this.character.filename || !this.character.file || !this.character.name || !this.character.newId) {
        return
      }
      let fileExtension = this.character.filename.split('.').pop()

      let storage = this.$firebase.storage()
      let storageRef = storage.ref()
      let iconRef = storageRef.child('characterIcons').child(this.character.newId + '.' + fileExtension)
      return iconRef.put(this.character.file)
        .then((snapshot) => {
          return snapshot.ref.getDownloadURL().then((url) => {
            return url
          })
        })
    }
  }
}
</script>
