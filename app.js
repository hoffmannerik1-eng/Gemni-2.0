````javascript
// ============================================================
// NOVA FAMILY AI
// KOMPLETTE APP.JS
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";


// ============================================================
// FIREBASE
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyAKmdUuFEfqmvs5gbjcdFhB1RIg9C9EtrE",
    authDomain: "nova-68fc1.firebaseapp.com",
    projectId: "nova-68fc1",
    storageBucket: "nova-68fc1.firebasestorage.app",
    messagingSenderId: "1020069093020",
    appId: "1:1020069093020:web:9be72af9e60af659475759"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();


// ============================================================
// ELEMENTE
// ============================================================

const chat = document.getElementById("chat");
const input = document.getElementById("input");

const sendButton =
    document.getElementById("sendButton");

const micButton =
    document.getElementById("micButton") ||
    document.getElementById("mic");

const voiceModeButton =
    document.getElementById("voiceModeButton");

const textModeButton =
    document.getElementById("textModeButton");

const youtubeButton =
    document.getElementById("youtubeButton");

const googleButton =
    document.getElementById("googleButton");

const loginButton =
    document.getElementById("loginButton") ||
    document.getElementById("googleLogin");

const logoutButton =
    document.getElementById("logoutButton") ||
    document.getElementById("logout");


// ============================================================
// STATUS
// ============================================================

const stateElement =
    document.getElementById("state") ||
    document.getElementById("status");


// ============================================================
// VARIABLEN
// ============================================================

let currentUser = null;

let mode = "voice";

let model = null;

let recognition = null;

let recognitionSupported = false;

let isListening = false;

let isSpeaking = false;

let isThinking = false;

let conversation = [];

let voices = [];

let selectedVoice = null;


// ============================================================
// STATUS
// ============================================================

function setState(text) {

    if (!stateElement) return;

    stateElement.textContent = text;
}


// ============================================================
// CHAT
// ============================================================

function addMessage(type, text) {

    if (!chat) return;

    const message = document.createElement("div");

    if (type === "user") {
        message.className = "message user-message";
    } else {
        message.className = "message nova-message";
    }

    message.textContent = text;

    chat.appendChild(message);

    chat.scrollTop = chat.scrollHeight;
}


// ============================================================
// TOAST
// ============================================================

function showToast(text) {

    let toast =
        document.getElementById("novaToast");

    if (!toast) {

        toast = document.createElement("div");

        toast.id = "novaToast";

        toast.style.position = "fixed";
        toast.style.left = "50%";
        toast.style.bottom = "25px";
        toast.style.transform = "translateX(-50%)";
        toast.style.zIndex = "99999";

        toast.style.background = "#111";
        toast.style.color = "#fff";

        toast.style.padding =
            "12px 18px";

        toast.style.borderRadius =
            "12px";

        toast.style.border =
            "1px solid #333";

        toast.style.maxWidth =
            "85%";

        toast.style.fontSize =
            "14px";

        document.body.appendChild(toast);
    }

    toast.textContent = text;

    toast.style.display = "block";

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {

        toast.style.display = "none";

    }, 5000);
}


// ============================================================
// MODUS
// ============================================================

function setMode(newMode) {

    mode = newMode;

    localStorage.setItem(
        "novaMode",
        mode
    );

    if (mode === "voice") {

        setState("SPRACHMODUS");

        showToast(
            "Tippe auf das Mikrofon und sprich mit Nova."
        );

    } else {

        stopListening();

        setState("TEXTMODUS");
    }
}


if (voiceModeButton) {

    voiceModeButton.addEventListener(
        "click",
        () => {

            setMode("voice");

        }
    );
}


if (textModeButton) {

    textModeButton.addEventListener(
        "click",
        () => {

            setMode("text");

        }
    );
}


// ============================================================
// GEMINI
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

        const ai =
            getAI(app, {
                backend:
                    new GoogleAIBackend()
            });

        model =
            getGenerativeModel(
                ai,
                {
                    model:
                        "gemini-3.7-flash"
                }
            );

        console.log(
            "Gemini erfolgreich geladen."
        );

        return model;

    } catch (error) {

        console.error(
            "GEMINI INITIALISIERUNG:",
            error
        );

        throw error;
    }
}


// ============================================================
// SPRACHEN
// ============================================================

function loadVoices() {

    voices =
        window.speechSynthesis.getVoices();

    if (!voices.length) return;

    const saved =
        localStorage.getItem(
            "novaVoice"
        );

    if (saved) {

        selectedVoice =
            voices.find(
                voice =>
                    voice.name === saved
            );
    }

    if (!selectedVoice) {

        selectedVoice =
            voices.find(
                voice =>
                    voice.lang &&
                    voice.lang
                        .toLowerCase()
                        .startsWith("de")
            );

    }

    if (!selectedVoice) {
        selectedVoice = voices[0];
    }
}


window.speechSynthesis.onvoiceschanged =
    loadVoices;

loadVoices();


// ============================================================
// NOVA SPRICHT
// ============================================================

function speak(text) {

    return new Promise(resolve => {

        if (!text) {

            resolve();
            return;
        }


        // ----------------------------------------------------
        // SEHR WICHTIG:
        // Mikrofon SOFORT ausschalten.
        // ----------------------------------------------------

        stopListening();


        // Alte Sprache abbrechen.

        try {

            window.speechSynthesis.cancel();

        } catch (_) {}


        isSpeaking = true;

        setState("NOVA SPRICHT");


        const utterance =
            new SpeechSynthesisUtterance(
                text
            );


        utterance.lang =
            "de-DE";

        utterance.rate =
            1.0;

        utterance.pitch =
            1.0;

        utterance.volume =
            1.0;


        if (selectedVoice) {

            utterance.voice =
                selectedVoice;
        }


        // ----------------------------------------------------
        // NOVA BEGINNT ZU SPRECHEN
        // ----------------------------------------------------

        utterance.onstart = () => {

            isSpeaking = true;

            // Noch einmal sicherstellen.

            stopListening();

            setState(
                "NOVA SPRICHT"
            );
        };


        // ----------------------------------------------------
        // NOVA IST KOMPLETT FERTIG
        // ----------------------------------------------------

        utterance.onend = () => {

            isSpeaking = false;

            setState("BEREIT");

            resolve();


            // ERST JETZT wieder zuhören.

            if (
                mode === "voice" &&
                !isThinking
            ) {

                setTimeout(() => {

                    if (
                        !isSpeaking &&
                        !isThinking &&
                        mode === "voice"
                    ) {

                        startListening();

                    }

                }, 500);
            }
        };


        // ----------------------------------------------------
        // SPRACHFEHLER
        // ----------------------------------------------------

        utterance.onerror =
            (event) => {

                console.error(
                    "SPRACHAUSGABE:",
                    event
                );

                isSpeaking = false;

                setState("BEREIT");

                resolve();


                if (
                    mode === "voice" &&
                    !isThinking
                ) {

                    setTimeout(
                        () => {

                            startListening();

                        },
                        500
                    );
                }
            };


        window.speechSynthesis.speak(
            utterance
        );

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

        recognitionSupported =
            false;

        console.warn(
            "SpeechRecognition nicht verfügbar."
        );

        return;
    }


    recognitionSupported =
        true;


    recognition =
        new SpeechRecognition();


    recognition.lang =
        "de-DE";


    recognition.continuous =
        false;


    recognition.interimResults =
        false;


    recognition.maxAlternatives =
        1;


    // --------------------------------------------------------
    // MIKROFON START
    // --------------------------------------------------------

    recognition.onstart =
        () => {

            // Sicherheitsprüfung

            if (
                isSpeaking ||
                isThinking
            ) {

                try {
                    recognition.stop();
                } catch (_) {}

                return;
            }


            isListening = true;

            setState(
                "ICH HÖRE ZU"
            );
        };


    // --------------------------------------------------------
    // SPRACHE ERKANNT
    // --------------------------------------------------------

    recognition.onresult =
        async event => {

            // NIEMALS während Nova spricht.

            if (
                isSpeaking ||
                isThinking
            ) {

                return;
            }


            const result =
                event.results[
                    event.results.length - 1
                ];


            if (
                !result ||
                !result[0]
            ) {

                return;
            }


            const text =
                result[0]
                    .transcript
                    .trim();


            if (!text) {
                return;
            }


            console.log(
                "Benutzer:",
                text
            );


            if (input) {
                input.value = text;
            }


            await sendToNova(
                text
            );
        };


    // --------------------------------------------------------
    // FEHLER
    // --------------------------------------------------------

    recognition.onerror =
        event => {

            console.warn(
                "MIKROFON:",
                event.error
            );


            isListening =
                false;


            if (
                event.error ===
                    "not-allowed" ||
                event.error ===
                    "service-not-allowed"
            ) {

                setState(
                    "MIKROFON BLOCKIERT"
                );


                showToast(
                    "Safari blockiert das Mikrofon. Erlaube den Mikrofonzugriff für diese Website."
                );


                return;
            }


            if (
                event.error ===
                    "no-speech"
            ) {

                setState(
                    "BEREIT"
                );

                return;
            }


            setState(
                "BEREIT"
            );
        };


    // --------------------------------------------------------
    // MIKROFON ENDE
    // --------------------------------------------------------

    recognition.onend =
        () => {

            isListening =
                false;


            // Wenn Nova spricht:
            // NICHT wieder starten.

            if (isSpeaking) {
                return;
            }


            // Wenn Nova denkt:
            // NICHT wieder starten.

            if (isThinking) {
                return;
            }


            setState(
                "BEREIT"
            );
        };
}


setupRecognition();


// ============================================================
// MIKROFON STARTEN
// ============================================================

function startListening() {

    if (!recognitionSupported) {

        showToast(
            "Dein Browser unterstützt die Sprachsteuerung nicht."
        );

        return;
    }


    // --------------------------------------------------------
    // ABSOLUTE SPERRE
    // --------------------------------------------------------

    if (isSpeaking) {
        return;
    }

    if (isThinking) {
        return;
    }

    if (mode !== "voice") {
        return;
    }

    if (isListening) {
        return;
    }


    try {

        recognition.start();

    } catch (error) {

        console.warn(
            "Mikrofon Start:",
            error
        );
    }
}


// ============================================================
// MIKROFON STOPPEN
// ============================================================

function stopListening() {

    if (!recognition) {
        return;
    }


    try {

        recognition.stop();

    } catch (_) {}


    isListening =
        false;
}


// ============================================================
// MIKROFON BUTTON
// ============================================================

if (micButton) {

    micButton.addEventListener(
        "click",
        () => {

            // Nova spricht?
            // NICHTS machen.

            if (isSpeaking) {

                showToast(
                    "Nova spricht gerade."
                );

                return;
            }


            // Nova denkt?
            // NICHTS machen.

            if (isThinking) {

                showToast(
                    "Nova denkt gerade."
                );

                return;
            }


            mode =
                "voice";


            localStorage.setItem(
                "novaMode",
                "voice"
            );


            if (isListening) {

                stopListening();

                setState(
                    "BEREIT"
                );

            } else {

                startListening();
            }

        }
    );
}


// ============================================================
// TEXT SENDEN
// ============================================================

if (sendButton) {

    sendButton.addEventListener(
        "click",
        async () => {

            if (!input) return;


            const text =
                input.value.trim();


            if (!text) {
                return;
            }


            input.value = "";


            await sendToNova(
                text
            );
        }
    );
}


// ============================================================
// ENTER
// ============================================================

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


                if (!text) {
                    return;
                }


                input.value = "";


                await sendToNova(
                    text
                );
            }
        }
    );
}


// ============================================================
// NOVA
// ============================================================

async function sendToNova(text) {

    if (!text) {
        return;
    }


    // Während Nova denkt:
    // keine zweite Anfrage.

    if (isThinking) {
        return;
    }


    // Während Nova spricht:
    // keine zweite Anfrage.

    if (isSpeaking) {
        return;
    }


    // --------------------------------------------------------
    // MIKROFON SOFORT AUS
    // --------------------------------------------------------

    stopListening();


    isThinking =
        true;


    setState(
        "NOVA DENKT"
    );


    addMessage(
        "user",
        text
    );


    conversation.push({
        role: "user",
        text: text
    });


    try {

        // ----------------------------------------------------
        // GEMINI LADEN
        // ----------------------------------------------------

        const aiModel =
            await initializeGemini();


        // ----------------------------------------------------
        // PROMPT
        // ----------------------------------------------------

        const prompt = `

Du bist Nova, eine persönliche KI.

Sprache:
Deutsch.

Stil:
Natürlich, freundlich, intelligent und direkt.

Antworte kurz, wenn eine kurze Antwort reicht.

Du kannst bestimmte Browseraktionen ausführen.

Mögliche Aktionen:

none
youtube
google

Antworte IMMER in diesem JSON-Format:

{
  "answer": "Antwort an den Benutzer",
  "action": "none"
}

Beispiel:

Benutzer:
Hallo Nova

Antwort:

{
  "answer": "Hallo! Was kann ich für dich tun?",
  "action": "none"
}

Benutzer:
Öffne YouTube

Antwort:

{
  "answer": "Ich öffne YouTube.",
  "action": "youtube"
}

Benutzer:
Öffne Google

Antwort:

{
  "answer": "Ich öffne Google.",
  "action": "google"
}

Letzte Unterhaltung:

${conversation
    .slice(-12)
    .map(
        item =>
            item.role +
            ": " +
            item.text
    )
    .join("\n")}

Neue Nachricht:

${text}

`;


        // ----------------------------------------------------
        // GEMINI
        // ----------------------------------------------------

        const result =
            await aiModel.generateContent(
                prompt
            );


        const response =
            result.response;


        let answer =
            response.text();


        // ----------------------------------------------------
        // JSON
        // ----------------------------------------------------

        let data;


        try {

            answer =
                answer
                    .replace(
                        /```json/gi,
                        ""
                    )
                    .replace(
                        /```/g,
                        ""
                    )
                    .trim();


            data =
                JSON.parse(
                    answer
                );

        } catch (_) {

            data = {
                answer:
                    answer,
                action:
                    "none"
            };
        }


        const novaAnswer =
            data.answer ||
            "Ich habe gerade keine Antwort.";


        const action =
            data.action ||
            "none";


        conversation.push({
            role: "nova",
            text: novaAnswer
        });


        addMessage(
            "nova",
            novaAnswer
        );


        // ----------------------------------------------------
        // DENKEN FERTIG
        // ----------------------------------------------------

        isThinking =
            false;


        // ----------------------------------------------------
        // AKTION
        // ----------------------------------------------------

        executeAction(
            action
        );


        // ----------------------------------------------------
        // SPRACHE
        // ----------------------------------------------------

        if (mode === "voice") {

            await speak(
                novaAnswer
            );

        } else {

            setState(
                "BEREIT"
            );
        }


    } catch (error) {

        // ----------------------------------------------------
        // FEHLER
        // ----------------------------------------------------

        isThinking =
            false;


        isSpeaking =
            false;


        stopListening();


        console.error(
            "NOVA FEHLER:",
            error
        );


        let errorMessage =
            error?.message ||
            String(error);


        if (
            errorMessage
                .toLowerCase()
                .includes(
                    "permission-denied"
                )
        ) {

            errorMessage =
                "Firebase verweigert den Gemini-Zugriff. Prüfe Firebase AI Logic und die Projektberechtigungen.";
        }


        if (
            errorMessage
                .toLowerCase()
                .includes(
                    "not-found"
                )
        ) {

            errorMessage =
                "Das Gemini-Modell wurde nicht gefunden oder ist für dein Firebase-Projekt nicht verfügbar.";
        }


        const visibleError =
            "Gemini-Fehler: " +
            errorMessage;


        addMessage(
            "nova",
            visibleError
        );


        showToast(
            visibleError
        );


        setState(
            "FEHLER"
        );


        // Nach Fehler wieder zuhören.

        if (
            mode === "voice"
        ) {

            setTimeout(
                () => {

                    if (
                        !isSpeaking &&
                        !isThinking
                    ) {

                        startListening();
                    }

                },
                800
            );
        }
    }
}


// ============================================================
// AKTIONEN
// ============================================================

function executeAction(action) {

    if (
        action === "youtube"
    ) {

        window.open(
            "https://www.youtube.com/",
            "_blank"
        );

        return;
    }


    if (
        action === "google"
    ) {

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
// LOGIN
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
                    "LOGIN:",
                    error
                );

                showToast(
                    "Login fehlgeschlagen."
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

                await signOut(
                    auth
                );

            } catch (error) {

                console.error(
                    "LOGOUT:",
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

        currentUser =
            user;


        if (user) {

            console.log(
                "Eingeloggt:",
                user.email
            );


            if (loginButton) {
                loginButton.style.display =
                    "none";
            }


            if (logoutButton) {
                logoutButton.style.display =
                    "";
            }


            try {

                const userRef =
                    doc(
                        db,
                        "users",
                        user.uid
                    );


                const userSnapshot =
                    await getDoc(
                        userRef
                    );


                if (
                    !userSnapshot.exists()
                ) {

                    await setDoc(
                        userRef,
                        {
                            email:
                                user.email,

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
                    "User-Daten:",
                    error
                );
            }


        } else {

            if (loginButton) {
                loginButton.style.display =
                    "";
            }


            if (logoutButton) {
                logoutButton.style.display =
                    "none";
            }
        }
    }
);


// ============================================================
// VOICE TEST
// ============================================================

window.testNovaVoice =
    async function () {

        if (isSpeaking) {
            return;
        }


        isThinking =
            false;


        stopListening();


        await speak(
            "Hallo. Ich bin Nova. Die Sprachwiedergabe funktioniert."
        );
    };


// ============================================================
// START
// ============================================================

const savedMode =
    localStorage.getItem(
        "novaMode"
    );


if (
    savedMode === "voice" ||
    savedMode === "text"
) {

    mode =
        savedMode;
}


setState(
    mode === "voice"
        ? "SPRACHMODUS"
        : "TEXTMODUS"
);


console.log(
    "NOVA FAMILY AI gestartet"
);

console.log(
    "Sprachmodus:",
    mode
);

console.log(
    "SpeechRecognition:",
    recognitionSupported
);
````
