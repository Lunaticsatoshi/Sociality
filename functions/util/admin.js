var admin = require("firebase-admin");
var serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://sociality-a732c.firebaseio.com",
    storageBucket: "sociality-a732c.appspot.com",
  });

  const db = admin.firestore();

  module.exports = { admin, db };