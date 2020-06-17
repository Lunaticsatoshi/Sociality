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
} = require("./handlers/posts");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
  getUserDetails,
  markNotificationsRead,
} = require("./handlers/users");

const FBauth = require("./util/fbAuth");

// Posts Routes
app.get("/posts", getAllPosts);

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

//Read notifications
app.post("/notifications", FBauth, markNotificationsRead);

exports.api = functions.https.onRequest(app);

//Automated Like Notifications
exports.createNotificationOnLike = functions.firestore
  .document("likes/{id}")
  .onCreate((snapshot) => {
    db.doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
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
      .then(() => {
        return;
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });
exports.deleteNotificationOnUnlike = functions.firestore
.document("likes/{id}")
.onDelete((snapshot) => {
  db.doc(`/notifications/${snapshot.id}`)
  .delete()
  .then(() => {
    return;
  })
  .catch((err) => {
    console.error(err);
    return;
  })
})

//Automated Comment Notification
exports.createNotificationOnComment = functions.firestore
  .document("comments/{id}")
  .onCreate((snapshot) => {
    db.doc(`/posts/${snapshot.data().postId}`)
      .get()
      .then((doc) => {
        if (doc.exists) {
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
      .then(() => {
        return;
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });
