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


/* =====================================================
   FIREBASE
===================================================== */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const ai = getAI(app, {
    backend: new GoogleAIBackend()
});

const model = getGenerativeModel(ai, {
    model: "gemini-3.7-flash"
});


/* =====================================================
   DOM
===================================================== */

const $ = id => document.getElementById(id);

const loginButton = $("loginButton");
const logoutButton = $("logoutButton");

const userInfo = $("userInfo");
const userPhoto = $("userPhoto");
const userName = $("userName");
const userEmail = $("userEmail");

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

const settingsButton = $("settingsButton");
const settingsOverlay = $("settingsOverlay");
const closeSettings = $("closeSettings");

const voiceSelect = $("voiceSelect");

const rateSlider = $("rateSlider");
const rateValue = $("rateValue");

const volumeSlider = $("volumeSlider");
const volumeValue = $("volumeValue");

const memoryToggle = $("memoryToggle");
const animationToggle = $("animationToggle");

const testVoice = $("testVoice");

const createFamily = $("createFamily");
const joinFamily = $("joinFamily");
const familyCode = $("familyCode");
const familyStatus = $("familyStatus");
const memoryStatus = $("memoryStatus");

const youtubeButton = $("youtubeButton");
const googleButton = $("googleButton");

const toast = $("toast");


/* =====================================================
   SOFORTIGER START
===================================================== */

/*
   Einstellungen werden schon VOR Firebase
   komplett geschlossen.
*/

settingsOverlay.hidden = true;
settingsOverlay.setAttribute("aria-hidden", "true");
settingsOverlay.style.display = "none";

textChat.hidden = true;

orb.classList.remove(
    "thinking",
    "listening",
    "speaking"
);

microphone.classList.remove("active");


/* =====================================================
   STATE
===================================================== */

let currentUser = null;
let currentFamilyId = null;

let voices = [];
let recognition = null;

let recognizing = false;
let thinking = false;
let speaking = false;

let chatMode = "voice";

let requestNumber = 0;

let toastTimer = null;


/* =====================================================
   SETTINGS
===================================================== */

const settings = {

    voiceName:
        localStorage.getItem("nova_voice") || "",

    rate:
        Number(
            localStorage.getItem("nova_rate") || "1"
        ),

    volume:
        Number(
            localStorage.getItem("nova_volume") || "1"
        ),

    memory:
        localStorage.getItem("nova_memory") !== "false",

    animations:
        localStorage.getItem("nova_animations") !== "false"
};


rateSlider.value = settings.rate;
volumeSlider.value = settings.volume;

memoryToggle.checked = settings.memory;
animationToggle.checked = settings.animations;

updateSettingLabels();


/* =====================================================
   STATE UI
===================================================== */

function setState(
    state,
    title,
    subtitle = ""
) {

    statusText.textContent = title;
    statusSub.textContent = subtitle;

    orb.classList.remove(
        "thinking",
        "listening",
        "speaking"
    );

    microphone.classList.remove("active");

    if (!settings.animations) {
        return;
    }

    if (state === "DENKEN") {
        orb.classList.add("thinking");
    }

    if (state === "HÖREN") {
        orb.classList.add("listening");
        microphone.classList.add("active");
    }

    if (state === "SPRECHEN") {
        orb.classList.add("speaking");
    }
}


/* =====================================================
   TOAST
===================================================== */

function showToast(text) {

    toast.textContent = text;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}


/* =====================================================
   LOGIN
===================================================== */

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


/* =====================================================
   LOGOUT
===================================================== */

logoutButton.addEventListener("click", async () => {

    try {

        await signOut(auth);

    } catch (error) {

        console.error(error);
    }
});


/* =====================================================
   REDIRECT
===================================================== */

getRedirectResult(auth)
    .then(result => {

        if (result?.user) {
            console.log("Login erfolgreich");
        }

    })
    .catch(error => {

        console.error(
            "REDIRECT ERROR:",
            error
        );
    });


/* =====================================================
   AUTH
===================================================== */

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

            textInput.disabled = true;
            sendText.disabled = true;

            youtubeButton.disabled = true;
            googleButton.disabled = true;

            setState(
                "BEREIT",
                "Bitte anmelden",
                "Melde dich mit Google an"
            );

            return;
        }


        loginButton.hidden = true;
        logoutButton.hidden = false;

        userInfo.hidden = false;
        userPhoto.hidden = false;


        userName.textContent =
            user.displayName || "Benutzer";

        userEmail.textContent =
            user.email || "";


        if (user.photoURL) {
            userPhoto.src = user.photoURL;
        }


        microphone.disabled = false;

        textInput.disabled = false;
        sendText.disabled = false;

        youtubeButton.disabled = false;
        googleButton.disabled = false;


        setState(
            "BEREIT",
            "Nova ist bereit",
            "Drücke das Mikrofon"
        );


        await loadUserData();

        initializeSpeech();
    }
);


/* =====================================================
   USER DATA
===================================================== */

async function loadUserData() {

    if (!currentUser) {
        return;
    }

    try {

        const userRef =
            doc(
                db,
                "users",
                currentUser.uid
            );

        const snapshot =
            await getDoc(userRef);

        if (snapshot.exists()) {

            const data =
                snapshot.data();

            currentFamilyId =
                data.familyId || null;
        }

        if (currentFamilyId) {

            familyStatus.textContent =
                `Verbunden: ${currentFamilyId}`;
        }

    } catch (error) {

        console.warn(
            "USER DATA:",
            error
        );
    }
}


/* =====================================================
   SPEECH
===================================================== */

function initializeSpeech() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;

    if (!SpeechRecognition) {

        microphone.disabled = true;

        statusSub.textContent =
            "Spracherkennung nicht unterstützt";

        return;
    }


    recognition =
        new SpeechRecognition();

    recognition.lang = "de-DE";

    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.maxAlternatives = 1;


    recognition.onstart = () => {

        recognizing = true;

        setState(
            "HÖREN",
            "Ich höre zu",
            "Sprich jetzt"
        );
    };


    recognition.onresult = event => {

        recognizing = false;

        const result =
            event.results[
                event.results.length - 1
            ];

        const text =
            result[0]
                .transcript
                .trim();

        if (!text) {

            setState(
                "BEREIT",
                "Nova ist bereit",
                "Drücke das Mikrofon"
            );

            return;
        }

        sendToNova(text);
    };


    recognition.onerror = event => {

        recognizing = false;

        console.error(
            "MIC ERROR:",
            event.error
        );

        if (
            event.error === "not-allowed"
        ) {

            setState(
                "FEHLER",
                "Mikrofon blockiert",
                "Erlaube den Mikrofonzugriff"
            );

        } else {

            setState(
                "BEREIT",
                "Nova ist bereit",
                "Drücke das Mikrofon"
            );
        }
    };


    recognition.onend = () => {

        recognizing = false;

        microphone.classList.remove(
            "active"
        );

        if (
            !thinking &&
            !speaking
        ) {

            setState(
                "BEREIT",
                "Nova ist bereit",
                "Drücke das Mikrofon"
            );
        }
    };
}


/* =====================================================
   MICROPHONE
===================================================== */

microphone.addEventListener("click", () => {

    if (!currentUser) {
        return;
    }

    if (!recognition) {

        showToast(
            "Spracherkennung nicht verfügbar."
        );

        return;
    }

    if (thinking || speaking) {
        return;
    }

    if (recognizing) {

        recognition.stop();

        return;
    }

    try {

        recognition.start();

    } catch (error) {

        console.error(
            "RECOGNITION:",
            error
        );
    }
});


/* =====================================================
   MODES
===================================================== */

voiceMode.addEventListener("click", () => {

    chatMode = "voice";

    voiceMode.classList.add("active");
    textMode.classList.remove("active");

    textChat.hidden = true;

    setState(
        "BEREIT",
        "Sprachmodus",
        "Drücke das Mikrofon"
    );
});


textMode.addEventListener("click", () => {

    chatMode = "text";

    textMode.classList.add("active");
    voiceMode.classList.remove("active");

    textChat.hidden = false;

    setState(
        "BEREIT",
        "Textmodus",
        "Schreibe Nova etwas"
    );

    setTimeout(() => {
        textInput.focus();
    }, 50);
});


/* =====================================================
   TEXT CHAT
===================================================== */

sendText.addEventListener(
    "click",
    sendTextMessage
);


textInput.addEventListener(
    "keydown",
    event => {

        if (event.key === "Enter") {
            sendTextMessage();
        }
    }
);


function sendTextMessage() {

    const text =
        textInput.value.trim();

    if (!text) {
        return;
    }

    if (!currentUser) {

        showToast(
            "Bitte zuerst anmelden."
        );

        return;
    }

    if (thinking) {
        return;
    }

    textInput.value = "";

    addMessage(
        "user",
        text
    );

    sendToNova(text);
}


/* =====================================================
   CHAT MESSAGE
===================================================== */

function addMessage(
    type,
    text
) {

    const message =
        document.createElement("div");

    message.className =
        `message ${type}`;

    message.textContent =
        text;

    messages.appendChild(message);

    messages.scrollTop =
        messages.scrollHeight;
}


/* =====================================================
   NOVA
===================================================== */

async function sendToNova(userText) {

    if (!currentUser) {
        return;
    }

    if (!userText) {
        return;
    }

    if (thinking) {
        return;
    }


    const requestId =
        ++requestNumber;


    thinking = true;
    speaking = false;


    setState(
        "DENKEN",
        "Nova denkt...",
        "Einen Moment"
    );


    let memories = "";


    if (settings.memory) {

        try {

            memories =
                await timeout(
                    getMemoryContext(),
                    2500
                );

        } catch (error) {

            console.warn(
                "Memory übersprungen",
                error
            );

            memories = "";
        }
    }


    if (
        requestId !== requestNumber
    ) {

        thinking = false;

        return;
    }


    const prompt = `

Du bist Nova, eine persönliche KI.

Sprich Deutsch.

Antworte natürlich, freundlich und direkt.

Halte Antworten normalerweise kurz.

Benutzer:
${userText}

Erinnerungen:
${memories || "Keine"}

Wenn der Benutzer etwas dauerhaft speichern möchte,
kann saveMemory true sein.

Wenn YouTube geöffnet werden soll:
YOUTUBE_HOME

Wenn auf YouTube gesucht werden soll:
YOUTUBE_SEARCH

Wenn Google geöffnet werden soll:
GOOGLE_SEARCH

Antworte ausschließlich mit diesem JSON:

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
`;


    try {

        const result =
            await timeout(
                model.generateContent(prompt),
                15000
            );


        if (
            requestId !== requestNumber
        ) {

            thinking = false;

            return;
        }


        const raw =
            result.response.text();

        console.log(
            "GEMINI:",
            raw
        );


        const data =
            parseJSON(raw);


        /* SOFORT AUS DENKMODUS */

        thinking = false;

        orb.classList.remove(
            "thinking"
        );


        setState(
            "BEREIT",
            "Nova ist bereit",
            "Antwort erhalten"
        );


        if (
            settings.memory &&
            data.saveMemory &&
            data.memory
        ) {

            saveMemory(
                data.memory
            ).catch(error => {

                console.error(
                    "MEMORY SAVE:",
                    error
                );
            });
        }


        try {

            executeAction(
                data.action,
                data.query
            );

        } catch (error) {

            console.error(
                "ACTION:",
                error
            );
        }


        const reply =
            cleanReply(
                data.reply ||
                "Okay."
            );


        if (
            chatMode === "text"
        ) {

            addMessage(
                "nova",
                reply
            );

        } else {

            speak(reply);
        }


    } catch (error) {

        console.error(
            "NOVA ERROR:",
            error
        );


        thinking = false;
        speaking = false;


        orb.classList.remove(
            "thinking",
            "speaking"
        );


        const errorText =
            getFriendlyError(error);


        setState(
            "FEHLER",
            "Nova konnte nicht antworten",
            errorText
        );


        if (
            chatMode === "text"
        ) {

            addMessage(
                "nova",
                errorText
            );

        } else {

            speak(
                errorText,
                false
            );
        }
    }
}


/* =====================================================
   TIMEOUT
===================================================== */

function timeout(
    promise,
    milliseconds
) {

    return new Promise(
        (resolve, reject) => {

            let finished = false;


            const timer =
                setTimeout(() => {

                    if (finished) {
                        return;
                    }

                    finished = true;

                    reject(
                        new Error("Timeout")
                    );

                }, milliseconds);


            promise.then(
                value => {

                    if (finished) {
                        return;
                    }

                    finished = true;

                    clearTimeout(timer);

                    resolve(value);

                },
                error => {

                    if (finished) {
                        return;
                    }

                    finished = true;

                    clearTimeout(timer);

                    reject(error);
                }
            );
        }
    );
}


/* =====================================================
   JSON
===================================================== */

function parseJSON(text) {

    let clean =
        String(text || "").trim();


    clean =
        clean.replace(
            /^```json/i,
            ""
        );


    clean =
        clean.replace(
            /^```/i,
            ""
        );


    clean =
        clean.replace(
            /```$/i,
            ""
        );


    clean = clean.trim();


    const first =
        clean.indexOf("{");

    const last =
        clean.lastIndexOf("}");


    if (
        first !== -1 &&
        last !== -1
    ) {

        clean =
            clean.substring(
                first,
                last + 1
            );
    }


    try {

        return JSON.parse(clean);

    } catch {

        return {

            action: "NONE",

            query: "",

            reply:
                clean ||
                "Ich konnte darauf gerade nicht antworten.",

            saveMemory: false,

            memory: ""
        };
    }
}


/* =====================================================
   CLEAN REPLY
===================================================== */

function cleanReply(text) {

    return String(text || "")
        .replace(
            /^["']|["']$/g,
            ""
        )
        .replace(
            /```/g,
            ""
        )
        .trim();
}


/* =====================================================
   ERRORS
===================================================== */

function getFriendlyError(error) {

    const message =
        String(
            error?.message ||
            error ||
            ""
        );


    if (/timeout/i.test(message)) {

        return "Gemini antwortet gerade nicht. Versuche es noch einmal.";
    }


    if (
        /429|quota|resource.?exhausted/i
            .test(message)
    ) {

        return "Das Gemini-Limit ist momentan erreicht.";
    }


    if (
        /403|permission|unauthorized/i
            .test(message)
    ) {

        return "Der Zugriff auf Gemini wurde verweigert.";
    }


    if (
        /404|not found/i.test(message)
    ) {

        return "Das Gemini-Modell wurde nicht gefunden.";
    }


    if (
        /network|fetch|failed/i.test(message)
    ) {

        return "Es gibt gerade ein Verbindungsproblem.";
    }


    return "Ich konnte gerade keine Antwort erzeugen.";
}


/* =====================================================
   ACTIONS
===================================================== */

function executeAction(
    action,
    queryText
) {

    const query =
        encodeURIComponent(
            queryText || ""
        );


    if (action === "YOUTUBE_HOME") {

        window.open(
            "https://www.youtube.com/",
            "_blank"
        );

        return;
    }


    if (action === "YOUTUBE_SEARCH") {

        window.open(
            "https://www.youtube.com/results?search_query=" +
            query,
            "_blank"
        );

        return;
    }


    if (action === "GOOGLE_SEARCH") {

        window.open(
            "https://www.google.com/search?q=" +
            query,
            "_blank"
        );

        return;
    }
}


/* =====================================================
   VOICES
===================================================== */

function loadVoices() {

    voices =
        speechSynthesis.getVoices();


    voiceSelect.innerHTML = "";


    const german =
        voices.filter(
            voice =>
                voice.lang
                    .toLowerCase()
                    .startsWith("de")
        );


    const available =
        german.length
            ? german
            : voices;


    available.forEach(voice => {

        const option =
            document.createElement("option");

        option.value =
            voice.name;

        option.textContent =
            `${voice.name} (${voice.lang})`;


        if (
            voice.name ===
            settings.voiceName
        ) {

            option.selected = true;
        }


        voiceSelect.appendChild(
            option
        );
    });


    if (
        !settings.voiceName &&
        available.length
    ) {

        const preferred =
            available.find(
                voice =>
                    /google|microsoft|natural|premium|enhanced/i
                        .test(
                            voice.name
                        )
            ) ||
            available[0];


        settings.voiceName =
            preferred.name;

        voiceSelect.value =
            preferred.name;
    }
}


loadVoices();

speechSynthesis.onvoiceschanged =
    loadVoices;


/* =====================================================
   SPEAK
===================================================== */

function speak(
    text,
    resetAfter = true
) {

    if (!text) {
        return;
    }


    speechSynthesis.cancel();


    speaking = true;


    setState(
        "SPRECHEN",
        "Nova spricht...",
        text
    );


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    const selectedVoice =
        voices.find(
            voice =>
                voice.name ===
                settings.voiceName
        );


    if (selectedVoice) {

        utterance.voice =
            selectedVoice;

        utterance.lang =
            selectedVoice.lang;

    } else {

        utterance.lang =
            "de-DE";
    }


    utterance.rate =
        settings.rate;

    utterance.volume =
        settings.volume;


    utterance.onend = () => {

        speaking = false;

        if (resetAfter) {

            setState(
                "BEREIT",
                "Nova ist bereit",
                "Drücke das Mikrofon"
            );
        }
    };


    utterance.onerror = () => {

        speaking = false;

        setState(
            "BEREIT",
            "Nova ist bereit",
            "Drücke das Mikrofon"
        );
    };


    speechSynthesis.speak(
        utterance
    );
}


/* =====================================================
   MEMORY
===================================================== */

async function getMemoryContext() {

    if (!currentUser) {
        return "";
    }


    const memories = [];


    try {

        const privateQuery =
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
            await getDocs(
                privateQuery
            );


        snapshot.forEach(
            docSnap => {

                const data =
                    docSnap.data();

                if (data.memory) {
                    memories.push(
                        data.memory
                    );
                }
            }
        );

    } catch (error) {

        console.warn(
            "PRIVATE MEMORY:",
            error
        );
    }


    if (currentFamilyId) {

        try {

            const familyQuery =
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
                await getDocs(
                    familyQuery
                );


            snapshot.forEach(
                docSnap => {

                    const data =
                        docSnap.data();

                    if (data.memory) {
                        memories.push(
                            data.memory
                        );
                    }
                }
            );

        } catch (error) {

            console.warn(
                "FAMILY MEMORY:",
                error
            );
        }
    }


    return memories
        .slice(-20)
        .join("\n");
}


/* =====================================================
   SAVE MEMORY
===================================================== */

async function saveMemory(memory) {

    if (
        !currentUser ||
        !memory
    ) {
        return;
    }


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


    memoryStatus.textContent =
        "Letzte Erinnerung gespeichert.";
}


/* =====================================================
   SETTINGS OPEN
===================================================== */

settingsButton.addEventListener(
    "click",
    () => {

        settingsOverlay.hidden = false;

        settingsOverlay.setAttribute(
            "aria-hidden",
            "false"
        );

        settingsOverlay.style.display =
            "flex";
    }
);


/* =====================================================
   SETTINGS CLOSE
===================================================== */

function closeSettingsWindow() {

    settingsOverlay.hidden = true;

    settingsOverlay.setAttribute(
        "aria-hidden",
        "true"
    );

    settingsOverlay.style.display =
        "none";
}


closeSettings.addEventListener(
    "click",
    closeSettingsWindow
);


settingsOverlay.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            settingsOverlay
        ) {

            closeSettingsWindow();
        }
    }
);


/* ESC */

document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

            if (
                !settingsOverlay.hidden
            ) {

                closeSettingsWindow();
            }
        }
    }
);


/* =====================================================
   SETTINGS RATE
===================================================== */

rateSlider.addEventListener(
    "input",
    () => {

        settings.rate =
            Number(
                rateSlider.value
            );

        localStorage.setItem(
            "nova_rate",
            String(settings.rate)
        );

        updateSettingLabels();
    }
);


/* =====================================================
   SETTINGS VOLUME
===================================================== */

volumeSlider.addEventListener(
    "input",
    () => {

        settings.volume =
            Number(
                volumeSlider.value
            );

        localStorage.setItem(
            "nova_volume",
            String(settings.volume)
        );

        updateSettingLabels();
    }
);


/* =====================================================
   SETTINGS VOICE
===================================================== */

voiceSelect.addEventListener(
    "change",
    () => {

        settings.voiceName =
            voiceSelect.value;

        localStorage.setItem(
            "nova_voice",
            settings.voiceName
        );
    }
);


/* =====================================================
   MEMORY TOGGLE
===================================================== */

memoryToggle.addEventListener(
    "change",
    () => {

        settings.memory =
            memoryToggle.checked;

        localStorage.setItem(
            "nova_memory",
            String(settings.memory)
        );
    }
);


/* =====================================================
   ANIMATION TOGGLE
===================================================== */

animationToggle.addEventListener(
    "change",
    () => {

        settings.animations =
            animationToggle.checked;

        localStorage.setItem(
            "nova_animations",
            String(settings.animations)
        );


        if (!settings.animations) {

            orb.classList.remove(
                "thinking",
                "listening",
                "speaking"
            );
        }
    }
);


/* =====================================================
   LABELS
===================================================== */

function updateSettingLabels() {

    rateValue.textContent =
        settings.rate.toFixed(1);

    volumeValue.textContent =
        Math.round(
            settings.volume * 100
        ) + "%";
}


/* =====================================================
   TEST VOICE
===================================================== */

testVoice.addEventListener(
    "click",
    () => {

        speak(
            "Hallo. Ich bin Nova. Meine Stimme funktioniert."
        );
    }
);


/* =====================================================
   CREATE FAMILY
===================================================== */

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


            familyCode.value =
                code;


            familyStatus.textContent =
                `Familiencode: ${code}`;


            showToast(
                `Familie erstellt: ${code}`
            );

        } catch (error) {

            console.error(
                "CREATE FAMILY:",
                error
            );

            showToast(
                "Familie konnte nicht erstellt werden."
            );
        }
    }
);


/* =====================================================
   JOIN FAMILY
===================================================== */

joinFamily.addEventListener(
    "click",
    async () => {

        if (!currentUser) {

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
                "Bitte einen Familiencode eingeben."
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


            if (!family.exists()) {

                showToast(
                    "Familie nicht gefunden."
                );

                return;
            }


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


            familyStatus.textContent =
                `Verbunden: ${code}`;


            showToast(
                "Familie erfolgreich beigetreten."
            );

        } catch (error) {

            console.error(
                "JOIN FAMILY:",
                error
            );

            showToast(
                "Beitreten fehlgeschlagen."
            );
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
            "_blank"
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
            "_blank"
        );
    }
);


/* =====================================================
   ABSOLUTER START
===================================================== */

closeSettingsWindow();

textChat.hidden = true;

chatMode = "voice";

voiceMode.classList.add("active");
textMode.classList.remove("active");

thinking = false;
speaking = false;
recognizing = false;

setState(
    "BEREIT",
    "Nova startet...",
    "Bitte anmelden"
);


setTimeout(() => {

    if (!currentUser) {

        setState(
            "BEREIT",
            "Bitte anmelden",
            "Melde dich mit Google an"
        );

    } else {

        setState(
            "BEREIT",
            "Nova ist bereit",
            "Drücke das Mikrofon"
        );
    }

}, 500);
