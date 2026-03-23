// --- SCORM ---
const scorm = {
    active: false,
    init() {
        this.api = (function find(w) { return (w.API) ? w.API : (w.parent && w.parent != w) ? find(w.parent) : null; })(window);
        if(this.api) { this.api.LMSInitialize(""); this.active = true; }
    },
    save(s, t) {
        if(!this.active) return;
        this.api.LMSSetValue("cmi.core.score.raw", Math.round((s/t)*100));
        this.api.LMSSetValue("cmi.core.lesson_status", "completed");
        this.api.LMSCommit("");
    }
};

// --- VARIABLEN ---
let questions = [], curQ = null, asked = 0, score = 0, gameState = "playing";
const bunnyEl = document.getElementById("bunny");

// --- MATHE RENDERING ---
function render(txt, el) {
    if(!el) return;
    try {
        el.innerHTML = txt.replace(/\$(.*?)\$/g, (m, f) => katex.renderToString(f, { throwOnError: false }));
    } catch(e) { el.innerText = txt; }
}

// --- SPIEL LOGIK ---
async function start() {
    scorm.init();
    try {
        const response = await fetch("question.json?v=" + Date.now());
        const data = await response.json();
        questions = data.sort(() => Math.random() - 0.5);
        resetBunny();
        nextQuestion();
    } catch(err) {
        document.getElementById("questionDisplay").innerText = "Fehler beim Laden!";
    }
}

function resetBunny() {
    // Sicherstellen, dass der Hase in der Mitte unten steht
    bunnyEl.style.left = "50%";
    bunnyEl.style.top = "80%";
    bunnyEl.style.transform = "translate(-50%, -50%)";
}

function nextQuestion() {
    if(asked >= questions.length) {
        scorm.save(score, questions.length * 10);
        document.getElementById("topHUD").innerHTML = `<h2>Mission Erfüllt!</h2><p>Punkte: ${score}</p><button onclick="location.reload()" style="padding:10px 20px; background:#4caf50; color:white; border:none; border-radius:10px;">Nochmal</button>`;
        bunnyEl.style.display = "none";
        return;
    }
    document.getElementById("astronautFeedback").style.display = "none";
    curQ = questions[asked++];
    render(curQ.question, document.getElementById("questionDisplay"));

    const container = document.getElementById("answerContainer");
    container.innerHTML = "";
    curQ.answers.forEach((ans, i) => {
        const div = document.createElement("div");
        div.className = "answerBox";
        render(ans, div);
        div.onclick = (e) => {
            e.stopPropagation();
            if(gameState === "playing") hop(i);
        };
        container.appendChild(div);
    });
    resetBunny();
    gameState = "playing";
}

function hop(idx) {
    gameState = "hopping";
    const boxes = document.querySelectorAll(".answerBox");
    const targetBox = boxes[idx];
    const rect = targetBox.getBoundingClientRect();

    // Hase zum Nest bewegen
    bunnyEl.style.left = (rect.left + rect.width / 2) + "px";
    bunnyEl.style.top = (rect.top + rect.height / 2) + "px";
    bunnyEl.style.transform = "translate(-50%, -50%) scale(1.2)";

    setTimeout(() => {
        gameState = "feedback";
        const isCorrect = (idx === curQ.correctAnswer);
        if(isCorrect) score += 10;
        document.getElementById("scoreDisplay").innerText = "Punkte: " + score;

        const fb = document.getElementById("astronautFeedback");
        const speech = document.getElementById("astronautSpeech");
        fb.style.display = "flex";
        render((isCorrect ? "✅ Richtig! " : "❌ Falsch. ") + (curQ.tipp || "Weiter!"), speech);
    }, 600);
}

// --- EVENTS ---
window.addEventListener("load", () => {
    start();
    
    // Klick auf Feedback-Feld -> Nächste Frage
    document.getElementById("astronautFeedback").onclick = nextQuestion;
    
    // Globaler Klick (außer auf Nester) -> Nächste Frage im Feedback-Modus
    window.addEventListener("pointerdown", (e) => {
        if(gameState === "feedback" && !e.target.closest(".answerBox")) {
            nextQuestion();
        }
    });

    // Tastatur
    window.addEventListener("keydown", (e) => {
        if(gameState === "feedback") {
            nextQuestion();
        } else if(gameState === "playing") {
            if(e.key === "ArrowLeft") hop(0);
            if(e.key === "ArrowUp" || e.key === " ") hop(1);
            if(e.key === "ArrowRight") hop(2);
        }
    });

    // UI
    document.getElementById("infoToggle").onclick = () => document.getElementById("infoOverlay").style.display = "flex";
    document.getElementById("closeInfoBtn").onclick = () => document.getElementById("infoOverlay").style.display = "none";
});
