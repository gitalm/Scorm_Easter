const Sound = { ctx: null, isMuted: true, init() { if(!this.ctx) this.ctx = new (AudioContext || webkitAudioContext)(); }, play(f, t, d) { if(!this.ctx || this.isMuted) return; let o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = t; o.frequency.setValueAtTime(f, this.ctx.currentTime); o.connect(g); g.connect(this.ctx.destination); g.gain.setValueAtTime(0.1, this.ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + d); o.start(); o.stop(this.ctx.currentTime + d); } };

const scorm = { active: false, init() { this.api = (function find(w) { return (w.API) ? w.API : (w.parent && w.parent != w) ? find(w.parent) : null; })(window); if(this.api) { this.api.LMSInitialize(""); this.active = true; } }, save(s, t) { if(!this.active) return; this.api.LMSSetValue("cmi.core.score.raw", Math.round((s/t)*100)); this.api.LMSCommit(""); } };

let viewW, viewH, questions = [], curQ = null, asked = 0, score = 0, gameState = "start";
let bunny = { x: 0, y: 0, targetX: 0, targetY: 0, isHopping: false };

function resetBunny() { bunny.x = viewW/2 - 25; bunny.y = viewH * 0.85; bunny.isHopping = false; }

function nextQuestion() {
    if(asked >= questions.length) { gameState="end"; questionDisplay.innerHTML = `<h2>Mission Erfüllt!</h2><button class="main-btn" onclick="location.reload()">Noch mal!</button>`; return; }
    document.getElementById("astronautFeedback").style.display = "none";
    curQ = questions[asked++];
    if(window.katex) questionDisplay.innerHTML = curQ.question.replace(/\$(.*?)\$/g, (m, f) => katex.renderToString(f));
    else questionDisplay.innerText = curQ.question;
    answerContainer.innerHTML = "";
    curQ.answers.forEach((ans, i) => {
        let div = document.createElement("div"); div.className = "answerBox";
        if(window.katex) div.innerHTML += ans.replace(/\$(.*?)\$/g, (m, f) => katex.renderToString(f));
        div.onclick = () => { if(gameState === "playing") hop(i); };
        answerContainer.appendChild(div);
    });
    resetBunny(); gameState = "playing";
}

function hop(idx) {
    gameState = "hopping";
    let b = document.querySelectorAll(".answerBox");
    let r = b[idx].getBoundingClientRect();
    bunny.targetX = r.left + r.width/2 - 25; bunny.targetY = r.top + r.height/2 - 25;
    bunny.isHopping = true;
}

function loop() {
    ctx.clearRect(0,0,viewW,viewH);
    if(gameState === "hopping") {
        let dx = bunny.targetX - bunny.x, dy = bunny.targetY - bunny.y;
        bunny.x += dx * 0.1; bunny.y += dy * 0.1;
        if(Math.hypot(dx,dy) < 5) {
            gameState = "feedback";
            let correct = Array.from(document.querySelectorAll(".answerBox")).indexOf(document.querySelectorAll(".answerBox")[0]) === curQ.correctAnswer; // Vereinfacht
            let isC = (bunny.targetX === document.querySelectorAll(".answerBox")[curQ.correctAnswer].getBoundingClientRect().left + 45); // Logik-Check
            document.getElementById("astronautSpeech").innerText = isC ? "Super! 🥕" : "Oh je... 💨";
            document.getElementById("astronautFeedback").style.display = "flex";
        }
    }
    if(gameState !== "start" && gameState !== "end") {
        ctx.font = "50px serif"; ctx.fillText("🐇", bunny.x, bunny.y);
    }
    requestAnimationFrame(loop);
}

document.getElementById("startBtn").onclick = () => { Sound.init(); document.getElementById("startScreen").style.display="none"; fetch("question.json").then(r=>r.json()).then(d=>{ questions=d; nextQuestion(); }); };
window.addEventListener("pointerdown", () => { if(gameState === "feedback") nextQuestion(); });
window.onresize = () => { viewW = window.innerWidth; viewH = window.innerHeight; canvas.width = viewW; canvas.height = viewH; };
window.onresize(); loop(); scorm.init();
