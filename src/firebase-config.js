/**
 * To find your Firebase config object:
 *
 * 1. Go to your [Project settings in the Firebase console](https://console.firebase.google.com/project/_/settings/general/)
 * 2. In the "Your apps" card, select the nickname of the app for which you need a config object.
 * 3. Select Config from the Firebase SDK snippet pane.
 * 4. Copy the config object snippet, then add it here.
 */

const config = {
  /* TODO: ADD YOUR FIREBASE CONFIGURATION OBJECT HERE */

  apiKey: "AIzaSyBEFZNZJVzAYps64cDp07W-95khiP920_s",
  authDomain: "imentorattendance.firebaseapp.com",
  projectId: "imentorattendance",
  storageBucket: "imentorattendance.appspot.com",
  messagingSenderId: "708079387839",
  appId: "1:708079387839:web:fc2ca61ac17c8b4106720a",
};

export function getFirebaseConfig() {
  if (!config || !config.apiKey) {
    throw new Error(
      "No Firebase configuration object provided." +
        "\n" +
        "Add your web app's configuration object to firebase-config.js"
    );
  } else {
    return config;
  }
}
