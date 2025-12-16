// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBZKr7P5-RSwYdHdRYlIaiK8WoALjg_aSY",
    authDomain: "netbox-b633b.firebaseapp.com",
    projectId: "netbox-b633b",
    storageBucket: "netbox-b633b.firebasestorage.app",
    messagingSenderId: "849758968756",
    appId: "1:849758968756:web:0e92c52c729ce4e6d8f0e1",
    measurementId: "G-SRH2ZZSJVD",
    databaseURL: "https://netbox-b633b-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const analytics = getAnalytics(app);

export { database, analytics };
