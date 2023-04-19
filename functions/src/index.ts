import * as functions from "firebase-functions";
import * as express from "express";
import { Request, Response } from "express";
import * as dotenv from "dotenv";
import { initializeApp } from "firebase-admin/app";
import * as cors from "cors";
import { Keeponrockin } from "./keeponrockin";
import {
  Channel,
  Character,
  Player,
  Version,
  YoutubeData,
  Match,
} from "./models";

dotenv.config();

initializeApp();

const mongoDbUri = String(process.env.MONGODB);
const youtubeKey = String(process.env.YOUTUBEKEY);
const databaseName = String(process.env.DATABASENAME);
const api = express();
api.use(cors({ origin: true }));

const context = new Keeponrockin(mongoDbUri, databaseName);

api.get("/channels", (request: Request, response: Response) => {
  context.getChannels().then((channels: Channel[]) => {
    response.status(200).json(channels);
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.get("/characters", (request: Request, response: Response) => {
  context.getCharacters().then((characters: Character[]) => {
    response.status(200).json(characters);
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.get("/players", (request: Request, response: Response) => {
  context.getPlayers().then((players: Player[]) => {
    response.status(200).json(players);
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.put("/players", (request: Request, response: Response) => {
  context.savePlayer(request.body).then(() => {
    response.status(200).json();
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.post("/players/merge", (request: Request, response: Response) => {
  context.mergePlayers(request.query).then(() => {
    response.status(200).json();
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.delete("/players", (request: Request, response: Response) => {
  context.deletePlayer(request.query).then(() => {
    response.status(200).json();
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.put("/characters", (request: Request, response: Response) => {
  context.saveCharacter(request.body).then(() => {
    response.status(200).send(
      `Character: ${request.body.name} (${request.body.id}) successfully saved`
    );
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.delete("/characters", (request: Request, response: Response) => {
  context.deleteCharacter(request.query).then(() => {
    response.status(200).send(
      `Character: ${request.body.id} successfully deleted`
    );
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.get("/versions", (request: Request, response: Response) => {
  context.getVersions().then((versions: Version[]) => {
    response.status(200).json(versions);
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.put("/versions", (request: Request, response: Response) => {
  context.saveVersion(request.body).then(() => {
    response.status(200).send(
      `Version: ${request.body.newName} successfully saved`
    );
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.delete("/versions", (request: Request, response: Response) => {
  context.deleteVersion(request.query).then(() => {
    response.status(200).send(
      `Version: ${request.query.version} successfully deleted`
    );
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.get("/youtube-data", (request: Request, response: Response) => {
  context.getYoutubeData(request.query, youtubeKey)
    .then((youtubeData: YoutubeData) => {
      response.status(200).json(youtubeData);
    }).catch((error: Error) => {
      response.status(400).send(error.message);
    });
});

api.get("/matches", (request: Request, response: Response) => {
  Promise.all([
    context.getMatches(request.query),
    context.getMatchCount(request.query),
  ]).then((results: [Match[], number]) => {
    response.status(200).json({ matches: results[0], count: results[1] });
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.put("/matches", (request: Request, response: Response) => {
  throw new Error("Not yet implemented");
  context.saveMatches(request.body).then(() => {
    response.status(200).send(
      `Matches for video: ${request.body[0].video} successfully saved`
    );
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

api.delete("/matches", (request: Request, response: Response) => {
  context.deleteMatches(request.query).then(() => {
    response.status(200).send(
      `Matches from video: ${request.query.videoId} successfully deleted`
    );
  }).catch((error: Error) => {
    response.status(400).send(error.message);
  });
});

exports.api = functions.https.onRequest(api);
