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
        <v-progress-linear indeterminate v-show="loading"/>
        <v-alert dismissible v-model="error" type="error">
          {{ this.errorMessage }}
        </v-alert>
        <v-alert dismissible v-model="success" type="success">
          {{ this.successMessage }}
        </v-alert>
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
          <v-layout column v-show="!loading && !error">
            <v-text-field readonly label="Title" v-model="video.title"/>
            <v-text-field readonly label="Channel" v-model="video.channel.name"/>
            <v-text-field prepend-icon="event" readonly label="Date" v-model="video.date"/>
            <v-textarea readonly label="Description" v-model="video.description"/>
          </v-layout>
          <v-btn v-if="!error" @click="step = 3">Next</v-btn>
          <v-btn @click="startOver">Start over</v-btn>
        </v-stepper-content>
        <v-stepper-content step="3">
          <v-select label="Version" :items="versions" item-text="name"/>
          <v-textarea label="Description" v-model="manualEntry"/>
          <v-btn @click="parse">Parse</v-btn>
          <v-card v-for="(match, i) in matches" :key="i">
            <v-layout>
              <v-text-field
                class="ma-2"
                label="Timestamp"
                hint="**h**m**s"
                :rules="[validateTimestamp]"
                v-model="match.timestamp"/>
              <v-layout v-for="j in [1, 2]" :key="j">
                <v-menu transition="slide-y-transition" v-for="k in $config.teamSize" :key="k">
                  <v-btn class="mb-4" slot="activator" icon>
                    <v-icon>
                      mdi-account-outline
                    </v-icon>
                    <v-avatar class="mr-1" size="36px" v-if="false">
                      <img/>
                    </v-avatar>
                  </v-btn>
                  <v-list v-for="character in characters">
                    <v-list-tile @click="">
                      <v-avatar class="mr-1" size="36px">
                        <img :src="character.iconUrl" :alt="character.name">
                      </v-avatar>
                      {{ character.name }}
                    </v-list-tile>
                  </v-list>
                </v-menu>
                <v-autocomplete class="ma-2" :label="'Player ' + j" v-model="match['p' + j]"/>
                <h2 class="mt-2" v-if="j === 1">vs</h2>
              </v-layout>
              <a target="_blank" :href="'https://www.youtube.com/watch?v=' + video.id + '&t=' + (match.timestamp || '00h00m00s')">
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
              <h3 class="mb-2">Versions</h3>
              <v-layout row>
                <v-select class="ma-2" label="Edit Version"
                  :items="versions"
                  item-text="name"
                  :item-value="(version) => ({
                    id: version._id,
                    name: version.name
                  })"
                  v-model="editVersion"
                />
                <v-btn icon><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout row>
                <v-text-field class="ma-2" label="Name" v-model="editVersion.name"/>
                <v-btn icon><v-icon>save</v-icon></v-btn>
              </v-layout>
              <h3 class="mb-2">Characters</h3>
              <v-layout row>
                <v-select class="ma-2" label="Edit Character"
                  :items="charactersList" 
                  item-text="name"
                  :item-value="(character) => ({ 
                    id: character.id, 
                    name: character.name, 
                    newId: character.id, 
                    iconUrl: character.iconUrl
                  })"
                  v-model="editCharacter"
                />
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
                  <v-icon v-if="!editCharacter.iconUrl">mdi-image-plus</v-icon>
                  <v-avatar v-if="editCharacter.iconUrl" size="36px">
                    <img :src="editCharacter.iconUrl">
                  </v-avatar>
                </v-btn>
                <v-text-field class="ma-2" label="Name" v-model="editCharacter.name"/>
                <v-text-field class="ma-2" label="Id" v-model="editCharacter.newId"/>
                <v-btn icon @click="saveCharacter"><v-icon>save</v-icon></v-btn>
              </v-layout>
              <h3>Players</h3>
              <v-layout row>
                <v-autocomplete class="ma-2" label="Edit Player"/>
                <v-btn icon><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout row>
                <v-select class="ma-2" label="Edit Alias"/>
                <v-text-field class="ma-2" label="New Alias"/>
                <v-btn icon><v-icon>save</v-icon></v-btn>
                <v-btn icon><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout row>
                <v-autocomplete class="ma-2" label="Merge with Player"/>
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
    versions: [],
    editVersion: {},
    characters: {},
    charactersList: [],
    editCharacter: {},
    step: 1,
    link: '',
    video: {
      id: '',
      title: '',
      channel: '',
      date: '',
      description: '',
      version: ''
    },
    matches: [],
    loading: false,
    success: false,
    successMessage: '',
    error: false,
    errorMessage: '',
    manualEntry: '',
    admin: false,
    adminLoading: false,
    adminSuccess: false,
    adminSuccessMessage: '',
    adminError: false,
    adminErrorMessage: '',
    editCharacter: {
      name: '',
      id: '',
      newId: ''
    },
    newCharacterIcon: {
      filename: '',
      file: ''
    }
  }),
  created: function () {
    this.$api.getCharacters().then(response => {
      let characters = {}
      response.body.forEach((character) => {
        characters[character.id] = character
      })
      this.charactersList = response.body
      this.characters = characters
    })
    this.$api.getVersions().then(response => {
      this.versions = response.body
    })

    if (this.v) {
      this.link = 'https://www.youtube.com/watch?v=' + this.v
      this.validateYoutubeURL(this.link)
    }
  },
  watch: {
    step: function (step) {
      if (step === 2) {
        this.validateYoutubeID()
      } else if (step === 3) {
        this.manualEntry = this.video.description 
      }
    }
  },
  methods: {
    validateYoutubeURL: function (value) {
      let pattern = /.*youtu(?:(?:.be\/)|(?:be.*\/watch\?v=))([a-zA-Z0-9_-]{11})/
      let matches = value.match(pattern)
      if (matches) {
        this.video.id = matches[1]
        this.step = 2
        return true
      } else {
        return 'https://www.youtube.com/watch?v=***********'
      }
    },
    validateYoutubeID: function () {
      this.adminLoading = true
      this.video.channel = ''
      this.video.date = ''
      this.video.description = ''
      this.video.title = ''

      return this.$api.getYoutubeData({ v: this.video.id })
        .then((response) => {
          this.adminLoading = false
          if (response.ok) {
            this.video.channel = response.body.channel
            this.video.date = response.body.date
            this.video.description = response.body.description
            this.video.title = response.body.title
          }
        })
        .catch((error) => {
          this.errorMessage = error.bodyText + ' (' + this.link + ')'
          this.error = true
        })
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
    parse: function () {
      // TODO: implement
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
      // TODO: implement
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
        this.newCharacterIcon.filename = files[0].name
        if (this.newCharacterIcon.filename.lastIndexOf('.') <= 0) {
          return
        }
        let fr = new FileReader()
        fr.readAsDataURL(files[0])
        fr.addEventListener('load', () => {
          this.editCharacter.iconUrl = fr.result
          this.newCharacterIcon.file = files[0]
        })
      } else {
        this.newCharacterIcon.filename = ''
        this.newCharacterIcon.file = ''
      }
    },
    saveCharacter: function () {
      let character = {
        oldId: this.editCharacter.id,
        name: this.editCharacter.name,
        newId: this.editCharacter.newId
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
      if (!this.newCharacterIcon.filename || 
        !this.newCharacterIcon.file || 
        !this.editCharacter.name || 
        !this.editCharacter.newId) {
        return
      }
      let fileExtension = this.newCharacterIcon.filename.split('.').pop()

      let storage = this.$firebase.storage()
      let storageRef = storage.ref()
      let iconRef = storageRef.child('characterIcons').child(this.editCharacter.newId + '.' + fileExtension)
      return iconRef.put(this.newCharacterIcon.file)
        .then((snapshot) => {
          return snapshot.ref.getDownloadURL().then((url) => {
            return url
          })
        })
    }
  }
}
</script>
