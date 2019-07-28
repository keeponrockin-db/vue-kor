require('dotenv').config()

const _ = require('underscore')

const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp()

const express = require('express')
const cors = require('cors')({ origin: true })
const api = express()
api.use(cors)

const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectId
const connectMongoDB = () => MongoClient.connect(process.env.MONGODB)

const youtubeKey = process.env.YOUTUBEKEY
const axios = require('axios')

const itemsPerPage = 50
const defaultSort = {
  date: -1,
  video: 1,
  timestamp: 1
}

api.get('/matches', (request, response) => {
  return connectMongoDB()
    .then((client) => {
      if (request.query.p1 || request.query.p2) {
        // Get player ids from aliases for querying
        let query = formPlayerQuery(request.query)
        return client.db()
          .collection('players')
          .find(query)
          .toArray()
          .then((players) => ({ client, players }))
      } else {
        let players = []
        return ({ client, players })
      }
    })
    .then(({ client, players }) => {
      let query = formMatchQuery(request.query, players)
      let sort = defaultSort
      let skip = 0
      let limit = 0
      if (request.query.page !== 'all') {
        skip = request.query.page > 0 ? (request.query.page - 1) * itemsPerPage : 0
        limit = itemsPerPage
      }
      return ({ client, query, sort, skip, limit })
    })
    .then(({ client, query, sort, skip, limit }) => client.db()
      .collection('matches')
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray()
      .then((matches) => ({ client, matches, query }))
    )
    .then(({ client, matches, query }) => deserializeMatches(client, matches)
      .then((matches) => ({ client, matches, query }))
    )
    .then(({ client, matches, query }) => client.db()
      .collection('matches')
      .find(query)
      .count()
      .then((count) => ({ client, matches, count }))
    )
    .then(({ client, matches, count }) => {
      client.close()
      response.status(200).json({ matches: matches, count: count })
    })
    .catch((error) => response.status(400).send(error.toString()))
})

function formPlayerQuery (query) {
  let players = []
  if (query.p1) { players.push(query.p1) }
  if (query.p2) { players.push(query.p2) }
  return { aliases: { $in: players } }
}

function formMatchQuery (query, players) {
  if (query.v) { return { video: query.v } }

  players = players.map(player => ({
    aliases: player.aliases.map(alias => alias.toLowerCase()),
    id: player._id.toString()
  }))

  let matchQuery = {
    players: {
      $all: [{ $elemMatch: {} }, { $elemMatch: {} }]
    }
  }

  if (query.versions) { matchQuery.version = { $in: query.versions.split(',') } }
  if (query.channels) { matchQuery['channel.id'] = { $in: query.channels.split(',') } }
  if (query.title) { matchQuery['$text'] = { $search: query.title } }

  let playerNames = [query.p1, query.p2]

  for (let i = 0; i < 2; i++) {
    let playerName = playerNames[i]
    let otherPlayerName = playerNames[1 - i]

    if (playerName) {
      if (!matchQuery.players.$all[i].$elemMatch.id) { matchQuery.players.$all[i].$elemMatch.id = {} }
      let foundPlayers = players.filter(player => player.aliases.includes(playerName.toLowerCase()))
      if (foundPlayers) {
        matchQuery.players.$all[i].$elemMatch.id.$in = foundPlayers.map(player => player.id)
      }
    } else if (otherPlayerName) {
      if (!matchQuery.players.$all[i].$elemMatch.id) { matchQuery.players.$all[i].$elemMatch.id = {} }
      let foundPlayers = players.filter(player => player.aliases.includes(otherPlayerName.toLowerCase()))
      if (foundPlayers) {
        matchQuery.players.$all[i].$elemMatch.id.$nin = foundPlayers.map(player => player.id)
      }
    }
  }

  let characters = [query.p1chars, query.p2chars]

  if (characters[0] && characters[0] === characters[1]) {
    matchQuery.mirror = { $all: characters[0].split(',') }
  } else {
    for (let i = 0; i < 2; i++) {
      if (characters[i]) {
        matchQuery.players.$all[i].$elemMatch.characters = {
          $all: characters[i].split(',')
        }
      }
    }
  }

  return matchQuery
}

function deserializeMatches (client, matches) {
  let playerIds = []
  matches.forEach((match) => {
    delete match._id
    match.players.forEach((player) => {
      playerIds.push(ObjectId(player.id))
    })
  })

  return client.db()
    .collection('characters')
    .find()
    .toArray()
    .then((characters) => {
      let characterLookup = {}
      characters.forEach(character => {
        characterLookup[character.id] = {
          id: character.id,
          name: character.name,
          iconUrl: character.iconUrl
        }
      })
      matches = matches.map(match => {
        for (let i = 0; i < 2; i++) {
          let playerCharacters = []
          match.players[i].characters.forEach(character => {
            playerCharacters.push(characterLookup[character])
          })
          match.players[i].characters = playerCharacters
        }
        return match
      })
      return ({ matches })
    })
    .then(({ matches }) => client.db()
      .collection('players')
      .find({ _id: { $in: playerIds } })
      .toArray()
      .then((players) => {
        return matches.map(match => {
          for (let i = 0; i < 2; i++) {
            let player = players.find(player => player._id.equals(ObjectId(match.players[i].id)))
            match.players[i].name = player.name
            match.players[i].aliases = player.aliases
            delete match.players[i].id
          }
          return match
        })
      })
    )
}

api.put('/matches', (request, response) => {
  if (!request.headers.authorization) {
    response.status(403).send('Unauthorized')
  }

  admin.auth().verifyIdToken(request.headers.authorization).then(() => {
    let matches = request.body

    return connectMongoDB()
      .then((client) => {
        return ({ client, matches })
      })
      .then(({ client, matches }) => {
        return addMatches(client, matches).then(() => ({ client }))
      })
      .then(({ client }) => {
        client.close()
      })
      .then(() => {
        response.status(200).send(`Matches for video: ${matches[0].video} successfully saved`)
      })
      .catch((error) => response.status(400).send(error.toString()))
  }).catch((error) => response.status(400).send(error.toString()))
})

function addMatches (client, matches) {
  return checkCharacters(client, matches)
    .then(({ client, matches }) => addMirrorFields(client, matches))
    .then(({ client, matches }) => {
      let version = matches[0].version
      if (!version) {
        throw new Error('A version was not selected')
      }
      return client.db()
        .collection('versions')
        .updateOne({ name: version }, { $set: { name: version } }, { upsert: true })
        .then(() => ({ client, matches }))
    })
    .then(({ client, matches }) => {
      let channel = matches[0].channel
      return client.db()
        .collection('channels')
        .updateOne({ id: channel.id }, { $set: channel }, { upsert: true })
        .then(() => ({ client, matches }))
    })
    .then(({ client, matches }) => fillPlayerIds(client, matches))
    .then(({ client, matches }) => {
      matches.forEach((match) => {
        if (match.timestamp === '00h00m00s') { match.timestamp = '00h00m01s' }
      })
      return ({ client, matches })
    })
    .then(({ client, matches }) => {
      return client.db()
        .collection('matches')
        .deleteMany({ video: matches[0].video })
        .then(() => ({ client, matches }))
    })
    .then(({ client, matches }) => {
      return client.db()
        .collection('matches')
        .insert(matches)
    })
}

function checkCharacters (client, matches) {
  return client.db()
    .collection('characters')
    .find()
    .toArray()
    .then((characters) => {
      let characterIds = characters.map((character) => character.id)
      matches.forEach((match) => {
        match.players.forEach((player) => {
          player.characters.forEach((character) => {
            if (characterIds.indexOf(character) < 0) {
              throw new Error('One or more characters were not found')
            }
          })
        })
      })
      return ({ client, matches })
    })
}

function addMirrorFields (client, matches) {
  matches = matches.map((match) => {
    match.players[0].characters.forEach((character) => {
      if (match.players[1].characters.indexOf(character) >= 0) {
        if (!match.mirror) {
          match.mirror = []
        }
        match.mirror.push(character)
      }
    })
    return match
  })
  return ({ client, matches })
}

function fillPlayerIds (client, matches) {
  let foundPlayers = []
  matches.forEach(match => {
    match.players.forEach((player) => {
      if (!player.name) {
        player.name = 'Unknown Player'
      }
      player.name = player.name.trim()
      if (!foundPlayers.includes(player.name)) {
        foundPlayers.push(player.name)
      }
    })
  })

  let query = { aliases: { $in: foundPlayers } }

  return client.db()
    .collection('players')
    .find(query)
    .toArray()
    .then((players) => {
      let playerIds = {}
      let newPlayers = foundPlayers
      for (let i = newPlayers.length - 1; i >= 0; i--) {
        // go backwards so you don't break index when modifying the array
        for (let j = 0; j < players.length; j++) {
          if (players[j].aliases.includes(newPlayers[i])) {
            // starting with all related players, remove known ones and remember their ids
            playerIds[newPlayers[i]] = players[j]._id.toString()
            newPlayers.splice(i, 1)
            break
          }
        }
      }
      return ({ newPlayers, playerIds })
    })
    .then(({ newPlayers, playerIds }) => {
      if (newPlayers.length > 0) {
        return client.db()
          .collection('players')
          .insert(
            newPlayers.map(player => ({
              name: player,
              aliases: [player]
            }))
          )
          .then(() => {
            query = { name: { $in: newPlayers } }
            return client.db()
              .collection('players')
              .find(query)
              .toArray()
              .then((players) => {
                players.forEach(player => {
                  playerIds[player.name] = player._id.toString()
                })
                return playerIds
              })
          })
      } else {
        return playerIds
      }
    })
    .then((playerIds) => {
      matches.forEach(match => {
        match.players.forEach((player) => {
          player.id = playerIds[player.name]
          delete player.name
        })
      })

      return ({ client, matches })
    })
}

api.delete('/matches', (request, response) => {
  if (!request.headers.authorization) {
    response.status(403).send('Unauthorized')
  }

  admin.auth().verifyIdToken(request.headers.authorization).then(() => {
    return connectMongoDB()
      .then((client) => {
        let videoId = request.query.videoId
        return ({ client, videoId })
      })
      .then(({ client, videoId }) => {
        return client.db()
          .collection('matches')
          .deleteMany({ video: videoId })
          .then(() => ({ client, videoId }))
      })
      .then(({ client, videoId }) => {
        client.close()
        response.status(200).send(`Matches from video: ${videoId} successfully deleted`)
      })
      .catch((error) => response.status(400).send(error.toString()))
  }).catch((error) => response.status(400).send(error.toString()))
})

api.put('/import', (request, response) => {
  if (!request.headers.authorization) {
    response.status(403).send('Unauthorized')
  }

  admin.auth().verifyIdToken(request.headers.authorization).then(() => {
    let videos = request.body

    if (!auditImport(videos)) { response.status(400).send('Improperly formatted import file') }

    return connectMongoDB()
      .then((client) => {
        let matches = []
        videos.forEach(video => {
          video.forEach(match => {
            let newMatch = {
              players: [{
                name: match.players[0].name
              }, {
                name: match.players[1].name
              }]
            }
            matches.push(newMatch)
          })
        })
        return fillPlayerIds(client, matches)
      })
      .then(({ client }) => {
        let promiseArray = []
        try {
          videos.forEach(video => {
            promiseArray.push(addMatches(client, video))
          })
          return Promise.all(promiseArray).then(() => ({ client }))
        } catch (error) {
          throw error
        }
      })
      .then(({ client }) => {
        client.close()
      })
      .then(() => {
        response.status(200).send('Matches successfully imported')
      })
      .catch((error) => response.status(400).send(error.toString()))
  }).catch((error) => response.status(400).send(error.toString()))
})

function auditImport (videos) {
  videos.forEach(video => {
    let videoId = video[0].video
    video.forEach(match => {
      if (!(match.timestamp &&
        match.players &&
        match.video &&
        match.title &&
        match.channel &&
        match.date &&
        match.version)) {
        return false
      }
      if (match.video !== videoId) { return false }
    })
  })

  return true
}

api.get('/characters', (request, response) => {
  return connectMongoDB()
    .then((client) => client.db()
      .collection('characters')
      .find()
      .sort({ name: 1 })
      .toArray()
      .then((characters) => ({ client, characters }))
    )
    .then(({ client, characters }) => {
      client.close()
      return characters
    })
    .then((characters) => response.status(200).json(characters))
    .catch((error) => response.status(400).send(error.toString()))
})

api.put('/characters', (request, response) => {
  if (!request.headers.authorization) {
    response.status(403).send('Unauthorized')
  }

  admin.auth().verifyIdToken(request.headers.authorization).then(() => {
    let character = {
      name: request.body.name,
      id: request.body.newId,
      iconUrl: request.body.iconUrl
    }
    let id = request.body.oldId || request.body.newId

    return connectMongoDB()
      .then((client) => {
        return ({ client, character, id })
      })
      .then(({ client, character, id }) => {
        if (id !== character.id) {
          // TODO: fix up matches
          throw Error(`Changing IDs is not implented`)
        }
        return ({ client, character, id })
      })
      .then(({ client, character, id }) => client.db()
        .collection('characters')
        .updateOne({ id: id }, { $set: character }, { upsert: true })
        .then(() => ({ client, character }))
      )
      .then(({ client, character }) => {
        client.close()
        response.status(200).send(`Character: ${character.name} (${character.id}) successfully saved`)
      })
      .catch((error) => response.status(400).send(error.toString()))
  }).catch((error) => response.status(400).send(error.toString()))
})

api.delete('/characters', (request, response) => {
  if (!request.headers.authorization) {
    response.status(403).send('Unauthorized')
  }

  admin.auth().verifyIdToken(request.headers.authorization).then(() => {
    return connectMongoDB()
      .then((client) => {
        let id = request.query.id
        let matchQuery = { 'players.characters': id }
        return ({ client, id, matchQuery })
      })
      .then(({ client, id, matchQuery }) => client.db()
        .collection('matches')
        .find(matchQuery)
        .toArray()
        .then((matches) => ({ client, id, matches }))
      )
      .then(({ client, id, matches }) => {
        if (matches.length === 0) {
          return client.db()
            .collection('characters')
            .deleteOne({ id: id })
            .then(() => ({ client, id }))
        } else {
          throw new Error(`Character: ${id} is used in ${matches.length} matches`)
        }
      })
      .then(({ client, id }) => {
        client.close()
        response.status(200).send(`Character: ${id} successfully deleted`)
      })
      .catch((error) => response.status(400).send(error.toString()))
  }).catch((error) => response.status(400).send(error.toString()))
})

api.get('/players', (request, response) => {
  return connectMongoDB()
    .then((client) => client.db()
      .collection('players')
      .find()
      .toArray()
      .then((players) => ({ client, players }))
    )
    .then(({ client, players }) => {
      client.close()
      return players
    })
    .then((players) => response.status(200).json(players))
    .catch((error) => response.status(400).send(error.toString()))
})

api.put('/players', (request, response) => {
  if (!request.headers.authorization) {
    response.status(403).send('Unauthorized')
  }

  admin.auth().verifyIdToken(request.headers.authorization).then(() => {
    return connectMongoDB()
      .then((client) => {
        let player = request.body
        if (!player.id || !player.name || !player.aliases || player.aliases.length < 1) {
          throw new Error('Incomplete player data')
        }

        if (player.aliases.length !== _.unique(player.aliases).length) {
          throw new Error('Duplicate aliases')
        }

        return ({ client, player })
      })
      .then(({ client, player }) => client.db()
        .collection('players')
        .updateOne(
          { _id: ObjectId(player.id) },
          { $set: { name: player.name, aliases: player.aliases } }
        )
        .then(() => ({ client, player }))
      )
      .then(({ client, player }) => {
        client.close()
        response.status(200).send(`${player.name} saved`)
      })
      .catch((error) => response.status(400).send(error.toString()))
  }).catch((error) => response.status(400).send(error.toString()))
})

api.delete('/players', (request, response) => {
  if (!request.headers.authorization) {
    response.status(403).send('Unauthorized')
  }

  admin.auth().verifyIdToken(request.headers.authorization).then(() => {
    return connectMongoDB()
      .then((client) => {
        let id = request.query.id
        let matchQuery = { 'players.id': id }
        return ({ client, id, matchQuery })
      })
      .then(({ client, id, matchQuery }) => client.db()
        .collection('matches')
        .find(matchQuery)
        .toArray()
        .then((matches) => ({ client, id, matches }))
      )
      .then(({ client, id, matches }) => {
        if (matches.length === 0) {
          return client.db()
            .collection('players')
            .deleteOne({ _id: ObjectId(id) })
            .then(() => ({ client, id }))
        } else {
          throw new Error(`Player: ${id} is used in ${matches.length} matches`)
        }
      })
      .then(({ client, id }) => {
        client.close()
        response.status(200).send(`Player: ${id} successfully deleted`)
      })
      .catch((error) => response.status(400).send(error.toString()))
  }).catch((error) => response.status(400).send(error.toString()))
})

api.post('/players/merge', (request, response) => {
  if (!request.headers.authorization) {
    response.status(403).send('Unauthorized')
  }

  admin.auth().verifyIdToken(request.headers.authorization).then(() => {
    return connectMongoDB()
      .then((client) => {
        let players = request.body
        if (players[0] === players[1]) { response.status(400).send('Players with the same id cannot be merged') }
        return ({ client, players })
      })
      .then(({ client, players }) => client.db()
        .collection('players')
        .find({ _id: {$in: [ObjectId(players[0]), ObjectId(players[1])]} })
        .toArray()
        .then((players) => ({ client, players }))
      )
      .then(({ client, players }) => client.db()
        .collection('matches')
        .updateMany({ 'players.id': players[1]._id.toString() },
          { $set: { 'players.$[player].id': players[0]._id.toString() } },
          { arrayFilters: [ { 'player.id': players[1]._id.toString() } ] })
        .then((results) => ({ client, players }))
      )
      .then(({ client, players }) => {
        let aliases = _.union(players[0].aliases, players[1].aliases)
        return ({ client, players, aliases })
      })
      .then(({ client, players, aliases }) => client.db()
        .collection('players')
        .updateOne(
          { _id: ObjectId(players[0]._id) },
          { $set: { aliases: aliases } }
        )
        .then(() => ({ client, players }))
      )
      .then(({ client, players }) => client.db()
        .collection('players')
        .deleteOne({ _id: ObjectId(players[1]._id) })
        .then(() => ({ client, players }))
      )
      .then(({ client, players }) => {
        client.close()
        response.status(200).send(`Players ${players[0].name} and ${players[1].name} were merged`)
      })
      .catch((error) => response.status(400).send(error.toString()))
  }).catch((error) => response.status(400).send(error.toString()))
})

api.get('/versions', (request, response) => {
  return connectMongoDB()
    .then((client) => client.db()
      .collection('versions')
      .find()
      .toArray()
      .then((versions) => ({ client, versions }))
    )
    .then(({ client, versions }) => {
      client.close()
      return versions
    })
    .then((versions) => response.status(200).json(versions))
    .catch((error) => response.status(400).send(error.toString()))
})

api.put('/versions', (request, response) => {
  if (!request.headers.authorization) {
    response.status(403).send('Unauthorized')
  }

  admin.auth().verifyIdToken(request.headers.authorization).then(() => {
    let version = request.body

    return connectMongoDB()
      .then((client) => {
        return ({ client, version })
      })
      .then(({ client, version }) => {
        if (!version.name) {
          throw new Error('Missing name')
        }
        if (version.name !== 'New Version') {
          // TODO: fix up matches
        }
        return ({ client, version })
      })
      .then(({ client, version }) => client.db()
        .collection('versions')
        .updateOne({ name: version.name }, { $set: { name: version.newName } }, { upsert: true })
        .then(() => ({ client, version }))
      )
      .then(({ client, version }) => {
        client.close()
        if (version.name === 'New Version') {
          response.status(200).send(`Version: ${version.newName} successfully saved`)
        } else {
          response.status(200).send(`Version: ${version.name} successfully renamed to ${version.newName}`)
        }
      })
      .catch((error) => response.status(400).send(error.toString()))
  }).catch((error) => response.status(400).send(error.toString()))
})

api.delete('/versions', (request, response) => {
  if (!request.headers.authorization) {
    response.status(403).send('Unauthorized')
  }

  admin.auth().verifyIdToken(request.headers.authorization).then(() => {
    return connectMongoDB()
      .then((client) => {
        let version = request.query.version
        let matchQuery = {
          version: version
        }
        return ({ client, version, matchQuery })
      })
      .then(({ client, version, matchQuery }) => client.db()
        .collection('matches')
        .find(matchQuery)
        .toArray()
        .then((matches) => ({ client, version, matches }))
      )
      .then(({ client, version, matches }) => {
        if (matches.length === 0) {
          return client.db()
            .collection('versions')
            .deleteOne({ name: version })
            .then(() => ({ client, version }))
        } else {
          throw new Error(`Version: ${version} is used in ${matches.length} matches`)
        }
      })
      .then(({ client, version }) => {
        client.close()
        response.status(200).send(`Version: ${version} successfully deleted`)
      })
      .catch((error) => response.status(400).send(error.toString()))
  }).catch((error) => response.status(400).send(error.toString()))
})

api.get('/channels', (request, response) => {
  return connectMongoDB()
    .then((client) => client.db()
      .collection('channels')
      .find()
      .toArray()
      .then((channels) => ({ client, channels }))
    )
    .then(({ client, channels }) => {
      client.close()
      return channels
    })
    .then((channels) => response.status(200).json(channels))
    .catch((error) => response.status(400).send(error.toString()))
})

api.get('/youtube-data', (request, response) => {
  if (!request.headers.authorization) {
    response.status(403).send('Unauthorized')
  }

  admin.auth().verifyIdToken(request.headers.authorization).then(() => {
    let url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${request.query.v}&key=${youtubeKey}`
    return axios.get(url)
      .then((youtube) => {
        if (youtube.data.items.length > 0) {
          response.status(200).json({
            id: request.query.v,
            title: youtube.data.items[0].snippet.title,
            date: youtube.data.items[0].snippet.publishedAt.split('T')[0],
            description: youtube.data.items[0].snippet.description,
            channel: {
              id: youtube.data.items[0].snippet.channelId,
              name: youtube.data.items[0].snippet.channelTitle
            }
          })
        } else {
          response.status(400).send('Invalid video')
        }
      })
      .catch((error) => response.status(400).send(error.toString()))
  }).catch((error) => response.status(400).send(error.toString()))
})

api.get('/users', (request, response) => {
  if (!request.headers.authorization) {
    response.status(403).send('Unauthorized')
  }

  admin.auth().verifyIdToken(request.headers.authorization).then(() => {
    return connectMongoDB()
      .then((client) => client.db()
        .collection('users')
        .find(request.query)
        .toArray()
        .then((users) => ({ client, users }))
      )
      .then(({ client, users }) => {
        client.close()
        return users
      })
      .then((users) => response.status(200).json(users))
      .catch((error) => response.status(400).send(error.toString()))
  }).catch((error) => response.status(400).send(error.toString()))
})

api.put('/users', (request, response) => {
  if (!request.headers.authorization) {
    response.status(403).send('Unauthorized')
  }

  admin.auth().verifyIdToken(request.headers.authorization).then(() => {
    let user = request.body

    return connectMongoDB()
      .then((client) => {
        return ({ client, user })
      })
      .then(({ client, user }) => client.db()
        .collection('users')
        .updateOne({ uid: user.uid }, { $set: { email: user.email } }, { upsert: true })
        .then(() => ({ client, user }))
      )
      .then(({ client, user }) => {
        client.close()
        response.status(200).send(`Version: ${user.email} successfully saved`)
      })
      .catch((error) => response.status(400).send(error.toString()))
  }).catch((error) => response.status(400).send(error.toString()))
})

exports.api = functions.https.onRequest(api)
