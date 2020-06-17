const { admin, db } = require("../util/admin");
const config = require("../util/config");

let imageUrl;

exports.getAllPosts = (req, res) => {
  db.collection("posts")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let posts = [];
      data.forEach((doc) => {
        posts.push({
          postId: doc.id,
          body: doc.data().body,
          authorId: doc.data().authorId,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          imgUrl: doc.data().imgUrl,
        });
      });
      return res.json(posts);
    })
    .catch((err) => console.error(err));
};

exports.uploadPostImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== "image/jpeg" && mimetype !== "image/png") {
      return res.status(400).json({ error: "Wrong File Type" });
    }
    //Get Image Extension
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    //Generate File Name
    imageFileName = `${Math.round(
      Math.random() * 10000000000
    )}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);

    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      })
      .then(() => {
        imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
      })
      .then(() => {
        return res.json({
          message: "Image Uploaded Sucessfully",
          imgUrl: imageUrl,
        });
      })
      .catch((err) => {
        console.log(err);
        return res.status(500).json({ error: err.code });
      });
  });
  busboy.end(req.rawBody);
};

exports.postOnePost = (req, res) => {
  if (req.body.body.trim() === "") {
    return res
      .status(400)
      .json({ body: "There must be some content in the post" });
  }

  const newPost = {
    body: req.body.body,
    authorId: req.user.userId,
    userHandle: req.user.userHandle,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
  };

  db.collection("posts")
    .add(newPost)
    .then((doc) => {
      const resPost = newPost;
      resPost.postId = doc.id;
      res.json(resPost);
    })
    .catch((err) => {
      res.status(500).json({ error: "Something Went Wrong" });
      console.log(err);
    });
};

//Fetch a Post
exports.getPost = (req, res) => {
  let postData = {};
  db.doc(`/posts/${req.params.postId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Post not found" });
      }
      postData = doc.data();
      postData.postId = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("postId", "==", req.params.postId)
        .get();
    })
    .then((data) => {
      postData.comments = [];
      data.forEach((doc) => {
        postData.comments.push(doc.data());
      });
      return res.json(postData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//Comment On a Post
exports.commentOnPost = (req, res) => {
  if (req.body.body.trim() === "")
    return res.status(400).json({ error: "Comment must not be empty" });

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    postId: req.params.postId,
    userHandle: req.user.userHandle,
    commentorId: req.user.userId,
    userImage: req.user.imageUrl,
  };

  db.doc(`/posts/${req.params.postId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Post not found" });
      }
      return doc.ref.update({commentCount: doc.data().commentCount + 1});
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "Something went Wrong" });
    });
};

//Like a Post
exports.likePost = (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.userHandle)
    .where("postId", "==", req.params.postId)
    .limit(1);

  const postDocument = db.doc(`/posts/${req.params.postId}`);

  let postData;

  postDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        postData = doc.data();
        postData.postId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Post Not Found!" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            postId: req.params.postId,
            userHandle: req.user.userHandle,
          })
          .then(() => {
            postData.likeCount++;
            return postDocument.update({ likeCount: postData.likeCount });
          })
          .then(() => {
            res.json(postData);
          });
      } else {
        return res.status(400).json({ error: "Post already Liked" });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ error: err.code });
    });
};

exports.unlikePost = (req, res) => {
  const likeDocument = db
  .collection("likes")
  .where("userHandle", "==", req.user.userHandle)
  .where("postId", "==", req.params.postId)
  .limit(1);

const postDocument = db.doc(`/posts/${req.params.postId}`);

let postData;

postDocument
  .get()
  .then((doc) => {
    if (doc.exists) {
      postData = doc.data();
      postData.postId = doc.id;
      return likeDocument.get();
    } else {
      return res.status(404).json({ error: "Post Not Found!" });
    }
  })
  .then((data) => {
    if (data.empty) {
      return res.status(400).json({ error: "Post not Liked" });
    } else {
      return db.doc(`/likes/${data.docs[0].id}`).delete()
      .then(() => {
        postData.likeCount--
        return postDocument.update({likeCount: postData.likeCount});
      })
      .then(() => {
        res.json(postData);
      })
    }
  })
  .catch((err) => {
    console.log(err);
    res.status(500).json({ error: err.code });
  });
};

//Deleting A post
exports.deletePost = (req, res) => {
   const document = db.doc(`/posts/${req.params.postId}`);
   document.get()
   .then((doc) =>{
     if (!doc.exists){
       return res.status(404).json({error: 'Post not found'});
     }
     if(doc.data().userHandle !== req.user.userHandle){
       return res.status(403).json({error: Unauthorized});
     } else {
       return document.delete()
     }
   })
   .then(() => {
     res.json({message:'Post deleted sucessfully'});
   })
   .catch((err) => {
     console.error(err)
     return res.status(500).json({error: err.code})
   })
}