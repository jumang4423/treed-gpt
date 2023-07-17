import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
const firebaseConfig = {};

const app = initializeApp(firebaseConfig);
export const Db = getDatabase(app);
export const Fauth = getAuth(app);
