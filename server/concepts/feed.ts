import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

export interface Feed extends BaseDoc {
  owner: ObjectId;
  items: ObjectId[];
}

export default class FeedConcept {
  public readonly feed = new DocCollection<Feed>("feed");

  async createFeed(owner: ObjectId) {
    const feed = await this.feed.createOne({ owner, items: [] });
    return { msg: "Feed successfully created!", feed: feed };
  }

  async addToFeed(owner: ObjectId, item: ObjectId) {
    const feed = await this.feed.readOne({ owner });
    if (!feed) {
      throw new NotFoundError("User does not have a feed.");
    } else {
      const feed_items = feed.items.concat([item]);
      await this.feed.updateOne({ owner }, { items: feed_items });
    }
  }

  async bulkAddToFeed(owner: ObjectId, newItems: ObjectId[]) {
    const feed = await this.feed.readOne({ owner });
    if (!feed) {
      throw new NotFoundError("User does not have a feed.");
    } else {
      const feed_items = feed.items.concat(newItems);
      await this.feed.updateOne({ owner }, { items: feed_items });
    }
  }

  async clearFeed(owner: ObjectId) {
    const feed = await this.feed.readOne({ owner });
    if (!feed) {
      throw new NotFoundError("User does not have a feed.");
    } else {
      await this.feed.updateOne({ owner }, { items: [] });
    }
  }

  async getFeedItems(owner: ObjectId) {
    const feed = await this.feed.readOne({ owner });
    if (!feed) {
      throw new NotFoundError("User does not have a feed.");
    } else {
      return feed.items;
    }
  }
}
