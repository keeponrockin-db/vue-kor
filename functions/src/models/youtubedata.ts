import { Channel } from "./channel";

export class YoutubeData {
  public id: string;
  public title: string;
  public date: string;
  public description: string;
  public channel: Channel;

  public constructor(id: string, response: { data: { items: { snippet: { title: string, publishedAt: string, description: string, channelId: string, channelTitle: string; }; }[]; }; }) {
    this.id = id;
    this.title = response.data.items[0].snippet.title;
    this.date = response.data.items[0].snippet.publishedAt.split('T')[0];
    this.description = response.data.items[0].snippet.description;
    this.channel = new Channel({
      id: response.data.items[0].snippet.channelId,
      name: response.data.items[0].snippet.channelTitle
    });
  }
}