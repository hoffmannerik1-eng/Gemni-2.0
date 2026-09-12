import {
    initializeApp
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";


import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";


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
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";


import {
    getAI,
    getGenerativeModel,
    GoogleAIBackend
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-ai.js";


import {
    firebaseConfig
}
from "./firebase-config.js";


/* =====================================
   FIREBASE
===================================== */

const firebaseApp =
    initializeApp(firebaseConfig);


const auth =
    getAuth(firebaseApp);


const database =
    getFirestore(firebaseApp);


/* =====================================
   GEMINI ÜBER FIREBASE AI LOGIC
===================================== */

const ai =
    getAI(
        firebaseApp,
        {
            backend:
                new GoogleAIBackend()
        }
    );


const model =
    getGenerativeModel(
        ai,
        {
            model:
                "gemini-3.7-flash"
        }
    );


/* =====================================
   VARIABLEN
===================================== */

let currentUser = null;

let familyId = null;

let currentMode = "private";

let recognition = null;

let busy = false;


/* =====================================
   ELEMENTE
===================================== */

const status =
    document.getElementById("status");

const microphone =
    document.getElementById("microphone");

const orb =
    document.getElementById("orb");

const account =
    document.getElementById("account");

const panel =
    document.getElementById("controlPanel");

const memories =
    document.getElementById("memoryList");

const familyCode =
    document.getElementById("familyCode");


/* =====================================
   GOOGLE LOGIN
===================================== */

document
    .getElementById("loginButton")
    .onclick = login;


async function login() {

    try {

        const provider =
            new GoogleAuthProvider();


        await signInWithPopup(
            auth,
            provider
        );

    }

    catch(error) {

        console.error(error);

        alert(
            "Google-Anmeldung fehlgeschlagen."
        );

    }

}


/* =====================================
   AUTH STATUS
===================================== */

onAuthStateChanged(
    auth,
    async user => {

        currentUser = user;


        if(!user) {

            microphone.disabled = true;

            panel.classList.add(
                "hidden"
            );

            status.textContent =
                "ANMELDEN";

            account.innerHTML = `
                <button id="loginButton">
                    Mit Google anmelden
                </button>
            `;

            document
                .getElementById(
                    "loginButton"
                )
                .onclick = login;

            return;
        }


        microphone.disabled =
            false;


        panel.classList.remove(
            "hidden"
        );


        account.innerHTML = `

            <button id="logoutButton">

                ${escapeHtml(
                    user.displayName ||
                    "Google Konto"
                )}

                · Abmelden

            </button>

        `;


        document
            .getElementById(
                "logoutButton"
            )
            .onclick =
                () => signOut(auth);


        const userDoc =
            await getDoc(
                doc(
                    database,
                    "users",
                    user.uid
                )
            );


        if(userDoc.exists()) {

            familyId =
                userDoc.data().familyId ||
                null;

        }


        status.textContent =
            "BEREIT";


        await loadMemories();

    }
);


/* =====================================
   SPRACHERKENNUNG
===================================== */

function setupSpeech() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if(!SpeechRecognition) {

        status.textContent =
            "SPRACHE NICHT UNTERSTÜTZT";

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


    recognition.onstart =
        () => {

            setState(
                "listening"
            );

            status.textContent =
                "ICH HÖRE ZU";

        };


    recognition.onresult =
        async event => {

            const text =
                event
                    .results[0][0]
                    .transcript;


            await processSpeech(
                text
            );

        };


    recognition.onerror =
        error => {

            console.error(
                error
            );

            setState("");

            status.textContent =
                "BEREIT";

        };


    recognition.onend =
        () => {

            if(!busy) {

                setState("");

                status.textContent =
                    "BEREIT";

            }

        };

}


setupSpeech();


microphone.onclick =
    () => {

        if(
            !recognition ||
            busy
        )
            return;


        try {

            recognition.start();

        }

        catch(error) {

            console.log(
                error
            );

        }

    };


/* =====================================
   SPRACHE → GEMINI
===================================== */

async function processSpeech(
    text
) {

    busy = true;


    setState(
        "thinking"
    );


    status.textContent =
        "NOVA DENKT";


    try {

        const privateMemories =
            await getPrivateMemories();


        let familyMemories = [];


        if(
            currentMode ===
                "family"
            &&
            familyId
        ) {

            familyMemories =
                await getFamilyMemories();

        }


        const prompt = `

Du bist Nova.

Du bist ein moderner deutscher
Sprachassistent.

Der Benutzer sieht keinen
Textchat.

Antworte kurz und natürlich.

Der Benutzer sagt:

"${text}"


PRIVATE ERINNERUNGEN:

${privateMemories.join("\n")}


FAMILIEN-ERINNERUNGEN:

${familyMemories.join("\n")}


Gib ausschließlich gültiges JSON zurück.

Format:

{
    "action": "NONE",
    "query": "",
    "reply": "",
    "saveMemory": false,
    "memory": ""
}


Mögliche Aktionen:

NONE

YOUTUBE_HOME

YOUTUBE_SEARCH

GOOGLE_SEARCH


Wenn der Benutzer sagt:

"Öffne YouTube"

verwende:

YOUTUBE_HOME


Wenn der Benutzer sagt:

"Suche auf YouTube nach Fußball"

verwende:

YOUTUBE_SEARCH


Wenn der Benutzer etwas Wichtiges
über sich selbst sagt, das später
nützlich sein könnte:

saveMemory = true


Beispiel:

"Ich mag Roboter."

Dann:

{
    "saveMemory": true,
    "memory": "Der Nutzer interessiert sich für Roboter."
}


Wenn der Benutzer im Familienmodus
eine gemeinsame Familieninformation
speichert, darf sie als
Familieninformation gespeichert werden.

`;


        const result =
            await model.generateContent(
                prompt
            );


        const raw =
            result.response
                .text()
                .replace(
                    /```json/gi,
                    ""
                )
                .replace(
                    /```/g,
                    ""
                )
                .trim();


        const command =
            JSON.parse(raw);


        /* =========================
           ERINNERUNG SPEICHERN
        ========================= */

        if(
            command.saveMemory
            &&
            command.memory
        ) {

            await saveMemory(
                command.memory
            );

        }


        /* =========================
           AKTION
        ========================= */

        await executeCommand(
            command
        );


    }

    catch(error) {

        console.error(
            error
        );


        const message =
            String(
                error.message ||
                error
            );


        if(
            /429|quota|limit|resource.?exhausted/i
                .test(message)
        ) {

            speak(
                "Das Gemini Limit ist momentan erreicht. Bitte versuche es später erneut."
            );

        }

        else {

            speak(
                "Ich konnte die KI gerade nicht erreichen."
            );

        }

    }


    finally {

        busy = false;

    }

}


/* =====================================
   AKTIONEN
===================================== */

async function executeCommand(
    command
) {


    if(
        command.action ===
        "YOUTUBE_HOME"
    ) {

        window.open(
            "https://www.youtube.com/",
            "_blank"
        );


        speak(
            command.reply ||
            "YouTube ist geöffnet."
        );


        return;

    }


    if(
        command.action ===
        "YOUTUBE_SEARCH"
    ) {

        window.open(

            "https://www.youtube.com/results?search_query="
            +
            encodeURIComponent(
                command.query
            ),

            "_blank"

        );


        speak(
            command.reply ||
            "Ich suche auf YouTube."
        );


        return;

    }


    if(
        command.action ===
        "GOOGLE_SEARCH"
    ) {

        window.open(

            "https://www.google.com/search?q="
            +
            encodeURIComponent(
                command.query
            ),

            "_blank"

        );


        speak(
            command.reply ||
            "Ich öffne die Suche."
        );


        return;

    }


    speak(
        command.reply ||
        "Alles klar."
    );

}


/* =====================================
   SPRACH-AUSGABE
===================================== */

function speak(
    text
) {

    setState(
        "speaking"
    );


    status.textContent =
        "NOVA SPRICHT";


    speechSynthesis.cancel();


    const voice =
        new SpeechSynthesisUtterance(
            text
        );


    voice.lang =
        "de-DE";


    voice.rate =
        1.03;


    voice.pitch =
        .96;


    voice.onend =
        () => {

            setState("");

            status.textContent =
                "BEREIT";

        };


    speechSynthesis.speak(
        voice
    );

}


/* =====================================
   ERINNERUNGEN
===================================== */

async function saveMemory(
    text
) {

    if(
        !currentUser
    )
        return;


    if(
        currentMode ===
            "family"
        &&
        familyId
    ) {

        await addDoc(

            collection(
                database,
                "familyMemories"
            ),

            {

                familyId:

                    familyId,

                ownerUid:

                    currentUser.uid,

                text:

                    text,

                createdAt:

                    serverTimestamp()

            }

        );

    }

    else {

        await addDoc(

            collection(
                database,
                "memories"
            ),

            {

                ownerUid:

                    currentUser.uid,

                text:

                    text,

                createdAt:

                    serverTimestamp()

            }

        );

    }


    await loadMemories();

}


async function getPrivateMemories() {

    const result =
        await getDocs(

            query(

                collection(
                    database,
                    "memories"
                ),

                where(
                    "ownerUid",
                    "==",
                    currentUser.uid
                )

            )

        );


    return result.docs
        .map(
            doc =>
                doc.data().text
        )
        .slice(-30);

}


async function getFamilyMemories() {

    if(!familyId)
        return [];


    const result =
        await getDocs(

            query(

                collection(
                    database,
                    "familyMemories"
                ),

                where(
                    "familyId",
                    "==",
                    familyId
                )

            )

        );


    return result.docs
        .map(
            doc =>
                doc.data().text
        )
        .slice(-30);

}


async function loadMemories() {

    if(!currentUser)
        return;


    let list = [];


    if(
        currentMode ===
            "family"
        &&
        familyId
    ) {

        list =
            await getFamilyMemories();

    }

    else {

        list =
            await getPrivateMemories();

    }


    if(!list.length) {

        memories.innerHTML =
            "Noch keine Erinnerungen.";

        return;

    }


    memories.innerHTML =
        list
            .reverse()
            .map(
                text =>
                    `<div class="memory">
                        ${escapeHtml(text)}
                    </div>`
            )
            .join("");

}


/* =====================================
   FAMILIE ERSTELLEN
===================================== */

document
    .getElementById(
        "createFamily"
    )
    .onclick =
    async () => {

        if(!currentUser)
            return;


        const id =
            crypto
                .randomUUID()
                .replaceAll(
                    "-",
                    ""
                )
                .slice(
                    0,
                    10
                );


        familyId =
            id;


        await setDoc(

            doc(
                database,
                "families",
                id
            ),

            {

                ownerUid:
                    currentUser.uid,

                name:
                    "Meine Familie",

                createdAt:
                    serverTimestamp()

            }

        );


        await setDoc(

            doc(
                database,
                "families",
                id,
                "members",
                currentUser.uid
            ),

            {

                uid:
                    currentUser.uid,

                name:
                    currentUser.displayName,

                joinedAt:
                    serverTimestamp()

            }

        );


        await setDoc(

            doc(
                database,
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


        familyCode.textContent =
            "Familiencode: " +
            id;


        alert(
            "Deine Familie wurde erstellt.\n\nFamiliencode:\n"
            +
            id
        );

    };


/* =====================================
   FAMILIE BEITRETEN
===================================== */

document
    .getElementById(
        "joinFamily"
    )
    .onclick =
    async () => {

        const id =
            prompt(
                "Familiencode eingeben:"
            );


        if(!id)
            return;


        const family =
            await getDoc(

                doc(
                    database,
                    "families",
                    id.trim()
                )

            );


        if(
            !family.exists()
        ) {

            alert(
                "Diese Familie gibt es nicht."
            );

            return;

        }


        familyId =
            id.trim();


        await setDoc(

            doc(
                database,
                "families",
                familyId,
                "members",
                currentUser.uid
            ),

            {

                uid:
                    currentUser.uid,

                name:
                    currentUser.displayName,

                joinedAt:
                    serverTimestamp()

            }

        );


        await setDoc(

            doc(
                database,
                "users",
                currentUser.uid
            ),

            {

                familyId:
                    familyId

            },

            {

                merge:
                    true

            }

        );


        familyCode.textContent =
            "Familie: " +
            familyId;


        await loadMemories();

    };


/* =====================================
   MODUS
===================================== */

document
    .getElementById(
        "privateMode"
    )
    .onclick =
    async () => {

        currentMode =
            "private";


        document
            .getElementById(
                "privateMode"
            )
            .classList.add(
                "selected"
            );


        document
            .getElementById(
                "familyMode"
            )
            .classList.remove(
                "selected"
            );


        await loadMemories();

    };


document
    .getElementById(
        "familyMode"
    )
    .onclick =
    async () => {

        if(!familyId) {

            speak(
                "Du bist noch keiner Familie beigetreten."
            );

            return;

        }


        currentMode =
            "family";


        document
            .getElementById(
                "familyMode"
            )
            .classList.add(
                "selected"
            );


        document
            .getElementById(
                "privateMode"
            )
            .classList.remove(
                "selected"
            );


        await loadMemories();

    };


/* =====================================
   STATUS
===================================== */

function setState(
    state
) {

    orb.classList.remove(
        "listening",
        "thinking",
        "speaking"
    );


    if(state) {

        orb.classList.add(
            state
        );

    }

}


/* =====================================
   HTML SICHER MACHEN
===================================== */

function escapeHtml(
    text
) {

    return String(text)
        .replace(
            /[&<>"']/g,
            char => ({

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            }[char])

        );

}
