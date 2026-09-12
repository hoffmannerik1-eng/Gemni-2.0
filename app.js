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

const app =
    initializeApp(firebaseConfig);

const auth =
    getAuth(app);

const db =
    getFirestore(app);

const ai =
    getAI(app, {
        backend:
            new GoogleAIBackend()
    });

const model =
    getGenerativeModel(ai, {
        model:
            "gemini-3.7-flash"
    });


// ============================================================
// HELPER
// ============================================================

const $ =
    id => document.getElementById(id);


// ============================================================
// ELEMENTS
// ============================================================

const loginButton =
    $("loginButton");

const logoutButton =
    $("logoutButton");

const userInfo =
    $("userInfo");

const userPhoto =
    $("userPhoto");

const userName =
    $("userName");

const userEmail =
    $("userEmail");

const settingsButton =
    $("settingsButton");

const settingsOverlay =
    $("settingsOverlay");

const closeSettings =
    $("closeSettings");

const microphone =
    $("microphone");

const status =
    $("status");

const statusText =
    $("statusText");

const voiceMode =
    $("voiceMode");

const textMode =
    $("textMode");

const textChat =
    $("textChat");

const messages =
    $("messages");

const textInput =
    $("textInput");

const sendText =
    $("sendText");

const privateMode =
    $("privateMode");

const familyMode =
    $("familyMode");

const createFamily =
    $("createFamily");

const joinFamily =
    $("joinFamily");

const familyCode =
    $("familyCode");

const memoryList =
    $("memoryList");

const memoryStatus =
    $("memoryStatus");

const voiceSelect =
    $("voiceSelect");

const rateSlider =
    $("rateSlider");

const rateValue =
    $("rateValue");

const volumeSlider =
    $("volumeSlider");

const volumeValue =
    $("volumeValue");

const memoryToggle =
    $("memoryToggle");

const animationToggle =
    $("animationToggle");

const testVoice =
    $("testVoice");


// ============================================================
// STATE
// ============================================================

let currentUser = null;

let currentFamilyId = null;

let currentMode = "private";

let chatMode = "voice";

let recognition = null;

let listening = false;

let availableVoices = [];


// ============================================================
// LOCAL SETTINGS
// ============================================================

let settings = {
    voiceName: "",
    rate: 0.95,
    volume: 1,
    memory: true,
    animations: true
};


function loadSettings() {

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

        console.error(error);
    }

    rateSlider.value =
        settings.rate;

    volumeSlider.value =
        settings.volume;

    rateValue.textContent =
        settings.rate;

    volumeValue.textContent =
        Math.round(
            settings.volume * 100
        ) + "%";

    memoryToggle.checked =
        settings.memory;

    animationToggle.checked =
        settings.animations;

    if (!settings.animations) {

        document.body.classList.add(
            "no-animation"
        );
    }
}


function saveSettings() {

    localStorage.setItem(
        "novaSettings",
        JSON.stringify(settings)
    );
}

loadSettings();


// ============================================================
// SETTINGS UI
// ============================================================

settingsButton.addEventListener(
    "click",
    () => {

        settingsOverlay.classList.remove(
            "hidden"
        );
    }
);


closeSettings.addEventListener(
    "click",
    () => {

        settingsOverlay.classList.add(
            "hidden"
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

            settingsOverlay.classList.add(
                "hidden"
            );
        }
    }
);


// ============================================================
// VOICES
// ============================================================

function loadVoices() {

    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }

    availableVoices =
        window.speechSynthesis
            .getVoices();

    voiceSelect.innerHTML = "";

    const automatic =
        document.createElement(
            "option"
        );

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
                    a.name.localeCompare(
                        b.name
                    )
            );


    german.forEach(
        voice => {

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
        }
    );


    voiceSelect.value =
        settings.voiceName;
}


loadVoices();


if (
    "speechSynthesis" in window
) {

    window.speechSynthesis.onvoiceschanged =
        loadVoices;
}


// ============================================================
// SETTINGS EVENTS
// ============================================================

rateSlider.addEventListener(
    "input",
    () => {

        settings.rate =
            Number(
                rateSlider.value
            );

        rateValue.textContent =
            settings.rate.toFixed(2);

        saveSettings();
    }
);


volumeSlider.addEventListener(
    "input",
    () => {

        settings.volume =
            Number(
                volumeSlider.value
            );

        volumeValue.textContent =
            Math.round(
                settings.volume * 100
            ) + "%";

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


memoryToggle.addEventListener(
    "change",
    () => {

        settings.memory =
            memoryToggle.checked;

        memoryStatus.textContent =
            settings.memory
                ? "AKTIV"
                : "AUS";

        saveSettings();
    }
);


animationToggle.addEventListener(
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
// NOVA VOICE
// ============================================================

function speak(text) {

    if (!text) return;

    if (
        !("speechSynthesis" in window)
    ) {

        console.error(
            "Sprachausgabe nicht verfügbar."
        );

        return;
    }


    window.speechSynthesis.cancel();


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    utterance.lang =
        "de-DE";

    utterance.rate =
        settings.rate;

    utterance.volume =
        settings.volume;

    utterance.pitch =
        1;


    let voice = null;


    if (settings.voiceName) {

        voice =
            availableVoices.find(
                v =>
                    v.name ===
                    settings.voiceName
            );
    }


    if (!voice) {

        voice =
            availableVoices.find(
                v =>
                    v.lang ===
                    "de-DE"
            );
    }


    if (!voice) {

        voice =
            availableVoices.find(
                v =>
                    v.lang
                        ?.toLowerCase()
                        .startsWith("de")
            );
    }


    if (voice) {

        utterance.voice =
            voice;
    }


    utterance.onstart =
        () => {

            setState(
                "SPEAKEN",
                "Nova spricht..."
            );
        };


    utterance.onend =
        () => {

            setState(
                "BEREIT",
                "Nova wartet"
            );
        };


    utterance.onerror =
        error => {

            console.error(
                "VOICE ERROR:",
                error
            );

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

testVoice.addEventListener(
    "click",
    () => {

        speak(
            "Hallo. Ich bin Nova. Deine Sprachausgabe funktioniert."
        );
    }
);


// ============================================================
// STATUS
// ============================================================

function setState(
    state,
    text
) {

    status.textContent =
        state;

    statusText.textContent =
        text;


    microphone.classList.remove(
        "listening",
        "thinking",
        "speaking"
    );


    if (
        state === "ZUHÖREN"
    ) {

        microphone.classList.add(
            "listening"
        );
    }


    if (
        state === "DENKEN"
    ) {

        microphone.classList.add(
            "thinking"
        );
    }


    if (
        state === "SPRECHEN"
    ) {

        microphone.classList.add(
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
        await getRedirectResult(
            auth
        );

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
// AUTH STATE
// ============================================================

onAuthStateChanged(
    auth,
    async user => {

        console.log(
            "AUTH:",
            user
        );


        if (!user) {

            currentUser =
                null;

            userInfo.classList.add(
                "hidden"
            );

            loginButton.classList.remove(
                "hidden"
            );

            logoutButton.classList.add(
                "hidden"
            );

            setState(
                "BEREIT",
                "Bitte anmelden"
            );

            return;
        }


        currentUser =
            user;


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

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await signOut(
                auth
            );

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

    if (!currentUser) return;


    try {

        const reference =
            doc(
                db,
                "users",
                currentUser.uid
            );


        const snapshot =
            await getDoc(
                reference
            );


        if (
            snapshot.exists()
        ) {

            const data =
                snapshot.data();

            currentFamilyId =
                data.familyId ||
                null;
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

            listening =
                true;

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


            listening =
                false;


            console.log(
                "USER:",
                text
            );


            await sendToNova(
                text
            );
        };


    recognition.onerror =
        event => {

            listening =
                false;


            console.error(
                "MIC:",
                event.error
            );


            setState(
                "FEHLER",
                "Mikrofonfehler"
            );


            if (
                event.error ===
                "not-allowed"
            ) {

                speak(
                    "Bitte erlaube Nova den Zugriff auf dein Mikrofon."
                );
            }
        };


    recognition.onend =
        () => {

            listening =
                false;
        };
}


// ============================================================
// MICROPHONE
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
                "Dein Browser unterstützt keine Spracheingabe."
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
                error
            );
        }
    }
);


// ============================================================
// CHAT MODE
// ============================================================

voiceMode.addEventListener(
    "click",
    () => {

        chatMode =
            "voice";

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

        chatMode =
            "text";

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
    sendTextMessage
);


textInput.addEventListener(
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


    await sendToNova(
        text
    );
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
// GEMINI
// ============================================================

async function sendToNova(text) {

    if (!currentUser)
        return;


    setState(
        "DENKEN",
        "Nova denkt..."
    );


    try {

        const memories =
            settings.memory
                ? await getMemoryContext()
                : "";


        const prompt = `

Du bist Nova, eine moderne persönliche KI.

Antworte auf Deutsch.

Benutzer:
"${text}"

Bekannte Erinnerungen:
${memories || "Keine"}

Wenn der Benutzer etwas über sich erzählt,
das langfristig nützlich ist:
saveMemory = true.

Wenn er YouTube öffnen möchte:
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
            parseJSON(
                raw
            );


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
            data.reply ||
            "Okay.";


        if (
            chatMode === "text"
        ) {

            addMessage(
                "nova",
                reply
            );

        } else {

            speak(
                reply
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
// JSON
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
                action:
                    "NONE",

                query:
                    "",

                reply:
                    text,

                saveMemory:
                    false,

                memory:
                    ""
            };
        }
    }
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
            encodeURIComponent(
                query
            ),
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
            encodeURIComponent(
                query
            ),
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
            currentMode ===
                "family" &&
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
            currentMode ===
                "family" &&
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

                    result.push(
                        item.data()
                            .memory
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
                item => {

                    result.push(
                        item.data()
                            .memory
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

privateMode.addEventListener(
    "click",
    async () => {

        currentMode =
            "private";


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
                    .replaceAll(
                        "-",
                        ""
                    )
                    .substring(
                        0,
                        8
                    )
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
                    merge:
                        true
                }
            );


            currentFamilyId =
                code;


            familyCode.textContent =
                `Familiencode: ${code}`;


            speak(
                `Familie erstellt. Dein Familiencode ist ${code}.`
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
// JOIN FAMILY
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
                    merge:
                        true
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
                "Der Beitritt zur Familie ist fehlgeschlagen."
            );
        }
    }
);


// ============================================================
// LOGIN
// ============================================================

loginButton.addEventListener(
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
        "AI:",
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
            "Das Gemini Limit ist momentan erreicht. Bitte versuche es später erneut."
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
            reply
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
    "NOVA FAMILY AI ONLINE"
);
