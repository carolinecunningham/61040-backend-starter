import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface FilterDoc extends BaseDoc {
  filterName: string;
  filterItems: ObjectId[];
}

export interface RecItemsDoc extends BaseDoc {
  owner: ObjectId;
  recommendedItems: ObjectId[];
  startingIndex: number;
}

// referenced https://howtodoinjava.com/typescript/sets/

export default class FilteringConcept {
  public readonly filters = new DocCollection<FilterDoc>("filters");
  public readonly recommended_items = new DocCollection<RecItemsDoc>("recommended_items");

  private async createFilter(filterName: string, firstItem: ObjectId) {
    // private: filters are only created by the app to enable passive filtering
    const filterItems = [firstItem];
    const _id = await this.filters.createOne({ filterName, filterItems });
    return { msg: "Filter successfully created!", filter: await this.filters.readOne({ _id }) };
  }

  async assignToFilter(filterName: string, item: ObjectId) {
    // we have assignToFilter 1) check if filter already exists and 2) if not create it
    // this simplifies logic of having to check if filter already exists
    const filter = await this.filters.readOne({ filterName });

    if (!filter) {
      // need to create a new filter
      return await this.createFilter(filterName, item);
    } else {
      // assign to existing filter
      const filter_items = filter.filterItems.concat(item);
      await this.filters.updateOne({ filterName }, { filterItems: filter_items });
    }
  }

  async getFilterItems(filterName: string) {
    const filter = await this.filters.readOne({ filterName });

    if (!filter) {
      // filter does not exist
      throw new FilterNotFoundError(filterName);
    }
    return filter.filterItems;
  }

  removeItemsFromFilter(filterI: ObjectId[], itemsToDelete: ObjectId[]) {
    // do NOT modify filter, as we need to track all items later on
    const itemsToDeleteStr = itemsToDelete.map((i) => i.toString());
    let filterINewItems: ObjectId[] = [];
    for (const f of filterI) {
      const f_str = f.toString();
      const indexOfItem = itemsToDeleteStr.indexOf(f_str);
      if (indexOfItem === -1) {
        filterINewItems = filterINewItems.concat([f]);
      }
    }
    return filterINewItems;
  }

  getFiltersIntersection(filter1: ObjectId[], filter2: ObjectId[]) {
    let mutualItems: ObjectId[] = [];
    const filter2Str = filter2.map((i) => i.toString());

    for (const item of filter1) {
      if (filter2Str.indexOf(item.toString()) !== -1) {
        mutualItems = mutualItems.concat([item]);
      }
    }
    return mutualItems;
  }

  async getRecommendedItems(owner: ObjectId, filter1: ObjectId[], filter2: ObjectId[], maxQuantity: number) {
    const inBothFilters = this.getFiltersIntersection(filter1, filter2);
    const onlyInFilter1 = this.removeItemsFromFilter(filter1, inBothFilters);
    const onlyInFilter2 = this.removeItemsFromFilter(filter2, inBothFilters);

    let recommendedItems: ObjectId[] = [];
    recommendedItems = recommendedItems.concat(inBothFilters);
    recommendedItems = recommendedItems.concat(onlyInFilter1);
    recommendedItems = recommendedItems.concat(onlyInFilter2);
    // console.log(inBothFilters);
    // console.log(onlyInFilter1);
    // console.log(onlyInFilter2);
    // referenced https://stackoverflow.com/questions/60041413/typescript-number-addition-0-1-returns-01
    const nextIdx = (maxQuantity + 1) / 1;

    await this.recommended_items.createOne({ owner, recommendedItems, startingIndex: nextIdx });
    return recommendedItems.slice(0, maxQuantity);
  }

  async getMoreRecommendations(owner: ObjectId, maxQuantity: number) {
    const recItemsFilter = await this.recommended_items.readOne({ owner });
    if (!recItemsFilter) {
      throw new RecommendationsNotFoundError(owner);
    } else {
      const recommended_items = recItemsFilter.recommendedItems;
      if (recItemsFilter.startingIndex > recommended_items.length) {
        throw new NoMoreSuggestionsError(owner);
      } else {
        const maxQuant = maxQuantity / 1;
        const end_idx = (recItemsFilter.startingIndex + maxQuant) / 1;
        const rec_items = recommended_items.slice(recItemsFilter.startingIndex, end_idx);
        const startingIndex = (recItemsFilter.startingIndex += maxQuant);
        await this.recommended_items.updateOne({ owner }, { startingIndex });
        return rec_items;
      }
    }
  }
}

export class FilterNotFoundError extends NotFoundError {
  constructor(public readonly filterName: string) {
    super("Filter for {0} does not exist!", filterName);
  }
}

export class RecommendationsNotFoundError extends NotFoundError {
  constructor(public readonly _id: ObjectId) {
    super("Recommended items for {0} does not exist!", _id);
  }
}

export class NoMoreSuggestionsError extends NotAllowedError {
  constructor(public readonly _id: ObjectId) {
    super("Cannot get any more recommended items for {0}!", _id);
  }
}
