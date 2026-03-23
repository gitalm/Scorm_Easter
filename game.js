// --- SOUND ENGINE ---
const Sound = {
    ctx: null, isMuted: true,
    init() { 
        if(!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (this.ctx.state === 'suspended') this.ctx.resume();
        }
    },
    play(freq, type, duration, vol=0.1) {
        if (!this.ctx || this.isMuted) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.connect(gain); gain.connect(this.ctx.destination);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            osc.start(); osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    },
    success() { this.play(523, 'sine', 0.2); setTimeout(() => this.play(659, 'sine', 0.3), 100); },
    error() { this.play(150, 'sawtooth', 0.4); this.play(100, 'sawtooth', 0.4); },
    boost() { this.play(200, 'sawtooth', 1.0, 0.05); }
};

// --- SCORM ---
const scorm = {
    active: false,
    init() {
        this.api = (function findAPI(win) {
            let n = 0; while ((win.API == null) && (win.parent != null) && (win.parent != win)) { if (n++ > 10) return null; win = win.parent; }
            return win.API;
        })(window);
        if (this.api) { this.api.LMSInitialize(""); this.active = true; }
    },
    save(score, total) {
        if (!this.active) return;
        let percent = Math.round((score / total) * 100);
        this.api.LMSSetValue("cmi.core.score.raw", percent.toString());
        this.api.LMSCommit("");
    }
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const answerContainer = document.getElementById("answerContainer");
const scoreDisplay = document.getElementById("scoreDisplay");
const questionDisplay = document.getElementById("questionDisplay");
const astronautFeedback = document.getElementById("astronautFeedback");
const astronautSpeech = document.getElementById("astronautSpeech");

let viewW, viewH, questions = [], curQ = null, asked = 0, score = 0, effects = [], gameState = "start";
const ROCKET_SIZE = 50;
const EMOJI_FIX = 0; // Hase zeigt nach vorne/oben
const ROCKET_Y_REL = 0.75; 
let rocket = { x: 0, y: 0, targetX: 0, targetY: 0, angle: EMOJI_FIX, speed: 18, selectedIdx: 1, isFlying: false };

function renderMath(text, element) {
    if (window.katex) element.innerHTML = text.replace(/\$(.*?)\$/g, (m, f) => katex.renderToString(f, { throwOnError: false }));
    else element.innerText = text;
}

function resize() {
    if (!canvas) return;
    viewW = window.innerWidth; viewH = window.innerHeight;
    canvas.width = viewW; canvas.height = viewH;
    if (gameState === "playing" || gameState === "intro") resetRocket();
}

function resetRocket() {
    rocket.x = viewW / 2 - ROCKET_SIZE / 2;
    rocket.y = viewH * ROCKET_Y_REL;
    rocket.angle = EMOJI_FIX; // Senkrecht nach oben
    rocket.isFlying = false;
}

function nextQuestion() {
    if(asked >= questions.length) { 
        gameState="end"; 
        questionDisplay.innerHTML = `<h2>Mission Erfüllt!</h2><p>Ergebnis: ${Math.round((score/(questions.length*10))*100)}%</p><button class="main-btn" onclick="location.reload()">Noch mal!</button>`;
        return; 
    }
    astronautFeedback.style.display = "none";
    curQ = questions[asked++];
    renderMath(curQ.question, questionDisplay);
    
    answerContainer.innerHTML = "";
    curQ.answers.forEach((ans, i) => {
        let div = document.createElement("div");
        div.className = "answerBox";
        renderMath(ans, div);
        div.onclick = () => { if(gameState === "playing") launch(i); };
        answerContainer.appendChild(div);
    });
    resetRocket();
    gameState = "playing";
}

function launch(idx) {
    gameState = "flying";
    let boxes = document.querySelectorAll(".answerBox");
    boxes[idx].classList.add("selected");
    let rect = boxes[idx].getBoundingClientRect();
    
    rocket.targetX = rect.left + rect.width / 2 - ROCKET_SIZE / 2;
    rocket.targetY = rect.top + rect.height / 2;
    
    let dx = rocket.targetX - rocket.x, dy = rocket.targetY - rocket.y;
    rocket.angle = Math.atan2(dy, dx) + Math.PI / 2;
    rocket.isFlying = true;
}

function showFeedback(isCorrect) {
    gameState = "feedback";
    if(isCorrect) { score += 10; Sound.success(); } else Sound.error();
    scoreDisplay.innerText = "Punkte: " + score;
    
    astronautFeedback.style.display = "flex";
    let txt = (isCorrect ? "✅ Richtig! " : "❌ Falsch... ") + curQ.explanation + " (Tippen zum Weiter)";
    renderMath(txt, astronautSpeech);
}

function loop() {
    ctx.clearRect(0,0,viewW,viewH);
    // Sterne
    ctx.fillStyle = "white";
    for(let i=0; i<30; i++) ctx.fillRect((i*137)%viewW, (i*243)%viewH, 2, 2);

    if(gameState === "flying") {
        let dx = rocket.targetX - rocket.x, dy = rocket.targetY - rocket.y, dist = Math.hypot(dx, dy);
        if(dist > 10) {
            rocket.x += (dx/dist) * rocket.speed;
            rocket.y += (dy/dist) * rocket.speed;
        } else {
            rocket.x = rocket.targetX; rocket.y = rocket.targetY;
            let win = (rocket.selectedIdx === curQ.correctAnswer);
            showFeedback(win);
        }
    }

    if(gameState !== "start" && gameState !== "end") {
        ctx.save();
        ctx.translate(rocket.x + ROCKET_SIZE/2, rocket.y + ROCKET_SIZE/2);
        ctx.rotate(rocket.angle);
        ctx.font = ROCKET_SIZE + "px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🐇", 0, 0);
        ctx.restore();
    }
    requestAnimationFrame(loop);
}

// EVENTS
document.getElementById("startBtn").onclick = (e) => { 
    e.stopPropagation(); Sound.init(); document.getElementById("startScreen").style.display="none"; 
    fetch("question.json").then(r=>r.json()).then(d=>{ questions=d.sort(()=>Math.random()-0.5); nextQuestion(); });
};

window.addEventListener("pointerdown", () => { if(gameState === "feedback") nextQuestion(); });
window.addEventListener("keydown", (e) => {
    if(gameState === "feedback") { nextQuestion(); return; }
    if(gameState !== "playing") return;
    if(e.key === "ArrowLeft") launch(0);
    if(e.key === "ArrowUp" || e.key === " ") launch(1);
    if(e.key === "ArrowRight") launch(2);
});
document.getElementById("muteToggle").onclick = (e) => { Sound.init(); Sound.isMuted = !Sound.isMuted; e.target.innerText = Sound.isMuted ? "🔇" : "🔊"; };
window.addEventListener("resize", resize);
scorm.init(); resize(); loop();
