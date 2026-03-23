// --- SCORM Kommunikation ---
const scorm = {
    active: false,
    init() {
        this.api = (function findAPI(win) {
            let n = 0; while ((win.API == null) && (win.parent != null) && (win.parent != win)) { if (n++ > 10) return null; win = win.parent; }
            return win.API;
        })(window);
        if (this.api) { this.api.LMSInitialize(""); this.active = true; }
    },
    save(score, maxScore) {
        if (!this.active) return;
        let percent = Math.round((score / maxScore) * 100);
        this.api.LMSSetValue("cmi.core.score.raw", percent.toString());
        this.api.LMSSetValue("cmi.core.lesson_status", "completed");
        this.api.LMSCommit("");
        this.api.LMSFinish("");
    }
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const answerContainer = document.getElementById("answerContainer");
const scoreDisplay = document.getElementById("scoreDisplay");
const questionDisplay = document.getElementById("questionDisplay");
const feedback = document.getElementById("astronautFeedback");
const speech = document.getElementById("astronautSpeech");

let viewW, viewH, questions = [], curQ = null, asked = 0, score = 0, gameState = "playing";
let bunny = { x: 0, y: 0, targetX: 0, targetY: 0, isHopping: false };

function resetBunny() { bunny.x = viewW/2 - 25; bunny.y = viewH * 0.8; bunny.isHopping = false; }

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
        questionDisplay.innerHTML = `<h2>Mission Ende!</h2><p>Punkte: ${score}</p>`;
        return; 
    }
    feedback.style.display = "none";
    curQ = questions[asked++];
    questionDisplay.innerText = curQ.question;
    answerContainer.innerHTML = "";
    curQ.answers.forEach((ans, i) => {
        let div = document.createElement("div"); div.className = "answerBox";
        div.innerText = ans;
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
    bunny.choice = idx;
}

function loop() {
    ctx.clearRect(0,0,viewW,viewH);
    if(bunny.isHopping) {
        bunny.x += (bunny.targetX - bunny.x) * 0.1;
        bunny.y += (bunny.targetY - bunny.y) * 0.1;
        if(Math.hypot(bunny.targetX - bunny.x, bunny.targetY - bunny.y) < 5) {
            gameState = "feedback"; bunny.isHopping = false;
            let win = (bunny.choice === curQ.correctAnswer);
            if(win) score += 10;
            scoreDisplay.innerText = "Punkte: " + score;
            speech.innerText = win ? "Richtig! 🥕" : "Leider nein... 💨";
            feedback.style.display = "flex";
        }
    }
    ctx.font = "50px serif"; ctx.fillText("🐇", bunny.x, bunny.y);
    requestAnimationFrame(loop);
}

window.addEventListener("pointerdown", () => { if(gameState === "feedback") nextQuestion(); });
window.onresize = () => { viewW = window.innerWidth; viewH = window.innerHeight; canvas.width = viewW; canvas.height = viewH; };
window.onresize(); start();
