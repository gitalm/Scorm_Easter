// --- SCORM Kommunikation ---
const scorm = {
    active: false,
    init() { 
        this.api = (function find(w) { return (w.API) ? w.API : (w.parent && w.parent != w) ? find(w.parent) : null; })(window); 
        if(this.api) { this.api.LMSInitialize(""); this.active = true; } 
    },
    save(score, maxScore) { 
        if (!this.active) return; 
        this.api.LMSSetValue("cmi.core.score.raw", Math.round((score/maxScore)*100)); 
        this.api.LMSSetValue("cmi.core.lesson_status", "completed"); 
        this.api.LMSCommit(""); 
    }
};

// --- Spiel-Variablen ---
let questions = [], curQ = null, asked = 0, score = 0, gameState = "playing";
const bunnyEl = document.getElementById("bunny");

// --- Mathe-Rendering ---
function render(txt, el) { 
    try { el.innerHTML = txt.replace(/\$(.*?)\$/g, (m, f) => katex.renderToString(f)); } 
    catch(e) { el.innerText = txt; } 
}

// --- Start/Spiel-Logik ---
async function start() {
    scorm.init();
    try {
        let r = await fetch("question.json");
        questions = (await r.json()).sort(() => Math.random() - 0.5);
        resetBunny();
        nextQuestion();
    } catch(e) { console.error("JSON konnte nicht geladen werden", e); }
}

function resetBunny() {
    bunnyEl.style.left = (window.innerWidth / 2 - 25) + "px";
    bunnyEl.style.top = (window.innerHeight * 0.7) + "px";
}

function nextQuestion() {
    if(asked >= questions.length) { 
        scorm.save(score, questions.length * 10);
        document.getElementById("topHUD").innerHTML = `<h2>Mission Erfüllt!</h2><p>Punkte: ${score}</p>`;
        gameState = "end";
        return; 
    }
    document.getElementById("astronautFeedback").style.display = "none";
    curQ = questions[asked++];
    render(curQ.question, document.getElementById("questionDisplay"));
    
    let container = document.getElementById("answerContainer");
    container.innerHTML = "";
    curQ.answers.forEach((ans, i) => {
        let div = document.createElement("div"); div.className = "answerBox";
        render(ans, div);
        div.onclick = () => { if(gameState === "playing") hop(i); };
        container.appendChild(div);
    });
    gameState = "playing";
}

function hop(idx) {
    if(gameState !== "playing") return;
    gameState = "hopping";
    let b = document.querySelectorAll(".answerBox")[idx];
    let r = b.getBoundingClientRect();
    bunnyEl.style.left = (r.left + r.width/2 - 25) + "px";
    bunnyEl.style.top = (r.top + r.height/2 - 25) + "px";
    
    setTimeout(() => {
        gameState = "feedback";
        let win = (idx === curQ.correctAnswer);
        if(win) score += 10;
        document.getElementById("scoreDisplay").innerText = "Punkte: " + score;
        render((win ? "✅ Richtig! " : "❌ Falsch. ") + (curQ.tipp || "Weiter!"), document.getElementById("astronautSpeech"));
        document.getElementById("astronautFeedback").style.display = "flex";
    }, 500);
}

// --- Events ---
window.addEventListener("pointerdown", (e) => { 
    if(gameState === "feedback" && !e.target.closest(".answerBox")) nextQuestion(); 
});

window.addEventListener("keydown", (e) => {
    if(gameState === "feedback") nextQuestion();
    else if(gameState === "playing") {
        if(e.key === "ArrowLeft") hop(0);
        else if(e.key === " " || e.key === "ArrowUp") hop(1);
        else if(e.key === "ArrowRight") hop(2);
    }
});

// Init bei Laden
window.addEventListener("load", () => {
    // Sound Button
    const mute = document.getElementById("muteToggle");
    if(mute) mute.onclick = () => mute.innerText = (mute.innerText === "🔇" ? "🔊" : "🔇");
    
    // Info Buttons
    const info = document.getElementById("infoToggle");
    if(info) info.onclick = () => document.getElementById("infoOverlay").style.display = "flex";
    const close = document.getElementById("closeInfoBtn");
    if(close) close.onclick = () => document.getElementById("infoOverlay").style.display = "none";
    
    start();
});
