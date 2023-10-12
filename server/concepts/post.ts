import { Filter, ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface PostOptions {
  backgroundColor?: string;
}

export interface PostDoc extends BaseDoc {
  author: ObjectId;
  content: string;
  prompt: PostPrompts;
  audience?: ObjectId;
  options?: PostOptions;
}

enum PostPrompts {
  "Celebration" = 0,
  "Life Update" = 1,
  "Other" = 2,
}

export default class PostConcept {
  public readonly posts = new DocCollection<PostDoc>("posts");

  async create(author: ObjectId, content: string, prompt: number, audience?: ObjectId, options?: PostOptions) {
    const _id = await this.posts.createOne({ author, content, prompt, audience, options });
    await this.isPromptSuppported(prompt);
    return { msg: "Post successfully created!", post: await this.posts.readOne({ _id }) };
  }

  async getPosts(query: Filter<PostDoc>) {
    const posts = await this.posts.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    return posts;
  }

  async getPostById(_id: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (post === null) {
      throw new PostNotFoundError(_id);
    }
    return post;
  }

  async getByAuthor(author: ObjectId) {
    return await this.getPosts({ author });
  }

  async update(_id: ObjectId, update: Partial<PostDoc>) {
    this.sanitizeUpdate(update);
    if (update.prompt !== undefined) {
      await this.isPromptSuppported(update.prompt);
    }
    await this.posts.updateOne({ _id }, update);
    return { msg: "Post successfully updated!" };
  }

  async delete(_id: ObjectId) {
    await this.posts.deleteOne({ _id });
    return { msg: "Post deleted successfully!" };
  }

  async isAuthor(user: ObjectId, _id: ObjectId) {
    const post = await this.posts.readOne({ _id });
    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    if (post.author.toString() !== user.toString()) {
      throw new PostAuthorNotMatchError(user, _id);
    }
  }

  async isPromptSuppported(prompt: number) {
    if (!(prompt in PostPrompts)) {
      throw new PromptNotAllowedError(prompt);
    }
  }

  async getPostPrompt(username: string, _id: ObjectId) {
    const post = await this.posts.readOne({ _id });

    if (!post) {
      throw new NotFoundError(`Post ${_id} does not exist!`);
    }
    await this.isPromptSuppported(post.prompt);

    if (post.prompt == 0) {
      return "Congratulate " + username + "!";
    } else if (post.prompt == 1) {
      return "Check out what " + username + " is doing!";
    } else {
      return "Say something nice to " + username + "!";
    }
  }

  private sanitizeUpdate(update: Partial<PostDoc>) {
    // Make sure the update cannot change the author.
    const allowedUpdates = ["content", "options", "prompt", "audience"];
    for (const key in update) {
      if (!allowedUpdates.includes(key)) {
        throw new NotAllowedError(`Cannot update '${key}' field!`);
      }
    }
  }
}

export class PostAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly author: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of post {1}!", author, _id);
  }
}

export class PromptNotAllowedError extends NotAllowedError {
  constructor(public readonly prompt: number) {
    super("Prompt {0} is not supported. Please choose options {1}, {2}, {3}!", prompt, PostPrompts["Celebration"], PostPrompts["Life Update"], PostPrompts["Other"]);
  }
}

export class PostNotFoundError extends NotFoundError {
  constructor(public readonly _id: ObjectId) {
    super("Post {0} does not exist!", _id);
  }
}
