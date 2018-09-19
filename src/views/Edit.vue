<template>
  <div>
    <v-stepper class="elevation-0" v-model="step">
      <v-stepper-items>
        <v-stepper-header>
          <v-stepper-step :complete="step > 1" step="1">Sign In</v-stepper-step>
          <v-divider/>
          <v-stepper-step :complete="step > 2" step="2">Enter Link</v-stepper-step>
          <v-divider/>
          <v-stepper-step :complete="step > 3" step="3">Confirm Video Details</v-stepper-step>
          <v-divider/>
          <v-stepper-step :complete="step > 4" step="4">Timestamps</v-stepper-step>
        </v-stepper-header>
        <v-progress-linear indeterminate v-show="loading"/>
        <v-alert type="error"
          dismissible
          v-model="error"
          transition="slide-x-transition"
        >
          {{ this.errorMessage }}
        </v-alert>
        <v-alert type="success"
          dismissible
          v-model="success"
          transition="slide-x-transition"
        >
          {{ this.successMessage }}
        </v-alert>
        <v-stepper-content step="1">
          <v-layout column align-center>
            <v-btn @click="signIn('twitter')">
              <v-icon left>mdi-twitter</v-icon> Sign in with Twitter
            </v-btn>
            <v-btn @click="signIn('google')">
              <v-icon left>mdi-google</v-icon> Sign in with Google
            </v-btn>
          </v-layout>
        </v-stepper-content>
        <v-stepper-content step="2">
          <v-text-field label="Link"
            clearable
            prepend-icon="mdi-youtube"
            hint="https://www.youtube.com/watch?v=***********"
            :rules="[validateYoutubeURL]"
            v-model="link"
          />
        </v-stepper-content>
        <v-stepper-content step="3">
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
          <v-btn v-if="!error && !loading" @click="step = 4">
            <v-icon left>arrow_right_alt</v-icon>
            Next
          </v-btn>
        </v-stepper-content>
        <v-stepper-content step="4">
          <v-form ref="matchForm" v-model="validMatches">
            <v-text-field label="Title" readonly v-model="video.title"/>
            <v-text-field label="Channel" readonly v-model="video.channel.name"/>
            <v-text-field label="Date" prepend-icon="event" readonly v-model="video.date"/>
            <v-textarea label="Description" clearable v-model="manualEntry"/>
            <v-btn @click="parse">Parse</v-btn>
            <v-btn @click="generate">Generate</v-btn>
            <v-select label="Version"
              :rules="[validateVersion]"
              :items="versions.map((version) => version.name)"
              v-model="video.version"
            />
            <v-layout
              :column="$vuetify.breakpoint.smAndDown"
              :align-center="$vuetify.breakpoint.mdAndUp"
              fill-height
              v-for="(match, i) in matches"
              :key="i"
            >
              <v-flex xs2>
                <v-text-field label="Timestamp"
                  class="mr-1"
                  placeholder="00h00m00s"
                  hint="**h**m**s"
                  :rules="[validateTimestamp]"
                  v-model="match.timestamp"
                />
              </v-flex>
              <v-flex xs9>
                <v-layout :column="$vuetify.breakpoint.smAndDown">
                  <v-layout row align-center v-for="j in [1, 2]" :key="j" :reverse="j === 1 && $vuetify.breakpoint.mdAndUp">
                    <span class="ma-1" v-if="j === 1 && $vuetify.breakpoint.mdAndUp">vs</span>
                    <v-menu v-for="k in $config.teamSize" :key="k"
                      max-height="400px"
                      transition="slide-y-transition"
                    >
                      <v-btn class="ma-0" slot="activator" icon>
                        <v-icon v-if="!match.players[j - 1].characters[k - 1]">
                          mdi-account-outline
                        </v-icon>
                        <v-avatar size="36px" v-if="match.players[j - 1].characters[k - 1]">
                          <img :src="characters[match.players[j - 1].characters[k - 1]] ?
                            characters[match.players[j - 1].characters[k - 1]].iconUrl : ''"
                            :alt="match.players[j - 1].characters[k - 1]"
                            :title="match.players[j - 1].characters[k - 1]"
                          />
                        </v-avatar>
                      </v-btn>
                      <v-list v-for="character in characters" :key="character.id">
                        <v-list-tile @click="selectCharacter(match, (j - 1), (k - 1), character.id)">
                          <v-avatar size="36px">
                            <img :src="character.iconUrl" :alt="character.name">
                          </v-avatar>
                          {{ character.name }}
                        </v-list-tile>
                      </v-list>
                    </v-menu>
                    <v-combobox :label="`Player ${j}`"
                      clearable
                      placeholder="Unknown Player"
                      :items="aliases"
                      v-model="match.players[j - 1].name"
                    />
                  </v-layout>
                </v-layout>
              </v-flex>
              <v-layout row class="text-xs-right" xs2>
                <a :href="`https://www.youtube.com/watch?v=${video.id}&t=${match.timestamp || '00h00m00s'}`"
                  class="ma-0"
                  target="_blank"
                >
                  <v-btn icon class="ma-0"><v-icon>mdi-youtube</v-icon></v-btn>
                </a>
                <v-btn icon class="ma-0" @click="swapPlayers(match)"><v-icon>swap_horiz</v-icon></v-btn>
                <v-btn icon class="ma-0" @click="duplicateMatch(match)"><v-icon>mdi-content-duplicate</v-icon></v-btn>
                <v-btn icon class="ma-0" @click="deleteMatch(match)"><v-icon>delete</v-icon></v-btn>
              </v-layout>
            </v-layout>
            <v-btn @click="warn(startOver)">
              <v-icon left>undo</v-icon>
              Start over
            </v-btn>
            <v-btn v-if="!loading" @click="addMatch">
              <v-icon left>playlist_add</v-icon>
              Add Match
            </v-btn>
            <v-btn v-if="!loading" @click="save">
              <v-icon left>save</v-icon>
              Save
            </v-btn>
            <v-btn v-if="!loading" @click="warn(deleteMatches)">
              <v-icon left>delete</v-icon>
              Delete
            </v-btn>
          </v-form>
        </v-stepper-content>
      </v-stepper-items>
    </v-stepper>
    <v-layout>
      <v-spacer/>
      <v-dialog v-model="admin"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <v-btn v-show="$firebase.auth().currentUser" dark slot="activator">
          <v-icon left>settings</v-icon>
          Admin Settings
        </v-btn>
        <v-card>
          <v-toolbar dark>
            <v-toolbar-title>Admin Settings</v-toolbar-title>
            <v-spacer/>
            <v-btn icon dark @click.native="admin = false">
              <v-icon>arrow_back</v-icon>
            </v-btn>
          </v-toolbar>
          <v-alert type="error"
            dismissible
            v-model="adminError"
            transition="slide-x-transition"
          >
            {{ this.adminErrorMessage }}
          </v-alert>
          <v-alert type="success"
            dismissible
            v-model="adminSuccess"
            transition="slide-x-transition"
          >
            {{ this.adminSuccessMessage }}
          </v-alert>
          <v-progress-linear indeterminate v-show="adminLoading"/>
          <v-layout column>
            <v-form class="pa-4">
              <h3 class="mb-2">Versions</h3>
              <v-layout row align-center>
                <v-select label="Edit Version"
                  :items="[{ name: 'New Version' }].concat(versions)"
                  item-text="name"
                  :item-value="(version) => ({
                    name: version.name,
                    newName: version.name
                  })"
                  v-model="editVersion"
                />
                <v-btn icon @click="warn(deleteVersion)"><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout row align-center>
                <v-text-field label="Name" class="mr-3" clearable v-model="editVersion.newName"/>
                <v-btn icon @click="saveVersion"><v-icon>save</v-icon></v-btn>
              </v-layout>
              <h3 class="mb-2">Characters</h3>
              <v-layout row align-center>
                <v-select label="Edit Character"
                  :items="[{ name: 'New Character' }].concat(charactersList)"
                  item-text="name"
                  :item-value="(character) => ({
                    id: character.id,
                    name: character.name,
                    newId: character.id,
                    iconUrl: character.iconUrl
                  })"
                  v-model="editCharacter"
                />
                <v-btn icon @click="deleteCharacter"><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout :column="$vuetify.breakpoint.xsOnly">
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
                  <v-text-field label="Name" class="mr-3" clearable v-model="editCharacter.name"/>
                </v-layout>
                <v-layout row align-center>
                  <v-text-field label="Id" clearable v-model="editCharacter.newId"/>
                  <v-btn icon @click="saveCharacter"><v-icon>save</v-icon></v-btn>
                </v-layout>
              </v-layout>
              <h3>Players</h3>
              <v-layout row align-center>
                <v-autocomplete label="Edit Player" :items="aliases" v-model="editPlayer"/>
                <v-btn icon @click="deletePlayer"><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout :column="$vuetify.breakpoint.xsOnly">
                <v-select label="Edit Alias" class="mr-3" clearable/>
                <v-layout row align-center>
                <v-text-field label="New Alias" clearable/>
                <v-btn icon @click="saveAlias"><v-icon>save</v-icon></v-btn>
                <v-btn icon @click="deleteAlias"><v-icon>delete</v-icon></v-btn>
                </v-layout>
              </v-layout>
              <v-layout row align-center>
                <v-autocomplete label="Merge with Player" clearable :items="aliases"/>
                <v-btn icon @click="warn(mergePlayers)"><v-icon>save</v-icon></v-btn>
              </v-layout>
            </v-form>
          </v-layout>
        </v-card>
      </v-dialog>
    </v-layout>
    <v-dialog v-model="warning" width="500">
      <v-card>
        <v-card-title class="headline">Warning</v-card-title>
        <v-card-text>
          This action cannot be undone. Continue?
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn @click="ignoreWarning">Yes</v-btn>
          <v-btn @click="warning = false">No</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
    validMatches: false,
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
    },
    editPlayer: {
      name: '',
      aliases: [],
      id: ''
    },
    warning: false,
    action: function () {},
    actionArgs: null
  }),
  mounted: function () {
    this.loadCharacters()
    this.loadPlayers()
    this.loadVersions()
    this.$firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        this.step = 1
        return
      }
      user.getIdToken()
        .then((token) => {
          this.$httpInterceptors.push((request) => {
            request.headers.set('Authorization', token)
          })
          this.step = 2
          if (this.v) {
            this.link = `https://www.youtube.com/watch?v=${this.v}`
            this.validateYoutubeURL(this.link)
          }
        })
    })
  },
  watch: {
    step: function (step) {
      if (step === 3) {
        this.validateYoutubeID()
      } else if (step === 4) {
        this.manualEntry = this.video.description
        this.loadMatches()
      }
    },
    editCharacter: function (character) {
      this.newCharacterIcon = {
        filename: '',
        file: ''
      }
    }
  },
  methods: {
    signIn: function (providerName) {
      this.loading = true
      this.$firebase.auth().signInWithPopup(this.$providers[providerName])
        .then(() => {
          this.loading = false
        })
        .catch((error) => {
          this.loading = false
          this.displayError(`${error.code}: ${error.message}`)
        })
    },
    loadCharacters: function () {
      this.$characters.get().then(response => {
        let characters = {}
        response.body.forEach((character) => {
          characters[character.id] = character
        })
        this.charactersList = response.body
        this.characters = characters
      })
    },
    loadPlayers: function () {
      this.$players.get().then(response => {
        response.body.forEach((player) => {
          player.aliases.forEach((alias) => {
            this.aliases.push(alias)
          })
        })
        this.aliases.sort()
      })
    },
    loadVersions: function () {
      this.$versions.get().then(response => {
        this.versions = response.body
      })
    },
    validateYoutubeURL: function (value) {
      let pattern = /.*youtu(?:(?:.be\/)|(?:be.*\/watch\?v=))([a-zA-Z0-9_-]{11})/i
      let matches = value.match(pattern)
      if (matches) {
        this.video.id = matches[1]
        this.step = 3
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

      return this.$youtubeData.get({ v: this.video.id })
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
          this.step = 2
          this.loading = false
          this.displayError(`${response.bodyText} (${this.link})`)
        })
    },
    loadMatches: function () {
      this.loading = true
      this.$matches.get({ v: this.video.id }).then((response) => {
        this.loading = false
        if (response.ok && response.body.matches.length > 0) {
          this.video.version = response.body.matches[0].version
          this.matches = response.body.matches.map((match) => {
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
    validateVersion: function (value) {
      return (value !== '') || 'Please select a version'
    },
    validateTimestamp: function (value) {
      let pattern = /[0-9]{2}(?:h)[0-9]{2}(?:m)[0-9]{2}(?:s)/i
      return pattern.test(value) || '**h**m**s'
    },
    startOver: function () {
      this.step = 2
      this.link = ''
      this.title = ''
      this.channel = ''
      this.date = ''
      this.$router.replace('edit')
    },
    parse: function () {
      let matches = []
      let lines = this.manualEntry.split('\n')
      lines.forEach((line) => {
        if (line) {
          let pattern = /(?:([0-9]{1,2})(?:h|:))?([0-9]{1,2})(?:m|:)([0-9]{1,2})(?:s)?\s+(.*)/i
          let match = line.match(pattern)
          if (match) {
            let hours = match[1] ? match[1] : '00'
            let minutes = match[2]
            let seconds = match[3]
            let times = [hours, minutes, seconds]
            for (let i = 0; i < 3; i++) {
              while (times[i].length < 2) {
                times[i] = `0${times[i]}`
              }
            }
            let timestamp = `${times[0]}h${times[1]}m${times[2]}s`

            let players = match[4]
            pattern = /\s*(.*)\s+\(\s*(.*)\s*\)\s+vs\s+(.*)\s+\(\s*(.*)\s*\)\s*/i
            match = players.match(pattern)
            if (match) {
              matches.push({
                timestamp: timestamp,
                players: [
                  {
                    name: match[1],
                    characters: match[2].split(/,\s*|\//).map((character) => character.toLowerCase())
                  },
                  {
                    name: match[3],
                    characters: match[4].split(/,\s*|\//).map((character) => character.toLowerCase())
                  }
                ]
              })
            }
          }
        }
      })
      this.matches = matches
    },
    generate: function () {
      let newDescription = ''
      this.matches.forEach((match) => {
        let characters = []
        match.players.forEach((player) => {
          characters.push(player.characters.join('/'))
        })
        newDescription +=
          `${match.timestamp} ${match.players[0].name} (${characters[0]}) vs` +
          ` ${match.players[1].name} (${characters[1]})\n`
      })
      this.manualEntry = newDescription
    },
    selectCharacter: function (match, playerIndex, characterIndex, character) {
      match.players[playerIndex].characters.splice(characterIndex, 1, character)
    },
    addMatch: function () {
      let defaultCharacters = []
      for (let i = 0; i < this.$config.teamSize; i++) {
        if (i < Object.keys(this.characters).size) {
          defaultCharacters.push(Object.keys(this.characters)[i])
        } else {
          defaultCharacters.push(Object.keys(this.characters)[0])
        }
      }
      let newMatch = {
        players: [{characters: defaultCharacters.slice()}, {characters: defaultCharacters.slice()}]
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
      if (this.$refs.matchForm.validate()) {
        let matches = this.matches.map((match) => {
          match.video = this.video.id
          match.title = this.video.title
          match.channel = this.video.channel
          match.date = this.video.date
          match.version = this.video.version
          return match
        })
        this.loading = true
          this.$matches.save(matches)
            .then((response) => {
              this.loading = false
              if (response.ok) {
                this.displaySuccess('Matches saved')
              } else {
                this.displayError(response.bodyText)
              }
            })
            .catch((response) => {
              this.loading = false
              this.displayError(response.bodyText)
            })
      }
    },
    deleteMatches: function () {
      this.loading = true
      this.$matches.delete(this.video.id)
        .then((response) => {
          this.loading = false
          this.displayAdminSuccess('Matches deleted')
          this.matches = []
        })
        .catch((response) => {
          this.loading = false
          this.displayError(response.bodyText)
        })
    },
    displayError: function (message) {
      this.errorMessage = message
      this.error = true
      this.successMessage = ''
      this.success = false
    },
    displaySuccess: function (message) {
      this.successMessage = message
      this.success = true
      this.errorMessage = ''
      this.error = false
    },
    saveVersion: function () {
      this.adminLoading = true
      this.$versions.save(this.editVersion)
        .then(response => {
          this.adminLoading = false
          if (response.ok) {
            this.displayAdminSuccess('Version saved')
            this.loadVersions()
          } else {
            this.displayAdminError(response.bodyText)
          }
        })
        .catch((response) => {
          this.adminLoading = false
          this.displayAdminError(response.bodyText)
        })
    },
    deleteVersion: function () {
      this.adminLoading = true
      this.$versions.delete(this.editVersion.id)
        .then((response) => {
          this.adminLoading = false
          this.displayAdminSuccess('Version deleted')
          this.loadVersions()
        })
        .catch((response) => {
          this.adminLoading = false
          this.displayAdminError(response.bodyText)
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
          return this.$characters.save(character).then(response => {
            this.adminLoading = false
            if (response.ok) {
              this.displayAdminSuccess('Character saved')
              this.loadCharacters()
            } else {
              this.displayAdminError(response.bodyText)
            }
          })
        })
        .catch((response) => {
          this.adminLoading = false
          this.displayAdminError(response.bodyText)
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
      let iconRef = storageRef.child('characterIcons').child(`${this.editCharacter.newId}.${fileExtension}`)
      return iconRef.put(this.newCharacterIcon.file)
        .then((snapshot) => {
          return snapshot.ref.getDownloadURL().then((url) => {
            return url
          })
        })
    },
    deleteCharacter: function () {
      this.adminLoading = true
      this.$characters.delete(this.editCharacter)
        .then((response) => {
          this.adminLoading = false
          this.displayAdminSuccess('Character deleted')
          this.loadCharacters()
        })
        .catch((response) => {
          this.adminLoading = false
          this.displayAdminError(response.bodyText)
        })
    },
    savePlayer: function () {
      this.adminLoading = true
      this.$players.save()
        .then((response) => {
          this.adminLoading = false
          this.displayAdminSuccess('Player saved')
          this.loadPlayers()
        })
        .catch((response) => {
          this.adminLoading = false
          this.displayAdminError(response.bodyText)
        })
    },
    deletePlayer: function () {
      this.adminLoading = true
      this.$players.delete()
        .then((response) => {
          this.displayAdminSuccess('Player deleted')
          this.adminLoading = false
          this.loadPlayers()
        })
        .catch((response) => {
          this.adminLoading = false
          this.displayAdminError(response.bodyText)
        })
    },
    mergePlayers: function () {
      this.adminLoading = true
      this.$players.merge()
        .then((response) => {
          this.displayAdminSuccess('Players merged')
          this.adminLoading = false
          this.loadPlayers()
        })
        .catch((response) => {
          this.adminLoading = false
          this.displayAdminError(response.bodyText)
        })
    },
    saveAlias: function () {
      // TODO: finish
    },
    deleteAlias: function () {
      // TODO: finish
    },
    warn: function (action, args) {
      this.warning = true
      this.action = action
      this.actionArgs = args
    },
    ignoreWarning: function () {
      this.warning = false
      this.action(this.actionArgs)
    },
    displayAdminError: function (message) {
      this.adminErrorMessage = message
      this.adminError = true
      this.adminSuccessMessage = ''
      this.adminSuccess = false
    },
    displayAdminSuccess: function (message) {
      this.adminSuccessMessage = message
      this.adminSuccess = true
      this.adminErrorMessage = ''
      this.adminError = false
    }
  }
}
</script>
