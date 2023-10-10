import FeedConcept from "./concepts/feed";
import FilteringConcept from "./concepts/filtering";
import FriendConcept from "./concepts/friend";
import LabelConcept from "./concepts/label";
import PostConcept from "./concepts/post";
import UserConcept from "./concepts/user";
import WebSessionConcept from "./concepts/websession";

// App Definition using concepts
export const WebSession = new WebSessionConcept();
export const User = new UserConcept();
export const Post = new PostConcept();
export const Friend = new FriendConcept();
export const Filtering = new FilteringConcept();
export const Label = new LabelConcept();
export const Feed = new FeedConcept();
