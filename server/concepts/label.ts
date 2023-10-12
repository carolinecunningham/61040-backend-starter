import { Filter, ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface LabelDoc extends BaseDoc {
  name: String;
  author: ObjectId;
  items?: ObjectId[];
}

export default class LabelConcept {
  // public readonly app_labels = new DocCollection<AppLabelDoc>("app_labels");
  public readonly labels = new DocCollection<LabelDoc>("labels");

  async createLabel(author: ObjectId, name: string) {
    const _id = await this.labels.createOne({ name, author });
    return { msg: "MyLifeList successfully created!", label: await this.labels.readOne({ _id }) };
  }

  async assignToLabel(_id: ObjectId, item: ObjectId) {
    // referenced https://www.typescriptlang.org/docs/handbook/utility-types.html
    const label = await this.labels.readOne({ _id });
    await this.itemisNotInLabel(_id, item, label);
    if (label !== null) {
      let label_items = label.items;
      if (label_items !== undefined) {
        // CASE A: label has items already
        label_items = label_items.concat([item]);
      } else {
        // CASE B: label is empty
        label_items = [item];
      }
      await this.labels.updateOne({ _id }, { items: label_items });
      return { msg: "Assigned item to list" };
    }
  }

  async removeFromLabel(_id: ObjectId, item: ObjectId) {
    // referenced https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/splice
    const label = await this.labels.readOne({ _id });
    await this.itemIsInLabel(_id, item, label);
    if (label !== null) {
      const label_items = label.items;
      if (label_items !== undefined) {
        const idx = label_items.indexOf(item);
        label_items.splice(idx);
        await this.labels.updateOne({ _id }, { items: label_items });
        return { msg: "Deleted item from list" };
      }
    }
  }

  async deleteLabel(_id: ObjectId) {
    await this.labels.deleteOne({ _id });
    return { msg: "Label deleted successfully!" };
  }

  async getLabelItems(_id: ObjectId) {
    const label = await this.labels.readOne({ _id });
    if (label !== null) {
      if (label.items !== undefined) {
        return label?.items;
      }
      return [];
    }
    throw new LabelNotFound(_id);
  }

  async getLabels(query: Filter<LabelDoc>) {
    const posts = await this.labels.readMany(query, {
      sort: { dateUpdated: -1 },
    });
    return posts;
  }

  async getLabelsByAuthor(author: ObjectId) {
    return await this.getLabels({ author });
  }

  private async itemIsInLabel(_id: ObjectId, item: ObjectId, label: LabelDoc | null) {
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
    const label = await this.labels.readOne({ _id });
    if (!label) {
      throw new LabelNotFound(_id);
    }
    if (label.author.toString() !== user.toString()) {
      throw new LabelAuthorNotMatchError(_id, user);
    }
  }

  private async itemisNotInLabel(_id: ObjectId, item: ObjectId, label: LabelDoc | null) {
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
    super("Label {0} does not exist!", _id);
  }
}
