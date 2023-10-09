import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface UserLabelDoc extends BaseDoc {
  name: String;
  author: ObjectId;
  items?: ObjectId[];
}

export interface AppLabelDoc extends BaseDoc {
  identifier: String;
  items?: ObjectId[];
}

export default class LabelConcept {
  public readonly app_labels = new DocCollection<AppLabelDoc>("app_labels");
  public readonly user_labels = new DocCollection<UserLabelDoc>("user_labels");

  async createUserLabel(author: ObjectId, name: string) {
    const _id = await this.user_labels.createOne({ name, author });
    return { msg: "MyLifeList successfully created!", label: await this.user_labels.readOne({ _id }) };
  }

  async createAppLabel(name: string) {
    const _id = await this.user_labels.createOne({ name });
    return { msg: "New MyLifeList for application", label: await this.app_labels.readOne({ _id }) };
  }

  async assignToLabel(_id: ObjectId, item: ObjectId) {
    // referenced https://www.typescriptlang.org/docs/handbook/utility-types.html
    const label = await this.user_labels.readOne({ _id });
    await this.itemisNotInLabel(_id, item, label);
    if (label !== null) {
      let label_items = label.items;
      if (label_items !== undefined) {
        label_items.concat([item]);
      } else {
        label_items = [item];
      }
      await this.user_labels.updateOne({ _id }, { items: label_items });
      return { msg: "Assigned item to list" };
    }
  }

  async removeFromLabel(_id: ObjectId, item: ObjectId) {
    // referenced https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
    const label = await this.user_labels.readOne({ _id });
    await this.itemIsInLabel(_id, item, label);
    if (label !== null) {
      const label_items = label.items;
      if (label_items !== undefined) {
        const idx = label_items.indexOf(item);
        label_items.splice(idx);
        await this.user_labels.updateOne({ _id }, { items: label_items });
        return { msg: "Deleted item from list" };
      }
    }
  }

  async deleteUserLabel(_id: ObjectId) {
    await this.user_labels.deleteOne({ _id });
    return { msg: "Label deleted successfully!" };
  }

  async deleteAppLabel(_id: ObjectId) {
    await this.app_labels.deleteOne({ _id });
    return { msg: "Label deleted successfully!" };
  }

  async getLabelItems(_id: ObjectId) {
    const label = await this.user_labels.readOne({ _id });
    if (label !== null) {
      if (label.items !== undefined) {
        return label?.items;
      }
      return { msg: "Label is empty" };
    }
  }

  async getUserLabels(query: Filter<UserLabelDoc>) {
    const posts = await this.user_labels.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    return posts;
  }

  async getLabelsByAuthor(author: ObjectId) {
    return await this.getUserLabels({ author });
  }

  // async getAppLabelItems(_id: ObjectId) {
  //   const label = await this.app_labels.readOne({ _id });
  //   if (label !== null) {
  //     const label_items = label.items;
  //     if (label_items !== undefined) {
  //       return label_items.map((label_item) => label_item.toString());
  //     }
  //   }
  // }

  private async itemIsInLabel(_id: ObjectId, item: ObjectId, label: UserLabelDoc | null) {
    if (!label) {
      throw new LabelNotFound(_id);
    }
    if (label.items === undefined) {
      throw new NotAllowedError("Cannot delete from empty label");
    } else if (label.items.indexOf(item) === -1) {
      throw new NotAllowedError(`Cannot delete item that's not in label!`);
    }
  }

  async isAuthor(_id: ObjectId, user: ObjectId) {
    const label = await this.user_labels.readOne({ _id });
    if (!label) {
      throw new LabelNotFound(_id);
    }
    if (label.author.toString() !== user.toString()) {
      throw new LabelAuthorNotMatchError(_id, user);
    }
  }

  private async itemisNotInLabel(_id: ObjectId, item: ObjectId, label: UserLabelDoc | null) {
    if (!label) {
      throw new LabelNotFound(_id);
    }
    if (label.items !== undefined && label.items.indexOf(item) !== -1) {
      throw new NotAllowedError(`Item has been already added to label!`);
    }
  }
}

export class LabelAuthorNotMatchError extends NotAllowedError {
  constructor(
    public readonly _id: ObjectId,
    public readonly author: ObjectId,
  ) {
    super("{0} is not the author of post {1}!", author, _id);
  }
}

export class LabelNotFound extends NotFoundError {
  constructor(public readonly _id: ObjectId) {
    super("Post ${_id} does not exist!", _id);
  }
}
