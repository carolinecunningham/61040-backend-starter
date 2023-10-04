import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";

export interface FilterDoc extends BaseDoc {
  filterName: string;
  filterLabel: ObjectId;
}

export default class FilteringConcept {
  public readonly filters = new DocCollection<FilterDoc>("filters");

  // return the objects that match the filter
  // referenced

  getItemsMatchingFilter(labelItems: ObjectId[], inputItems: ObjectId[]) {
    const out: ObjectId[] = [];

    inputItems.forEach(function (item) {
      if (labelItems.indexOf(item) !== -1) {
        out.push(item);
      }
    });
    return out;
  }
}
