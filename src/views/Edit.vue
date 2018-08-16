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
          <v-btn @click="startOver">
            <v-icon left>undo</v-icon>
            Start over
          </v-btn>
          <v-btn v-if="!error && !loading" @click="step = 3">
            <v-icon left>arrow_right_alt</v-icon>
            Next
          </v-btn>
        </v-stepper-content>
        <v-stepper-content step="3">
          <v-text-field readonly label="Title" v-model="video.title"/>
          <v-text-field readonly label="Channel" v-model="video.channel.name"/>
          <v-text-field prepend-icon="event" readonly label="Date" v-model="video.date"/>
          <v-textarea label="Description" v-model="manualEntry"/>
          <v-btn @click="parse">Parse</v-btn>
          <v-select label="Version" :items="versions" v-model="video.version"/>
          <v-card v-for="(match, i) in matches" :key="i">
            <v-layout fill-height align-center>
              <v-text-field label="Timestamp"
                class="mr-1"
                hint="**h**m**s"
                :rules="[validateTimestamp]"
                v-model="match.timestamp"
              />
              <v-layout row v-for="j in [1, 2]" :key="j" :reverse="j === 1">
                <v-menu transition="slide-y-transition" v-for="k in $config.teamSize" :key="k">
                  <v-btn slot="activator" icon>
                    <v-icon v-if="!match.players[j - 1].characters[k - 1]">
                      mdi-account-outline
                    </v-icon>
                    <v-avatar class="mr-1" size="36px" v-if="match.players[j - 1].characters[k - 1]">
                      <img :src="characters[match.players[j - 1].characters[k - 1]].iconUrl"/>
                    </v-avatar>
                  </v-btn>
                  <v-list v-for="character in characters" :key="character.id">
                    <v-list-tile @click="match.players[j - 1].characters[k - 1] = character">
                      <v-avatar size="36px">
                        <img :src="character.iconUrl" :alt="character.name">
                      </v-avatar>
                      {{ character.name }}
                    </v-list-tile>
                  </v-list>
                </v-menu>
                <v-combobox :label="'Player ' + j" :items="aliases" v-model="match.players[j - 1].name"/>
              </v-layout>
              <a target="_blank" :href="'https://www.youtube.com/watch?v=' + video.id + '&t=' + (match.timestamp || '00h00m00s')">
                <v-btn icon><v-icon>mdi-youtube</v-icon></v-btn>
              </a>
              <v-btn icon @click="swapPlayers(match)"><v-icon>swap_horiz</v-icon></v-btn>
              <v-btn icon @click="duplicateMatch(match)"><v-icon>mdi-content-duplicate</v-icon></v-btn>
              <v-btn icon @click="deleteMatch(match)"><v-icon>delete</v-icon></v-btn>
            </v-layout>
          </v-card>
          <v-btn @click="startOver">
            <v-icon left>undo</v-icon>
            Start over
          </v-btn>
          <v-btn @click="addMatch">
            <v-icon left>playlist_add</v-icon>
            Add Match
          </v-btn>
          <v-btn v-if="!loading" @click="save">
            <v-icon left>save</v-icon>
            Save
          </v-btn>
        </v-stepper-content>
      </v-stepper-items>
    </v-stepper>
    <v-layout>
      <v-spacer/>
      <v-dialog v-model="admin" fullscreen hide-overlay transition="dialog-bottom-transition">
        <v-btn slot="activator">
          <v-icon left>settings</v-icon>
          Admin Settings
        </v-btn>
        <v-card>
          <v-toolbar dark>
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
              <v-layout row align-center>
                <v-select label="Edit Version"
                  :items="[{ name: 'New Version'}].concat(versions)"
                  item-text="name"
                  :item-value="(version) => ({
                    id: version._id,
                    name: version.name
                  })"
                  v-model="editVersion"
                />
                <v-btn icon><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout row align-center>
                <v-text-field label="Name" v-model="editVersion.name"/>
                <v-btn icon><v-icon>save</v-icon></v-btn>
              </v-layout>
              <h3 class="mb-2">Characters</h3>
              <v-layout row align-center>
                <v-select label="Edit Character"
                  :items="[{ name: 'New Character'}].concat(charactersList)"
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
              <v-layout row align-center>
                <input
                  type="file"
                  style="display: none"
                  ref="characterIcon"
                  accept="image/*"
                  @change="onCharacterIconPicked"
                />
                <v-btn icon @click="pickCharacterIcon">
                  <v-icon v-if="!editCharacter.iconUrl">add_photo_alternate</v-icon>
                  <v-avatar v-if="editCharacter.iconUrl" size="36px">
                    <img :src="editCharacter.iconUrl">
                  </v-avatar>
                </v-btn>
                <v-text-field label="Name" class="mr-1" v-model="editCharacter.name"/>
                <v-text-field label="Id" v-model="editCharacter.newId"/>
                <v-btn icon @click="saveCharacter"><v-icon>save</v-icon></v-btn>
              </v-layout>
              <h3>Players</h3>
              <v-layout row align-center>
                <v-autocomplete label="Edit Player" :items="aliases"/>
                <v-btn icon><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout row align-center>
                <v-select label="Edit Alias" class="mr-1"/>
                <v-text-field label="New Alias"/>
                <v-btn icon><v-icon>save</v-icon></v-btn>
                <v-btn icon><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout row align-center>
                <v-autocomplete label="Merge with Player" :items="aliases"/>
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
    video: {
      id: '',
      title: '',
      channel: '',
      date: '',
      description: '',
      version: ''
    },
    aliases: [],
    versions: [],
    editVersion: {},
    characters: {},
    charactersList: [],
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
    this.loadCharacters()
    this.loadPlayers()
    this.loadVersions()
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
        this.loadMatches()
      }
    }
  },
  methods: {
    loadCharacters: function () {
      this.$api.getCharacters().then(response => {
        let characters = {}
        response.body.forEach((character) => {
          characters[character.id] = character
        })
        this.charactersList = response.body
        this.characters = characters
      })
    },
    loadPlayers: function () {
      this.$api.getPlayers().then(response => {
        response.body.forEach((player) => {
          player.aliases.forEach((alias) => {
            this.aliases.push(alias)
          })
        })
        this.aliases.sort()
      })
    },
    loadVersions: function () {
      this.$api.getVersions().then(response => {
        this.versions = response.body
      })
    },
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
      this.loading = true
      this.video.channel = ''
      this.video.date = ''
      this.video.description = ''
      this.video.title = ''

      return this.$api.getYoutubeData({ v: this.video.id })
        .then((response) => {
          this.loading = false
          this.error = false
          if (response.ok) {
            this.video.channel = response.body.channel
            this.video.date = response.body.date
            this.video.description = response.body.description
            this.video.title = response.body.title
          }
        })
        .catch((response) => {
          this.step = 1
          this.loading = false
          this.errorMessage = response.bodyText + ' (' + this.link + ')'
          this.error = true
        })
    },
    loadMatches: function () {
      this.loading = true
      this.$api.getMatches({ v: this.video.id }).then((response) => {
        this.loading = false
        if (response.ok && response.body.length > 0) {
          this.video.version = { name: response.body[0].version }
          this.matches = response.body.map((match) => {
            return {
              timestamp: match.timestamp,
              players: [{
                name: match.players[0].name,
                characters: match.players[0].characters.map((character) => {
                  return character.id
                })
              }, {
                name: match.players[1].name,
                characters: match.players[1].characters.map((character) => {
                  return character.id
                })
              }]
            }
          })
        }
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
        players: [{characters: []}, {characters: []}]
      }
      this.matches.push(newMatch)
    },
    swapPlayers: function (match) {
      match.players.push(match.players.shift())
    },
    duplicateMatch: function (match) {
      let index = this.matches.indexOf(match)
      let newMatch = {
        timestamp: match.timestamp,
        players: [{
          name: match.players[0].name,
          characters: match.players[0].characters.slice()
        }, {
          name: match.players[1].name,
          characters: match.players[1].characters.slice()
        }]
      }
      this.matches.splice(index, 0, newMatch)
    },
    deleteMatch: function (match) {
      this.matches.splice(this.matches.indexOf(match), 1)
    },
    save: function () {
      let matches = this.matches.map((match) => {
        match.video = this.video.id
        match.title = this.video.title
        match.channel = this.video.channel
        match.date = this.video.date
        match.version = this.video.version
        return match
      })
      this.loading = true
      this.$api.saveMatches(matches)
        .then((response) => {
          this.loading = false
          if (response.ok) {
            this.successMessage = 'Matches saved'
            this.success = true
            this.errorMessage = ''
            this.error = false
          } else {
            this.errorMessage = response.bodyText
            this.error = true
            this.successMessage = ''
            this.success = false
          }
        })
        .catch((response) => {
          this.loading = false
          this.errorMessage = response.bodyText
          this.error = true
          this.successMessage = ''
          this.success = false
        })
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
              this.loadCharacters()
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
