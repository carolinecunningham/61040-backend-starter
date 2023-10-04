import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Filtering, Friend, Label, Post, User, WebSession } from "./app";
import { PostDoc, PostOptions } from "./concepts/post";
import { UserDoc } from "./concepts/user";
import { WebSessionDoc } from "./concepts/websession";
import Responses from "./responses";

class Routes {
  @Router.get("/session")
  async getSessionUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await User.getUsers();
  }

  @Router.get("/users/:username")
  async getUser(username: string) {
    return await User.getUserByUsername(username);
  }

  @Router.post("/users")
  async createUser(session: WebSessionDoc, username: string, password: string) {
    WebSession.isLoggedOut(session);
    return await User.create(username, password);
  }

  @Router.patch("/users")
  async updateUser(session: WebSessionDoc, update: Partial<UserDoc>) {
    const user = WebSession.getUser(session);
    return await User.update(user, update);
  }

  @Router.delete("/users")
  async deleteUser(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    WebSession.end(session);
    return await User.delete(user);
  }

  @Router.post("/login")
  async logIn(session: WebSessionDoc, username: string, password: string) {
    const u = await User.authenticate(username, password);
    WebSession.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: WebSessionDoc) {
    WebSession.end(session);
    return { msg: "Logged out!" };
  }

  @Router.get("/posts")
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await User.getUserByUsername(author))._id;
      posts = await Post.getByAuthor(id);
    } else {
      posts = await Post.getPosts({});
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: WebSessionDoc, content: string, options?: PostOptions) {
    const user = WebSession.getUser(session);
    const created = await Post.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:_id")
  async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return await Post.update(_id, update);
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return Post.delete(_id);
  }

  @Router.get("/friends")
  async getFriends(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await User.idsToUsernames(await Friend.getFriends(user));
  }

  @Router.delete("/friends/:friend")
  async removeFriend(session: WebSessionDoc, friend: string) {
    const user = WebSession.getUser(session);
    const friendId = (await User.getUserByUsername(friend))._id;
    return await Friend.removeFriend(user, friendId);
  }

  @Router.get("/friend/requests")
  async getRequests(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Responses.friendRequests(await Friend.getRequests(user));
  }

  @Router.post("/friend/requests/:to")
  async sendFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.sendRequest(user, toId);
  }

  @Router.delete("/friend/requests/:to")
  async removeFriendRequest(session: WebSessionDoc, to: string) {
    const user = WebSession.getUser(session);
    const toId = (await User.getUserByUsername(to))._id;
    return await Friend.removeRequest(user, toId);
  }

  @Router.put("/friend/accept/:from")
  async acceptFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.acceptRequest(fromId, user);
  }

  @Router.put("/friend/reject/:from")
  async rejectFriendRequest(session: WebSessionDoc, from: string) {
    const user = WebSession.getUser(session);
    const fromId = (await User.getUserByUsername(from))._id;
    return await Friend.rejectRequest(fromId, user);
  }

  // ACTIONS

  // @Router.put("users/hometown")
  // async add_hometown(session: WebSessionDoc, hometown: string) {}

  // @Router.put("users/school")
  // async add_school(session: WebSessionDoc, school: school) {}

  // @Router.get("/posts/prompt")
  // async getPostPrompt(session: WebSessionDoc, _id: ObjectIds) {}

  @Router.post("/lists")
  async createUserLabel(session: WebSessionDoc, name: string) {
    const user = WebSession.getUser(session);
    return await Label.createUserLabel(user, name);
  }

  @Router.put("/lists/assign/:_id")
  async assignToLabel(session: WebSessionDoc, _id: ObjectId, item: ObjectId) {
    const user = WebSession.getUser(session);
    await Label.isAuthor(_id, user);
    await Label.assignToLabel(_id, item);
  }

  @Router.put("/lists/remove/:_id")
  async removeFromLabel(session: WebSessionDoc, _id: ObjectId, item: ObjectId) {
    const user = WebSession.getUser(session);
    await Label.isAuthor(_id, user);
    await Label.removeFromLabel(_id, item);
  }

  @Router.delete("/lists/:_id")
  async deleteUserLabel(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Label.isAuthor(_id, user);
    await Label.deleteUserLabel(_id);
  }

  @Router.get("/lists/:_id")
  async getUserLabelItems(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Label.isAuthor(_id, user);
    await Label.getUserLabelItems(_id);
  }

  // @Router.put("/feed/add")
  // async addToFeed(Session: WebSessionDoc, item: string) {}

  // @Router.put("/feed/remove")
  // async removeFromFeed(Session: WebSessionDoc, item: string) {}

  // @Router.put("/feed/add/many")
  // async bulkAdd(Session: WebSessionDoc, itemList: [string]) {}

  // @Router.put("/feed/add/remove")
  // async bulkRemove(Session: WebSessionDoc, itemList: [string]) {}

  // @Router.delete("/feed/clear")
  // async clearFeed(Session: WebSessionDoc) {}

  // @Router.put("/feed/suggestions")
  // async seeNewSuggestions(Session: WebSessionDoc, newClicked: boolean) {}

  @Router.get("/filer/items")
  async getItemsMatchingFilter(session: WebSessionDoc, labelItems: ObjectId[], outputItems: ObjectId[]) {
    return Filtering.getItemsMatchingFilter(labelItems, outputItems);
  }

  // // SYNCHRONIZATIONS

  // @Router.get("/get/posts/label")
  // async getPostsFromLabel(Session: WebSessionDoc, label: ObjectID) {}

  // @Router.get("/get/users/recommended")
  // async getRecommendedUsers(Session: WebSessionDoc, user: ObjectID) {}

  // @Router.post("/add/users/recommended")
  // async addRecommendedUsers(Session: WebSessionDoc) {}

  // @Router.put("/update/users/recommended")
  // async updateRecommendedUsers(Session: WebSessionDoc) {}
}

export default getExpressRouter(new Routes());
