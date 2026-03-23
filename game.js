// Initialisierung des Spiels
document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('startButton');
    const startScreen = document.getElementById('startScreen');
    const bunny = document.getElementById('bunny');
    const questionDisplay = document.getElementById('questionDisplay');
    const answerBoxes = document.querySelectorAll('.answerBox');
    const astronautFeedback = document.getElementById('astronautFeedback');

    // Startbildschirm verstecken
    startButton.addEventListener('click', () => {
        startScreen.style.display = 'none';
    });

    // Hase mit Maus bewegen
    document.addEventListener('mousemove', (e) => {
        bunny.style.left = `${e.clientX}px`;
        bunny.style.top = `${e.clientY}px`;
    });

    // Fragen aus der JSON laden
    let questions = [];
    fetch('question.json')
        .then(response => response.json())
        .then(data => {
            questions = data.questions;
            showQuestion();
        });

    // Frage anzeigen
    function showQuestion() {
        const currentQuestion = questions[0];
        questionDisplay.textContent = currentQuestion.question;
        answerBoxes.forEach((box, index) => {
            box.textContent = currentQuestion.answers[index];
            box.onclick = () => checkAnswer(index);
        });
    }

    // Antwort prüfen
    function checkAnswer(selectedIndex) {
        const currentQuestion = questions[0];
        if (selectedIndex === currentQuestion.correctAnswer) {
            astronautFeedback.textContent = "Richtig! 🎉";
        } else {
            astronautFeedback.textContent = "Falsch! Versuche es nochmal.";
        }
        astronautFeedback.style.display = 'flex';
        setTimeout(() => {
            astronautFeedback.style.display = 'none';
        }, 2000);
    }
});
