/* =====================================================
   NOVA FAMILY AI
   COMPLETE APP.JS
   ===================================================== */


/* =====================================================
   FIREBASE
===================================================== */

import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import {
    getAuth,
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

import {
    firebaseConfig
} from "./firebase-config.js";


/* =====================================================
   DOM
===================================================== */

const $ = id => document.getElementById(id);

const orb = $("orb");
const statusText = $("statusText");
const statusSub = $("statusSub");

const microphone = $("microphone");

const voiceMode = $("voiceMode");
const textMode = $("textMode");

const textChat = $("textChat");
const messages = $("messages");
const textInput = $("textInput");
const sendText = $("sendText");

const youtubeButton = $("youtubeButton");
const googleButton = $("googleButton");
const settingsButton = $("settingsButton");

const settingsOverlay = $("settingsOverlay");
const closeSettings = $("closeSettings");

const voiceSelect = $("voiceSelect");

const rateSlider = $("rateSlider");
const rateValue = $("rateValue");

const volumeSlider = $("volumeSlider");
const volumeValue = $("volumeValue");

const testVoice = $("testVoice");

const loginButton = $("loginButton");
const logoutButton = $("logoutButton");

const userPhoto = $("userPhoto");
const userInfo = $("userInfo");
const userName = $("userName");
const userEmail = $("userEmail");

const memoryToggle = $("memoryToggle");
const animationToggle = $("animationToggle");

const familyStatus = $("familyStatus");
const createFamily = $("createFamily");
const joinFamily = $("joinFamily");
const familyCode = $("familyCode");

const toast = $("toast");


/* =====================================================
   STATE
===================================================== */

let firebaseApp = null;
let auth = null;
let db = null;
let model = null;

let currentUser = null;

let recognition = null;
let recognitionRunning = false;

let voices = [];
let activeUtterance = null;

let thinking = false;
let speaking = false;

let mode = "voice";


let settings = {
    voiceName: "",
    rate: 1,
    volume: 1,
    memory: true,
    animation: true
};


/* =====================================================
   SETTINGS LOAD
===================================================== */

try {

    const saved =
        localStorage.getItem(
            "novaSettings"
        );

    if (saved) {

        settings = {
            ...settings,
            ...JSON.parse(saved)
        };

    }

} catch (error) {

    console.warn(
        "Settings konnten nicht geladen werden:",
        error
    );

}


function saveSettings() {

    try {

        localStorage.setItem(
            "novaSettings",
            JSON.stringify(settings)
        );

    } catch (error) {

        console.warn(error);

    }

}


/* =====================================================
   UI STATE
===================================================== */

function setState(
    title,
    subtitle = ""
) {

    if (statusText) {
        statusText.textContent =
            title;
    }

    if (statusSub) {
        statusSub.textContent =
            subtitle;
    }


    if (orb) {

        orb.classList.remove(
            "thinking",
            "listening",
            "speaking"
        );


        if (title === "DENKE") {

            orb.classList.add(
                "thinking"
            );

        }


        if (title === "ZUHÖREN") {

            orb.classList.add(
                "listening"
            );

        }


        if (title === "SPRECHEN") {

            orb.classList.add(
                "speaking"
            );

        }

    }

}


function showToast(text) {

    if (!toast) return;

    toast.textContent =
        text;

    toast.classList.add(
        "show"
    );


    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 3000);

}


/* =====================================================
   BASIC BUTTONS
===================================================== */

settingsButton?.addEventListener(
    "click",
    () => {

        settingsOverlay.hidden =
            false;

        refreshVoices();

    }
);


closeSettings?.addEventListener(
    "click",
    () => {

        settingsOverlay.hidden =
            true;

    }
);


settingsOverlay?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            settingsOverlay
        ) {

            settingsOverlay.hidden =
                true;

        }

    }
);


/* =====================================================
   MODES
===================================================== */

voiceMode?.addEventListener(
    "click",
    () => {

        mode =
            "voice";

        voiceMode.classList.add(
            "active"
        );

        textMode.classList.remove(
            "active"
        );

        textChat.hidden =
            true;

        setState(
            "BEREIT",
            "Drücke das Mikrofon"
        );

    }
);


textMode?.addEventListener(
    "click",
    () => {

        mode =
            "text";

        textMode.classList.add(
            "active"
        );

        voiceMode.classList.remove(
            "active"
        );

        textChat.hidden =
            false;

        setState(
            "TEXTMODUS",
            "Schreibe Nova etwas"
        );

        setTimeout(
            () => {

                textInput?.focus();

            },
            100
        );

    }
);


/* =====================================================
   YOUTUBE BUTTON
===================================================== */

youtubeButton?.addEventListener(
    "click",
    () => {

        window.open(
            "https://www.youtube.com/",
            "_blank"
        );

    }
);


/* =====================================================
   GOOGLE BUTTON
===================================================== */

googleButton?.addEventListener(
    "click",
    () => {

        window.open(
            "https://www.google.com/",
            "_blank"
        );

    }
);


/* =====================================================
   FIREBASE INIT
===================================================== */

try {

    firebaseApp =
        initializeApp(
            firebaseConfig
        );


    auth =
        getAuth(
            firebaseApp
        );


    db =
        getFirestore(
            firebaseApp
        );


    console.log(
        "Firebase gestartet."
    );

} catch (error) {

    console.error(
        "Firebase Fehler:",
        error
    );


    showToast(
        "Firebase konnte nicht gestartet werden."
    );

}


/* =====================================================
   GEMINI
===================================================== */

async function initializeGemini() {

    if (!firebaseApp) {

        return;

    }


    if (model) {

        return;

    }


    try {

        const aiModule =
            await import(
                "https://www.gstatic.com/firebasejs/12.13.0/firebase-ai.js"
            );


        const ai =
            aiModule.getAI(
                firebaseApp,
                {
                    backend:
                        new aiModule.GoogleAIBackend()
                }
            );


        model =
            aiModule.getGenerativeModel(
                ai,
                {
                    model:
                        "gemini-3.7-flash"
                }
            );


        console.log(
            "Gemini gestartet."
        );

    } catch (error) {

        console.error(
            "Gemini Fehler:",
            error
        );


        model =
            null;

    }

}


/* =====================================================
   GOOGLE LOGIN
===================================================== */

loginButton?.addEventListener(
    "click",
    async () => {

        if (!auth) {

            showToast(
                "Firebase ist nicht verfügbar."
            );

            return;

        }


        try {

            const provider =
                new GoogleAuthProvider();


            await signInWithRedirect(
                auth,
                provider
            );

        } catch (error) {

            console.error(
                "Login:",
                error
            );


            showToast(
                "Google-Anmeldung konnte nicht gestartet werden."
            );

        }

    }
);


/* =====================================================
   LOGOUT
===================================================== */

logoutButton?.addEventListener(
    "click",
    async () => {

        if (!auth) return;


        try {

            await signOut(
                auth
            );

        } catch (error) {

            console.error(
                error
            );

        }

    }
);


/* =====================================================
   REDIRECT RESULT
===================================================== */

if (auth) {

    getRedirectResult(
        auth
    ).catch(
        error => {

            console.error(
                "Login Redirect:",
                error
            );

        }
    );

}


/* =====================================================
   AUTH STATE
===================================================== */

if (auth) {

    onAuthStateChanged(
        auth,
        user => {

            currentUser =
                user;


            if (!user) {

                loginButton.hidden =
                    false;

                logoutButton.hidden =
                    true;

                userInfo.hidden =
                    true;

                userPhoto.hidden =
                    true;

                return;

            }


            loginButton.hidden =
                true;

            logoutButton.hidden =
                false;

            userInfo.hidden =
                false;


            userName.textContent =
                user.displayName ||
                "Benutzer";


            userEmail.textContent =
                user.email ||
                "";


            if (user.photoURL) {

                userPhoto.src =
                    user.photoURL;

                userPhoto.hidden =
                    false;

            }

        }
    );

}


/* =====================================================
   SPEECH RECOGNITION
===================================================== */

function initializeSpeech() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        if (microphone) {

            microphone.disabled =
                true;

        }

        return;

    }


    if (recognition) {

        return;

    }


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


    recognition.onstart =
        () => {

            recognitionRunning =
                true;


            microphone.classList.add(
                "active"
            );


            setState(
                "ZUHÖREN",
                "Ich höre zu..."
            );

        };


    recognition.onresult =
        event => {

            const text =
                event
                    .results[0][0]
                    .transcript
                    .trim();


            if (!text) {

                return;

            }


            sendToNova(
                text
            );

        };


    recognition.onerror =
        event => {

            console.error(
                "Mikrofon:",
                event.error
            );


            recognitionRunning =
                false;


            microphone.classList.remove(
                "active"
            );


            setState(
                "BEREIT",
                "Drücke das Mikrofon"
            );


            if (
                event.error ===
                "not-allowed"
            ) {

                showToast(
                    "Mikrofonzugriff wurde blockiert."
                );

            }

        };


    recognition.onend =
        () => {

            recognitionRunning =
                false;


            microphone.classList.remove(
                "active"
            );


            if (
                !thinking &&
                !speaking
            ) {

                setState(
                    "BEREIT",
                    "Drücke das Mikrofon"
                );

            }

        };

}


/* =====================================================
   MICROPHONE
===================================================== */

microphone?.addEventListener(
    "click",
    () => {

        if (!recognition) {

            initializeSpeech();

        }


        if (!recognition) {

            return;

        }


        if (
            thinking ||
            speaking
        ) {

            return;

        }


        try {

            if (
                recognitionRunning
            ) {

                recognition.stop();

            } else {

                speechSynthesis.cancel();

                recognition.start();

            }

        } catch (error) {

            console.error(
                "Microphone:",
                error
            );

        }

    }
);


/* =====================================================
   VOICES
===================================================== */

function refreshVoices() {

    voices =
        speechSynthesis.getVoices();


    if (!voiceSelect) {

        return;

    }


    voiceSelect.innerHTML =
        "";


    voices.forEach(
        voice => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                voice.name;


            option.textContent =
                `${voice.name} — ${voice.lang}`;


            voiceSelect.appendChild(
                option
            );

        }
    );


    if (
        settings.voiceName
    ) {

        voiceSelect.value =
            settings.voiceName;

    }

}


speechSynthesis.addEventListener(
    "voiceschanged",
    refreshVoices
);


refreshVoices();


/* =====================================================
   NOVA SPEAK
===================================================== */

async function speak(text) {

    if (!text) {

        return;

    }


    try {

        speechSynthesis.cancel();


        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    100
                )
        );


        speechSynthesis.resume();


        const utterance =
            new SpeechSynthesisUtterance(
                text
            );


        utterance.lang =
            "de-DE";


        utterance.rate =
            Number(
                settings.rate
            ) || 1;


        utterance.volume =
            Number(
                settings.volume
            );


        utterance.pitch =
            1;


        const currentVoices =
            speechSynthesis.getVoices();


        let voice =
            null;


        if (
            settings.voiceName
        ) {

            voice =
                currentVoices.find(
                    item =>
                        item.name ===
                        settings.voiceName
                );

        }


        if (!voice) {

            voice =
                currentVoices.find(
                    item =>
                        item.lang
                            .toLowerCase()
                            .startsWith(
                                "de"
                            )
                );

        }


        if (voice) {

            utterance.voice =
                voice;

        }


        activeUtterance =
            utterance;


        speaking =
            true;


        setState(
            "SPRECHEN",
            "Nova spricht..."
        );


        utterance.onstart =
            () => {

                speaking =
                    true;

            };


        utterance.onend =
            () => {

                speaking =
                    false;

                activeUtterance =
                    null;


                setState(
                    "BEREIT",
                    "Drücke das Mikrofon"
                );

            };


        utterance.onerror =
            error => {

                console.error(
                    "SpeechSynthesis:",
                    error
                );


                speaking =
                    false;


                activeUtterance =
                    null;


                setState(
                    "BEREIT",
                    "Drücke das Mikrofon"
                );

            };


        speechSynthesis.speak(
            utterance
        );

    } catch (error) {

        console.error(
            "Speech Error:",
            error
        );


        speaking =
            false;

    }

}


/* =====================================================
   TEST VOICE
===================================================== */

testVoice?.addEventListener(
    "click",
    () => {

        speak(
            "Hallo. Ich bin Nova. Ich bin bereit."
        );

    }
);


/* =====================================================
   VOICE SETTINGS
===================================================== */

rateSlider.value =
    settings.rate;


rateValue.textContent =
    Number(
        settings.rate
    ).toFixed(1);


rateSlider.addEventListener(
    "input",
    () => {

        settings.rate =
            Number(
                rateSlider.value
            );


        rateValue.textContent =
            settings.rate.toFixed(1);


        saveSettings();

    }
);


volumeSlider.value =
    settings.volume;


volumeValue.textContent =
    `${Math.round(
        settings.volume * 100
    )}%`;


volumeSlider.addEventListener(
    "input",
    () => {

        settings.volume =
            Number(
                volumeSlider.value
            );


        volumeValue.textContent =
            `${Math.round(
                settings.volume * 100
            )}%`;


        saveSettings();

    }
);


voiceSelect.addEventListener(
    "change",
    () => {

        settings.voiceName =
            voiceSelect.value;


        saveSettings();

    }
);


/* =====================================================
   MEMORY TOGGLE
===================================================== */

memoryToggle.checked =
    settings.memory;


memoryToggle.addEventListener(
    "change",
    () => {

        settings.memory =
            memoryToggle.checked;


        saveSettings();

    }
);


/* =====================================================
   ANIMATION TOGGLE
===================================================== */

animationToggle.checked =
    settings.animation;


animationToggle.addEventListener(
    "change",
    () => {

        settings.animation =
            animationToggle.checked;


        document.body.classList.toggle(
            "no-animation",
            !settings.animation
        );


        saveSettings();

    }
);


/* =====================================================
   TEXT CHAT
===================================================== */

sendText?.addEventListener(
    "click",
    () => {

        const text =
            textInput.value.trim();


        if (!text) {

            return;

        }


        textInput.value =
            "";


        sendToNova(
            text
        );

    }
);


textInput?.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            event.preventDefault();

            sendText.click();

        }

    }
);


/* =====================================================
   MEMORY
===================================================== */

async function getMemory() {

    if (
        !currentUser ||
        !db
    ) {

        return "";

    }


    try {

        const memoryRef =
            doc(
                db,
                "users",
                currentUser.uid,
                "settings",
                "memory"
            );


        const snapshot =
            await getDoc(
                memoryRef
            );


        if (
            !snapshot.exists()
        ) {

            return "";

        }


        return JSON.stringify(
            snapshot.data()
        );

    } catch (error) {

        console.error(
            "Memory:",
            error
        );


        return "";

    }

}


/* =====================================================
   NOVA
===================================================== */

async function sendToNova(
    userText
) {

    if (
        !userText ||
        thinking
    ) {

        return;

    }


    thinking =
        true;


    addMessage(
        "user",
        userText
    );


    setState(
        "DENKE",
        "Nova verarbeitet deine Anfrage..."
    );


    /* Gemini erst jetzt laden */

    if (!model) {

        await initializeGemini();

    }


    if (!model) {

        thinking =
            false;


        const errorText =
            "Die KI-Verbindung ist momentan nicht verfügbar.";


        if (
            mode === "text"
        ) {

            addMessage(
                "nova",
                errorText
            );


            setState(
                "BEREIT",
                "Nova ist bereit"
            );

        } else {

            await speak(
                errorText
            );

        }


        return;

    }


    try {

        const memory =
            settings.memory
                ? await getMemory()
                : "";


        const prompt = `
Du bist Nova, eine moderne persönliche KI-Assistentin.

Antworte immer auf Deutsch.

Sei natürlich, freundlich, intelligent und direkt.

Antworte ausschließlich als JSON:

{
  "reply": "deine Antwort",
  "action": "NONE",
  "query": ""
}

Erlaubte Aktionen:

NONE
YOUTUBE_HOME
YOUTUBE_SEARCH
GOOGLE_SEARCH

YOUTUBE_HOME:
Wenn der Benutzer YouTube öffnen möchte.

YOUTUBE_SEARCH:
Wenn der Benutzer etwas auf YouTube suchen möchte.

GOOGLE_SEARCH:
Wenn der Benutzer etwas bei Google suchen möchte.

Wenn der Benutzer sagt:
"Öffne YouTube"
oder
"Mach YouTube auf"
verwende:

YOUTUBE_HOME

Wenn der Benutzer sagt:
"Suche auf YouTube nach Minecraft"
verwende:

YOUTUBE_SEARCH

und setze query auf:

Minecraft

Wenn der Benutzer sagt:
"Suche bei Google nach dem Wetter"
verwende:

GOOGLE_SEARCH

und setze query auf:

Wetter

Gedächtnis:
${memory || "Kein gespeicherter Kontext."}

Benutzer:
${userText}
`;


        const result =
            await model.generateContent(
                prompt
            );


        const raw =
            result.response.text();


        let data;


        try {

            const cleaned =
                raw
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
                    cleaned
                );

        } catch {

            data = {

                reply:
                    raw,

                action:
                    "NONE",

                query:
                    ""

            };

        }


        const reply =
            data.reply ||
            "Ich habe keine Antwort erhalten.";


        thinking =
            false;


        if (
            mode === "text"
        ) {

            addMessage(
                "nova",
                reply
            );


            setState(
                "BEREIT",
                "Nova ist bereit"
            );

        } else {

            await speak(
                reply
            );

        }


        executeAction(
            data.action,
            data.query
        );


    } catch (error) {

        console.error(
            "Nova Fehler:",
            error
        );


        thinking =
            false;


        const errorText =
            "Bei der Verbindung mit Nova ist gerade ein Fehler aufgetreten.";


        if (
            mode === "text"
        ) {

            addMessage(
                "nova",
                errorText
            );


            setState(
                "BEREIT",
                "Nova ist bereit"
            );

        } else {

            await speak(
                errorText
            );

        }

    }

}


/* =====================================================
   ACTIONS
===================================================== */

function executeAction(
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

        const q =
            encodeURIComponent(
                query || ""
            );


        window.open(
            `https://www.youtube.com/results?search_query=${q}`,
            "_blank"
        );

        return;

    }


    if (
        action ===
        "GOOGLE_SEARCH"
    ) {

        const q =
            encodeURIComponent(
                query || ""
            );


        window.open(
            `https://www.google.com/search?q=${q}`,
            "_blank"
        );

        return;

    }

}


/* =====================================================
   CHAT MESSAGES
===================================================== */

function addMessage(
    type,
    text
) {

    if (!messages) {

        return;

    }


    const message =
        document.createElement(
            "div"
        );


    message.className =
        `message ${type}`;


    message.textContent =
        text;


    messages.appendChild(
        message
    );


    messages.scrollTop =
        messages.scrollHeight;

}


/* =====================================================
   FAMILY CREATE
===================================================== */

createFamily?.addEventListener(
    "click",
    async () => {

        if (
            !currentUser ||
            !db
        ) {

            showToast(
                "Bitte zuerst mit Google anmelden."
            );

            return;

        }


        const code =
            Math.random()
                .toString(36)
                .substring(
                    2,
                    8
                )
                .toUpperCase();


        try {

            await setDoc(
                doc(
                    db,
                    "families",
                    code
                ),
                {
                    owner:
                        currentUser.uid,

                    createdAt:
                        serverTimestamp()
                }
            );


            familyStatus.textContent =
                `Familiencode: ${code}`;


            showToast(
                `Familiencode: ${code}`
            );

        } catch (error) {

            console.error(
                error
            );


            showToast(
                "Familie konnte nicht erstellt werden."
            );

        }

    }
);


/* =====================================================
   FAMILY JOIN
===================================================== */

joinFamily?.addEventListener(
    "click",
    async () => {

        if (
            !currentUser ||
            !db
        ) {

            showToast(
                "Bitte zuerst anmelden."
            );

            return;

        }


        const code =
            familyCode.value
                .trim()
                .toUpperCase();


        if (!code) {

            showToast(
                "Bitte Familiencode eingeben."
            );

            return;

        }


        try {

            const result =
                await getDoc(
                    doc(
                        db,
                        "families",
                        code
                    )
                );


            if (
                !result.exists()
            ) {

                showToast(
                    "Familie wurde nicht gefunden."
                );

                return;

            }


            familyStatus.textContent =
                `Verbunden: ${code}`;


            showToast(
                "Familie verbunden."
            );

        } catch (error) {

            console.error(
                error
            );


            showToast(
                "Beitreten fehlgeschlagen."
            );

        }

    }
);


/* =====================================================
   INITIAL START
===================================================== */

settingsOverlay.hidden =
    true;


textChat.hidden =
    true;


microphone.disabled =
    false;


textInput.disabled =
    false;


sendText.disabled =
    false;


initializeSpeech();


setState(
    "BEREIT",
    "Nova ist bereit"
);


console.log(
    "NOVA: System gestartet."
);
