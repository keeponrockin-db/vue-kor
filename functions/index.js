require('dotenv').config()

const functions = require('firebase-functions')

const express = require('express')
const cors = require('cors')({ origin: true })
const api = express()
api.use(cors)

const MongoClient = require('mongodb').MongoClient
const ObjectId = require('mongodb').ObjectId
const connectMongoDB = () => MongoClient.connect(process.env.MONGODB)

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
    .then(({client, matches}) => {
      matches = deserializeMatches(client, matches)
      client.close()
      return matches
    })
    .then(matches => response.json(matches))
    .catch(error => response.status(400).send(error.toString()))
})

function formPlayerQuery (query) {
  let players = []
  if (query.p1) { players.push(query.p1) }
  if (query.p2) { players.push(query.p2) }
  return { aliases: { $in: players } }
}

function formMatchQuery (query, players) {
  if (query.video) { return { video: query.video } }

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
    match.players.forEach((player) => {
      playerIds.push(ObjectId(player.id))
    })
  })

  return client.db()
    .collection('players')
    .find({_id: {$in: playerIds}})
    .toArray()
    .then(players => {
      return matches.map(match => {
        let deserializedMatch = {
          video: match.video,
          title: match.title,
          channel: match.channel,
          date: match.date,
          version: match.version,
          timestamp: match.timestamp,
          players: [{aliases: [], characters: []}, {aliases: [], characters: []}]
        }
        for (let i = 0; i < 2; i++) {
          let player = players.find(player => player._id.equals(ObjectId(match.players[i].id)))
          deserializedMatch.players[i].name = player.name
          deserializedMatch.players[i].aliases = player.aliases

          match.players[i].characters.forEach(character => {
            deserializedMatch.players[i].characters.push({id: character})
          })
        }

        return deserializedMatch
      })
    })
}

api.put('/matches', (request, response) => {
  return connectMongoDB()
    .then(client => {
      let matches = request.body
      return ({client, matches})
    })
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
        .insert(matches)
    })
    .then((results) => {
      response.status(200).json(results)
    })
    .catch(error => response.status(400).send(error.toString()))
})

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

exports.api = functions.https.onRequest(api)
