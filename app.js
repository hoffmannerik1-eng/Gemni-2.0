// ============================================================
// NOVA FAMILY AI
// komplette app.js
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
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

import { firebaseConfig } from "./firebase-config.js";


// ============================================================
// FIREBASE
// ============================================================

const firebaseApp = initializeApp(firebaseConfig);

const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const ai = getAI(firebaseApp, {
    backend: new GoogleAIBackend()
});

// Falls dein Firebase-Projekt einen anderen verfügbaren Gemini-
// Modellnamen anzeigt, diesen Modellnamen hier anpassen.
const model = getGenerativeModel(ai, {
    model: "gemini-3.7-flash"
});


// ============================================================
// ELEMENTE
// ============================================================

const loginButton =
    document.getElementById("loginButton") ||
    document.getElementById("googleLogin");

const logoutButton =
    document.getElementById("logoutButton") ||
    document.getElementById("logout");

const microphone =
    document.getElementById("microphone") ||
    document.getElementById("micButton") ||
    document.getElementById("mic");

const statusElement =
    document.getElementById("status");

const statusText =
    document.getElementById("statusText");

const userName =
    document.getElementById("userName");

const userPhoto =
    document.getElementById("userPhoto");

const familyMode =
    document.getElementById("familyMode");

const privateMode =
    document.getElementById("privateMode");

const createFamilyButton =
    document.getElementById("createFamily");

const joinFamilyButton =
    document.getElementById("joinFamily");

const familyCodeElement =
    document.getElementById("familyCode");

const memoryList =
    document.getElementById("memoryList");


// ============================================================
// VARIABLEN
// ============================================================

let currentUser = null;
let currentFamilyId = null;

let recognition = null;
let listening = false;

let currentMode = "private";

let voicesLoaded = false;


// ============================================================
// STATUS
// ============================================================

function setStatus(type, text) {

    if (statusElement) {
        statusElement.className = "";
        statusElement.classList.add(type.toLowerCase());
    }

    if (statusText) {
        statusText.textContent = text;
    }

    console.log(`[NOVA] ${type}: ${text}`);
}


// ============================================================
// SPRACHAUSGABE
// ============================================================

function loadVoices() {

    if (!("speechSynthesis" in window)) {
        console.warn("speechSynthesis wird nicht unterstützt.");
        return;
    }

    const voices = window.speechSynthesis.getVoices();

    if (voices.length > 0) {
        voicesLoaded = true;
        console.log("Stimmen geladen:", voices.length);
    }
}

if ("speechSynthesis" in window) {
    loadVoices();

    window.speechSynthesis.onvoiceschanged = () => {
        loadVoices();
    };
}


// ============================================================
// NOVA SPRICHT
// ============================================================

function speak(text) {

    if (!text) return;

    if (!("speechSynthesis" in window)) {
        console.error("Dieser Browser unterstützt keine Sprachausgabe.");
        return;
    }

    console.log("Nova spricht:", text);

    // alte Ausgabe stoppen
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang = "de-DE";
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();

    // Deutsche Stimme bevorzugen
    const germanVoice =
        voices.find(v =>
            v.lang &&
            v.lang.toLowerCase() === "de-de"
        ) ||
        voices.find(v =>
            v.lang &&
            v.lang.toLowerCase().startsWith("de")
        );

    if (germanVoice) {
        utterance.voice = germanVoice;
        console.log("Deutsche Stimme:", germanVoice.name);
    }

    utterance.onstart = () => {
        setStatus("SPEAKING", "Nova spricht...");
    };

    utterance.onend = () => {
        setStatus("READY", "Bereit");
    };

    utterance.onerror = (event) => {

        console.error(
            "Sprachausgabe-Fehler:",
            event.error
        );

        setStatus(
            "ERROR",
            "Sprachausgabe fehlgeschlagen"
        );
    };

    // kleine Verzögerung hilft besonders bei Safari
    setTimeout(() => {

        window.speechSynthesis.speak(utterance);

    }, 100);
}


// ============================================================
// TESTSPRACHE
// ============================================================

window.novaTestVoice = function () {

    speak(
        "Hallo Erik. Ich bin Nova Family AI. Meine Sprachausgabe funktioniert."
    );

};


// ============================================================
// GOOGLE LOGIN
// ============================================================

async function login() {

    try {

        const provider = new GoogleAuthProvider();

        provider.setCustomParameters({
            prompt: "select_account"
        });

        const result =
            await signInWithPopup(auth, provider);

        console.log(
            "Angemeldet:",
            result.user.displayName
        );

        speak(
            `Hallo ${result.user.displayName || "Erik"}. Ich bin bereit.`
        );

    } catch (error) {

        console.error("Login Fehler:", error);

        alert(
            "Google Login konnte nicht durchgeführt werden."
        );
    }
}


async function logout() {

    try {

        await signOut(auth);

        currentUser = null;
        currentFamilyId = null;

        setStatus(
            "READY",
            "Nicht angemeldet"
        );

    } catch (error) {

        console.error(error);

    }
}


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(auth, async (user) => {

    if (user) {

        currentUser = user;

        console.log(
            "Benutzer:",
            user.displayName,
            user.uid
        );

        if (userName) {
            userName.textContent =
                user.displayName || "Erik";
        }

        if (userPhoto && user.photoURL) {
            userPhoto.src = user.photoURL;
        }

        await loadUserData();

        setStatus(
            "READY",
            "Bereit"
        );

    } else {

        currentUser = null;

        if (userName) {
            userName.textContent =
                "Nicht angemeldet";
        }

        setStatus(
            "READY",
            "Bitte anmelden"
        );
    }

});


// ============================================================
// BENUTZERDATEN
// ============================================================

async function loadUserData() {

    if (!currentUser) return;

    try {

        const userRef =
            doc(db, "users", currentUser.uid);

        const snapshot =
            await getDoc(userRef);

        if (snapshot.exists()) {

            const data = snapshot.data();

            currentFamilyId =
                data.familyId || null;

            console.log(
                "Familie:",
                currentFamilyId
            );
        }

    } catch (error) {

        console.error(
            "Benutzerdaten konnten nicht geladen werden:",
            error
        );
    }

    await loadMemories();
}


// ============================================================
// MIKROFON
// ============================================================

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.lang = "de-DE";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;


    recognition.onstart = () => {

        listening = true;

        setStatus(
            "LISTENING",
            "Ich höre zu..."
        );

        if (microphone) {
            microphone.classList.add("active");
        }
    };


    recognition.onresult = async (event) => {

        const transcript =
            event.results[0][0].transcript.trim();

        console.log(
            "Erkannt:",
            transcript
        );

        listening = false;

        if (microphone) {
            microphone.classList.remove("active");
        }

        setStatus(
            "THINKING",
            "Nova denkt..."
        );

        await processCommand(transcript);
    };


    recognition.onerror = (event) => {

        console.error(
            "Mikrofonfehler:",
            event.error
        );

        listening = false;

        if (microphone) {
            microphone.classList.remove("active");
        }

        if (event.error === "not-allowed") {

            setStatus(
                "ERROR",
                "Mikrofonzugriff verweigert"
            );

            speak(
                "Bitte erlaube dieser Website den Zugriff auf dein Mikrofon."
            );

        } else {

            setStatus(
                "ERROR",
                "Mikrofonfehler"
            );
        }
    };


    recognition.onend = () => {

        listening = false;

        if (microphone) {
            microphone.classList.remove("active");
        }

        console.log("Mikrofon beendet.");
    };

} else {

    console.error(
        "Speech Recognition wird nicht unterstützt."
    );
}


// ============================================================
// MIKROFON BUTTON
// ============================================================

if (microphone) {

    microphone.addEventListener("click", async () => {

        // Bei Safari / Browsern zunächst Audio freischalten
        unlockAudio();

        if (!currentUser) {

            speak(
                "Bitte melde dich zuerst mit Google an."
            );

            return;
        }

        if (!recognition) {

            speak(
                "Dein Browser unterstützt die Spracheingabe leider nicht."
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

            console.error(
                "Recognition Start Fehler:",
                error
            );
        }

    });
}


// ============================================================
// AUDIO FREISCHALTEN
// ============================================================

function unlockAudio() {

    if (!("speechSynthesis" in window)) {
        return;
    }

    // Safari kann speechSynthesis manchmal erst nach
    // einer Benutzeraktion benutzen.
    const test =
        new SpeechSynthesisUtterance("");

    test.volume = 0;

    window.speechSynthesis.speak(test);
}


// ============================================================
// GEMINI
// ============================================================

async function processCommand(text) {

    if (!currentUser) return;

    try {

        const memories =
            await getMemoryContext();

        const prompt = `

Du bist Nova, eine freundliche persönliche KI.

Antworte auf Deutsch.

Der Benutzer hat gesagt:

"${text}"

Bisher bekannte Erinnerungen:

${memories || "Keine gespeicherten Erinnerungen."}

Analysiere die Anfrage.

Du MUSST ausschließlich gültiges JSON zurückgeben.

Format:

{
  "action": "NONE",
  "query": "",
  "reply": "",
  "saveMemory": false,
  "memory": ""
}

Erlaubte actions:

NONE
YOUTUBE_HOME
YOUTUBE_SEARCH
GOOGLE_SEARCH

Regeln:

Wenn der Benutzer YouTube öffnen möchte:
action = YOUTUBE_HOME

Wenn der Benutzer etwas auf YouTube suchen möchte:
action = YOUTUBE_SEARCH
query = Suchbegriff

Wenn der Benutzer Google öffnen oder etwas googeln möchte:
action = GOOGLE_SEARCH
query = Suchbegriff

Wenn der Benutzer etwas Wichtiges über sich erzählt, das später
nützlich sein könnte:
saveMemory = true
memory = kurze Zusammenfassung

reply muss immer eine kurze natürliche deutsche Antwort sein.

Keine Markdown-Ausgabe.
Nur JSON.

`;


        const result =
            await model.generateContent(prompt);

        const response =
            result.response.text();

        console.log(
            "Gemini:",
            response
        );

        const data =
            parseGeminiJSON(response);

        // Antwort speichern
        if (
            data.saveMemory === true &&
            data.memory
        ) {

            await saveMemory(
                data.memory
            );
        }

        // Aktion durchführen
        await executeAction(
            data.action,
            data.query
        );

        // sprechen
        if (data.reply) {

            speak(
                data.reply
            );
        } else {

            setStatus(
                "READY",
                "Bereit"
            );
        }

    } catch (error) {

        console.error(
            "Gemini Fehler:",
            error
        );

        handleAIError(error);
    }
}


// ============================================================
// JSON VON GEMINI
// ============================================================

function parseGeminiJSON(text) {

    try {

        return JSON.parse(text);

    } catch {

        // ```json ... ``` entfernen
        let cleaned =
            text
                .replace(/```json/gi, "")
                .replace(/```/g, "")
                .trim();

        try {

            return JSON.parse(cleaned);

        } catch {

            console.warn(
                "Gemini hat kein gültiges JSON geliefert."
            );

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
    queryText
) {

    if (!action) return;


    if (action === "YOUTUBE_HOME") {

        openWebsite(
            "https://www.youtube.com/"
        );

        return;
    }


    if (action === "YOUTUBE_SEARCH") {

        if (!queryText) return;

        const url =
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(queryText);

        openWebsite(url);

        return;
    }


    if (action === "GOOGLE_SEARCH") {

        if (!queryText) return;

        const url =
            "https://www.google.com/search?q=" +
            encodeURIComponent(queryText);

        openWebsite(url);

        return;
    }
}


// ============================================================
// WEBSITE ÖFFNEN
// ============================================================

function openWebsite(url) {

    console.log(
        "Öffne:",
        url
    );

    const tab =
        window.open(
            url,
            "NovaActionTab"
        );

    if (!tab) {

        console.warn(
            "Popup wurde blockiert."
        );

        speak(
            "Der Browser hat das Öffnen der Seite blockiert."
        );
    }
}


// ============================================================
// GEMINI FEHLER
// ============================================================

function handleAIError(error) {

    const message =
        String(
            error?.message ||
            error ||
            ""
        );

    console.error(
        "AI Error:",
        message
    );


    if (
        /429|quota|limit|resource.?exhausted/i
            .test(message)
    ) {

        setStatus(
            "ERROR",
            "Gemini Limit erreicht"
        );

        speak(
            "Das Gemini Limit ist momentan erreicht. Bitte versuche es später erneut."
        );

        return;
    }


    if (
        /permission|unauthorized|forbidden/i
            .test(message)
    ) {

        setStatus(
            "ERROR",
            "Keine Berechtigung"
        );

        speak(
            "Ich habe momentan keine Berechtigung für Gemini."
        );

        return;
    }


    setStatus(
        "ERROR",
        "Fehler bei Nova"
    );

    speak(
        "Entschuldigung, bei meiner Verbindung mit Gemini ist ein Fehler aufgetreten."
    );
}


// ============================================================
// PRIVATE MEMORY
// ============================================================

async function saveMemory(memory) {

    if (!currentUser) return;

    try {

        if (currentMode === "family" &&
            currentFamilyId) {

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

        console.log(
            "Memory gespeichert:",
            memory
        );

        await loadMemories();

    } catch (error) {

        console.error(
            "Memory konnte nicht gespeichert werden:",
            error
        );
    }
}


// ============================================================
// MEMORY LADEN
// ============================================================

async function getMemoryContext() {

    if (!currentUser) return "";

    try {

        let memories = [];


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
                document => {

                    memories.push(
                        document.data().memory
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
                document => {

                    memories.push(
                        document.data().memory
                    );
                }
            );
        }


        return memories
            .slice(-30)
            .join("\n- ");

    } catch (error) {

        console.error(
            "Memory Fehler:",
            error
        );

        return "";
    }
}


// ============================================================
// MEMORY LISTE
// ============================================================

async function loadMemories() {

    if (!memoryList || !currentUser) {
        return;
    }

    try {

        memoryList.innerHTML = "";

        let memories = [];


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
                docSnap => {

                    memories.push(
                        docSnap.data()
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
                docSnap => {

                    memories.push(
                        docSnap.data()
                    );
                }
            );
        }


        memories
            .slice(-20)
            .reverse()
            .forEach(data => {

                const item =
                    document.createElement("div");

                item.className =
                    "memory-item";

                item.textContent =
                    data.memory || "";

                memoryList.appendChild(item);
            });

    } catch (error) {

        console.error(
            "Memory Liste Fehler:",
            error
        );
    }
}


// ============================================================
// PRIVAT / FAMILIE
// ============================================================

if (privateMode) {

    privateMode.addEventListener(
        "click",
        async () => {

            currentMode =
                "private";

            privateMode.classList.add(
                "active"
            );

            if (familyMode) {
                familyMode.classList.remove(
                    "active"
                );
            }

            await loadMemories();

            speak(
                "Privater Modus aktiviert."
            );
        }
    );
}


if (familyMode) {

    familyMode.addEventListener(
        "click",
        async () => {

            if (!currentFamilyId) {

                speak(
                    "Du bist noch keiner Familie beigetreten."
                );

                return;
            }

            currentMode =
                "family";

            familyMode.classList.add(
                "active"
            );

            if (privateMode) {
                privateMode.classList.remove(
                    "active"
                );
            }

            await loadMemories();

            speak(
                "Familienmodus aktiviert."
            );
        }
    );
}


// ============================================================
// FAMILIE ERSTELLEN
// ============================================================

if (createFamilyButton) {

    createFamilyButton.addEventListener(
        "click",
        async () => {

            if (!currentUser) {

                speak(
                    "Bitte melde dich zuerst an."
                );

                return;
            }


            try {

                const familyId =
                    crypto.randomUUID()
                        .replaceAll("-", "")
                        .substring(0, 8)
                        .toUpperCase();


                await setDoc(
                    doc(
                        db,
                        "families",
                        familyId
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
                        familyId,
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
                            familyId
                    },
                    {
                        merge: true
                    }
                );


                currentFamilyId =
                    familyId;


                if (familyCodeElement) {

                    familyCodeElement.textContent =
                        familyId;
                }


                speak(
                    `Die Familie wurde erstellt. Dein Familiencode ist ${familyId}.`
                );


            } catch (error) {

                console.error(
                    "Familie erstellen:",
                    error
                );

                speak(
                    "Die Familie konnte nicht erstellt werden."
                );
            }
        }
    );
}


// ============================================================
// FAMILIE BEITRETEN
// ============================================================

if (joinFamilyButton) {

    joinFamilyButton.addEventListener(
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
                    "Familiencode eingeben:"
                );


            if (!code) return;


            const familyId =
                code.trim().toUpperCase();


            try {

                const familyRef =
                    doc(
                        db,
                        "families",
                        familyId
                    );


                const family =
                    await getDoc(
                        familyRef
                    );


                if (!family.exists()) {

                    speak(
                        "Diese Familie wurde nicht gefunden."
                    );

                    return;
                }


                await setDoc(
                    doc(
                        db,
                        "families",
                        familyId,
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
                            familyId
                    },
                    {
                        merge: true
                    }
                );


                currentFamilyId =
                    familyId;


                if (familyCodeElement) {

                    familyCodeElement.textContent =
                        familyId;
                }


                speak(
                    "Du bist der Familie beigetreten."
                );


            } catch (error) {

                console.error(
                    "Familie beitreten:",
                    error
                );

                speak(
                    "Der Beitritt zur Familie ist fehlgeschlagen."
                );
            }
        }
    );
}


// ============================================================
// LOGIN / LOGOUT BUTTONS
// ============================================================

if (loginButton) {

    loginButton.addEventListener(
        "click",
        () => {

            unlockAudio();

            login();
        }
    );
}


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        logout
    );
}


// ============================================================
// START
// ============================================================

setStatus(
    "READY",
    "Nova ist bereit"
);

console.log(
    "Nova Family AI gestartet."
);
