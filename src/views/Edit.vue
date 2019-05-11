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
            <v-btn @click="warn(startOver, null, 'Starting over will lose unsaved timestamps.')">
              <v-icon left>undo</v-icon>
              Start over
            </v-btn>
            <v-btn v-if="!loading" @click="addMatch">
              <v-icon left>playlist_add</v-icon>
              Add Match
            </v-btn>
            <v-btn v-if="!loading" @click="warn(save, null, 'Saving will overwrite previous timestamps.')">
              <v-icon left>save</v-icon>
              Save
            </v-btn>
            <v-btn v-if="!loading" @click="warn(deleteMatches, null, 'Deleted matches cannot be recovered.')">
              <v-icon left>delete</v-icon>
              Delete
            </v-btn>
          </v-form>
        </v-stepper-content>
      </v-stepper-items>
    </v-stepper>
    <v-layout>
      <v-spacer/>
      <v-dialog v-model="showAdminSettings"
        fullscreen
        hide-overlay
        transition="dialog-bottom-transition"
      >
        <v-btn v-show="$firebase.auth().currentUser && isAdmin" dark slot="activator">
          <v-icon left>settings</v-icon>
          Admin Settings
        </v-btn>
        <v-card>
          <v-toolbar dark>
            <v-toolbar-title>Admin Settings</v-toolbar-title>
            <v-spacer/>
            <v-btn icon dark @click.native="showAdminSettings = false">
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
                  v-model="editVersion"
                  :items="[{ name: 'New Version' }].concat(versions)"
                  item-text="name"
                  :item-value="(version) => ({
                    name: version.name,
                    newName: version.name
                  })"
                />
                <v-btn icon @click="warn(deleteVersion, editVersion.name,
                  `Are you sure you want to delete version: ${editVersion.name}`)"><v-icon>delete</v-icon>
                </v-btn>
              </v-layout>
              <v-layout row align-center>
                <v-text-field label="Name" class="mr-3" clearable v-model="editVersion.newName"/>
                <v-btn icon @click="warn(saveVersion, editVersion,
                  `Saving version: ${editVersion.newName} will overwrite ${editVersion.name}`)"><v-icon>save</v-icon>
                </v-btn>
              </v-layout>
              <h3 class="mb-2">Characters</h3>
              <v-layout row align-center>
                <v-select label="Edit Character"
                  v-model="editCharacter"
                  :items="[{ name: 'New Character' }].concat(charactersList)"
                  item-text="name"
                  :item-value="(character) => ({
                    id: character.id,
                    name: character.name,
                    newId: character.id,
                    iconUrl: character.iconUrl
                  })"
                />
                <v-btn icon @click="warn(deleteCharacter, editCharacter.id,
                  `Are you sure you want to delete character: ${editCharacter.id}`)"><v-icon>delete</v-icon>
                </v-btn>
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
                  <v-btn icon @click="warn(saveCharacter, null,
                    `Saving character: ${editCharacter.newId} will overwrite character: ${editCharacter.id}.`)"><v-icon>save</v-icon>
                  </v-btn>
                </v-layout>
              </v-layout>
              <h3>Players</h3>
              <v-layout row align-center>
                <v-autocomplete label="Edit Player" 
                  v-model="editPlayer"
                  :items="[{ name: 'New Player' }].concat(aliases)"
                  item-text="name"
                  :item-value="(player) => ({
                    id: player.id,
                    name: player.name,
                    aliases: player.aliases
                  })"
                />
                <v-btn icon @click="warn(deletePlayer, editPlayer.id)"><v-icon>delete</v-icon></v-btn>
              </v-layout>
              <v-layout :column="$vuetify.breakpoint.xsOnly">
                <v-select label="Edit Alias" class="mr-3" clearable 
                  v-model="editAlias"
                  :items="['New Alias'].concat(editPlayer.aliases)"
                />
                <v-layout row align-center>
                <v-text-field label="New Alias" clearable v-model="newAlias"/>
                <v-btn icon @click="saveAlias"><v-icon>save</v-icon></v-btn>
                <v-btn icon @click="deleteAlias"><v-icon>delete</v-icon></v-btn>
                </v-layout>
              </v-layout>
              <v-layout row align-center>
                <v-autocomplete label="Merge with Player" clearable
                  v-model="mergePlayer"
                  :items="aliases"
                  item-text="name"
                  :item-value="(player) => ({
                    id: player.id,
                    name: player.name,
                    aliases: player.aliases
                  })"
                />
                <v-btn icon @click="warn(mergePlayers, [editPlayer.id, mergePlayer.id])"><v-icon>save</v-icon></v-btn>
              </v-layout>
              <h3>Import Matches</h3>
              <input
                type="file"
                style="display: none"
                ref="importMatches"
                accept="json/*"
                @change="onImportFilePicked"
              />
              <v-layout row align-start>
                <v-btn icon @click="pickImportFile"><v-icon>attachment</v-icon></v-btn>
                <v-text-field label="Import File" readonly v-model="importFilename"/>
                <v-btn icon @click="warn(saveImport)"><v-icon>save</v-icon></v-btn>
              </v-layout>
            </v-form>
          </v-layout>
        </v-card>
      </v-dialog>
    </v-layout>
    <v-dialog v-model="warning" width="500">
      <v-card>
        <v-card-title class="headline"><v-icon left>warning</v-icon>Warning</v-card-title>
        <v-card-text>
          {{warningMessage}}
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn @click="ignoreWarning">Continue</v-btn>
          <v-btn @click="warning = false">Cancel</v-btn>
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
    isAdmin: false,
    showAdminSettings: false,
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
    editAlias: '',
    newAlias: '',
    mergePlayer: {
      name: '',
      aliases: [],
      id: ''
    },
    importMatches: {},
    importFilename: "No file selected",
    warning: false,
    warningMessage: '',
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

          this.$users.get({uid: user.uid}).then((response) => {
            let userData = response.body[0]
            if (userData) {
              this.isAdmin = userData.admin
            } else {
              let newUser = {
                uid: user.uid,
                email: user.email,
                admin: false
              }
              this.$users.save(newUser)
            }
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
        this.aliases = []
        response.body.forEach((player) => {
          player.aliases.forEach((alias) => {
            this.aliases.push({
              id: player._id,
              name: alias,
              aliases: player.aliases
            })
          })
        })
        this.aliases.sort((a, b) => (a.name > b.name) ? 1 : -1)
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
      this.$matches.get({ v: this.video.id, page: 'all' }).then((response) => {
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
          let timeStampPattern = /(?:([0-9]{1,2})(?:h|:))?([0-9]{1,2})(?:m|:)([0-9]{1,2})(?:s)?\s+(.*)/i
          let match = line.match(timeStampPattern)
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
            let playersPattern = /\s*(.*)\s+\(\s*(.*)\s*\)\s+vs\s+(.*)\s+\(\s*(.*)\s*\)\s*/i
            let player1Pattern = /\s*(.*)\s+\(\s*(.*)\s*\)\s+vs\s+\(?(\w+)\)?/i
            let player2Pattern = /\(?(\w+)\)?\s+vs\s+(.*)\s+\(\s*(.*)\s*\)\s*/i
            let charactersOnlyPattern = /\(?(\w+)\)?\s+vs\s+\(?(\w+)\)?/i

            if (players.match(playersPattern)) {
              let match = players.match(playersPattern)
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
            } else if (players.match(player1Pattern)) {
              let match = players.match(player1Pattern)
              matches.push({
                timestamp: timestamp,
                players: [
                  {
                    name: match[1],
                    characters: match[2].split(/,\s*|\//).map((character) => character.toLowerCase())
                  },
                  {
                    name: '',
                    characters: match[3].split(/,\s*|\//).map((character) => character.toLowerCase())
                  }
                ]
              })
            } else if (players.match(player2Pattern)) {
              let match = players.match(player2Pattern)
              matches.push({
                timestamp: timestamp,
                players: [
                  {
                    name: '',
                    characters: match[1].split(/,\s*|\//).map((character) => character.toLowerCase())
                  },
                  {
                    name: match[2],
                    characters: match[3].split(/,\s*|\//).map((character) => character.toLowerCase())
                  }
                ]
              })
            } else if (players.match(charactersOnlyPattern)) {
              let match = players.match(charactersOnlyPattern)
              matches.push({
                timestamp: timestamp,
                players: [
                  {
                    name: '',
                    characters: match[1].split(/,\s*|\//).map((character) => character.toLowerCase())
                  },
                  {
                    name: '',
                    characters: match[2].split(/,\s*|\//).map((character) => character.toLowerCase())
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
              this.displaySuccess(response.bodyText)
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
      this.$matches.delete({videoId: this.video.id})
        .then((response) => {
          this.loading = false
          this.displaySuccess(response.bodyText)
          this.startOver()
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
      this.$vuetify.goTo(0)
    },
    displaySuccess: function (message) {
      this.successMessage = message
      this.success = true
      this.errorMessage = ''
      this.error = false
      this.$vuetify.goTo(0)
    },
    saveVersion: function (version) {
      this.adminLoading = true
      this.$versions.save(version)
        .then(response => {
          this.adminLoading = false
          if (response.ok) {
            this.displayAdminSuccess(response.bodyText)
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
    deleteVersion: function (versionName) {
      this.adminLoading = true
      this.$versions.delete({ version: versionName })
        .then((response) => {
          this.adminLoading = false
          this.displayAdminSuccess(response.bodyText)
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
      try {
        return this.uploadCharacterIcon(this.newCharacterIcon.filename,
          this.newCharacterIcon.file,
          this.editCharacter.newId,
          this.editCharacter.iconUrl)
          .then((url) => {
            character.iconUrl = url
            return this.$characters.save(character).then(response => {
              this.adminLoading = false
              if (response.ok) {
                this.displayAdminSuccess(response.bodyText)
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
      } catch (error) {
        this.adminLoading = false
        this.displayAdminError(error.message)
      }
    },
    uploadCharacterIcon: function (filename, file, id, oldUrl) {
      if (!filename || !file || !id) {
        if (oldUrl) {
          return Promise.resolve().then(() => oldUrl)
        }
        throw new Error('No icon was supplied')
      }
      let fileExtension = filename.split('.').pop()
      let storage = this.$firebase.storage()
      let storageRef = storage.ref()
      let iconRef = storageRef.child('characterIcons').child(`${id}.${fileExtension}`)
      return iconRef.put(file)
        .then((snapshot) => {
          return snapshot.ref.getDownloadURL().then((url) => {
            return url
          })
        })
    },
    deleteCharacter: function (characterId) {
      this.adminLoading = true
      this.$characters.delete({ id: characterId })
        .then((response) => {
          this.adminLoading = false
          this.displayAdminSuccess(response.bodyText)
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
          this.displayAdminSuccess(response.bodyText)
          this.loadPlayers()
        })
        .catch((response) => {
          this.adminLoading = false
          this.displayAdminError(response.bodyText)
        })
    },
    deletePlayer: function (playerId) {
      this.adminLoading = true
      this.$players.delete({id: playerId})
        .then((response) => {
          this.displayAdminSuccess(response.bodyText)
          this.adminLoading = false
          this.loadPlayers()
        })
        .catch((response) => {
          this.adminLoading = false
          this.displayAdminError(response.bodyText)
        })
    },
    mergePlayers: function (playerIds) {
      this.adminLoading = true
      this.$players.merge(playerIds)
        .then((response) => {
          this.loadPlayers()
          this.editPlayer = response.body
          this.mergePlayer = {
            name: '',
            aliases: [],
            id: ''
          }
          this.displayAdminSuccess('Players have been merged')
          this.adminLoading = false
        })
        .catch((response) => {
          this.adminLoading = false
          this.displayAdminError(response.bodyText)
        })
    },
    saveAlias: function () {
      this.adminLoading = true
      if (this.editAlias === 'New Alias' || !this.editAlias) {
        this.editPlayer.aliases.splice(0, 0, this.newAlias)
      } else {
        if (!this.newAlias) {
          this.newAlias = this.editAlias
        } else {
          let aliasIndex = this.editPlayer.aliases.indexOf(this.editAlias)
          if (~aliasIndex) {
            this.editPlayer.aliases.splice(aliasIndex, 1, this.newAlias)
          }
        }
      }

      this.$players.save({id: this.editPlayer.id, name: this.newAlias, aliases: this.editPlayer.aliases})
        .then((response) => {
          this.displayAdminSuccess(`${this.newAlias} was saved`)
          this.adminLoading = false
        })
        .catch((response) => {
          this.displayAdminError(response.bodyText)
          this.adminLoading = false
        })
    },
    deleteAlias: function () {
      this.adminLoading = true
      let aliasIndex = this.editPlayer.aliases.indexOf(this.editAlias)
      if (~aliasIndex) {
        this.editPlayer.aliases.splice(aliasIndex, 1)
      }

      this.$players.save(this.editPlayer)
        .then((response) => {
          this.displayAdminSuccess(`${this.editAlias} was deleted`)
          this.adminLoading = false
        })
        .catch((response) => {
          this.displayAdminError(response.bodyText)
          this.adminLoading = false
        })
    },
    pickImportFile: function () {
      this.$refs.importMatches.click()
    },
    onImportFilePicked (event) {
      let files = event.target.files
      if (files[0] !== undefined) {
        let fr = new FileReader()
        fr.readAsText(files[0])
        fr.addEventListener('load', () => {
          this.importFilename = files[0].name
          this.importMatches = JSON.parse(fr.result)
        })
      }
    },
    saveImport () {
      this.adminLoading = true
      this.$import.save(this.importMatches)
        .then((response) => {
          this.adminLoading = false
          if (response.ok) {
            this.displayAdminSuccess(response.bodyText)
          } else {
            this.displayAdminError(response.bodyText)
          }
        })
        .catch((response) => {
          this.adminLoading = false
          this.displayAdminError(response.bodyText)
        })
    },
    warn: function (action, args, message) {
      this.warning = true
      if (message) {
        this.warningMessage = message
      } else {
        this.warningMessage = 'This action cannot be undone.'
      }

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
      this.$vuetify.goTo(0)
    },
    displayAdminSuccess: function (message) {
      this.adminSuccessMessage = message
      this.adminSuccess = true
      this.adminErrorMessage = ''
      this.adminError = false
      this.$vuetify.goTo(0)
    }
  }
}
</script>
