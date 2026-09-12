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


/* =========================================================
   FIREBASE
========================================================= */

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

const ai = getAI(
    app,
    {
        backend: new GoogleAIBackend()
    }
);


/*
    Falls ein Modell später nicht verfügbar ist,
    kann hier einfach der Modellname geändert werden.
*/

const model = getGenerativeModel(
    ai,
    {
        model: "gemini-3.7-flash"
    }
);


/* =========================================================
   DOM
========================================================= */

const $ = id =>
    document.getElementById(id);


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

const microphone =
    $("microphone");

const orb =
    $("orb");

const status =
    $("status");

const statusText =
    $("statusText");

const statusSub =
    $("statusSub");

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

const settingsButton =
    $("settingsButton");

const settingsOverlay =
    $("settingsOverlay");

const closeSettings =
    $("closeSettings");

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

const createFamily =
    $("createFamily");

const joinFamily =
    $("joinFamily");

const familyCode =
    $("familyCode");

const familyStatus =
    $("familyStatus");

const memoryStatus =
    $("memoryStatus");

const youtubeButton =
    $("youtubeButton");

const googleButton =
    $("googleButton");

const toast =
    $("toast");


/* =========================================================
   STATE
========================================================= */

let currentUser = null;

let currentFamilyId = null;

let voices = [];

let recognition = null;

let recognizing = false;

let speaking = false;

let thinking = false;

let chatMode = "voice";

let requestNumber = 0;

let toastTimer = null;


/* =========================================================
   SETTINGS
========================================================= */

const settings = {

    voiceName:
        localStorage.getItem(
            "nova_voice"
        ) || "",

    rate:
        Number(
            localStorage.getItem(
                "nova_rate"
            ) || 1
        ),

    volume:
        Number(
            localStorage.getItem(
                "nova_volume"
            ) || 1
        ),

    memory:
        localStorage.getItem(
            "nova_memory"
        ) !== "false",

    animations:
        localStorage.getItem(
            "nova_animations"
        ) !== "false"
};


rateSlider.value =
    settings.rate;

volumeSlider.value =
    settings.volume;

memoryToggle.checked =
    settings.memory;

animationToggle.checked =
    settings.animations;

updateSettingLabels();


/* =========================================================
   UI
========================================================= */

function setState(
    state,
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

    microphone.classList.remove(
        "active"
    );


    if (
        settings.animations
    ) {

        if (
            state === "DENKEN"
        ) {

            orb.classList.add(
                "thinking"
            );

        }

        if (
            state === "HÖREN"
        ) {

            orb.classList.add(
                "listening"
            );

            microphone.classList.add(
                "active"
            );

        }

        if (
            state === "SPRECHEN"
        ) {

            orb.classList.add(
                "speaking"
            );
        }
    }
}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    text
) {

    toast.textContent =
        text;

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toastTimer
    );

    toastTimer =
        setTimeout(() => {

            toast.classList.remove(
                "show"
            );

        }, 3000);
}


/* =========================================================
   LOGIN
========================================================= */

loginButton.addEventListener(
    "click",
    async () => {

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


logoutButton.addEventListener(
    "click",
    async () => {

        await signOut(
            auth
        );
    }
);


/*
    Redirect-Ergebnis abholen.
*/

getRedirectResult(
    auth
).catch(error => {

    console.error(
        "LOGIN ERROR:",
        error
    );

});


/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(
    auth,
    async user => {

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

            microphone.disabled =
                true;

            textInput.disabled =
                true;

            sendText.disabled =
                true;

            youtubeButton.disabled =
                true;

            googleButton.disabled =
                true;

            setState(
                "BEREIT",
                "Bitte anmelden",
                "Nova wartet"
            );

            return;
        }


        loginButton.hidden =
            true;

        logoutButton.hidden =
            false;

        userInfo.hidden =
            false;

        userPhoto.hidden =
            false;


        userName.textContent =
            user.displayName ||
            "Benutzer";

        userEmail.textContent =
            user.email ||
            "";


        if (
            user.photoURL
        ) {

            userPhoto.src =
                user.photoURL;
        }


        microphone.disabled =
            false;

        textInput.disabled =
            false;

        sendText.disabled =
            false;

        youtubeButton.disabled =
            false;

        googleButton.disabled =
            false;


        setState(
            "BEREIT",
            "Nova ist bereit",
            "Wie kann ich helfen?"
        );


        await loadUserData();

        initializeSpeech();
    }
);


/* =========================================================
   USER DATA
========================================================= */

async function loadUserData() {

    if (!currentUser)
        return;


    try {

        const userRef =
            doc(
                db,
                "users",
                currentUser.uid
            );

        const snap =
            await getDoc(
                userRef
            );


        if (
            snap.exists()
        ) {

            const data =
                snap.data();

            currentFamilyId =
                data.familyId ||
                null;

        }


        if (
            currentFamilyId
        ) {

            familyStatus.textContent =
                `Verbunden: ${currentFamilyId}`;

        }

    } catch (error) {

        console.error(
            "USER DATA ERROR:",
            error
        );

    }
}


/* =========================================================
   SPEECH RECOGNITION
========================================================= */

function initializeSpeech() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        console.warn(
            "SpeechRecognition nicht verfügbar."
        );

        microphone.disabled =
            true;

        statusSub.textContent =
            "Spracherkennung wird nicht unterstützt";

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

            recognizing =
                true;

            setState(
                "HÖREN",
                "Ich höre zu",
                "Sprich jetzt"
            );
        };


    recognition.onresult =
        event => {

            const text =
                event.results[
                    event.results.length - 1
                ][0].transcript.trim();


            recognizing =
                false;


            if (!text)
                return;


            sendToNova(
                text
            );
        };


    recognition.onerror =
        event => {

            console.error(
                "MIC ERROR:",
                event.error
            );

            recognizing =
                false;


            if (
                event.error ===
                "not-allowed"
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
                    "Versuch es erneut"
                );
            }
        };


    recognition.onend =
        () => {

            recognizing =
                false;

            microphone.classList.remove(
                "active"
            );


            if (
                !thinking &&
                !speaking &&
                chatMode === "voice"
            ) {

                setState(
                    "BEREIT",
                    "Nova ist bereit",
                    "Drücke das Mikrofon"
                );
            }
        };
}


/* =========================================================
   MICROPHONE
========================================================= */

microphone.addEventListener(
    "click",
    () => {

        if (
            !currentUser ||
            !recognition
        )
            return;


        if (
            thinking ||
            speaking
        )
            return;


        if (
            recognizing
        ) {

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


/* =========================================================
   TEXT MODE
========================================================= */

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

        textChat.hidden =
            true;


        setState(
            "BEREIT",
            "Sprachmodus",
            "Drücke das Mikrofon"
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

        textChat.hidden =
            false;


        setState(
            "BEREIT",
            "Textmodus",
            "Schreibe Nova etwas"
        );


        setTimeout(
            () =>
                textInput.focus(),
            50
        );
    }
);


/* =========================================================
   TEXT SEND
========================================================= */

sendText.addEventListener(
    "click",
    () => {

        sendTextMessage();
    }
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


function sendTextMessage() {

    const text =
        textInput.value.trim();


    if (!text)
        return;


    textInput.value =
        "";


    addMessage(
        "user",
        text
    );


    sendToNova(
        text
    );
}


/* =========================================================
   CHAT
========================================================= */

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


/* =========================================================
   NOVA
========================================================= */

async function sendToNova(
    userText
) {

    if (
        !currentUser ||
        !userText ||
        thinking
    )
        return;


    const requestId =
        ++requestNumber;


    thinking =
        true;

    speaking =
        false;


    setState(
        "DENKEN",
        "Nova denkt...",
        "Einen Moment"
    );


    /*
        WICHTIG:

        Memory wird NICHT mehr vor Gemini
        blockierend abgefragt.

        Das verhindert:
        "Nova denkt..." für immer.
    */

    let memories = "";


    if (
        settings.memory
    ) {

        try {

            memories =
                await timeout(
                    getMemoryContext(),
                    2500
                );

        } catch {

            console.warn(
                "Memory übersprungen."
            );

            memories =
                "";
        }
    }


    if (
        requestId !==
        requestNumber
    )
        return;


    const prompt = `

Du bist Nova, eine persönliche KI.

Sprich Deutsch.

Antworte natürlich, freundlich und kurz.
Keine langen Erklärungen, außer der Benutzer bittet darum.

Benutzer:
${userText}

Bekannte Erinnerungen:
${memories || "Keine"}

Wenn der Benutzer etwas dauerhaft Wichtiges über sich
mitteilt, darf saveMemory true sein.

Wenn YouTube geöffnet werden soll:
YOUTUBE_HOME

Wenn auf YouTube gesucht werden soll:
YOUTUBE_SEARCH

Wenn Google geöffnet werden soll:
GOOGLE_SEARCH

Antworte ausschließlich als gültiges JSON:

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

        /*
            Gemini bekommt maximal 15 Sekunden.
        */

        const result =
            await timeout(
                model.generateContent(
                    prompt
                ),
                15000
            );


        if (
            requestId !==
            requestNumber
        )
            return;


        const raw =
            result.response.text();


        console.log(
            "NOVA RESPONSE:",
            raw
        );


        const data =
            parseJSON(
                raw
            );


        /*
            SOFORT aus "Denken" heraus.

            Keine Firestore-Operation,
            kein YouTube,
            kein Speech blockiert
            diesen Status.
        */

        thinking =
            false;


        setState(
            "BEREIT",
            "Nova ist bereit",
            "Antwort erhalten"
        );


        /*
            Memory im Hintergrund speichern.
        */

        if (
            settings.memory &&
            data.saveMemory &&
            data.memory
        ) {

            saveMemory(
                data.memory
            ).catch(
                error =>
                    console.error(
                        "MEMORY SAVE:",
                        error
                    )
            );
        }


        /*
            Aktion.
        */

        executeAction(
            data.action,
            data.query
        );


        const reply =
            cleanReply(
                data.reply ||
                "Okay."
            );


        if (
            chatMode ===
            "text"
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
            "NOVA ERROR:",
            error
        );


        /*
            GANZ WICHTIG:

            Egal was passiert:
            Nova bleibt niemals
            dauerhaft im Denkmodus.
        */

        thinking =
            false;


        speaking =
            false;


        orb.classList.remove(
            "thinking",
            "speaking"
        );


        setState(
            "FEHLER",
            "Nova konnte nicht antworten",
            "Versuche es erneut"
        );


        let errorText =
            "Ich konnte gerade keine Antwort erzeugen.";


        const errorString =
            String(
                error?.message ||
                error
            );


        if (
            /timeout/i.test(
                errorString
            )
        ) {

            errorText =
                "Nova hat zu lange auf Gemini gewartet.";

        } else if (
            /429|quota|resource.?exhausted/i.test(
                errorString
            )
        ) {

            errorText =
                "Das Gemini-Limit ist momentan erreicht.";

        } else if (
            /permission|unauthorized|403/i.test(
                errorString
            )
        ) {

            errorText =
                "Firebase oder Gemini hat den Zugriff verweigert.";
        }


        if (
            chatMode ===
            "text"
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


/* =========================================================
   TIMEOUT
========================================================= */

function timeout(
    promise,
    milliseconds
) {

    return new Promise(
        (resolve, reject) => {

            const timer =
                setTimeout(
                    () => {

                        reject(
                            new Error(
                                "Timeout"
                            )
                        );

                    },
                    milliseconds
                );


            promise.then(
                value => {

                    clearTimeout(
                        timer
                    );

                    resolve(
                        value
                    );

                },

                error => {

                    clearTimeout(
                        timer
                    );

                    reject(
                        error
                    );
                }
            );
        }
    );
}


/* =========================================================
   JSON PARSER
========================================================= */

function parseJSON(
    text
) {

    let clean =
        String(text)
            .trim();


    clean =
        clean.replace(
            /^```json/i,
            ""
        );


    clean =
        clean.replace(
            /^```/,
            ""
        );


    clean =
        clean.replace(
            /```$/g,
            ""
        );


    clean =
        clean.trim();


    const first =
        clean.indexOf(
            "{"
        );

    const last =
        clean.lastIndexOf(
            "}"
        );


    if (
        first !== -1 &&
        last !== -1
    ) {

        clean =
            clean.slice(
                first,
                last + 1
            );
    }


    try {

        return JSON.parse(
            clean
        );

    } catch {

        return {

            action:
                "NONE",

            query:
                "",

            reply:
                clean
                    .replace(
                        /```/g,
                        ""
                    )
                    .trim(),

            saveMemory:
                false,

            memory:
                ""
        };
    }
}


/* =========================================================
   CLEAN REPLY
========================================================= */

function cleanReply(
    text
) {

    return String(
        text || ""
    )
        .replace(
            /^["']|["']$/g,
            ""
        )
        .trim();
}


/* =========================================================
   ACTIONS
========================================================= */

function executeAction(
    action,
    queryText
) {

    const query =
        encodeURIComponent(
            queryText || ""
        );


    if (
        action ===
        "YOUTUBE_HOME"
    ) {

        window.open(
            "https://www.youtube.com/",
            "_blank"
        );

    }


    if (
        action ===
        "YOUTUBE_SEARCH"
    ) {

        window.open(
            `https://www.youtube.com/results?search_query=${query}`,
            "_blank"
        );

    }


    if (
        action ===
        "GOOGLE_SEARCH"
    ) {

        window.open(
            `https://www.google.com/search?q=${query}`,
            "_blank"
        );
    }
}


/* =========================================================
   SPEECH SYNTHESIS
========================================================= */

function loadVoices() {

    voices =
        speechSynthesis
            .getVoices();


    voiceSelect.innerHTML =
        "";


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


    available.forEach(
        voice => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                voice.name;

            option.textContent =
                `${voice.name} (${voice.lang})`;


            if (
                voice.name ===
                settings.voiceName
            ) {

                option.selected =
                    true;
            }


            voiceSelect.appendChild(
                option
            );
        }
    );


    if (
        !settings.voiceName &&
        available.length
    ) {

        const best =
            available.find(
                voice =>
                    /google|microsoft|premium|natural|enhanced/i
                        .test(
                            voice.name
                        )
            ) ||
            available[0];


        settings.voiceName =
            best.name;

        voiceSelect.value =
            best.name;
    }
}


loadVoices();

speechSynthesis.onvoiceschanged =
    loadVoices;


/* =========================================================
   SPEAK
========================================================= */

function speak(
    text,
    autoListen = true
) {

    if (!text)
        return;


    speechSynthesis.cancel();


    speaking =
        true;


    setState(
        "SPRECHEN",
        "Nova spricht...",
        text
    );


    const utterance =
        new SpeechSynthesisUtterance(
            text
        );


    const selected =
        voices.find(
            voice =>
                voice.name ===
                settings.voiceName
        );


    if (selected) {

        utterance.voice =
            selected;
    }


    utterance.lang =
        selected?.lang ||
        "de-DE";


    utterance.rate =
        settings.rate;


    utterance.volume =
        settings.volume;


    utterance.onend =
        () => {

            speaking =
                false;


            setState(
                "BEREIT",
                "Nova ist bereit",
                autoListen
                    ? "Drücke das Mikrofon"
                    : "Nova wartet"
            );


            /*
                Nicht automatisch wieder
                zuhören.

                Dadurch startet das Mikrofon
                nicht plötzlich von selbst.
            */
        };


    utterance.onerror =
        error => {

            console.error(
                "SPEECH ERROR:",
                error
            );


            speaking =
                false;


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


/* =========================================================
   MEMORY CONTEXT
========================================================= */

async function getMemoryContext() {

    if (
        !currentUser
    )
        return "";


    const results = [];


    /*
        PRIVATE MEMORY
    */

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


                if (
                    data.memory
                ) {

                    results.push(
                        data.memory
                    );
                }
            }
        );

    } catch (error) {

        console.warn(
            "PRIVATE MEMORY ERROR:",
            error
        );
    }


    /*
        FAMILY MEMORY
    */

    if (
        currentFamilyId
    ) {

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


                    if (
                        data.memory
                    ) {

                        results.push(
                            data.memory
                        );
                    }
                }
            );

        } catch (error) {

            console.warn(
                "FAMILY MEMORY ERROR:",
                error
            );
        }
    }


    return results
        .slice(-20)
        .join("\n");
}


/* =========================================================
   SAVE MEMORY
========================================================= */

async function saveMemory(
    memory
) {

    if (
        !currentUser ||
        !memory
    )
        return;


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


/* =========================================================
   SETTINGS
========================================================= */

settingsButton.addEventListener(
    "click",
    () => {

        settingsOverlay.hidden =
            false;
    }
);


closeSettings.addEventListener(
    "click",
    () => {

        settingsOverlay.hidden =
            true;
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
        }
    }
);


rateSlider.addEventListener(
    "input",
    () => {

        settings.rate =
            Number(
                rateSlider.value
            );


        localStorage.setItem(
            "nova_rate",
            settings.rate
        );


        updateSettingLabels();
    }
);


volumeSlider.addEventListener(
    "input",
    () => {

        settings.volume =
            Number(
                volumeSlider.value
            );


        localStorage.setItem(
            "nova_volume",
            settings.volume
        );


        updateSettingLabels();
    }
);


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


memoryToggle.addEventListener(
    "change",
    () => {

        settings.memory =
            memoryToggle.checked;


        localStorage.setItem(
            "nova_memory",
            settings.memory
        );
    }
);


animationToggle.addEventListener(
    "change",
    () => {

        settings.animations =
            animationToggle.checked;


        localStorage.setItem(
            "nova_animations",
            settings.animations
        );
    }
);


function updateSettingLabels() {

    rateValue.textContent =
        settings.rate.toFixed(1);

    volumeValue.textContent =
        Math.round(
            settings.volume * 100
        ) + "%";
}


testVoice.addEventListener(
    "click",
    () => {

        speak(
            "Hallo Erik. Ich bin Nova und meine Stimme funktioniert."
        );
    }
);


/* =========================================================
   FAMILY
========================================================= */

createFamily.addEventListener(
    "click",
    async () => {

        if (!currentUser)
            return;


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

        if (!currentUser)
            return;


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


            if (
                !family.exists()
            ) {

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
                error
            );

            showToast(
                "Beitreten fehlgeschlagen."
            );
        }
    }
);


/* =========================================================
   QUICK ACTIONS
========================================================= */

youtubeButton.addEventListener(
    "click",
    () => {

        window.open(
            "https://www.youtube.com/",
            "_blank"
        );
    }
);


googleButton.addEventListener(
    "click",
    () => {

        window.open(
            "https://www.google.com/",
            "_blank"
        );
    }
);


/* =========================================================
   START
========================================================= */

setState(
    "BEREIT",
    "Nova startet...",
    "Initialisiere System"
);


/*
    Nach kurzer Zeit nicht dauerhaft
    in "Start" hängen bleiben.
*/

setTimeout(
    () => {

        if (
            !currentUser &&
            !thinking
        ) {

            setState(
                "BEREIT",
                "Bitte anmelden",
                "Melde dich mit Google an"
            );
        }

    },
    1000
);
