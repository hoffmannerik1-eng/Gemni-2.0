// ============================================================
// NOVA FAMILY AI — FIXED VOICE + THINKING + LISTENING
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
// HELPER
// ============================================================

const $ = id => document.getElementById(id);


// ============================================================
// ELEMENTS
// ============================================================

const loginButton = $("loginButton");
const logoutButton = $("logoutButton");

const userInfo = $("userInfo");
const userPhoto = $("userPhoto");
const userName = $("userName");
const userEmail = $("userEmail");

const settingsButton = $("settingsButton");
const settingsOverlay = $("settingsOverlay");
const closeSettings = $("closeSettings");

const microphone = $("microphone");

const status = $("status");
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
const memoryStatus = $("memoryStatus");

const voiceSelect = $("voiceSelect");
const rateSlider = $("rateSlider");
const rateValue = $("rateValue");

const volumeSlider = $("volumeSlider");
const volumeValue = $("volumeValue");

const memoryToggle = $("memoryToggle");
const animationToggle = $("animationToggle");

const testVoice = $("testVoice");


// ============================================================
// STATE
// ============================================================

let currentUser = null;
let currentFamilyId = null;

let currentMode = "private";
let chatMode = "voice";

let recognition = null;

let listening = false;
let speaking = false;
let thinking = false;

let availableVoices = [];

let autoListenTimer = null;


// ============================================================
// SETTINGS
// ============================================================

let settings = {
    voiceName: "",
    rate: 0.92,
    volume: 1,
    memory: true,
    animations: true
};


function loadSettings() {

    try {

        const saved =
            localStorage.getItem("novaSettings");

        if (saved) {

            settings = {
                ...settings,
                ...JSON.parse(saved)
            };
        }

    } catch (error) {

        console.error(
            "SETTINGS LOAD:",
            error
        );
    }


    if (rateSlider)
        rateSlider.value = settings.rate;

    if (volumeSlider)
        volumeSlider.value = settings.volume;

    if (rateValue)
        rateValue.textContent =
            Number(settings.rate).toFixed(2);

    if (volumeValue)
        volumeValue.textContent =
            Math.round(settings.volume * 100) + "%";

    if (memoryToggle)
        memoryToggle.checked = settings.memory;

    if (animationToggle)
        animationToggle.checked =
            settings.animations;

    document.body.classList.toggle(
        "no-animation",
        !settings.animations
    );
}


function saveSettings() {

    localStorage.setItem(
        "novaSettings",
        JSON.stringify(settings)
    );
}


loadSettings();


// ============================================================
// SETTINGS PANEL
// ============================================================

settingsButton?.addEventListener(
    "click",
    () => {

        settingsOverlay.classList.remove(
            "hidden"
        );
    }
);


closeSettings?.addEventListener(
    "click",
    () => {

        settingsOverlay.classList.add(
            "hidden"
        );
    }
);


settingsOverlay?.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            settingsOverlay
        ) {

            settingsOverlay.classList.add(
                "hidden"
            );
        }
    }
);


// ============================================================
// NATURAL BROWSER VOICE SELECTION
// ============================================================

function voiceScore(voice) {

    const name =
        (voice.name || "").toLowerCase();

    const lang =
        (voice.lang || "").toLowerCase();

    let score = 0;


    if (lang === "de-de")
        score += 100;

    else if (lang.startsWith("de"))
        score += 80;


    // Stimmen, die häufig natürlicher klingen
    if (name.includes("google"))
        score += 40;

    if (name.includes("microsoft"))
        score += 40;

    if (name.includes("premium"))
        score += 35;

    if (name.includes("enhanced"))
        score += 35;

    if (name.includes("neural"))
        score += 35;

    if (name.includes("natural"))
        score += 35;

    if (name.includes("siri"))
        score += 25;


    // Schlechtere generische Stimmen etwas nach hinten
    if (name.includes("compact"))
        score -= 10;

    if (name.includes("espeak"))
        score -= 20;


    return score;
}


function loadVoices() {

    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }


    availableVoices =
        window.speechSynthesis.getVoices();


    voiceSelect.innerHTML = "";


    const automatic =
        document.createElement("option");

    automatic.value = "";

    automatic.textContent =
        "Automatisch – beste deutsche Stimme";

    voiceSelect.appendChild(
        automatic
    );


    const german =
        availableVoices
            .filter(
                voice =>
                    voice.lang &&
                    voice.lang
                        .toLowerCase()
                        .startsWith("de")
            )
            .sort(
                (a, b) =>
                    voiceScore(b) -
                    voiceScore(a)
            );


    german.forEach(
        voice => {

            const option =
                document.createElement("option");

            option.value =
                voice.name;

            option.textContent =
                `${voice.name} (${voice.lang})`;

            voiceSelect.appendChild(
                option
            );
        }
    );


    voiceSelect.value =
        settings.voiceName;
}


loadVoices();


if ("speechSynthesis" in window) {

    window.speechSynthesis.onvoiceschanged =
        loadVoices;
}


// ============================================================
// SETTINGS EVENTS
// ============================================================

rateSlider?.addEventListener(
    "input",
    () => {

        settings.rate =
            Number(rateSlider.value);

        rateValue.textContent =
            settings.rate.toFixed(2);

        saveSettings();
    }
);


volumeSlider?.addEventListener(
    "input",
    () => {

        settings.volume =
            Number(volumeSlider.value);

        volumeValue.textContent =
            Math.round(
                settings.volume * 100
            ) + "%";

        saveSettings();
    }
);


voiceSelect?.addEventListener(
    "change",
    () => {

        settings.voiceName =
            voiceSelect.value;

        saveSettings();
    }
);


memoryToggle?.addEventListener(
    "change",
    async () => {

        settings.memory =
            memoryToggle.checked;

        if (memoryStatus) {

            memoryStatus.textContent =
                settings.memory
                    ? "AKTIV"
                    : "AUS";
        }

        saveSettings();

        await loadMemories();
    }
);


animationToggle?.addEventListener(
    "change",
    () => {

        settings.animations =
            animationToggle.checked;

        document.body.classList.toggle(
            "no-animation",
            !settings.animations
        );

        saveSettings();
    }
);


// ============================================================
// STOP EVERYTHING
// ============================================================

function stopAllVoice() {

    clearTimeout(autoListenTimer);

    autoListenTimer = null;


    if (recognition) {

        try {
            recognition.stop();
        } catch {}
    }


    listening = false;


    if ("speechSynthesis" in window) {

        window.speechSynthesis.cancel();
    }


    speaking = false;
}


// ============================================================
// SPEAK
// ============================================================

function speak(text, autoListenAfter = true) {

    if (!text)
        return;


    if (!("speechSynthesis" in window)) {

        console.error(
            "SpeechSynthesis wird nicht unterstützt."
        );

        setState(
            "BEREIT",
            "Nova wartet"
        );

        return;
    }


    clearTimeout(autoListenTimer);


    window.speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    utterance.lang = "de-DE";

    utterance.rate =
        Number(settings.rate);

    utterance.volume =
        Number(settings.volume);

    utterance.pitch = 1;


    let voice = null;


    // Manuell gewählte Stimme
    if (settings.voiceName) {

        voice =
            availableVoices.find(
                v =>
                    v.name ===
                    settings.voiceName
            );
    }


    // Beste automatische deutsche Stimme
    if (!voice) {

        voice =
            availableVoices
                .filter(
                    v =>
                        v.lang &&
                        v.lang
                            .toLowerCase()
                            .startsWith("de")
                )
                .sort(
                    (a, b) =>
                        voiceScore(b) -
                        voiceScore(a)
                )[0];
    }


    if (voice) {

        utterance.voice =
            voice;
    }


    utterance.onstart =
        () => {

            speaking = true;
            thinking = false;

            setState(
                "SPRECHEN",
                "Nova spricht..."
            );
        };


    utterance.onend =
        () => {

            speaking = false;


            setState(
                "BEREIT",
                "Nova wartet"
            );


            // Nach der Antwort kurz warten
            // und dann wieder zuhören.
            if (
                autoListenAfter &&
                chatMode === "voice" &&
                currentUser &&
                recognition
            ) {

                autoListenTimer =
                    setTimeout(
                        () => {

                            startListening();

                        },
                        700
                    );
            }
        };


    utterance.onerror =
        error => {

            console.error(
                "VOICE ERROR:",
                error
            );

            speaking = false;

            setState(
                "FEHLER",
                "Sprachausgabe fehlgeschlagen"
            );
        };


    window.speechSynthesis.speak(
        utterance
    );
}


// ============================================================
// VOICE TEST
// ============================================================

testVoice?.addEventListener(
    "click",
    () => {

        speak(
            "Hallo. Ich bin Nova. Ich kann jetzt natürlicher sprechen.",
            false
        );
    }
);


// ============================================================
// STATE
// ============================================================

function setState(
    state,
    text
) {

    if (status)
        status.textContent = state;

    if (statusText)
        statusText.textContent = text;


    microphone?.classList.remove(
        "listening",
        "thinking",
        "speaking"
    );


    if (state === "ZUHÖREN") {

        microphone?.classList.add(
            "listening"
        );
    }


    if (state === "DENKEN") {

        microphone?.classList.add(
            "thinking"
        );
    }


    if (state === "SPRECHEN") {

        microphone?.classList.add(
            "speaking"
        );
    }
}


// ============================================================
// TOAST
// ============================================================

function toast(text) {

    const element =
        $("toast");

    if (!element)
        return;


    element.textContent =
        text;

    element.classList.add(
        "show"
    );


    setTimeout(
        () => {

            element.classList.remove(
                "show"
            );

        },
        3000
    );
}


// ============================================================
// GOOGLE LOGIN
// ============================================================

async function login() {

    try {

        const provider =
            new GoogleAuthProvider();


        provider.setCustomParameters({
            prompt:
                "select_account"
        });


        await signInWithRedirect(
            auth,
            provider
        );

    } catch (error) {

        console.error(
            "LOGIN:",
            error
        );

        toast(
            "Google-Anmeldung konnte nicht gestartet werden."
        );
    }
}


// ============================================================
// REDIRECT RESULT
// ============================================================

try {

    const result =
        await getRedirectResult(auth);


    if (result?.user) {

        console.log(
            "LOGIN ERFOLGREICH:",
            result.user.email
        );
    }

} catch (error) {

    console.error(
        "REDIRECT:",
        error
    );

    toast(
        "Google-Anmeldung konnte nicht abgeschlossen werden."
    );
}


// ============================================================
// AUTH
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        if (!user) {

            currentUser = null;

            userInfo?.classList.add(
                "hidden"
            );

            loginButton?.classList.remove(
                "hidden"
            );

            logoutButton?.classList.add(
                "hidden"
            );


            stopAllVoice();


            setState(
                "BEREIT",
                "Bitte anmelden"
            );


            return;
        }


        currentUser =
            user;


        userInfo?.classList.remove(
            "hidden"
        );

        loginButton?.classList.add(
            "hidden"
        );

        logoutButton?.classList.remove(
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


        setState(
            "BEREIT",
            "Nova ist bereit"
        );


        await loadUser();


        toast(
            `Willkommen ${user.displayName || ""}`
        );
    }
);


// ============================================================
// LOGOUT
// ============================================================

logoutButton?.addEventListener(
    "click",
    async () => {

        try {

            stopAllVoice();

            await signOut(auth);

            toast(
                "Abgemeldet."
            );

        } catch (error) {

            console.error(error);
        }
    }
);


// ============================================================
// LOAD USER
// ============================================================

async function loadUser() {

    if (!currentUser)
        return;


    try {

        const reference =
            doc(
                db,
                "users",
                currentUser.uid
            );


        const snapshot =
            await getDoc(reference);


        if (snapshot.exists()) {

            const data =
                snapshot.data();

            currentFamilyId =
                data.familyId || null;


            if (currentFamilyId) {

                familyCode.textContent =
                    `Familiencode: ${currentFamilyId}`;
            }
        }


        await loadMemories();

    } catch (error) {

        console.error(
            "USER LOAD:",
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

            listening = true;

            speaking = false;

            thinking = false;


            setState(
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


            listening = false;


            if (!text)
                return;


            console.log(
                "USER:",
                text
            );


            await sendToNova(text);
        };


    recognition.onerror =
        event => {

            listening = false;


            console.error(
                "MIC:",
                event.error
            );


            if (
                event.error ===
                "aborted"
            ) {
                return;
            }


            if (
                event.error ===
                "no-speech"
            ) {

                setState(
                    "BEREIT",
                    "Nova wartet"
                );

                return;
            }


            setState(
                "FEHLER",
                "Mikrofonfehler"
            );


            if (
                event.error ===
                "not-allowed"
            ) {

                speak(
                    "Bitte erlaube Nova den Zugriff auf dein Mikrofon.",
                    false
                );
            }
        };


    recognition.onend =
        () => {

            listening = false;
        };
}


// ============================================================
// START LISTENING
// ============================================================

function startListening() {

    if (!recognition)
        return;


    if (!currentUser)
        return;


    if (speaking)
        return;


    if (thinking)
        return;


    if (listening)
        return;


    try {

        recognition.start();

    } catch (error) {

        console.log(
            "LISTEN START:",
            error
        );
    }
}


// ============================================================
// MICROPHONE
// ============================================================

microphone?.addEventListener(
    "click",
    () => {

        if (!currentUser) {

            toast(
                "Bitte zuerst mit Google anmelden."
            );

            return;
        }


        if (!recognition) {

            speak(
                "Dein Browser unterstützt keine Spracheingabe.",
                false
            );

            return;
        }


        // Wenn Nova gerade spricht:
        // sofort stoppen und zuhören.
        if (speaking) {

            window.speechSynthesis.cancel();

            speaking = false;

            setTimeout(
                startListening,
                150
            );

            return;
        }


        // Wenn Nova denkt:
        // nichts doppelt starten.
        if (thinking) {

            toast(
                "Nova verarbeitet gerade deine Anfrage."
            );

            return;
        }


        // Wenn bereits zugehört wird:
        // Aufnahme beenden.
        if (listening) {

            try {
                recognition.stop();
            } catch {}

            return;
        }


        startListening();
    }
);


// ============================================================
// CHAT MODE
// ============================================================

voiceMode?.addEventListener(
    "click",
    () => {

        chatMode = "voice";


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


textMode?.addEventListener(
    "click",
    () => {

        chatMode = "text";


        textMode.classList.add(
            "active"
        );

        voiceMode.classList.remove(
            "active"
        );


        textChat.classList.remove(
            "hidden"
        );


        clearTimeout(autoListenTimer);


        if (recognition && listening) {

            try {
                recognition.stop();
            } catch {}
        }


        textInput.focus();
    }
);


// ============================================================
// TEXT SEND
// ============================================================

sendText?.addEventListener(
    "click",
    sendTextMessage
);


textInput?.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            sendTextMessage();
        }
    }
);


async function sendTextMessage() {

    const text =
        textInput.value.trim();


    if (!text)
        return;


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
// CHAT MESSAGE
// ============================================================

function addMessage(
    type,
    text
) {

    const element =
        document.createElement(
            "div"
        );


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
// TIMEOUT HELPER
// ============================================================

function withTimeout(
    promise,
    milliseconds,
    message
) {

    return Promise.race([

        promise,

        new Promise(
            (_, reject) => {

                setTimeout(
                    () => {

                        reject(
                            new Error(
                                message
                            )
                        );

                    },
                    milliseconds
                );
            }
        )
    ]);
}


// ============================================================
// GEMINI
// ============================================================

async function sendToNova(text) {

    if (!currentUser)
        return;


    clearTimeout(autoListenTimer);


    if (recognition && listening) {

        try {
            recognition.stop();
        } catch {}
    }


    thinking = true;
    speaking = false;


    setState(
        "DENKEN",
        "Nova denkt..."
    );


    try {

        const memories =
            settings.memory
                ? await withTimeout(
                    getMemoryContext(),
                    10000,
                    "Memory timeout"
                )
                : "";


        const prompt = `

Du bist Nova, eine moderne persönliche KI.

Antworte auf Deutsch.

Sei natürlich, freundlich und kurz.
Klinge wie ein echter persönlicher Assistent.
Keine unnötigen langen Erklärungen.

Benutzer:
"${text}"

Bekannte Erinnerungen:
${memories || "Keine"}

Wenn der Benutzer etwas über sich erzählt,
das langfristig nützlich ist:
saveMemory = true.

Wenn der Benutzer YouTube öffnen möchte:
YOUTUBE_HOME

Wenn er auf YouTube etwas suchen möchte:
YOUTUBE_SEARCH

Wenn er Google benutzen möchte:
GOOGLE_SEARCH

Antworte ausschließlich als JSON:

{
 "action":"NONE",
 "query":"",
 "reply":"",
 "saveMemory":false,
 "memory":""
}

Erlaubte actions:

NONE
YOUTUBE_HOME
YOUTUBE_SEARCH
GOOGLE_SEARCH

`;


        // WICHTIG:
        // Falls Gemini hängt, wird nach 25 Sekunden
        // automatisch ein Fehler ausgelöst.
        const result =
            await withTimeout(
                model.generateContent(prompt),
                25000,
                "Gemini Timeout"
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
            settings.memory &&
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


        const reply =
            cleanReply(
                data.reply ||
                "Okay."
            );


        thinking = false;


        if (
            chatMode === "text"
        ) {

            setState(
                "BEREIT",
                "Nova wartet"
            );


            addMessage(
                "nova",
                reply
            );

        } else {

            speak(
                reply,
                true
            );
        }


    } catch (error) {

        thinking = false;


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
// CLEAN REPLY
// ============================================================

function cleanReply(text) {

    return String(text)
        .replace(
            /^["']|["']$/g,
            ""
        )
        .trim();
}


// ============================================================
// JSON
// ============================================================

function parseJSON(text) {

    try {

        return JSON.parse(
            text
        );

    } catch {}


    const cleaned =
        String(text)
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

    } catch {}


    // JSON innerhalb von anderem Text suchen
    const start =
        cleaned.indexOf("{");

    const end =
        cleaned.lastIndexOf("}");


    if (
        start !== -1 &&
        end !== -1 &&
        end > start
    ) {

        try {

            return JSON.parse(
                cleaned.substring(
                    start,
                    end + 1
                )
            );

        } catch {}
    }


    return {
        action: "NONE",
        query: "",
        reply: cleaned,
        saveMemory: false,
        memory: ""
    };
}


// ============================================================
// ACTIONS
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

        if (!query)
            return;


        window.open(
            "https://www.youtube.com/results?search_query=" +
            encodeURIComponent(query),
            "_blank"
        );

        return;
    }


    if (
        action ===
        "GOOGLE_SEARCH"
    ) {

        if (!query)
            return;


        window.open(
            "https://www.google.com/search?q=" +
            encodeURIComponent(query),
            "_blank"
        );
    }
}


// ============================================================
// MEMORY SAVE
// ============================================================

async function saveMemory(memory) {

    if (!currentUser)
        return;


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
            "MEMORY SAVE:",
            error
        );
    }
}


// ============================================================
// MEMORY CONTEXT
// ============================================================

async function getMemoryContext() {

    if (!currentUser)
        return "";


    try {

        const result = [];


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
                item => {

                    const memory =
                        item.data().memory;

                    if (memory)
                        result.push(memory);
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
                item => {

                    const memory =
                        item.data().memory;

                    if (memory)
                        result.push(memory);
                }
            );
        }


        return result
            .slice(-30)
            .join("\n- ");

    } catch (error) {

        console.error(
            "MEMORY CONTEXT:",
            error
        );

        return "";
    }
}


// ============================================================
// MEMORY LIST
// ============================================================

async function loadMemories() {

    if (!currentUser)
        return;


    if (!settings.memory) {

        memoryList.innerHTML =
            `<div class="memory-item">
                Memory ist deaktiviert.
            </div>`;

        return;
    }


    try {

        const context =
            await getMemoryContext();


        memoryList.innerHTML = "";


        if (!context) {

            memoryList.innerHTML =
                `<div class="memory-item">
                    Noch keine Erinnerungen.
                </div>`;

            return;
        }


        context
            .split("\n- ")
            .filter(Boolean)
            .forEach(
                memory => {

                    const element =
                        document.createElement(
                            "div"
                        );


                    element.className =
                        "memory-item";


                    element.textContent =
                        memory;


                    memoryList.appendChild(
                        element
                    );
                }
            );

    } catch (error) {

        console.error(
            "MEMORY LOAD:",
            error
        );
    }
}


// ============================================================
// PRIVATE MODE
// ============================================================

privateMode?.addEventListener(
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
            "Privater Modus aktiviert."
        );
    }
);


// ============================================================
// FAMILY MODE
// ============================================================

familyMode?.addEventListener(
    "click",
    async () => {

        if (!currentFamilyId) {

            speak(
                "Du bist noch keiner Familie beigetreten.",
                false
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
            "Familienmodus aktiviert."
        );
    }
);


// ============================================================
// CREATE FAMILY
// ============================================================

createFamily?.addEventListener(
    "click",
    async () => {

        if (!currentUser) {

            speak(
                "Bitte melde dich zuerst an.",
                false
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
                `Familie erstellt. Dein Familiencode ist ${code}.`,
                false
            );

        } catch (error) {

            console.error(
                "CREATE FAMILY:",
                error
            );


            speak(
                "Die Familie konnte nicht erstellt werden.",
                false
            );
        }
    }
);


// ============================================================
// JOIN FAMILY
// ============================================================

joinFamily?.addEventListener(
    "click",
    async () => {

        if (!currentUser) {

            speak(
                "Bitte melde dich zuerst an.",
                false
            );

            return;
        }


        const code =
            prompt(
                "Familiencode eingeben:"
            );


        if (!code)
            return;


        const id =
            code
                .trim()
                .toUpperCase();


        try {

            const family =
                await getDoc(
                    doc(
                        db,
                        "families",
                        id
                    )
                );


            if (!family.exists()) {

                speak(
                    "Diese Familie wurde nicht gefunden.",
                    false
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
                "Du bist der Familie beigetreten.",
                false
            );

        } catch (error) {

            console.error(
                "JOIN FAMILY:",
                error
            );


            speak(
                "Der Beitritt zur Familie ist fehlgeschlagen.",
                false
            );
        }
    }
);


// ============================================================
// LOGIN
// ============================================================

loginButton?.addEventListener(
    "click",
    login
);


// ============================================================
// AI ERROR
// ============================================================

function handleAIError(error) {

    const message =
        String(
            error?.message ||
            error ||
            ""
        );


    console.error(
        "AI ERROR:",
        message
    );


    if (
        /429|quota|limit|resource.?exhausted/i
            .test(message)
    ) {

        setState(
            "LIMIT",
            "Gemini-Limit erreicht"
        );


        speak(
            "Das Gemini Limit ist momentan erreicht. Bitte versuche es später erneut.",
            false
        );


        return;
    }


    if (
        /timeout/i.test(message)
    ) {

        setState(
            "FEHLER",
            "Gemini antwortet zu langsam"
        );


        speak(
            "Die KI antwortet gerade zu langsam. Bitte versuche es noch einmal.",
            false
        );


        return;
    }


    setState(
        "FEHLER",
        "Nova hat einen Fehler"
    );


    const reply =
        "Entschuldigung, momentan ist ein Fehler mit meiner KI aufgetreten.";


    if (
        chatMode === "text"
    ) {

        addMessage(
            "nova",
            reply
        );

    } else {

        speak(
            reply,
            false
        );
    }
}


// ============================================================
// START
// ============================================================

setState(
    "BEREIT",
    "Nova wartet"
);


console.log(
    "NOVA FAMILY AI ONLINE — VOICE FIXED"
);
