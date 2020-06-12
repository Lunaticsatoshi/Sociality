const functions = require("firebase-functions");
const express = require("express");
const app = express();
const config = require("./util/config");
const {
  getAllPosts,
  postOnePost,
  uploadPostImage,
  getPost,
  commentOnPost,
  likePost,
  unlikePost,
} = require("./handlers/posts");
const {
  signup,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUser,
} = require("./handlers/users");
const FBauth = require("./util/fbAuth");

// Posts Routes
app.get("/posts", getAllPosts);

//Posting A post
app.post("/posts/image", FBauth, uploadPostImage);
app.post("/posts", FBauth, postOnePost);

//Get Post
app.get("/posts/:postId", getPost);
//TODO: Delete a Post
//TODO: Like a Post
app.get("/posts/:postId/like", FBauth, likePost);
//TODO: Unlike a Post
app.get("/posts/:postId/unlike", FBauth, unlikePost);
//Comment on a Post
app.post("/posts/:postId/comment", FBauth, commentOnPost);

//Users Sign Up route
app.post("/signup", signup);

//Users Login Route
app.post("/login", login);

//Upload Profile
app.post("/user/image", FBauth, uploadImage);

//Add User details
app.post("/user", FBauth, addUserDetails);

app.get("/user", FBauth, getAuthenticatedUser);

exports.api = functions.https.onRequest(app);
