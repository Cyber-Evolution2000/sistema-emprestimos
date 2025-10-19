// scripts/firebase-config.js

// ✅ SUA CONFIGURAÇÃO DO NOVO PROJETO - VERSÃO COMPATÍVEL
const firebaseConfig = {
  apiKey: "AIzaSyABGPVIC2uqejmg0musrh-fbvzcgnpFI5M",
  authDomain: "sistema-emprestimos-6a48d.firebaseapp.com",
  projectId: "sistema-emprestimos-6a48d",
  storageBucket: "sistema-emprestimos-6a48d.firebasestorage.app",
  messagingSenderId: "193277613589",
  appId: "1:193277613589:web:6c2b895163567f4eea201c",
  measurementId: "G-777XLLX1JD"
};

// Initialize Firebase (versão compatível com nosso código)
firebase.initializeApp(firebaseConfig);

// Initialize Cloud Firestore
const db = firebase.firestore();