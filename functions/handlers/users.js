const { admin, db } = require("../util/admin");
const config = require('../util/config');

const firebase = require("firebase");
firebase.initializeApp(config);

const { validateSignUpData, validateLoginData, reduceUserDetails } = require('../util/validators');

//Sign Up User
exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    userHandle: req.body.userHandle,
  };

  const { valid, errors } = validateSignUpData(newUser);

  if (!valid) return res.status(400).json(errors);

  const noImg = 'no-img.jpg';

  //TODO: validate the user
  let token, userId;
  db.doc(`/users/${newUser.userHandle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res
          .status(400)
          .json({ userHandle: "This Handle is alraedy taken" });
      } else {
        firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password)
          .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
          })
          .then((idToken) => {
            token = idToken;
            const userCredentials = {
              userId: userId,
              userHandle: newUser.userHandle,
              email: newUser.email,
              imageUrl: `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${noImg}?alt=media`,
              createdAt: new Date().toISOString(),
            };
            return db.doc(`/users/${newUser.userHandle}`).set(userCredentials);
          })
          .then(() => {
            return res.status(201).json({ token });
          })
          .catch((err) => {
            console.error(err);
            if (err.code === "auth/email-already-in-use") {
              return res.status(400).json({ email: "Email Already in Use" });
            } else {
              return res.status(500).json({ error: err.code });
            }
          });
      }
    });
};

//Login User
exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  const { valid, errors } = validateLoginData(user);

  if (!valid) return res.status(400).json(errors);
   
  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((err) => {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        return res
          .status(403)
          .json({ general: "Wrong credentials please check and try again" });
      } else return res.status(500).json({ error: err.code });
    });
};

//Add User Details 
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);
  
  db.doc(`/users/${req.user.userHandle}`).update(userDetails)
  .then(() => {
    return res.json({message: 'Details Added sucessfully'})
  })
  .catch( err => {
    console.error(err)
    return res.status(500).json({error: err.code})
  })
};

//Get any users Details
exports.getUserDetails = (req, res) => {
  let userData = {}
  db.doc(`/users/${req.params.handle}`).get()
    .then((doc) => {
      if (doc.exists){
        userData.user = doc.data();
        return db.collection('posts').where('userHandle', '==', req.params.handle)
          .orderBy('createdAt', 'desc')
          .get()
      } else {
        return res.status(404).json({error: 'User Does Not Exists'})
      }
    })
    .then((data) => {
      userData.posts = [];
      data.forEach((doc) => {
        userData.posts.push({
          body: doc.data().body,
          createdAt: doc.data().createdAt,
          userHandle: doc.data().userHandle,
          userImage: doc.data().userImage,
          likeCount: doc.data().likeCount,
          commentCount: doc.data().commentCount,
          postId: doc.id,
        })
      })
      return res.json(userData)
    })
    .catch((err) => {
      console.error(err)
      res.status(500).json({error: err.code})
    })
}

//Get Authenticated User Details
exports.getAuthenticatedUser = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.userHandle}`).get()
  .then(doc => {
    if (doc.exists){
      userData.credentials = doc.data();
      return db.collection('likes').where(`userHandle`, '==', req.user.userHandle).get()
    }
  }).then(data =>{
    userData.likes = [];
    data.forEach(doc => {
      userData.likes.push(doc.data());
    });
    return db.collection('notifications').where('recepient', '==', req.user.userHandle)
      .orderBy('createdAt', 'desc').limit(10).get();
  })
  .then((data) => {
    userData.notifications = []
    data.forEach((doc) => {
      userData.notifications.push({
        recipient: doc.data().recepient,
        sender: doc.data().sender,
        createdAt: doc.data().createdAt,
        postId: doc.data().postId,
        type: doc.data().type,
        read: doc.data().read,
        notificationId: doc.id
      })
    });
    return res.json(userData);
  })
  .catch(err => {
    console.error(err);
    return res.status(500).json({error: err.code})
  })
}

//Upload Profile Image
exports.uploadImage = (req, res) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new BusBoy({headers: req.headers});

  let imageFileName;
  let  imageToBeUploaded = {};

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if (mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
      return res.status(400).json({error: 'Wrong File Type'})
    }
    //Get Image Extension
    const imageExtension = filename.split('.')[filename.split('.').length - 1];
    //Generate File Name
    imageFileName = `${Math.round(Math.random()*10000000000)}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);

    imageToBeUploaded = {filepath, mimetype};
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on('finish', () => {
    admin.storage().bucket().upload(imageToBeUploaded.filepath, {
      resumable: false,
      metadata: {
        metadata: {
          contentType: imageToBeUploaded.mimetype
        }
      }
    })
    .then(() => {
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`
      return db.doc(`/users/${req.user.userHandle}`).update({imageUrl})
    })
    .then(() => {
      return res.json({message: 'Image Uploaded Sucessfully'})
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({error: err.code});
    })
  });
  busboy.end(req.rawBody);
}

//Read Notifications
exports.markNotificationsRead = (req, res) => {
  let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notification = db.doc(`/notification/${notificationId}`);
    batch.update(notification, {read: true});
  });
  batch.commit()
    .then(() => {
      return res.json({message: 'Notifications Read'});
    })
    .catch((err) =>{
      console.error(err);
      return res.status(500).json({error: err.code})
    })
}