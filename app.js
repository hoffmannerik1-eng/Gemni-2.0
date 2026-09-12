````javascript
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


/* =========================
   FIREBASE
   ========================= */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const ai = getAI(app, {
    backend: new GoogleAIBackend()
});

const model = getGenerativeModel(ai, {
    model: "gemini-3.7-flash"
});


/* =========================
   DOM
   ========================= */

const orb = document.getElementById("orb");

const statusText = document.getElementById("statusText");
const statusSub = document.getElementById("statusSub");

const microphone = document.getElementById("microphone");

const voiceMode = document.getElementById("voiceMode");
const textMode = document.getElementById("textMode");

const textChat = document.getElementById("textChat");
const messages = document.getElementById("messages");

const textInput = document.getElementById("textInput");
const sendText = document.getElementById("sendText");

const youtubeButton = document.getElementById("youtubeButton");
const googleButton = document.getElementById("googleButton");

const settingsButton = document.getElementById("settingsButton");
const settingsOverlay = document.getElementById("settingsOverlay");
const closeSettings = document.getElementById("closeSettings");

const voiceSelect = document.getElementById("voiceSelect");
const rateSlider = document.getElementById("rateSlider");
const rateValue = document.getElementById("rateValue");

const volumeSlider = document.getElementById("volumeSlider");
const volumeValue = document.getElementById("volumeValue");

const testVoice = document.getElementById("testVoice");

const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");

const userPhoto = document.getElementById("userPhoto");
const userInfo = document.getElementById("userInfo");

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");

const memoryToggle = document.getElementById("memoryToggle");
const animationToggle = document.getElementById("animationToggle");

const toast = document.getElementById("toast");

const familyStatus = document.getElementById("familyStatus");
const createFamily = document.getElementById("createFamily");
const joinFamily = document.getElementById("joinFamily");
const familyCode = document.getElementById("familyCode");
const memoryStatus = document.getElementById("memoryStatus");


/* =========================
   START
   ========================= */

settingsOverlay.hidden = true;
settingsOverlay.style.display = "none";

textChat.hidden = true;

orb.classList.remove(
    "thinking",
    "listening",
    "speaking"
);


/* =========================
   STATE
   ========================= */

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


/* =========================
   SETTINGS STORAGE
   ========================= */

try {
    const saved = localStorage.getItem("novaSettings");

    if (saved) {
        settings = {
            ...settings,
            ...JSON.parse(saved)
        };
    }
} catch {
    console.warn("Nova settings konnten nicht geladen werden.");
}


function saveSettings() {
    localStorage.setItem(
        "novaSettings",
        JSON.stringify(settings)
    );
}


/* =========================
   UI
   ========================= */

function setState(title, subtitle = "") {

    statusText.textContent = title;
    statusSub.textContent = subtitle;

    orb.classList.remove(
        "thinking",
        "listening",
        "speaking"
    );

    if (title === "DENKE") {
        orb.classList.add("thinking");
    }

    if (title === "ZUHÖREN") {
        orb.classList.add("listening");
    }

    if (title === "SPRECHEN") {
        orb.classList.add("speaking");
    }
}


function showToast(text) {

    toast.textContent = text;

    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


/* =========================
   GOOGLE LOGIN
   ========================= */

loginButton.addEventListener("click", async () => {

    try {

        const provider =
            new GoogleAuthProvider();

        await signInWithRedirect(
            auth,
            provider
        );

    } catch (error) {

        console.error(error);

        showToast(
            "Google-Anmeldung konnte nicht gestartet werden."
        );
    }
});


logoutButton.addEventListener(
    "click",
    async () => {

        await signOut(auth);

    }
);


getRedirectResult(auth)
    .catch(error => {
        console.error(
            "Redirect Login:",
            error
        );
    });


/* =========================
   AUTH STATE
   ========================= */

onAuthStateChanged(
    auth,
    async user => {

        currentUser = user;

        if (!user) {

            loginButton.hidden = false;

            logoutButton.hidden = true;

            userInfo.hidden = true;
            userPhoto.hidden = true;

            microphone.disabled = true;

            youtubeButton.disabled = true;
            googleButton.disabled = true;

            textInput.disabled = true;
            sendText.disabled = true;

            setState(
                "ANMELDEN",
                "Melde dich mit Google an"
            );

            return;
        }


        loginButton.hidden = true;

        logoutButton.hidden = false;

        userInfo.hidden = false;

        userName.textContent =
            user.displayName || "Benutzer";

        userEmail.textContent =
            user.email || "";


        if (user.photoURL) {

            userPhoto.src =
                user.photoURL;

            userPhoto.hidden = false;

        }


        microphone.disabled = false;

        youtubeButton.disabled = false;
        googleButton.disabled = false;

        textInput.disabled = false;
        sendText.disabled = false;


        initializeSpeech();

        setState(
            "BEREIT",
            "Drücke das Mikrofon"
        );

    }
);


/* =========================
   SPEECH RECOGNITION
   ========================= */

function initializeSpeech() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        showToast(
            "Spracherkennung wird von diesem Browser nicht unterstützt."
        );

        microphone.disabled = true;

        return;
    }


    recognition =
        new SpeechRecognition();

    recognition.lang = "de-DE";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.maxAlternatives = 1;


    recognition.onstart = () => {

        recognitionRunning = true;

        microphone.classList.add(
            "active"
        );

        setState(
            "ZUHÖREN",
            "Ich höre zu..."
        );

    };


    recognition.onresult = event => {

        const text =
            event.results[0][0].transcript.trim();

        if (!text) return;

        sendToNova(text);

    };


    recognition.onerror = event => {

        console.error(
            "SpeechRecognition:",
            event.error
        );

        recognitionRunning = false;

        microphone.classList.remove(
            "active"
        );

        if (event.error === "not-allowed") {

            showToast(
                "Mikrofonzugriff wurde blockiert."
            );

        }

        setState(
            "BEREIT",
            "Drücke das Mikrofon"
        );

    };


    recognition.onend = () => {

        recognitionRunning = false;

        microphone.classList.remove(
            "active"
        );

        if (!thinking && !speaking) {

            setState(
                "BEREIT",
                "Drücke das Mikrofon"
            );
        }

    };

}


/* =========================
   MICROPHONE
   ========================= */

microphone.addEventListener(
    "click",
    () => {

        if (!recognition) return;

        if (thinking || speaking) return;


        if (recognitionRunning) {

            recognition.stop();

            return;
        }


        /*
         * Wichtig:
         * Hier darf der Browser das Mikrofon
         * öffnen, weil es direkt durch den
         * Klick ausgelöst wird.
         */

        try {

            speechSynthesis.cancel();

            recognition.start();

        } catch (error) {

            console.error(error);

        }

    }
);


/* =========================
   MODE
   ========================= */

voiceMode.addEventListener(
    "click",
    () => {

        mode = "voice";

        voiceMode.classList.add("active");
        textMode.classList.remove("active");

        textChat.hidden = true;

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

        textMode.classList.add("active");
        voiceMode.classList.remove("active");

        textChat.hidden = false;

        setState(
            "TEXTMODUS",
            "Schreibe Nova etwas"
        );

        setTimeout(
            () => textInput.focus(),
            100
        );

    }
);


/* =========================
   TEXT SENDEN
   ========================= */

sendText.addEventListener(
    "click",
    () => {

        const text =
            textInput.value.trim();

        if (!text) return;

        textInput.value = "";

        sendToNova(text);

    }
);


textInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {

            event.preventDefault();

            sendText.click();

        }

    }
);


/* =========================
   GEMINI
   ========================= */

async function sendToNova(userText) {

    if (!currentUser) {

        showToast(
            "Bitte zuerst anmelden."
        );

        return;
    }


    if (thinking) return;


    thinking = true;


    addMessage(
        "user",
        userText
    );


    setState(
        "DENKE",
        "Nova verarbeitet deine Anfrage..."
    );


    try {

        const memory =
            settings.memory
                ? await getMemory()
                : "";


        const prompt = `
Du bist Nova, ein moderner persönlicher KI-Assistent.

Antworte auf Deutsch.

Du bist freundlich, intelligent, ruhig und natürlich.
Keine übertriebenen Roboterformulierungen.
Keine unnötigen langen Antworten.

Antworte ausschließlich als JSON:

{
  "reply": "Antwort an den Benutzer",
  "action": "NONE | YOUTUBE_HOME | YOUTUBE_SEARCH | GOOGLE_SEARCH",
  "query": ""
}

Regeln:

NONE:
Normale Antwort.

YOUTUBE_HOME:
Wenn der Benutzer YouTube öffnen möchte.

YOUTUBE_SEARCH:
Wenn der Benutzer etwas auf YouTube suchen möchte.

GOOGLE_SEARCH:
Wenn der Benutzer etwas bei Google suchen möchte.

Familiengedächtnis:
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
                    (_, reject) =>
                        setTimeout(
                            () =>
                                reject(
                                    new Error(
                                        "Gemini Timeout"
                                    )
                                ),
                            20000
                        )
                )

            ]);


        const raw =
            result.response.text();


        let data;


        try {

            const cleaned =
                raw
                    .replace(/```json/gi, "")
                    .replace(/```/g, "")
                    .trim();

            data =
                JSON.parse(cleaned);

        } catch {

            data = {
                reply: raw,
                action: "NONE",
                query: ""
            };

        }


        const reply =
            data.reply ||
            "Ich konnte darauf gerade nicht antworten.";


        thinking = false;


        if (mode === "text") {

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

        thinking = false;

        const errorText =
            "Entschuldigung, da ist gerade ein Fehler aufgetreten.";


        if (mode === "text") {

            addMessage(
                "nova",
                errorText
            );

        } else {

            await speak(
                errorText
            );

        }

    }

}


/* =========================
   ACTIONS
   ========================= */

function executeAction(
    action,
    queryText
) {

    if (!action) return;


    if (action === "YOUTUBE_HOME") {

        window.open(
            "https://www.youtube.com/",
            "_blank"
        );

    }


    if (action === "YOUTUBE_SEARCH") {

        const q =
            encodeURIComponent(
                queryText || ""
            );

        window.open(
            `https://www.youtube.com/results?search_query=${q}`,
            "_blank"
        );

    }


    if (action === "GOOGLE_SEARCH") {

        const q =
            encodeURIComponent(
                queryText || ""
            );

        window.open(
            `https://www.google.com/search?q=${q}`,
            "_blank"
        );

    }

}


/* =========================
   TEXT CHAT
   ========================= */

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


/* =========================
   VOICES
   ========================= */

function isGermanVoice(voice) {

    return /^de(-|_)/i.test(
        voice.lang
    );

}


function voiceScore(voice) {

    let score = 0;

    const name =
        voice.name.toLowerCase();

    const lang =
        voice.lang.toLowerCase();


    if (lang === "de-de")
        score += 100;

    if (lang.startsWith("de"))
        score += 50;


    if (
        name.includes("natural") ||
        name.includes("enhanced") ||
        name.includes("premium")
    ) {
        score += 40;
    }


    if (
        name.includes("google") ||
        name.includes("microsoft")
    ) {
        score += 20;
    }


    return score;
}


function chooseGermanVoice() {

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


    return [...german]
        .sort(
            (a, b) =>
                voiceScore(b) -
                voiceScore(a)
        )[0];

}


function refreshVoices() {

    voices =
        speechSynthesis.getVoices();


    if (!voices.length) return;


    voiceSelect.innerHTML = "";


    const german =
        voices.filter(
            isGermanVoice
        );


    const list =
        german.length
            ? german
            : voices;


    list.forEach(voice => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            voice.name;

        option.textContent =
            `${voice.name} (${voice.lang})`;

        voiceSelect.appendChild(
            option
        );

    });


    const selected =
        chooseGermanVoice();


    if (selected) {

        settings.voiceName =
            selected.name;

        voiceSelect.value =
            selected.name;

        saveSettings();

    }

}


speechSynthesis.addEventListener(
    "voiceschanged",
    refreshVoices
);


refreshVoices();


/* =========================
   WAIT FOR VOICES
   ========================= */

function waitForVoices() {

    return new Promise(resolve => {

        const current =
            speechSynthesis.getVoices();


        if (current.length) {

            voices = current;

            resolve(current);

            return;
        }


        let finished = false;


        const finish = () => {

            if (finished) return;

            finished = true;

            voices =
                speechSynthesis.getVoices();

            resolve(voices);

        };


        speechSynthesis.addEventListener(
            "voiceschanged",
            finish,
            { once: true }
        );


        setTimeout(
            finish,
            2000
        );

    });

}


/* =========================
   NOVA SPRICHT
   ========================= */

async function speak(text) {

    if (!text) return;


    await waitForVoices();


    speechSynthesis.cancel();


    /*
     * Safari kann die Speech Queue
     * manchmal pausieren.
     */

    speechSynthesis.resume();


    const voice =
        chooseGermanVoice();


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
        Number(settings.rate) || 1;


    activeUtterance.volume =
        Number(settings.volume);


    activeUtterance.pitch =
        1;


    speaking = true;


    setState(
        "SPRECHEN",
        "Nova spricht..."
    );


    activeUtterance.onstart =
        () => {

            speaking = true;

            setState(
                "SPRECHEN",
                "Nova spricht..."
            );

        };


    activeUtterance.onend =
        () => {

            speaking = false;

            activeUtterance = null;

            setState(
                "BEREIT",
                "Drücke das Mikrofon"
            );

        };


    activeUtterance.onerror =
        event => {

            console.error(
                "SpeechSynthesis:",
                event
            );

            speaking = false;

            activeUtterance = null;

            setState(
                "BEREIT",
                "Drücke das Mikrofon"
            );

            showToast(
                "Die Stimme konnte nicht abgespielt werden."
            );

        };


    speechSynthesis.speak(
        activeUtterance
    );

}


/* =========================
   VOICE SETTINGS
   ========================= */

voiceSelect.addEventListener(
    "change",
    () => {

        settings.voiceName =
            voiceSelect.value;

        saveSettings();

    }
);


rateSlider.value =
    settings.rate;

rateValue.textContent =
    Number(settings.rate).toFixed(1);


rateSlider.addEventListener(
    "input",
    () => {

        settings.rate =
            Number(rateSlider.value);

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
            Number(volumeSlider.value);

        volumeValue.textContent =
            `${Math.round(
                settings.volume * 100
            )}%`;

        saveSettings();

    }
);


/* =========================
   VOICE TEST
   ========================= */

testVoice.addEventListener(
    "click",
    async () => {

        await speak(
            "Hallo. Ich bin Nova. Deine KI-Assistentin."
        );

    }
);


/* =========================
   SETTINGS
   ========================= */

settingsButton.addEventListener(
    "click",
    () => {

        settingsOverlay.hidden = false;

        settingsOverlay.style.display =
            "flex";

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

        settingsOverlay.hidden = true;

        settingsOverlay.style.display =
            "none";

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

            closeSettings.click();

        }

    }
);


/* =========================
   ANIMATION SETTING
   ========================= */

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


/* =========================
   MEMORY
   ========================= */

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


async function getMemory() {

    if (!currentUser) return "";

    try {

        const ref =
            doc(
                db,
                "users",
                currentUser.uid,
                "settings",
                "memory"
            );


        const snap =
            await getDoc(ref);


        if (!snap.exists())
            return "";


        return JSON.stringify(
            snap.data()
        );

    } catch (error) {

        console.error(
            "Memory:",
            error
        );

        return "";

    }

}


/* =========================
   FAMILY
   ========================= */

createFamily.addEventListener(
    "click",
    async () => {

        if (!currentUser) {

            showToast(
                "Bitte zuerst anmelden."
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

            console.error(error);

            showToast(
                "Familie konnte nicht erstellt werden."
            );

        }

    }
);


joinFamily.addEventListener(
    "click",
    async () => {

        if (!currentUser) return;


        const code =
            familyCode.value
                .trim()
                .toUpperCase();


        if (!code) return;


        try {

            const snap =
                await getDoc(
                    doc(
                        db,
                        "families",
                        code
                    )
                );


            if (!snap.exists()) {

                showToast(
                    "Familie nicht gefunden."
                );

                return;

            }


            familyStatus.textContent =
                `Verbunden mit Familie ${code}`;


            showToast(
                "Familie erfolgreich verbunden."
            );

        } catch (error) {

            console.error(error);

            showToast(
                "Beitritt fehlgeschlagen."
            );

        }

    }
);


/* =========================
   START STATUS
   ========================= */

if (!currentUser) {

    setState(
        "ANMELDEN",
        "Melde dich mit Google an"
    );

}
````
