// --- SOUND ENGINE ---
const Sound = {
    ctx: null, isMuted: true,
    init() { if(!this.ctx) { this.ctx = new (AudioContext || webkitAudioContext)(); if (this.ctx.state === 'suspended') this.ctx.resume(); } },
    play(freq, type, duration, vol=0.1) {
        if (!this.ctx || this.isMuted) return;
        let o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, this.ctx.currentTime);
        o.connect(g); g.connect(this.ctx.destination);
        g.gain.setValueAtTime(vol, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        o.start(); o.stop(this.ctx.currentTime + duration);
    },
    success() { this.play(523, "sine", 0.3); },
    error() { this.play(150, "sawtooth", 0.4); }
};

const scorm = {
    active: false,
    init() { this.api = (function find(w) { return (w.API) ? w.API : (w.parent && w.parent != w) ? find(w.parent) : null; })(window); if(this.api) { this.api.LMSInitialize(""); this.active = true; } },
    save(s, t) { if (!this.active) return; this.api.LMSSetValue("cmi.core.score.raw", Math.round((s/t)*100)); this.api.LMSSetValue("cmi.core.lesson_status", "completed"); this.api.LMSCommit(""); }
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let questions = [], curQ = null, asked = 0, score = 0, gameState = "playing", bunny = { x: 0, y: 0, targetX: 0, targetY: 0, hopping: false, choice: -1 };

function render(txt, el) { try { el.innerHTML = txt.replace(/\$(.*?)\$/g, (m, f) => katex.renderToString(f)); } catch(e) { el.innerText = txt; } }

async function start() {
    scorm.init();
    let r = await fetch("question.json");
    questions = (await r.json()).sort(() => Math.random() - 0.5);
    nextQuestion();
    loop();
}

function nextQuestion() {
    if(asked >= questions.length) { 
        scorm.save(score, questions.length * 10);
        document.getElementById("topHUD").innerHTML = `<h2>Mission Erfüllt!</h2><p>Punkte: ${score}</p>`;
        gameState = "end"; return; 
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
    gameState = "hopping";
    let b = document.querySelectorAll(".answerBox");
    let r = b[idx].getBoundingClientRect();
    bunny.targetX = r.left + r.width/2 - 25; bunny.targetY = r.top + r.height/2 - 25;
    bunny.hopping = true; bunny.choice = idx;
}

function loop() {
    ctx.clearRect(0,0,window.innerWidth, window.innerHeight);
    if(bunny.hopping) {
        bunny.x += (bunny.targetX - bunny.x) * 0.1; bunny.y += (bunny.targetY - bunny.y) * 0.1;
        if(Math.hypot(bunny.targetX - bunny.x, bunny.targetY - bunny.y) < 5) {
            gameState = "feedback"; bunny.hopping = false;
            let win = (bunny.choice === curQ.correctAnswer);
            if(win) score += 10;
            document.getElementById("scoreDisplay").innerText = "Punkte: " + score;
            render((win ? "✅ Richtig! " : "❌ Falsch. ") + (curQ.tipp || "Weiter!"), document.getElementById("astronautSpeech"));
            document.getElementById("astronautFeedback").style.display = "flex";
        }
    } else { bunny.x = window.innerWidth/2 - 25; bunny.y = window.innerHeight * 0.75; }
    if(gameState !== "end") { ctx.font = "50px serif"; ctx.fillText("🐇", bunny.x, bunny.y); }
    requestAnimationFrame(loop);
}

// EVENTS
window.addEventListener("load", () => {
    window.addEventListener("pointerdown", (e) => { if(gameState === "feedback" && !e.target.closest(".answerBox")) nextQuestion(); });
    window.addEventListener("keydown", (e) => {
        if(gameState === "feedback") nextQuestion();
        else if(gameState === "playing") {
            if(e.key === "ArrowLeft") hop(0);
            if(e.key === " ") hop(1);
            if(e.key === "ArrowRight") hop(2);
        }
    });
    document.getElementById("muteToggle").onclick = (e) => { Sound.init(); Sound.isMuted = !Sound.isMuted; e.target.innerText = Sound.isMuted ? "🔇" : "🔊"; };
    document.getElementById("infoToggle").onclick = () => document.getElementById("infoOverlay").style.display = "flex";
    document.getElementById("closeInfoBtn").onclick = () => document.getElementById("infoOverlay").style.display = "none";
    start();
});
