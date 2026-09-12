// ============================================================
// NOVA FAMILY AI
// ============================================================

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    addDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

import {
    getAI,
    getGenerativeModel,
    GoogleAIBackend
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-ai.js";

import {
    firebaseConfig
} from "./firebase-config.js";


// ============================================================
// FIREBASE
// ============================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const ai = getAI(app, {
    backend: new GoogleAIBackend()
});

const model = getGenerativeModel(ai, {
    model: "gemini-3.7-flash"
});


// ============================================================
// ELEMENTE
// ============================================================

const $ = id => document.getElementById(id);

const loginButton = $("loginButton");
const logoutButton = $("logoutButton");

const userInfo = $("userInfo");
const userPhoto = $("userPhoto");
const userName = $("userName");
const userEmail = $("userEmail");

const microphone = $("microphone");

const statusElement = $("status");
const statusText = $("statusText");

const voiceMode = $("voiceMode");
const textMode = $("textMode");

const textChat = $("textChat");
const messages = $("messages");
const textInput = $("textInput");
const sendText = $("sendText");

const privateMode = $("privateMode");
const familyMode = $("familyMode");

const createFamily = $("createFamily");
const joinFamily = $("joinFamily");

const familyCode = $("familyCode");
const memoryList = $("memoryList");


// ============================================================
// VARIABLEN
// ============================================================

let currentUser = null;

let currentFamilyId = null;

let currentMode = "private";

let currentChatMode = "voice";

let recognition = null;

let listening = false;


// ============================================================
// STATUS
// ============================================================

function setStatus(type, text) {

    statusElement.textContent = type;

    statusText.textContent = text;

    microphone.classList.remove(
        "listening",
        "thinking",
        "speaking"
    );

    if (type === "ZUHÖREN") {
        microphone.classList.add("listening");
    }

    if (type === "DENKEN") {
        microphone.classList.add("thinking");
    }

    if (type === "SPRECHEN") {
        microphone.classList.add("speaking");
    }
}


// ============================================================
// TOAST
// ============================================================

function toast(text) {

    const element = $("toast");

    element.textContent = text;

    element.classList.add("show");

    setTimeout(() => {
        element.classList.remove("show");
    }, 3000);
}


// ============================================================
// SPRACHAUSGABE
// ============================================================

function speak(text) {

    if (!text) return;

    if (!window.speechSynthesis) {

        console.error(
            "speechSynthesis nicht verfügbar"
        );

        return;
    }

    window.speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(text);

    utterance.lang = "de-DE";

    utterance.rate = 0.95;

    utterance.pitch = 1;

    utterance.volume = 1;

    const voices =
        window.speechSynthesis.getVoices();

    const germanVoice =
        voices.find(
            voice =>
                voice.lang === "de-DE"
        ) ||
        voices.find(
            voice =>
                voice.lang?.startsWith("de")
        );

    if (germanVoice) {
        utterance.voice = germanVoice;
    }

    utterance.onstart = () => {

        setStatus(
            "SPRECHEN",
            "Nova spricht..."
        );
    };

    utterance.onend = () => {

        setStatus(
            "BEREIT",
            "Nova wartet"
        );
    };

    utterance.onerror = error => {

        console.error(
            "TTS Fehler:",
            error
        );

        setStatus(
            "FEHLER",
            "Sprachausgabe fehlgeschlagen"
        );
    };

    window.speechSynthesis.speak(
        utterance
    );
}


window.speechSynthesis?.addEventListener(
    "voiceschanged",
    () => {
        window.speechSynthesis.getVoices();
    }
);


// ============================================================
// GOOGLE LOGIN
// ============================================================

async function login() {

    try {

        const provider =
            new GoogleAuthProvider();

        provider.setCustomParameters({
            prompt: "select_account"
        });

        // Redirect ist robuster als Popup,
        // besonders auf Safari / mobilen Geräten.
        await signInWithRedirect(
            auth,
            provider
        );

    } catch (error) {

        console.error(
            "LOGIN FEHLER:",
            error
        );

        toast(
            "Google-Anmeldung konnte nicht gestartet werden."
        );
    }
}


// ============================================================
// REDIRECT ERGEBNIS
// ============================================================

try {

    const result =
        await getRedirectResult(auth);

    if (result?.user) {

        console.log(
            "Google Login erfolgreich:",
            result.user.email
        );
    }

} catch (error) {

    console.error(
        "REDIRECT LOGIN FEHLER:",
        error
    );

    toast(
        "Anmeldung konnte nicht abgeschlossen werden."
    );
}


// ============================================================
// LOGOUT
// ============================================================

async function logout() {

    try {

        await signOut(auth);

        toast(
            "Du wurdest abgemeldet."
        );

    } catch (error) {

        console.error(error);
    }
}


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        console.log(
            "AUTH STATE:",
            user
        );

        if (user) {

            currentUser = user;

            userInfo.classList.remove(
                "hidden"
            );

            loginButton.classList.add(
                "hidden"
            );

            logoutButton.classList.remove(
                "hidden"
            );

            userName.textContent =
                user.displayName ||
                "Benutzer";

            userEmail.textContent =
                user.email ||
                "";

            if (user.photoURL) {

                userPhoto.src =
                    user.photoURL;
            }

            setStatus(
                "BEREIT",
                "Nova ist bereit"
            );

            await loadUser();

            toast(
                `Angemeldet als ${user.displayName || user.email}`
            );

        } else {

            currentUser = null;

            userInfo.classList.add(
                "hidden"
            );

            loginButton.classList.remove(
                "hidden"
            );

            logoutButton.classList.add(
                "hidden"
            );

            setStatus(
                "BEREIT",
                "Bitte anmelden"
            );
        }
    }
);


// ============================================================
// USER LADEN
// ============================================================

async function loadUser() {

    if (!currentUser) return;

    try {

        const ref =
            doc(
                db,
                "users",
                currentUser.uid
            );

        const snapshot =
            await getDoc(ref);

        if (snapshot.exists()) {

            const data =
                snapshot.data();

            currentFamilyId =
                data.familyId || null;
        }

        await loadMemories();

    } catch (error) {

        console.error(
            "USER LOAD FEHLER:",
            error
        );
    }
}


// ============================================================
// SPEECH RECOGNITION
// ============================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition) {

    recognition =
        new SpeechRecognition();

    recognition.lang = "de-DE";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;


    recognition.onstart = () => {

        listening = true;

        setStatus(
            "ZUHÖREN",
            "Ich höre zu..."
        );
    };


    recognition.onresult =
        async event => {

            const text =
                event
                    .results[0][0]
                    .transcript
                    .trim();

            console.log(
                "SPRACHE:",
                text
            );

            listening = false;

            await sendToNova(text);
        };


    recognition.onerror =
        event => {

            console.error(
                "MIC ERROR:",
                event.error
            );

            listening = false;

            setStatus(
                "FEHLER",
                "Mikrofonfehler"
            );

            if (
                event.error ===
                "not-allowed"
            ) {

                speak(
                    "Bitte erlaube den Mikrofonzugriff für diese Website."
                );
            }
        };


    recognition.onend = () => {

        listening = false;
    };

}


// ============================================================
// MIKROFON
// ============================================================

microphone.addEventListener(
    "click",
    () => {

        if (!currentUser) {

            speak(
                "Bitte melde dich zuerst mit Google an."
            );

            return;
        }

        if (!recognition) {

            speak(
                "Dein Browser unterstützt die Spracheingabe nicht."
            );

            return;
        }

        if (listening) {

            recognition.stop();

            return;
        }

        try {

            recognition.start();

        } catch (error) {

            console.error(error);
        }
    }
);


// ============================================================
// CHAT MODUS
// ============================================================

voiceMode.addEventListener(
    "click",
    () => {

        currentChatMode = "voice";

        voiceMode.classList.add(
            "active"
        );

        textMode.classList.remove(
            "active"
        );

        textChat.classList.add(
            "hidden"
        );
    }
);


textMode.addEventListener(
    "click",
    () => {

        currentChatMode = "text";

        textMode.classList.add(
            "active"
        );

        voiceMode.classList.remove(
            "active"
        );

        textChat.classList.remove(
            "hidden"
        );

        textInput.focus();
    }
);


// ============================================================
// TEXT SENDEN
// ============================================================

sendText.addEventListener(
    "click",
    () => {

        sendTextMessage();
    }
);


textInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            sendTextMessage();
        }
    }
);


async function sendTextMessage() {

    const text =
        textInput.value.trim();

    if (!text) return;

    if (!currentUser) {

        toast(
            "Bitte zuerst anmelden."
        );

        return;
    }

    textInput.value = "";

    addMessage(
        "user",
        text
    );

    await sendToNova(text);
}


// ============================================================
// CHAT NACHRICHT
// ============================================================

function addMessage(
    type,
    text
) {

    const element =
        document.createElement("div");

    element.className =
        `message ${type}`;

    element.textContent =
        text;

    messages.appendChild(
        element
    );

    messages.scrollTop =
        messages.scrollHeight;
}


// ============================================================
// GEMINI
// ============================================================

async function sendToNova(text) {

    if (!currentUser) return;

    setStatus(
        "DENKEN",
        "Nova denkt..."
    );

    try {

        const memories =
            await getMemoryContext();

        const prompt = `

Du bist Nova Family AI.

Du bist eine moderne persönliche KI.

Antworte immer auf Deutsch.

Der Benutzer sagt:

"${text}"

Bekannte Erinnerungen:

${memories || "Keine Erinnerungen."}

Deine Aufgabe:

Beantworte die Anfrage natürlich.

Wenn der Benutzer YouTube öffnen möchte:

action = YOUTUBE_HOME

Wenn er etwas auf YouTube suchen möchte:

action = YOUTUBE_SEARCH

Wenn er etwas googeln möchte:

action = GOOGLE_SEARCH

Wenn der Benutzer etwas über sich erzählt,
das später nützlich sein könnte:

saveMemory = true

memory = kurze Zusammenfassung.

Gib ausschließlich dieses JSON zurück:

{
    "action": "NONE",
    "query": "",
    "reply": "",
    "saveMemory": false,
    "memory": ""
}

Erlaubte Aktionen:

NONE
YOUTUBE_HOME
YOUTUBE_SEARCH
GOOGLE_SEARCH

`;


        const result =
            await model.generateContent(
                prompt
            );

        const raw =
            result.response.text();

        console.log(
            "GEMINI:",
            raw
        );

        const data =
            parseJSON(raw);


        if (
            data.saveMemory &&
            data.memory
        ) {

            await saveMemory(
                data.memory
            );
        }


        await executeAction(
            data.action,
            data.query
        );


        if (currentChatMode === "text") {

            addMessage(
                "nova",
                data.reply || "Okay."
            );

        } else {

            speak(
                data.reply || "Okay."
            );
        }


    } catch (error) {

        console.error(
            "GEMINI ERROR:",
            error
        );

        handleAIError(
            error
        );
    }
}


// ============================================================
// JSON PARSER
// ============================================================

function parseJSON(text) {

    try {

        return JSON.parse(
            text
        );

    } catch {

        const cleaned =
            text
                .replace(
                    /```json/gi,
                    ""
                )
                .replace(
                    /```/g,
                    ""
                )
                .trim();

        try {

            return JSON.parse(
                cleaned
            );

        } catch {

            return {
                action: "NONE",
                query: "",
                reply: text,
                saveMemory: false,
                memory: ""
            };
        }
    }
}


// ============================================================
// AKTIONEN
// ============================================================

async function executeAction(
    action,
    query
) {

    if (
        action ===
        "YOUTUBE_HOME"
    ) {

        window.open(
            "https://www.youtube.com/",
            "_blank"
        );

        return;
    }


    if (
        action ===
        "YOUTUBE_SEARCH"
    ) {

        if (!query) return;

        const url =
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(query);

        window.open(
            url,
            "_blank"
        );

        return;
    }


    if (
        action ===
        "GOOGLE_SEARCH"
    ) {

        if (!query) return;

        const url =
            "https://www.google.com/search?q=" +
            encodeURIComponent(query);

        window.open(
            url,
            "_blank"
        );
    }
}


// ============================================================
// MEMORY SPEICHERN
// ============================================================

async function saveMemory(memory) {

    if (!currentUser) return;

    try {

        if (
            currentMode === "family" &&
            currentFamilyId
        ) {

            await addDoc(
                collection(
                    db,
                    "familyMemories"
                ),
                {
                    familyId:
                        currentFamilyId,

                    ownerUid:
                        currentUser.uid,

                    memory:
                        memory,

                    createdAt:
                        serverTimestamp()
                }
            );

        } else {

            await addDoc(
                collection(
                    db,
                    "memories"
                ),
                {
                    ownerUid:
                        currentUser.uid,

                    memory:
                        memory,

                    createdAt:
                        serverTimestamp()
                }
            );
        }

        await loadMemories();

    } catch (error) {

        console.error(
            "MEMORY ERROR:",
            error
        );
    }
}


// ============================================================
// MEMORY CONTEXT
// ============================================================

async function getMemoryContext() {

    if (!currentUser) return "";

    try {

        let result = [];


        if (
            currentMode === "family" &&
            currentFamilyId
        ) {

            const q =
                query(
                    collection(
                        db,
                        "familyMemories"
                    ),
                    where(
                        "familyId",
                        "==",
                        currentFamilyId
                    )
                );

            const snapshot =
                await getDocs(q);

            snapshot.forEach(
                doc => {

                    result.push(
                        doc.data().memory
                    );
                }
            );

        } else {

            const q =
                query(
                    collection(
                        db,
                        "memories"
                    ),
                    where(
                        "ownerUid",
                        "==",
                        currentUser.uid
                    )
                );

            const snapshot =
                await getDocs(q);

            snapshot.forEach(
                doc => {

                    result.push(
                        doc.data().memory
                    );
                }
            );
        }


        return result
            .slice(-30)
            .join("\n- ");

    } catch (error) {

        console.error(
            error
        );

        return "";
    }
}


// ============================================================
// MEMORY LISTE
// ============================================================

async function loadMemories() {

    if (!currentUser) return;

    try {

        memoryList.innerHTML = "";

        const memories =
            await getMemoryContext();

        if (!memories) {

            memoryList.innerHTML =
                `<div class="memory-item">
                    Noch keine Erinnerungen.
                </div>`;

            return;
        }

        memories
            .split("\n- ")
            .filter(Boolean)
            .forEach(
                memory => {

                    const item =
                        document.createElement(
                            "div"
                        );

                    item.className =
                        "memory-item";

                    item.textContent =
                        memory;

                    memoryList.appendChild(
                        item
                    );
                }
            );

    } catch (error) {

        console.error(
            error
        );
    }
}


// ============================================================
// PRIVAT
// ============================================================

privateMode.addEventListener(
    "click",
    async () => {

        currentMode = "private";

        privateMode.classList.add(
            "active"
        );

        familyMode.classList.remove(
            "active"
        );

        await loadMemories();

        toast(
            "Privater Modus"
        );
    }
);


// ============================================================
// FAMILIE
// ============================================================

familyMode.addEventListener(
    "click",
    async () => {

        if (!currentFamilyId) {

            speak(
                "Du bist noch keiner Familie beigetreten."
            );

            return;
        }

        currentMode = "family";

        familyMode.classList.add(
            "active"
        );

        privateMode.classList.remove(
            "active"
        );

        await loadMemories();

        toast(
            "Familienmodus"
        );
    }
);


// ============================================================
// FAMILIE ERSTELLEN
// ============================================================

createFamily.addEventListener(
    "click",
    async () => {

        if (!currentUser) {

            speak(
                "Bitte melde dich zuerst an."
            );

            return;
        }

        try {

            const code =
                crypto
                    .randomUUID()
                    .replaceAll("-", "")
                    .substring(0, 8)
                    .toUpperCase();


            await setDoc(
                doc(
                    db,
                    "families",
                    code
                ),
                {
                    ownerUid:
                        currentUser.uid,

                    createdAt:
                        serverTimestamp()
                }
            );


            await setDoc(
                doc(
                    db,
                    "families",
                    code,
                    "members",
                    currentUser.uid
                ),
                {
                    uid:
                        currentUser.uid,

                    name:
                        currentUser.displayName ||
                        "Mitglied",

                    joinedAt:
                        serverTimestamp()
                }
            );


            await setDoc(
                doc(
                    db,
                    "users",
                    currentUser.uid
                ),
                {
                    familyId:
                        code
                },
                {
                    merge: true
                }
            );


            currentFamilyId =
                code;

            familyCode.textContent =
                `Familiencode: ${code}`;

            speak(
                `Die Familie wurde erstellt. Dein Code ist ${code}.`
            );

        } catch (error) {

            console.error(
                error
            );

            speak(
                "Die Familie konnte nicht erstellt werden."
            );
        }
    }
);


// ============================================================
// FAMILIE BEITRETEN
// ============================================================

joinFamily.addEventListener(
    "click",
    async () => {

        if (!currentUser) {

            speak(
                "Bitte melde dich zuerst an."
            );

            return;
        }

        const code =
            prompt(
                "Familiencode:"
            );

        if (!code) return;

        const id =
            code
                .trim()
                .toUpperCase();


        try {

            const ref =
                doc(
                    db,
                    "families",
                    id
                );

            const snapshot =
                await getDoc(ref);


            if (!snapshot.exists()) {

                speak(
                    "Diese Familie wurde nicht gefunden."
                );

                return;
            }


            await setDoc(
                doc(
                    db,
                    "families",
                    id,
                    "members",
                    currentUser.uid
                ),
                {
                    uid:
                        currentUser.uid,

                    name:
                        currentUser.displayName ||
                        "Mitglied",

                    joinedAt:
                        serverTimestamp()
                }
            );


            await setDoc(
                doc(
                    db,
                    "users",
                    currentUser.uid
                ),
                {
                    familyId:
                        id
                },
                {
                    merge: true
                }
            );


            currentFamilyId =
                id;

            familyCode.textContent =
                `Familiencode: ${id}`;

            speak(
                "Du bist der Familie beigetreten."
            );

        } catch (error) {

            console.error(
                error
            );

            speak(
                "Der Beitritt ist fehlgeschlagen."
            );
        }
    }
);


// ============================================================
// LOGIN BUTTON
// ============================================================

loginButton.addEventListener(
    "click",
    login
);


// ============================================================
// LOGOUT
// ============================================================

logoutButton.addEventListener(
    "click",
    logout
);


// ============================================================
// FEHLER
// ============================================================

function handleAIError(error) {

    const text =
        String(
            error?.message ||
            error
        );


    if (
        /429|quota|limit|resource.?exhausted/i
            .test(text)
    ) {

        setStatus(
            "LIMIT",
            "Gemini Limit erreicht"
        );

        speak(
            "Das Gemini Limit ist momentan erreicht. Bitte versuche es später erneut."
        );

        return;
    }


    console.error(
        "AI ERROR:",
        error
    );


    setStatus(
        "FEHLER",
        "Nova hat einen Fehler"
    );


    if (
        currentChatMode === "text"
    ) {

        addMessage(
            "nova",
            "Entschuldigung, momentan ist ein Fehler aufgetreten."
        );

    } else {

        speak(
            "Entschuldigung, momentan ist ein Fehler aufgetreten."
        );
    }
}


// ============================================================
// START
// ============================================================

setStatus(
    "BEREIT",
    "Nova wartet"
);

console.log(
    "NOVA FAMILY AI ONLINE"
);
