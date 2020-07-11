const functions = require("firebase-functions");
const express = require("express");
const app = express();
const config = require("./util/config");
const { db } = require("./util/admin");
const {
  getAllPosts,
  postOnePost,
  uploadPostImage,
  getPost,
  commentOnPost,
  likePost,
  unlikePost,
  deletePost,
  getFeedPost,
} = require("./handlers/posts");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
  followUser,
  unfollowUser,
  isFollowing,
} = require("./handlers/users");

const FBauth = require("./util/fbAuth");

// Posts Routes
app.get("/posts", getAllPosts);

//Get All feed Post
app.get("/feed", FBauth, getFeedPost)

//Posting A post
app.post("/posts/image", FBauth, uploadPostImage);
app.post("/posts", FBauth, postOnePost);

//Get Post
app.get("/posts/:postId", getPost);
// Delete a Post
app.delete("/posts/:postId", FBauth, deletePost);
//TODO: Like a Post
app.get("/posts/:postId/like", FBauth, likePost);
//TODO: Unlike a Post
app.get("/posts/:postId/unlike", FBauth, unlikePost);
//Comment on a Post
app.post("/posts/:postId/comment", FBauth, commentOnPost);

//Users Routes
//Users Sign Up route
app.post("/signup", signup);

//Users Login Route
app.post("/login", login);

//Upload Profile
app.post("/user/image", FBauth, uploadImage);

//Add User details
app.post("/user", FBauth, addUserDetails);

app.get("/user", FBauth, getAuthenticatedUser);

//Get other Users
app.get("/user/:handle", getUserDetails);

//Follow Users
app.get("/user/:handle/follow", FBauth, followUser);

//UnFollow Users
app.get("/user/:handle/unfollow", FBauth, unfollowUser);

//Check Folllowing User
app.get("/user/:handle/following", FBauth, isFollowing);

//Read notifications
app.post("/notifications", FBauth, markNotificationsRead);

exports.api = functions.https.onRequest(app);

//Automated Like Notifications
exports.createNotificationOnLike = functions.firestore
  .document("likes/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recepient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "like",
            read: false,
            postId: doc.id,
          });
        }
      })
      .catch((err) => console.error(err));
  });
exports.deleteNotificationOnUnlike = functions.firestore
  .document("likes/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

//Automated Comment Notification
exports.createNotificationOnComment = functions.firestore
  .document("comments/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recepient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: "comment",
            read: false,
            postId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.onUserImageChange = functions.firestore
  .document("/users/{userId}")
  .onUpdate((change) => {
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log("Image has changed");
      const batch = db.batch();
      return db
        .collection("posts")
        .where("userHandle", "==", change.before.data().userHandle)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const post = db.doc(`/posts/${doc.id}`);
            batch.update(post, { userImage: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else return true;
  });

exports.onPostDeleted = functions.firestore
  .document("/posts/{postId}")
  .onDelete((snapshot, context) => {
    const postId = context.params.postId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("postId", "==", postId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db.collection("likes").where("postId", "==", postId).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection("notifications")
          .where("postId", "==", postId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => {
        console.error(err);
      });
  });

exports.onFollowUser = functions.firestore
  .document("/followers/{userHandle}/userFollowers/{followerHandle}")
  .onCreate((snapshot, context) => {
    const userHandle = context.params.userHandle;
    const followerHandle = context.params.followerHandle;

    const userFeedRef = db
      .collection("feeds")
      .doc(followerHandle)
      .collection("userFeed");

    const postRef = db
      .collection("posts")
      .where("userHandle", "==", userHandle);

   return postRef.get().then((data) => {
      data.forEach((doc) => {
        if (doc.exists) {
          userFeedRef.doc(doc.id).set(doc.data());
        }
      });
    })
    .catch((err) => {
      console.error(err);
      return;
    });
  });

exports.onUnfollowUser = functions.firestore
  .document("/followers/{userHandle}/userFollowers/{followerHandle}")
  .onDelete((snapshot, context) => {
    const userHandle = context.params.userHandle;
    const followerHandle = context.params.followerHandle;

    const userFeedRef = db
      .collection("feeds")
      .doc(followerHandle)
      .collection("userFeed");

    const postRef = db
      .collection("posts")
      .where("userHandle", "==", userHandle);

    return postRef.get().then((data) => {
      data.forEach((doc) => {
        if (doc.exists) {
          userFeedRef.doc(doc.id).delete();
        }
      });
    })
    .catch((err) => {
      console.error(err);
      return;
    });
  });

exports.onUploadPost = functions.firestore
  .document("/posts/{postId}")
  .onCreate((snapshot, context) => {
    const userHandle = snapshot.data().userHandle;
    const followerRef = db
      .collection("followers")
      .doc(userHandle)
      .collection("userFollowing");

   return followerRef.get().then((doc) => {
      doc.forEach((data) => {
        db.collection("feeds")
          .doc(data.userHandle)
          .collection("userFeed")
          .doc(snapshot.id)
          .set(snapshot.data());
      });
    })
    .catch((err) => {
      console.error(err);
      return;
    });
  });
