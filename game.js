const scorm = {
    active: false,
    init() { this.api = (function find(w) { return (w.API) ? w.API : (w.parent && w.parent != w) ? find(w.parent) : null; })(window); if(this.api) { this.api.LMSInitialize(""); this.active = true; } },
    save(score, maxScore) { if (!this.active) return; this.api.LMSSetValue("cmi.core.score.raw", Math.round((score/maxScore)*100)); this.api.LMSSetValue("cmi.core.lesson_status", "completed"); this.api.LMSCommit(""); }
};

const canvas = document.getElementById("gameCanvas"), ctx = canvas.getContext("2d");
let questions = [], curQ = null, asked = 0, score = 0, gameState = "playing", bunny = { x: 0, y: 0, targetX: 0, targetY: 0, hopping: false, choice: -1 };

function render(txt, el) {
    try { el.innerHTML = txt.replace(/\$(.*?)\$/g, (m, f) => katex.renderToString(f)); } 
    catch(e) { el.innerText = txt; }
}

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
        document.getElementById("topHUD").innerHTML = `<h2>Mission Ende!</h2><p>Punkte: ${score}</p>`;
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
    gameState = "hopping";
    let b = document.querySelectorAll(".answerBox");
    let r = b[idx].getBoundingClientRect();
    bunny.targetX = r.left + r.width/2 - 20; bunny.targetY = r.top + r.height/2 - 20;
    bunny.hopping = true; bunny.choice = idx;
}

function loop() {
    ctx.clearRect(0,0,window.innerWidth, window.innerHeight);
    if(bunny.hopping) {
        bunny.x += (bunny.targetX - bunny.x) * 0.1;
        bunny.y += (bunny.targetY - bunny.y) * 0.1;
        if(Math.hypot(bunny.targetX - bunny.x, bunny.targetY - bunny.y) < 5) {
            gameState = "feedback"; bunny.hopping = false;
            let win = (bunny.choice === curQ.correctAnswer);
            if(win) score += 10;
            document.getElementById("scoreDisplay").innerText = "Punkte: " + score;
            render(win ? "Richtig! 🥕" : "Leider nein... 💨", document.getElementById("astronautSpeech"));
            document.getElementById("astronautFeedback").style.display = "flex";
        }
    } else { bunny.x = window.innerWidth/2 - 25; bunny.y = window.innerHeight * 0.8; }
    
    ctx.font = "50px serif"; ctx.fillText("🐇", bunny.x, bunny.y);
    requestAnimationFrame(loop);
}

// Globaler Input
window.addEventListener("pointerdown", () => { if(gameState === "feedback") nextQuestion(); });
window.addEventListener("keydown", (e) => {
    if(gameState === "feedback") { nextQuestion(); return; }
    if(gameState === "playing") {
        if(e.key === "ArrowLeft") hop(0);
        if(e.key === "ArrowUp" || e.key === " ") hop(1);
        if(e.key === "ArrowRight") hop(2);
    }
});
window.onresize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
window.onresize(); start();
