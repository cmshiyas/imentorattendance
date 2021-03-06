/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";

import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  setDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { getPerformance } from "firebase/performance";

import { getFirebaseConfig } from "./firebase-config.js";

// Signs-in Friendly Chat.
async function signIn() {
  // Sign in Firebase using popup auth and Google as the identity provider.
  var provider = new GoogleAuthProvider();
  await signInWithPopup(getAuth(), provider);
}

// Signs-out of Friendly Chat.
function signOutUser() {
  // Sign out of Firebase.
  signOut(getAuth());
}

// Initialize firebase auth
function initFirebaseAuth() {
  // Listen to auth state changes.
  onAuthStateChanged(getAuth(), authStateObserver);
}

// Returns the signed-in user's profile Pic URL.
function getProfilePicUrl() {
  return getAuth().currentUser.photoURL || "/images/profile_placeholder.png";
}

// Returns the signed-in user's display name.
function getUserName() {
  return getAuth().currentUser.displayName;
}

// Returns true if a user is signed-in.
function isUserSignedIn() {
  return !!getAuth().currentUser;
}
// Saves a new message to Cloud Firestore.
async function saveMessage(messageText) {
  // Add a new message entry to the Firebase database.
  try {
    await addDoc(collection(getFirestore(), "attendance"), {
      name: messageText.name,
      text: messageText.subject,
      rollno: messageText.rollno,
      profilePicUrl: getProfilePicUrl(),
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error writing new message to Firebase Database", error);
  }
}

// Loads chat messages history and listens for upcoming ones.
// Loads chat messages history and listens for upcoming ones.
function loadMessages() {
  // Create the query to load the last 12 messages and listen for new ones.
  const recentMessagesQuery = query(
    collection(getFirestore(), "attendance"),
    orderBy("timestamp", "asc")
    // limit(12)
  );

  // Start listening to the query.
  onSnapshot(recentMessagesQuery, function (snapshot) {
    snapshot.docChanges().forEach(function (change) {
      if (change.type === "removed") {
        deleteMessage(change.doc.id);
      } else {
        var message = change.doc.data();

        if (checkSignedInWithMessage() && messageListElement) {
          displayMessage(
            change.doc.id,
            message.timestamp,
            message.name,
            message.text,
            message.rollno,
            message.profilePicUrl,
            message.imageUrl
          );
        }
      }
    });
  });
}

// Saves a new message containing an image in Firebase.
// This first saves the image in Firebase storage.
async function saveImageMessage(file) {
  // TODO 9: Posts a new image as a message.
}

// Saves the messaging device token to Cloud Firestore.
async function saveMessagingDeviceToken() {
  // TODO 10: Save the device token in Cloud Firestore
}

// Requests permissions to show notifications.
async function requestNotificationsPermissions() {
  // TODO 11: Request permissions to send notifications.
}

// Triggered when a file is selected via the media picker.
function onMediaFileSelected(event) {
  event.preventDefault();
  var file = event.target.files[0];

  // Clear the selection in the file picker input.
  imageFormElement.reset();

  // Check if the file is an image.
  if (!file.type.match("image.*")) {
    var data = {
      message: "You can only share images",
      timeout: 2000,
    };
    signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // Check if the user is signed-in
  if (checkSignedInWithMessage()) {
    saveImageMessage(file);
  }
}

// Triggered when the send new message form is submitted.
function onMessageFormSubmit(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (messageInputElement.value && checkSignedInWithMessage()) {
    const formData = {
      subject:
        messageInputElement.options[messageInputElement.selectedIndex].value,
      rollno: rollnoInputElement.value,
      name: studentName.value,
    };
    console.log(formData);
    saveMessage(formData).then(function () {
      // Clear message text field and re-enable the SEND button.
      resetDropDownfield(messageInputElement);
      resetMaterialTextfield(rollnoInputElement);
      resetMaterialTextfield(studentName);

      toggleButton();
    });
    alert("Your attendance is captured succesfully!!");
  }
}

// Triggers when the auth state change for instance when the user signs-in or signs-out.
function authStateObserver(user) {
  if (user) {
    // User is signed in!
    // Get the signed-in user's profile pic and name.
    var profilePicUrl = getProfilePicUrl();
    var userName = getUserName();

    // Set the user's profile pic and name.
    userPicElement.style.backgroundImage =
      "url(" + addSizeToGoogleProfilePic(profilePicUrl) + ")";
    userNameElement.textContent = userName;

    // Show user's profile and sign-out button.
    userNameElement.removeAttribute("hidden");
    userPicElement.removeAttribute("hidden");
    signOutButtonElement.removeAttribute("hidden");

    // Hide sign-in button.
    signInButtonElement.setAttribute("hidden", "true");

    // We save the Firebase Messaging Device token and enable notifications.
    saveMessagingDeviceToken();
  } else {
    // User is signed out!
    // Hide user's profile and sign-out button.
    userNameElement.setAttribute("hidden", "true");
    userPicElement.setAttribute("hidden", "true");
    signOutButtonElement.setAttribute("hidden", "true");

    // Show sign-in button.
    signInButtonElement.removeAttribute("hidden");
  }
}

// Returns true if user is signed-in. Otherwise false and displays a message.
function checkSignedInWithMessage() {
  // Return true if the user is signed in Firebase
  if (isUserSignedIn()) {
    return true;
  }

  // Display a message to the user using a Toast.
  var data = {
    message: "You must sign-in first",
    timeout: 2000,
  };
  signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
  return false;
}

// Resets the given MaterialTextField.
function resetMaterialTextfield(element) {
  element.value = "";
  // element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
}

function resetDropDownfield(element) {
  element.value = "";
  // element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
}

// Template for messages.
var MESSAGE_TEMPLATE =
  '<div class="message-container">' +
  '<div class="spacing"><div class="pic"></div></div>' +
  '<div class="message"></div>' +
  '<div class="name"></div>' +
  '<div class="recordtime"></div>';
("</div>");

var MESSAGE_TEMPLATE_NEW =
  '<tr><td class="pic" class="spacing"></td><td class="name"></td><td class="rollno"></td><td class="message"></td><td class="recordtime"></td></tr>';
// Adds a size to Google Profile pics URLs.
function addSizeToGoogleProfilePic(url) {
  if (url.indexOf("googleusercontent.com") !== -1 && url.indexOf("?") === -1) {
    return url + "?sz=150";
  }
  return url;
}

// A loading image URL.
var LOADING_IMAGE_URL = "https://www.google.com/images/spin-32.gif?a";

// Delete a Message from the UI.
function deleteMessage(id) {
  var div = document.getElementById(id);
  // If an element for that message exists we delete it.
  if (div) {
    div.parentNode.removeChild(div);
  }
}

function createAndInsertMessage(id, timestamp, text) {
  const container = document.createElement("div");
  const row = document.createElement("tr");
  container.appendChild(row);

  row.innerHTML = MESSAGE_TEMPLATE_NEW;
  const div = container.firstChild;
  div.setAttribute("id", id);

  // If timestamp is null, assume we've gotten a brand new message.
  // https://stackoverflow.com/a/47781432/4816918
  timestamp = timestamp ? timestamp.toMillis() : Date.now();
  div.setAttribute("timestamp", timestamp);
  div.setAttribute("class", text.replace(/\s/g, "").toLowerCase());

  // figure out where to insert new message
  if (messageTable) {
    const existingMessages = messageTable.children;
    if (existingMessages.length === 1) {
      messageTable.appendChild(div);
    } else {
      let messageListNode = existingMessages[1];

      while (messageListNode) {
        const messageListNodeTime = messageListNode.getAttribute("timestamp");

        if (!messageListNodeTime) {
          throw new Error(
            `Child ${messageListNode.id} has no 'timestamp' attribute`
          );
        }

        if (messageListNodeTime > timestamp) {
          break;
        }

        messageListNode = messageListNode.nextSibling;
      }

      messageTable.insertBefore(div, messageListNode);
    }
  }

  return div;
}

// Displays a Message in the UI.
function displayMessage(id, timestamp, name, text, rollno, picUrl, imageUrl) {
  var div =
    document.getElementById(id) || createAndInsertMessage(id, timestamp, text);

  // profile picture
  if (picUrl) {
    div.querySelector(".pic").style.backgroundImage =
      "url(" + addSizeToGoogleProfilePic(picUrl) + ")";
  }

  var date = new Date(timestamp.toMillis());

  div.querySelector(".name").textContent = name;
  div.querySelector(".rollno").textContent = rollno;

  div.querySelector(".recordtime").textContent = date.toLocaleString();

  var messageElement = div.querySelector(".message");

  if (text) {
    // If the message is text.
    messageElement.textContent = text;
    // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, "<br>");
  } else if (imageUrl) {
    // If the message is an image.
    var image = document.createElement("img");
    image.addEventListener("load", function () {
      messageListElement.scrollTop = messageListElement.scrollHeight;
    });
    image.src = imageUrl + "&" + new Date().getTime();
    messageElement.innerHTML = "";
    messageElement.appendChild(image);
  }
  // Show the card fading-in and scroll to view the new message.
  setTimeout(function () {
    div.classList.add("visible");
  }, 1);
  messageListElement.scrollTop = messageListElement.scrollHeight;
}

// Enables or disables the submit button depending on the values of the input
// fields.
function toggleButton() {
  if (studentName) {
    submitButtonElement.removeAttribute("disabled");
  } else {
    submitButtonElement.setAttribute("disabled", "true");
  }
}

// function to hid rows
function toggle(className, displayState) {
  var elements = document.getElementsByClassName(className);

  for (var i = 0; i < elements.length; i++) {
    elements[i].style.display = displayState;
  }
}

function makeActive(navElement) {
  navElement.classList.add("active");
}
function removeActive(navElement) {
  navElement.classList.remove("active");
}
function displayAll() {
  removeActive(mathsSubjectTab);
  makeActive(allSubjectTab);
  removeActive(dsSubjectTab);
  removeActive(htmlSubjectTab);
  removeActive(abcSubjectTab);
  removeActive(tocSubjectTab);

  toggle("maths", "block");
  toggle("datastructure", "block");
  toggle("sensors&transducers", "block");
  toggle("python", "block");
  toggle("toc", "block");
}

function displayMaths() {
  makeActive(mathsSubjectTab);
  removeActive(allSubjectTab);
  removeActive(dsSubjectTab);
  removeActive(htmlSubjectTab);
  removeActive(abcSubjectTab);
  removeActive(tocSubjectTab);

  toggle("datastructure", "none");
  toggle("sensors&transducers", "none");
  toggle("python", "none");
  toggle("maths", "block");
  toggle("toc", "none");
}

function displayds() {
  removeActive(mathsSubjectTab);
  removeActive(allSubjectTab);

  makeActive(dsSubjectTab);
  removeActive(htmlSubjectTab);
  removeActive(abcSubjectTab);
  removeActive(tocSubjectTab);

  toggle("datastructure", "block");
  toggle("maths", "none");
  toggle("sensors&transducers", "none");
  toggle("python", "none");
  toggle("toc", "none");
}

function displayhtml() {
  removeActive(mathsSubjectTab);
  removeActive(allSubjectTab);
  removeActive(tocSubjectTab);

  removeActive(dsSubjectTab);
  makeActive(htmlSubjectTab);
  removeActive(abcSubjectTab);

  toggle("maths", "none");
  toggle("datastructure", "none");
  toggle("python", "none");
  toggle("sensors&transducers", "block");
  toggle("toc", "none");
}

function displayabc() {
  removeActive(mathsSubjectTab);
  removeActive(allSubjectTab);
  removeActive(tocSubjectTab);

  removeActive(dsSubjectTab);
  removeActive(htmlSubjectTab);
  makeActive(abcSubjectTab);

  toggle("maths", "none");
  toggle("datastructure", "none");
  toggle("python", "block");
  toggle("sensors&transducers", "none");
  toggle("toc", "none");
}

function displaytoc() {
  removeActive(mathsSubjectTab);
  removeActive(allSubjectTab);

  removeActive(dsSubjectTab);
  removeActive(htmlSubjectTab);
  removeActive(abcSubjectTab);
  makeActive(tocSubjectTab);

  toggle("maths", "none");
  toggle("datastructure", "none");
  toggle("python", "none");
  toggle("sensors&transducers", "none");
  toggle("toc", "block");
}

// Shortcuts to DOM Elements.
var messageListElement = document.getElementById("messages");
var messageTable = document.getElementById("message-table");
var messageFormElement = document.getElementById("message-form");
var messageInputElement = document.getElementById("message");
var subjectInputElement = document.getElementById("subject");
var rollnoInputElement = document.getElementById("rollno");
var studentName = document.getElementById("studentName");

var submitButtonElement = document.getElementById("submit");
var imageButtonElement = document.getElementById("submitImage");
var imageFormElement = document.getElementById("image-form");
var mediaCaptureElement = document.getElementById("mediaCapture");
var userPicElement = document.getElementById("user-pic");
var userNameElement = document.getElementById("user-name");
var signInButtonElement = document.getElementById("sign-in");
var signOutButtonElement = document.getElementById("sign-out");
var signInSnackbarElement = document.getElementById("must-signin-snackbar");
var getURL = window.location.href;

if (getURL.indexOf("/attendance") > 0) {
  var allSubjectTab = document.getElementById("allsubjects");
  var mathsSubjectTab = document.getElementById("maths");
  var dsSubjectTab = document.getElementById("datastructure");
  var htmlSubjectTab = document.getElementById("sensors&transducers");
  var abcSubjectTab = document.getElementById("python");
  var tocSubjectTab = document.getElementById("toc");

  allSubjectTab.addEventListener("click", displayAll);
  mathsSubjectTab.addEventListener("click", displayMaths);
  dsSubjectTab.addEventListener("click", displayds);
  htmlSubjectTab.addEventListener("click", displayhtml);
  abcSubjectTab.addEventListener("click", displayabc);
  tocSubjectTab.addEventListener("click", displaytoc);
}

// Saves message on form submit.
if (messageFormElement) {
  messageFormElement.addEventListener("submit", onMessageFormSubmit);
}
signOutButtonElement.addEventListener("click", signOutUser);
signInButtonElement.addEventListener("click", signIn);

// Toggle for the button.
if (studentName) {
  studentName.addEventListener("change", toggleButton);
}

// Events for image upload.
if (imageButtonElement) {
  imageButtonElement.addEventListener("click", function (e) {
    e.preventDefault();
    mediaCaptureElement.click();
  });
  mediaCaptureElement.addEventListener("change", onMediaFileSelected);
}

const firebaseAppConfig = getFirebaseConfig();
initializeApp(firebaseAppConfig);

// TODO 12: Initialize Firebase Performance Monitoring

initFirebaseAuth();

loadMessages();
