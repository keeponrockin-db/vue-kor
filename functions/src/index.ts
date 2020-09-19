import * as functions from 'firebase-functions';
import { Request, Response } from 'express';
import { Keeponrockin } from './keeponrockin';
import { Character, Channel, Match, Player, Version, YoutubeData } from './models';

require('dotenv').config();

const mongoDbUri = String(process.env.MONGODB);
const youtubeKey = String(process.env.YOUTUBEKEY);

const express = require('express');
const cors = require('cors')({ origin: true });
const api = express();
api.use(cors);

const context = new Keeponrockin(mongoDbUri);

api.get('/channels', (request: Request, response: Response) => {
  context.GetChannels().then((channels: Channel[]) => {
    response.status(200).json(channels);
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.get('/characters', (request: Request, response: Response) => {
  context.GetCharacters().then((characters: Character[]) => {
    response.status(200).json(characters);
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.put('/characters', (request: Request, response: Response) => {
  context.SaveCharacter(request.body).then(() => {
    response.status(200).send(`Character: ${request.body.name} (${request.body.id}) successfully saved`)
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  })
});

api.delete('/characters', (request: Request, response: Response) => {
  context.DeleteCharacter(request.query).then(() => {
    response.status(200).send(`Character: ${request.body.id} successfully deleted`);
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  })
});

api.get('/matches', (request: Request, response: Response) => {
  context.GetMatches(request.query).then((matches: Match[]) => {
    response.status(200).json(matches);
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.put('/matches', (request: Request, response: Response) => {
  context.SaveMatches(request.body).then(() => {
    response.status(200).send(`Matches for video: ${request.body[0].video} successfully saved`);
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.delete('/matches', (request: Request, response: Response) => {
  context.DeleteMatches(request.query).then(() => {
    response.status(200).send(`Matches from video: ${request.query.videoId} successfully deleted`);
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.get('/players', (request: Request, response: Response) => {
  context.GetPlayers().then((players: Player[]) => {
    response.status(200).json(players);
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.put('/players', (request: Request, response: Response) => {
  context.SavePlayer(request.body).then(() => {
    response.status(200).json();
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.post('/players/merge', (request: Request, response: Response) => {
  context.MergePlayers(request.query).then(() => {
    response.status(200).json();
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  })
});

api.delete('/players', (request: Request, response: Response) => {
  context.DeletePlayer(request.query).then(() => {
    response.status(200).json();
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
})

api.get('/versions', (request: Request, response: Response) => {
  context.GetVersions().then((versions: Version[]) => {
    response.status(200).json(versions);
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.put('/versions', (request: Request, response: Response) => {
  context.SaveVersion(request.body).then(() => {
    response.status(200).send(`Version: ${request.body.newName} successfully saved`)
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.delete('/versions', (request: Request, response: Response) => {
  context.DeleteVersion(request.query).then(() => {
    response.status(200).send(`Version: ${request.query.version} successfully deleted`)
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
})

api.get('/youtube-data', (request: Request, response: Response) => {
  context.GetYoutubeData(request.query, youtubeKey).then((youtubeData: YoutubeData) => {
    response.status(200).json(youtubeData);
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  })
});

exports.api = functions.https.onRequest(api);