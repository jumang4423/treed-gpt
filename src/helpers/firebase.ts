import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyAtFDSsTJ8S3n8Y4baSfKMCVFcQKD3MMo4",
  authDomain: "treed-gpt.firebaseapp.com",
  databaseURL:
    "https://treed-gpt-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "treed-gpt",
  storageBucket: "treed-gpt.appspot.com",
  messagingSenderId: "1096271593780",
  appId: "1:1096271593780:web:93e5d082b50b04de576561",
  measurementId: "G-8K2MP729MS",
};

const app = initializeApp(firebaseConfig);
export const Db = getDatabase(app);
export const Fauth = getAuth(app);
