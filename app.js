````javascript
/* =====================================================
   NOVA FAMILY AI
   ===================================================== */


/* =====================================================
   FIREBASE IMPORTS
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
    getAI,
    getGenerativeModel,
    GoogleAIBackend
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-ai.js";

import {
    firebaseConfig
} from "./firebase-config.js";


/* =====================================================
   DOM
   ===================================================== */

const orb =
    document.getElementById("orb");

const statusText =
    document.getElementById("statusText");

const statusSub =
    document.getElementById("statusSub");

const microphone =
    document.getElementById("microphone");

const voiceMode =
    document.getElementById("voiceMode");

const textMode =
    document.getElementById("textMode");

const textChat =
    document.getElementById("textChat");

const messages =
    document.getElementById("messages");

const textInput =
    document.getElementById("textInput");

const sendText =
    document.getElementById("sendText");

const youtubeButton =
    document.getElementById("youtubeButton");

const googleButton =
    document.getElementById("googleButton");

const settingsButton =
    document.getElementById("settingsButton");

const settingsOverlay =
    document.getElementById("settingsOverlay");

const closeSettings =
    document.getElementById("closeSettings");

const voiceSelect =
    document.getElementById("voiceSelect");

const rateSlider =
    document.getElementById("rateSlider");

const rateValue =
    document.getElementById("rateValue");

const volumeSlider =
    document.getElementById("volumeSlider");

const volumeValue =
    document.getElementById("volumeValue");

const testVoice =
    document.getElementById("testVoice");

const loginButton =
    document.getElementById("loginButton");

const logoutButton =
    document.getElementById("logoutButton");

const userPhoto =
    document.getElementById("userPhoto");

const userInfo =
    document.getElementById("userInfo");

const userName =
    document.getElementById("userName");

const userEmail =
    document.getElementById("userEmail");

const memoryToggle =
    document.getElementById("memoryToggle");

const animationToggle =
    document.getElementById("animationToggle");

const familyStatus =
    document.getElementById("familyStatus");

const createFamily =
    document.getElementById("createFamily");

const joinFamily =
    document.getElementById("joinFamily");

const familyCode =
    document.getElementById("familyCode");

const toast =
    document.getElementById("toast");


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
   LOAD SETTINGS
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
        "Settings konnten nicht geladen werden.",
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


    /*
     * Gemini wird separat initialisiert.
     * Wenn AI einen Fehler macht,
     * funktionieren die normalen Buttons
     * trotzdem weiter.
     */

    try {

        const ai =
            getAI(
                firebaseApp,
                {
                    backend:
                        new GoogleAIBackend()
                }
            );

        model =
            getGenerativeModel(
                ai,
                {
                    model:
                        "gemini-3.7-flash"
                }
            );

    } catch (error) {

        console.error(
            "Gemini konnte nicht gestartet werden:",
            error
        );

        model = null;

    }


} catch (error) {

    console.error(
        "Firebase konnte nicht gestartet werden:",
        error
    );

    showToast(
        "Firebase konnte nicht geladen werden."
    );

}


/* =====================================================
   BASIC UI
   ===================================================== */

function setState(
    title,
    subtitle = ""
) {

    statusText.textContent =
        title;

    statusSub.textContent =
        subtitle;


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
   SETTINGS BUTTON
   ===================================================== */

settingsButton.addEventListener(
    "click",
    () => {

        settingsOverlay.hidden =
            false;

        settingsOverlay.setAttribute(
            "aria-hidden",
            "false"
        );

        refreshVoices();

    }
);


closeSettings.addEventListener(
    "click",
    () => {

        settingsOverlay.hidden =
            true;

        settingsOverlay.setAttribute(
            "aria-hidden",
            "true"
        );

    }
);


settingsOverlay.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            settingsOverlay
        ) {

            settingsOverlay.hidden =
                true;

            settingsOverlay.setAttribute(
                "aria-hidden",
                "true"
            );

        }

    }
);


/* =====================================================
   MODE BUTTONS
   ===================================================== */

voiceMode.addEventListener(
    "click",
    () => {

        mode = "voice";

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


textMode.addEventListener(
    "click",
    () => {

        mode = "text";

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
                textInput.focus();
            },
            100
        );

    }
);


/* =====================================================
   TEXT SEND
   ===================================================== */

sendText.addEventListener(
    "click",
    () => {

        const text =
            textInput.value.trim();

        if (!text) return;

        textInput.value = "";

        sendToNova(
            text
        );

    }
);


textInput.addEventListener(
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
   YOUTUBE
   ===================================================== */

youtubeButton.addEventListener(
    "click",
    () => {

        window.open(
            "https://www.youtube.com/",
            "_blank",
            "noopener,noreferrer"
        );

    }
);


/* =====================================================
   GOOGLE
   ===================================================== */

googleButton.addEventListener(
    "click",
    () => {

        window.open(
            "https://www.google.com/",
            "_blank",
            "noopener,noreferrer"
        );

    }
);


/* =====================================================
   LOGIN
   ===================================================== */

loginButton.addEventListener(
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

logoutButton.addEventListener(
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
    ).catch(error => {

        console.error(
            "Login Redirect:",
            error
        );

    });

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


                /*
                 * Die Oberfläche bleibt
                 * trotzdem benutzbar.
                 */

                microphone.disabled =
                    false;

                textInput.disabled =
                    false;

                sendText.disabled =
                    false;


                initializeSpeech();


                setState(
                    "BEREIT",
                    "Du kannst Nova benutzen"
                );

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


            microphone.disabled =
                false;

            textInput.disabled =
                false;

            sendText.disabled =
                false;


            initializeSpeech();


            setState(
                "BEREIT",
                "Drücke das Mikrofon"
            );

        }
    );

} else {

    /*
     * Firebase Fehler:
     * Buttons bleiben trotzdem aktiv.
     */

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

}


/* =====================================================
   SPEECH RECOGNITION
   ===================================================== */

function initializeSpeech() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        microphone.disabled =
            true;

        showToast(
            "Dieser Browser unterstützt keine Spracherkennung."
        );

        return;

    }


    if (recognition) return;


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


            if (!text) return;


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


            if (
                event.error ===
                "not-allowed"
            ) {

                showToast(
                    "Mikrofonzugriff wurde blockiert."
                );

            }


            setState(
                "BEREIT",
                "Drücke das Mikrofon"
            );

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
   MICROPHONE BUTTON
   ===================================================== */

microphone.addEventListener(
    "click",
    () => {

        if (!recognition) {

            initializeSpeech();

        }


        if (!recognition) return;


        if (
            thinking ||
            speaking
        ) {

            return;

        }


        if (
            recognitionRunning
        ) {

            recognition.stop();

            return;

        }


        try {

            /*
             * Speech API wird direkt
             * durch den Button-Klick
             * gestartet.
             */

            speechSynthesis.cancel();

            recognition.start();

        } catch (error) {

            console.error(
                error
            );

        }

    }
);


/* =====================================================
   VOICE LIST
   ===================================================== */

function isGermanVoice(
    voice
) {

    return /^de[-_]/i.test(
        voice.lang
    );

}


function voiceScore(
    voice
) {

    let score = 0;

    const name =
        voice.name.toLowerCase();

    const lang =
        voice.lang.toLowerCase();


    if (
        lang ===
        "de-de"
    ) {

        score += 100;

    }


    if (
        lang.startsWith("de")
    ) {

        score += 50;

    }


    if (
        name.includes("natural") ||
        name.includes("premium") ||
        name.includes("enhanced")
    ) {

        score += 40;

    }


    if (
        name.includes("microsoft") ||
        name.includes("google")
    ) {

        score += 20;

    }


    return score;

}


function getBestGermanVoice() {

    const german =
        voices.filter(
            isGermanVoice
        );


    if (!german.length) {

        return null;

    }


    const saved =
        german.find(
            voice =>
                voice.name ===
                settings.voiceName
        );


    if (saved) {

        return saved;

    }


    return [...german].sort(
        (a, b) =>
            voiceScore(b) -
            voiceScore(a)
    )[0];

}


function refreshVoices() {

    voices =
        speechSynthesis.getVoices();


    if (!voices.length) return;


    voiceSelect.innerHTML =
        "";


    const german =
        voices.filter(
            isGermanVoice
        );


    const available =
        german.length
            ? german
            : voices;


    available.forEach(
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


    const best =
        getBestGermanVoice();


    if (best) {

        settings.voiceName =
            best.name;

        voiceSelect.value =
            best.name;

        saveSettings();

    }

}


speechSynthesis.addEventListener(
    "voiceschanged",
    refreshVoices
);


refreshVoices();


/* =====================================================
   WAIT FOR VOICES
   ===================================================== */

function waitForVoices() {

    return new Promise(
        resolve => {

            const current =
                speechSynthesis
                    .getVoices();


            if (
                current.length
            ) {

                voices =
                    current;

                resolve(
                    current
                );

                return;

            }


            let done =
                false;


            const finish =
                () => {

                    if (done)
                        return;

                    done =
                        true;

                    voices =
                        speechSynthesis
                            .getVoices();

                    resolve(
                        voices
                    );

                };


            speechSynthesis.addEventListener(
                "voiceschanged",
                finish,
                {
                    once: true
                }
            );


            setTimeout(
                finish,
                2000
            );

        }
    );

}


/* =====================================================
   NOVA SPEAKS
   ===================================================== */

async function speak(
    text
) {

    if (!text) return;


    await waitForVoices();


    speechSynthesis.cancel();

    speechSynthesis.resume();


    const voice =
        getBestGermanVoice();


    activeUtterance =
        new SpeechSynthesisUtterance(
            text
        );


    if (voice) {

        activeUtterance.voice =
            voice;

        activeUtterance.lang =
            voice.lang;

    } else {

        activeUtterance.lang =
            "de-DE";

    }


    activeUtterance.rate =
        Number(settings.rate)
        || 1;


    activeUtterance.volume =
        Number(settings.volume);


    activeUtterance.pitch =
        1;


    speaking =
        true;


    setState(
        "SPRECHEN",
        "Nova spricht..."
    );


    activeUtterance.onstart =
        () => {

            speaking =
                true;

        };


    activeUtterance.onend =
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


    activeUtterance.onerror =
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


            showToast(
                "Nova konnte die Stimme nicht abspielen."
            );

        };


    speechSynthesis.speak(
        activeUtterance
    );

}


/* =====================================================
   VOICE TEST
   ===================================================== */

testVoice.addEventListener(
    "click",
    async () => {

        await speak(
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
    Number(settings.rate)
        .toFixed(1);


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
   MEMORY
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
   ANIMATION
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
   MEMORY LOAD
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
   NOVA / GEMINI
   ===================================================== */

async function sendToNova(
    userText
) {

    if (!userText) return;


    if (thinking) return;


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


    /*
     * Falls Gemini nicht geladen wurde,
     * bekommt der Benutzer trotzdem
     * eine verständliche Fehlermeldung.
     */

    if (!model) {

        thinking =
            false;


        const errorText =
            "Die KI-Verbindung ist momentan nicht verfügbar. Prüfe bitte deine Firebase-Konfiguration und die Firebase AI Logic Einrichtung.";


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

Mögliche actions:

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

Gedächtnis:
${memory || "Kein gespeicherter Kontext."}

Benutzer:
${userText}
`;


        const result =
            await Promise.race([

                model.generateContent(
                    prompt
                ),

                new Promise(
                    (_, reject) => {

                        setTimeout(
                            () => {

                                reject(
                                    new Error(
                                        "Gemini Timeout"
                                    )
                                );

                            },
                            20000
                        );

                    }
                )

            ]);


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
    queryText
) {

    if (
        action ===
        "YOUTUBE_HOME"
    ) {

        window.open(
            "https://www.youtube.com/",
            "_blank",
            "noopener,noreferrer"
        );

    }


    if (
        action ===
        "YOUTUBE_SEARCH"
    ) {

        const query =
            encodeURIComponent(
                queryText || ""
            );


        window.open(
            `https://www.youtube.com/results?search_query=${query}`,
            "_blank",
            "noopener,noreferrer"
        );

    }


    if (
        action ===
        "GOOGLE_SEARCH"
    ) {

        const query =
            encodeURIComponent(
                queryText || ""
            );


        window.open(
            `https://www.google.com/search?q=${query}`,
            "_blank",
            "noopener,noreferrer"
        );

    }

}


/* =====================================================
   CHAT MESSAGE
   ===================================================== */

function addMessage(
    type,
    text
) {

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
   FAMILY
   ===================================================== */

createFamily.addEventListener(
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
                .substring(2, 8)
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


joinFamily.addEventListener(
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

            const family =
                await getDoc(
                    doc(
                        db,
                        "families",
                        code
                    )
                );


            if (
                !family.exists()
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
   INITIAL STATE
   ===================================================== */

settingsOverlay.hidden =
    true;

textChat.hidden =
    true;


setState(
    "BEREIT",
    "Nova ist bereit"
);


/* =====================================================
   VOICE INITIALIZATION
   ===================================================== */

initializeSpeech();

refreshVoices();
````
