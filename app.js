// ============================================================
// NOVA FAMILY AI - COMPLETE APP.JS
// Sprachmodus: Nova hört NICHT während sie spricht
// ============================================================

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from
    "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    arrayUnion
} from
    "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";


// ============================================================
// FIREBASE CONFIG
// ============================================================
// WICHTIG:
// Hier deine bisherige firebaseConfig einsetzen.
// Wenn du bereits einen funktionierenden firebaseConfig
// in deiner alten app.js hattest, einfach genau diesen übernehmen.
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyAKmdUuFEfqmvs5gbjcdFhB1RIg9C9EtrE",
    authDomain: "nova-68fc1.firebaseapp.com",
    projectId: "nova-68fc1",
    storageBucket: "nova-68fc1.firebasestorage.app",
    messagingSenderId: "1020069093020",
    appId: "1:1020069093020:web:9be72af9e60af659475759"
};


// ============================================================
// FIREBASE
// ============================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();


// ============================================================
// DOM
// ============================================================

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendButton = document.getElementById("sendButton");

const micButton =
    document.getElementById("micButton") ||
    document.getElementById("mic");

const loginButton =
    document.getElementById("loginButton") ||
    document.getElementById("googleLogin");

const logoutButton =
    document.getElementById("logoutButton") ||
    document.getElementById("logout");

const textModeButton =
    document.getElementById("textModeButton");

const voiceModeButton =
    document.getElementById("voiceModeButton");

const youtubeButton =
    document.getElementById("youtubeButton");

const googleButton =
    document.getElementById("googleButton");


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let mode = "voice";

let model = null;

let thinking = false;

let isSpeaking = false;

let isListening = false;

let recognition = null;

let recognitionSupported = false;

let shouldListenAgain = false;

let voices = [];

let selectedVoice = null;

let conversation = [];


// ============================================================
// HELPERS
// ============================================================

function $(id) {
    return document.getElementById(id);
}


function addMessage(type, text) {

    if (!chat) return;

    const message = document.createElement("div");

    message.className =
        type === "user"
            ? "message user-message"
            : "message nova-message";

    message.textContent = text;

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;
}


function showToast(text) {

    let toast = document.getElementById("novaToast");

    if (!toast) {

        toast = document.createElement("div");

        toast.id = "novaToast";

        toast.style.position = "fixed";
        toast.style.bottom = "25px";
        toast.style.left = "50%";
        toast.style.transform = "translateX(-50%)";
        toast.style.zIndex = "99999";
        toast.style.background = "#111";
        toast.style.color = "#fff";
        toast.style.padding = "12px 18px";
        toast.style.borderRadius = "12px";
        toast.style.border = "1px solid #333";
        toast.style.maxWidth = "80%";
        toast.style.fontSize = "14px";

        document.body.appendChild(toast);
    }

    toast.textContent = text;

    toast.style.display = "block";

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {
        toast.style.display = "none";
    }, 5000);
}


function setState(title, subtitle = "") {

    const state =
        document.getElementById("state") ||
        document.getElementById("status");

    if (!state) return;

    if (typeof state.textContent === "string") {
        state.textContent =
            subtitle
                ? `${title} – ${subtitle}`
                : title;
    }
}


// ============================================================
// SETTINGS
// ============================================================

function loadSettings() {

    const savedVoice =
        localStorage.getItem("novaVoice");

    const savedMode =
        localStorage.getItem("novaMode");

    if (savedMode === "text" || savedMode === "voice") {
        mode = savedMode;
    }

    if (savedVoice) {

        setTimeout(() => {

            voices = speechSynthesis.getVoices();

            selectedVoice =
                voices.find(v => v.name === savedVoice) ||
                null;

        }, 300);
    }
}


function saveSettings() {

    localStorage.setItem("novaMode", mode);

    if (selectedVoice) {
        localStorage.setItem(
            "novaVoice",
            selectedVoice.name
        );
    }
}


// ============================================================
// MODE
// ============================================================

function setMode(newMode) {

    mode = newMode;

    localStorage.setItem("novaMode", mode);

    if (mode === "voice") {

        setState("SPRACHMODUS");

        if (!isSpeaking && !thinking) {
            startListening();
        }

    } else {

        setState("TEXTMODUS");

        stopListening();
    }
}


if (textModeButton) {

    textModeButton.addEventListener("click", () => {
        setMode("text");
    });
}


if (voiceModeButton) {

    voiceModeButton.addEventListener("click", () => {
        setMode("voice");
    });
}


// ============================================================
// GEMINI / FIREBASE AI
// ============================================================

async function initializeGemini() {

    if (model) {
        return model;
    }

    try {

        const firebaseAI =
            await import(
                "https://www.gstatic.com/firebasejs/12.13.0/firebase-ai.js"
            );

        const {
            getAI,
            getGenerativeModel,
            GoogleAIBackend
        } = firebaseAI;

        const ai = getAI(app, {
            backend: new GoogleAIBackend()
        });

        model = getGenerativeModel(ai, {
            model: "gemini-3.7-flash"
        });

        return model;

    } catch (error) {

        console.error(
            "NOVA AI INITIALISIERUNG FEHLER:",
            error
        );

        throw error;
    }
}


// ============================================================
// SPEECH SYNTHESIS
// ============================================================

function loadVoices() {

    voices = speechSynthesis.getVoices();

    if (!voices.length) return;

    const savedVoice =
        localStorage.getItem("novaVoice");

    if (savedVoice) {

        selectedVoice =
            voices.find(v => v.name === savedVoice);
    }

    if (!selectedVoice) {

        selectedVoice =
            voices.find(v =>
                v.lang &&
                v.lang.toLowerCase().startsWith("de")
            ) ||
            voices[0];
    }
}


speechSynthesis.onvoiceschanged = loadVoices;

loadVoices();


function stopSpeaking() {

    try {
        speechSynthesis.cancel();
    } catch (_) {}

    isSpeaking = false;
}


function speak(text) {

    return new Promise(resolve => {

        if (!text) {
            resolve();
            return;
        }

        // ====================================================
        // GANZ WICHTIG:
        // Während Nova spricht NICHT zuhören.
        // ====================================================

        shouldListenAgain = false;

        stopListening();

        stopSpeaking();

        isSpeaking = true;

        setState("NOVA SPRICHT");

        const utterance =
            new SpeechSynthesisUtterance(text);

        utterance.lang = "de-DE";

        utterance.rate = 1.0;

        utterance.pitch = 1.0;

        utterance.volume = 1.0;

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {

            isSpeaking = true;

            // Sicherheitsmaßnahme:
            stopListening();

            setState("NOVA SPRICHT");
        };


        utterance.onend = () => {

            isSpeaking = false;

            setState("BEREIT");

            resolve();

            // Erst NACHDEM Nova komplett fertig gesprochen hat
            // wird das Mikrofon wieder aktiviert.

            if (
                mode === "voice" &&
                !thinking
            ) {

                setTimeout(() => {

                    if (
                        !isSpeaking &&
                        !thinking &&
                        mode === "voice"
                    ) {

                        startListening();
                    }

                }, 350);
            }
        };


        utterance.onerror = (event) => {

            console.error(
                "SPEECH ERROR:",
                event
            );

            isSpeaking = false;

            setState("BEREIT");

            resolve();

            if (
                mode === "voice" &&
                !thinking
            ) {

                setTimeout(() => {
                    startListening();
                }, 350);
            }
        };


        speechSynthesis.speak(utterance);
    });
}


// ============================================================
// SPEECH RECOGNITION
// ============================================================

function setupRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        recognitionSupported = false;

        console.warn(
            "SpeechRecognition wird von diesem Browser nicht unterstützt."
        );

        return;
    }

    recognitionSupported = true;

    recognition = new SpeechRecognition();

    recognition.lang = "de-DE";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;


    recognition.onstart = () => {

        // NIEMALS zuhören, während Nova spricht.

        if (isSpeaking || thinking) {

            try {
                recognition.stop();
            } catch (_) {}

            return;
        }

        isListening = true;

        setState("ICH HÖRE ZU");
    };


    recognition.onresult = async (event) => {

        // Sicherheitscheck:
        // Falls Nova inzwischen spricht -> ignorieren.

        if (isSpeaking || thinking) {
            return;
        }

        const result =
            event.results[
                event.results.length - 1
            ];

        if (!result || !result[0]) {
            return;
        }

        const text =
            result[0].transcript.trim();

        if (!text) return;

        input.value = text;

        await sendToNova(text);
    };


    recognition.onerror = (event) => {

        console.warn(
            "SpeechRecognition:",
            event.error
        );

        isListening = false;

        if (
            event.error === "not-allowed" ||
            event.error === "service-not-allowed"
        ) {

            setState(
                "MIKROFON NICHT ERLAUBT"
            );

            showToast(
                "Bitte Mikrofonzugriff für diese Website erlauben."
            );

            return;
        }

        setState("BEREIT");
    };


    recognition.onend = () => {

        isListening = false;

        // Während Nova spricht NICHT neu starten.

        if (
            isSpeaking ||
            thinking
        ) {

            return;
        }

        // Nur im Sprachmodus wieder zuhören.

        if (
            mode === "voice" &&
            shouldListenAgain
        ) {

            setTimeout(() => {

                if (
                    !isSpeaking &&
                    !thinking &&
                    mode === "voice"
                ) {

                    startListening();
                }

            }, 250);

        } else {

            setState("BEREIT");
        }
    };
}


setupRecognition();


// ============================================================
// START LISTENING
// ============================================================

function startListening() {

    if (!recognitionSupported) {

        showToast(
            "Dieser Browser unterstützt keine Sprachsteuerung."
        );

        return;
    }

    // ABSOLUTE SICHERHEIT:
    // Nova spricht -> kein Mikrofon.

    if (isSpeaking) {
        return;
    }

    // Nova denkt -> kein Mikrofon.

    if (thinking) {
        return;
    }

    if (mode !== "voice") {
        return;
    }

    if (isListening) {
        return;
    }

    shouldListenAgain = true;

    try {

        recognition.start();

    } catch (error) {

        console.warn(
            "Mikrofon konnte nicht gestartet werden:",
            error
        );
    }
}


// ============================================================
// STOP LISTENING
// ============================================================

function stopListening() {

    shouldListenAgain = false;

    if (!recognition) return;

    try {

        recognition.stop();

    } catch (_) {}

    isListening = false;
}


// ============================================================
// MICROPHONE BUTTON
// ============================================================

if (micButton) {

    micButton.addEventListener(
        "click",
        () => {

            if (isSpeaking) {
                return;
            }

            if (thinking) {
                return;
            }

            if (isListening) {

                stopListening();

                setState("BEREIT");

            } else {

                mode = "voice";

                localStorage.setItem(
                    "novaMode",
                    "voice"
                );

                startListening();
            }
        }
    );
}


// ============================================================
// SEND BUTTON
// ============================================================

if (sendButton) {

    sendButton.addEventListener(
        "click",
        async () => {

            const text =
                input?.value?.trim();

            if (!text) return;

            input.value = "";

            await sendToNova(text);
        }
    );
}


if (input) {

    input.addEventListener(
        "keydown",
        async event => {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                const text =
                    input.value.trim();

                if (!text) return;

                input.value = "";

                await sendToNova(text);
            }
        }
    );
}


// ============================================================
// NOVA RESPONSE
// ============================================================

async function sendToNova(text) {

    if (!text) return;

    if (thinking) return;

    // Falls Nova gerade spricht:
    // niemals neue Anfrage starten.

    if (isSpeaking) return;


    thinking = true;

    shouldListenAgain = false;

    stopListening();

    setState("NOVA DENKT");


    addMessage(
        "user",
        text
    );


    conversation.push({
        role: "user",
        text: text
    });


    try {

        // ====================================================
        // GEMINI STARTEN
        // ====================================================

        const aiModel =
            await initializeGemini();


        if (!aiModel) {
            throw new Error(
                "Gemini-Modell konnte nicht geladen werden."
            );
        }


        // ====================================================
        // PROMPT
        // ====================================================

        const prompt = `

Du bist Nova, eine persönliche KI.

Antworte auf Deutsch.

Du bist freundlich, ruhig, intelligent und direkt.

WICHTIGE REGELN:

1. Antworte möglichst natürlich.
2. Keine unnötigen langen Erklärungen.
3. Wenn der Benutzer eine einfache Frage stellt,
   antworte kurz und klar.
4. Wenn der Benutzer "öffne YouTube" sagt,
   soll eine Aktion ausgegeben werden.
5. Wenn der Benutzer "öffne Google" sagt,
   soll eine Aktion ausgegeben werden.
6. Gib die Antwort ausschließlich als JSON zurück.

Format:

{
  "answer": "Deine Antwort",
  "action": "none"
}

Mögliche Aktionen:

none
youtube
google

Beispiele:

Benutzer:
"Hallo Nova"

Antwort:
{
  "answer": "Hallo! Was kann ich für dich tun?",
  "action": "none"
}

Benutzer:
"Öffne YouTube"

Antwort:
{
  "answer": "Ich öffne YouTube.",
  "action": "youtube"
}

Benutzer:
"Öffne Google"

Antwort:
{
  "answer": "Ich öffne Google.",
  "action": "google"
}

Benutzer:
"Wie spät ist es?"

Antwort:
{
  "answer": "Ich kann dir die aktuelle Uhrzeit nennen.",
  "action": "none"
}

Aktuelle Unterhaltung:

${conversation
    .slice(-12)
    .map(x =>
        `${x.role}: ${x.text}`
    )
    .join("\n")}

Neue Nachricht:

${text}

`;


        // ====================================================
        // GEMINI REQUEST
        // ====================================================

        const result =
            await aiModel.generateContent(
                prompt
            );


        const response =
            result.response;


        let answer =
            response.text();


        // ====================================================
        // JSON PARSEN
        // ====================================================

        let data;

        try {

            answer =
                answer
                    .replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .trim();

            data =
                JSON.parse(answer);

        } catch (jsonError) {

            console.warn(
                "JSON konnte nicht gelesen werden:",
                answer
            );

            data = {
                answer: answer,
                action: "none"
            };
        }


        const novaAnswer =
            data.answer ||
            "Ich konnte darauf gerade nicht antworten.";


        const action =
            data.action ||
            "none";


        conversation.push({
            role: "nova",
            text: novaAnswer
        });


        // ====================================================
        // NOVA ANTWORT
        // ====================================================

        addMessage(
            "nova",
            novaAnswer
        );


        // Denken beenden BEVOR gesprochen wird.

        thinking = false;


        // ====================================================
        // AKTION
        // ====================================================

        executeAction(action);


        // ====================================================
        // SPRACHE
        // ====================================================

        if (mode === "voice") {

            // speak() stoppt das Mikrofon noch einmal
            // und startet es erst nach dem Ende.

            await speak(
                novaAnswer
            );

        } else {

            setState("BEREIT");
        }


    } catch (error) {

        thinking = false;

        isSpeaking = false;

        stopListening();


        console.error(
            "=============================="
        );

        console.error(
            "NOVA GEMINI FEHLER:"
        );

        console.error(error);

        console.error(
            "=============================="
        );


        // ====================================================
        // ECHTEN FEHLER ANZEIGEN
        // ====================================================

        let errorText =
            error?.message ||
            error?.code ||
            String(error);


        if (
            errorText.includes("permission-denied")
        ) {

            errorText =
                "Firebase hat den Zugriff auf Gemini verweigert. Prüfe die Firebase AI Logic Einrichtung.";
        }


        if (
            errorText.includes("not-found")
        ) {

            errorText =
                "Das Gemini-Modell wurde nicht gefunden oder ist für dieses Projekt nicht verfügbar.";
        }


        if (
            errorText.includes("unauthenticated")
        ) {

            errorText =
                "Die Firebase-Anmeldung ist nicht gültig.";
        }


        const visibleError =
            "Gemini-Fehler: " +
            errorText;


        addMessage(
            "nova",
            visibleError
        );


        showToast(
            visibleError
        );


        setState(
            "FEHLER",
            "Details wurden im Chat angezeigt"
        );


        // NICHT versuchen, den Fehler vorzulesen.
        // Dadurch bleibt das Mikrofon sauber.


        if (
            mode === "voice"
        ) {

            setTimeout(() => {

                if (
                    !thinking &&
                    !isSpeaking
                ) {

                    startListening();
                }

            }, 700);
        }
    }
}


// ============================================================
// ACTIONS
// ============================================================

function executeAction(action) {

    if (!action) return;


    if (action === "youtube") {

        window.open(
            "https://www.youtube.com/",
            "_blank"
        );

        return;
    }


    if (action === "google") {

        window.open(
            "https://www.google.com/",
            "_blank"
        );

        return;
    }
}


// ============================================================
// YOUTUBE BUTTON
// ============================================================

if (youtubeButton) {

    youtubeButton.addEventListener(
        "click",
        () => {

            window.open(
                "https://www.youtube.com/",
                "_blank"
            );
        }
    );
}


// ============================================================
// GOOGLE BUTTON
// ============================================================

if (googleButton) {

    googleButton.addEventListener(
        "click",
        () => {

            window.open(
                "https://www.google.com/",
                "_blank"
            );
        }
    );
}


// ============================================================
// GOOGLE LOGIN
// ============================================================

if (loginButton) {

    loginButton.addEventListener(
        "click",
        async () => {

            try {

                await signInWithPopup(
                    auth,
                    googleProvider
                );

            } catch (error) {

                console.error(
                    "LOGIN FEHLER:",
                    error
                );

                showToast(
                    "Login fehlgeschlagen: " +
                    (error.message || error)
                );
            }
        }
    );
}


// ============================================================
// LOGOUT
// ============================================================

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

            } catch (error) {

                console.error(
                    "LOGOUT FEHLER:",
                    error
                );
            }
        }
    );
}


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        currentUser = user;


        if (user) {

            console.log(
                "Nova Benutzer:",
                user.email
            );


            if (loginButton) {
                loginButton.style.display = "none";
            }


            if (logoutButton) {
                logoutButton.style.display = "";
            }


            // User-Dokument vorbereiten

            try {

                const userRef =
                    doc(
                        db,
                        "users",
                        user.uid
                    );

                const userSnap =
                    await getDoc(userRef);


                if (!userSnap.exists()) {

                    await setDoc(
                        userRef,
                        {
                            email: user.email,
                            displayName:
                                user.displayName ||
                                "Benutzer",
                            createdAt:
                                new Date()
                        }
                    );
                }

            } catch (error) {

                console.warn(
                    "Benutzer-Daten konnten nicht gespeichert werden:",
                    error
                );
            }

        } else {

            if (loginButton) {
                loginButton.style.display = "";
            }

            if (logoutButton) {
                logoutButton.style.display = "none";
            }
        }
    }
);


// ============================================================
// MEMORY
// ============================================================

async function saveMemory(key, value) {

    if (!currentUser) return;

    try {

        const ref =
            doc(
                db,
                "users",
                currentUser.uid
            );

        await setDoc(
            ref,
            {
                memories: {
                    [key]: value
                }
            },
            {
                merge: true
            }
        );

    } catch (error) {

        console.error(
            "MEMORY FEHLER:",
            error
        );
    }
}


async function loadMemory() {

    if (!currentUser) return null;

    try {

        const ref =
            doc(
                db,
                "users",
                currentUser.uid
            );

        const snap =
            await getDoc(ref);

        if (!snap.exists()) {
            return null;
        }

        return snap.data();

    } catch (error) {

        console.error(
            "MEMORY LADEN FEHLER:",
            error
        );

        return null;
    }
}


// ============================================================
// TEST VOICE
// ============================================================

window.testNovaVoice = async function () {

    if (isSpeaking) return;

    thinking = false;

    stopListening();

    await speak(
        "Hallo. Ich bin Nova. Die Sprachwiedergabe funktioniert."
    );
};


// ============================================================
// INITIALIZATION
// ============================================================

loadSettings();

setState(
    "NOVA BEREIT"
);


console.log(
    "===================================="
);

console.log(
    "NOVA FAMILY AI gestartet"
);

console.log(
    "Sprachmodus:",
    mode
);

console.log(
    "Mikrofon unterstützt:",
    recognitionSupported
);

console.log(
    "===================================="
);


// ============================================================
// START VOICE MODE
// ============================================================

setTimeout(() => {

    if (
        mode === "voice" &&
        !isSpeaking &&
        !thinking
    ) {

        startListening();
    }

}, 1000);
