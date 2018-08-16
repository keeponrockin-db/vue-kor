require('dotenv').config()

const functions = require('firebase-functions')

const express = require('express')
const cors = require('cors')({ origin: true })
const api = express()
api.use(cors)

const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectId
const connectMongoDB = () => MongoClient.connect(process.env.MONGODB)

const youtubeKey = process.env.YOUTUBEKEY
const axios = require('axios')

const itemsPerPage = 15
const defaultSort = {
  date: -1,
  title: 1,
  timestamp: 1
}

api.get('/matches', (request, response) => {
  return connectMongoDB()
    .then(client => {
      if (request.query.p1 || request.query.p2) {
        // Get player ids from aliases for querying
        let query = formPlayerQuery(request.query)
        return client.db()
          .collection('players')
          .find(query)
          .toArray()
          .then(players => ({client, players}))
      } else {
        let players = []
        return ({client, players})
      }
    })
    .then(({client, players}) => {
      let query = formMatchQuery(request.query, players)
      let sort = defaultSort
      let skip = request.query.page > 0 ? (request.query.page - 1) * itemsPerPage : 0
      let limit = itemsPerPage

      return ({client, query, sort, skip, limit})
    })
    .then(({client, query, sort, skip, limit}) => client.db()
      .collection('matches')
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray()
      .then(matches => ({client, matches}))
    )
    .then(({client, matches}) => deserializeMatches(client, matches)
      .then((matches) => {
        return ({client, matches})
      })
    )
    .then(({client, matches}) => {
      client.close()
      response.status(200).json(matches)
    })
    .catch(error => response.status(400).send(error.toString()))
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

  if (query.version) { matchQuery.version = query.version.toUpperCase() }
  if (query.channel) { matchQuery.channel = query.channel }

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
    .then(characters => {
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
      return ({matches})
    })
    .then(({matches}) => client.db()
      .collection('players')
      .find({_id: {$in: playerIds}})
      .toArray()
      .then(players => {
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
  return connectMongoDB()
    .then(client => {
      let matches = request.body
      return ({client, matches})
    })
    .then(({client, matches}) => addMirrorFields(client, matches))
    .then(({client, matches}) => {
      let version = matches[0].version
      return client.db()
        .collection('versions')
        .updateOne({name: version}, {$set: {name: version}}, {upsert: true})
        .then(() => ({client, matches}))
    })
    .then(({client, matches}) => {
      let channel = matches[0].channel
      return client.db()
        .collection('channel')
        .updateOne({id: channel.id}, {$set: channel}, {upsert: true})
        .then(() => ({client, matches}))
    })
    .then(({client, matches}) => fillPlayerIds(client, matches))
    .then(({client, matches}) => {
      return client.db()
        .collection('matches')
        .deleteMany({ video: matches[0].video })
        .then(() => ({client, matches}))
    })
    .then(({client, matches}) => {
      return client.db()
        .collection('matches')
        .insert(matches)
        .then((results) => ({client, results}))
    })
    .then(({client, results}) => {
      client.close()
      response.status(200).json(results)
    })
    .catch(error => response.status(400).send(error.toString()))
})

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
  return ({client, matches})
}

function fillPlayerIds (client, matches) {
  let foundPlayers = []
  matches.forEach(match => {
    match.players.forEach((player) => {
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
    .then(players => {
      let playerIds = {}
      let newPlayers = foundPlayers
      for (let i = newPlayers.length - 1; i >= 0; i--) {
        for (let j = 0; j < players.length; j++) {
          if (players[j].aliases.includes(newPlayers[i])) {
            playerIds[newPlayers.pop()] = players[j]._id.toString()
            break
          }
        }
      }
      return ({newPlayers, playerIds})
    })
    .then(({newPlayers, playerIds}) => {
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
              .then(players => {
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
    .then(playerIds => {
      matches.forEach(match => {
        match.players.forEach((player) => {
          player.id = playerIds[player.name]
          delete player.name
        })
      })

      return ({client, matches})
    })
}

api.get('/versions', (request, response) => {
  return connectMongoDB()
    .then(client => client.db()
      .collection('versions')
      .find()
      .toArray()
      .then(versions => ({client, versions: versions.map((version) => { return version.name })}))
    )
    .then(({client, versions}) => {
      client.close()
      return versions
    })
    .then(versions => response.json(versions))
    .catch(error => response.status(400).send(error.toString()))
})

api.put('/version', (request, response) => {
  return connectMongoDB()
    .then(client => {
      let version = {
        name: request.body.name
      }
      let id = request.body.id
      return ({client, version, id})
    })
    .then(({client, version, id}) => {
      if (id) {
        // fix up matches
      }
      return ({client, version, id})
    })
    .then(({client, version, id}) => client.db()
      .collection('versions')
      .updateOne({id: id}, {$set: version}, {upsert: true})
      .then((results) => ({client, results}))
    )
    .then(({client, results}) => {
      client.close()
      response.status(200).json(results)
    })
    .catch(error => response.status(400).send(error.toString()))
})

api.get('/characters', (request, response) => {
  return connectMongoDB()
    .then(client => client.db()
      .collection('characters')
      .find()
      .toArray()
      .then(characters => ({client, characters}))
    )
    .then(({client, characters}) => {
      client.close()
      return characters
    })
    .then(characters => response.json(characters))
    .catch(error => response.status(400).send(error.toString()))
})

api.put('/character', (request, response) => {
  return connectMongoDB()
    .then(client => {
      let character = {
        name: request.body.name,
        id: request.body.newId,
        iconUrl: request.body.iconUrl
      }
      let id = request.body.oldId || request.body.newId
      return ({client, character, id})
    })
    .then(({client, character, id}) => {
      if (id !== character.id) {
        // fix up matches
      }
      return ({client, character, id})
    })
    .then(({client, character, id}) => client.db()
      .collection('characters')
      .updateOne({id: id}, {$set: character}, {upsert: true})
      .then((results) => ({client, results}))
    )
    .then(({client, results}) => {
      client.close()
      response.status(200).json(results)
    })
    .catch(error => response.status(400).send(error.toString()))
})

api.get('/players', (request, response) => {
  return connectMongoDB()
    .then(client => client.db()
      .collection('players')
      .find()
      .toArray()
      .then(players => ({client, players}))
    )
    .then(({client, players}) => {
      client.close()
      return players
    })
    .then(players => response.json(players))
    .catch(error => response.status(400).send(error.toString()))
})

api.get('/youtubeData', (request, response) => {
  let url = 'https://www.googleapis.com/youtube/v3/videos?part=snippet&id=' +
    request.query.v + '&key=' + youtubeKey
  return axios.get(url)
    .then((youtube) => {
      if (youtube.data.items.length > 0) {
        response.json({
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
    .catch(error => response.status(400).send(error.toString()))
})

exports.api = functions.https.onRequest(api)
