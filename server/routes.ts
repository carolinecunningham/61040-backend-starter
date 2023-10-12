import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Feed, Filtering, Friend, Label, Post, User, WebSession } from "./app";
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
  async createUser(session: WebSessionDoc, username: string, password: string, school: string, hometown: string) {
    WebSession.isLoggedOut(session);
    const user = (await User.create(username, password, school, hometown)).user;
    if (user !== null) {
      const userId = (await User.getUserById(user._id))._id;
      await Feed.createFeed(userId);
      // add users to internal lists for school and hometown
      await Filtering.assignToFilter(school, userId);
      await Filtering.assignToFilter(hometown, userId);
    }
    return user;
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

  // POST ROUTES

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
  async createPost(session: WebSessionDoc, content: string, prompt: number, audienceLabel?: ObjectId, options?: PostOptions) {
    const user = WebSession.getUser(session);
    await Post.isPromptSuppported(prompt);
    if (audienceLabel) {
      await Label.isAuthor(audienceLabel, user);
    }
    console.log(audienceLabel);
    const created = await Post.create(user, content, prompt, audienceLabel, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:_id")
  async updatePost(session: WebSessionDoc, _id: ObjectId, update: Partial<PostDoc>) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    if (update.audience) {
      await Label.isAuthor(update.audience, user);
    }
    return await Post.update(_id, update);
  }

  @Router.delete("/posts/:_id")
  async deletePost(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Post.isAuthor(user, _id);
    return Post.delete(_id);
  }

  @Router.get("/posts/prompt/:_id")
  async getPostPrompt(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    const username = (await User.getUserById(user)).username;
    return await Post.getPostPrompt(username, _id);
  }

  // FRIEND ROUTES
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

  // LABEL ROUTES
  // Routes are called "lists" because known to users' as MyLifeLists

  @Router.get("/lists/")
  async getLabels(session: WebSessionDoc) {
    const user = WebSession.getUser(session);
    return await Label.getLabelsByAuthor(user);
  }

  @Router.post("/lists")
  async createLabel(session: WebSessionDoc, name: string) {
    const user = WebSession.getUser(session);
    return await Label.createLabel(user, name);
  }

  @Router.put("/lists/assign/:_id")
  async assignToLabel(session: WebSessionDoc, _id: ObjectId, item: ObjectId) {
    const user = WebSession.getUser(session);
    const friendUserID = (await User.getUserById(item))._id;
    await Label.isAuthor(_id, user);
    await Friend.areUsersFriends(friendUserID, user);
    return await Label.assignToLabel(_id, item);
  }

  @Router.put("/lists/remove/:_id")
  async removeFromLabel(session: WebSessionDoc, _id: ObjectId, item: ObjectId) {
    const user = WebSession.getUser(session);
    await Label.isAuthor(_id, user);
    return await Label.removeFromLabel(_id, item);
  }

  @Router.delete("/lists/:_id")
  async deleteLabel(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Label.isAuthor(_id, user);
    return await Label.deleteLabel(_id);
  }

  @Router.get("/lists/:_id")
  async getLabelItems(session: WebSessionDoc, _id: ObjectId) {
    const user = WebSession.getUser(session);
    await Label.isAuthor(_id, user);
    return await Label.getLabelItems(_id);
  }

  // FEED Routes

  @Router.get("/feed/")
  async generateFeed(session: WebSessionDoc, label?: ObjectId) {
    // referenced https://stackoverflow.com/questions/40140149/use-async-await-with-array-map
    const user = WebSession.getUser(session);
    await Feed.clearFeed(user);

    let labelItems: ObjectId[] = [];
    if (label) {
      // filter posts by authors only in label
      await Label.isAuthor(label, user);
      labelItems = await Label.getLabelItems(label);
      labelItems = await Promise.all(labelItems.map(async (user_id) => (await User.getUserById(user_id))._id));
    }

    const filterIter = label ? labelItems : await Friend.getFriends(user);

    for (const filterUser of filterIter) {
      // add post IDs to Feed
      const posts = await Post.getByAuthor(filterUser);

      // referenced https://web.mit.edu/6.102/www/sp23/classes/13-functional/
      const postsWithAudience = posts.filter((post) => post.audience !== undefined);
      const postsWithoutAudience = posts.filter((post) => post.audience === undefined);
      const postsIds = postsWithoutAudience.map((post) => post._id);
      await Feed.bulkAddToFeed(user, postsIds);

      for (const post of postsWithAudience) {
        // console.log("REACHED");
        if (post.audience) {
          // get label items in audience
          const labelItems = await Label.getLabelItems(post.audience);
          const labelItemsStr = labelItems.map((user_id) => user_id.toString());
          if (labelItemsStr.indexOf(user.toString()) !== -1) {
            // user in specified audience to see post
            await Feed.addToFeed(user, post._id);
          }
        } else {
          await Feed.addToFeed(user, post._id);
        }
      }
    }
    return { msg: "Feed Updated", posts: await Feed.getFeedItems(user) };
  }

  // FILTER ROUTES

  @Router.get("/filter/recommendedUsers/")
  async getRecommendedUsers(session: WebSessionDoc, maxQuantity: number) {
    const userID = WebSession.getUser(session);
    const user = await User.getUserById(userID);

    // referenced https://www.geeksforgeeks.org/how-to-get-the-union-of-two-sets-in-javascript/

    let usersShareSchool = await Filtering.getFilterItems(user.school);
    let usersShareHometown = await Filtering.getFilterItems(user.hometown);

    // remove original user and friends from potential recommendees

    const friends = await Friend.getFriends(userID);
    usersShareSchool = Filtering.removeItemsFromFilter(usersShareSchool, friends.concat([userID]));
    usersShareHometown = Filtering.removeItemsFromFilter(usersShareHometown, friends.concat([userID]));

    // combine recommended users, prioritize by both school and hometown

    return await Filtering.getRecommendedItems(userID, usersShareSchool, usersShareHometown, maxQuantity);
  }

  @Router.put("/filter/recommendedUsers/")
  async seeMoreSuggestions(session: WebSessionDoc, maxQuantity: number) {
    const userID = WebSession.getUser(session);

    return await Filtering.getMoreRecommendations(userID, maxQuantity);
  }
}

export default getExpressRouter(new Routes());
