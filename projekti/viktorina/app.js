const ROUND_SIZE = 10;
const TIME_LIMIT = 15; // sekundes

const $ = (id) => document.getElementById(id);
const screens = ["start", "game", "result"];

let round = [];
let index = 0;
let score = 0;
let correct = 0;
let streak = 0;
let bestStreak = 0;
let mistakes = [];
let timer = null;
let startedAt = 0;
let answered = false;

function show(name) {
  screens.forEach((s) => ($(s).hidden = s !== name));
}

function getBest() {
  try { return Number(localStorage.getItem("viktorina-best")) || 0; } catch { return 0; }
}
function setBest(v) {
  try { localStorage.setItem("viktorina-best", v); } catch {}
}

// Sajauc masīvu (Fišera–Jeitsa algoritms)
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startGame() {
  round = shuffle(QUESTIONS).slice(0, ROUND_SIZE).map((item) => {
    // sajauc arī atbilžu secību, saglabājot pareizo
    const order = shuffle(item.options.map((_, i) => i));
    return { q: item.q, options: order.map((i) => item.options[i]), a: order.indexOf(item.a) };
  });
  index = score = correct = streak = bestStreak = 0;
  mistakes = [];
  show("game");
  showQuestion();
}

function showQuestion() {
  const item = round[index];
  answered = false;

  $("counter").textContent = `${index + 1} / ${ROUND_SIZE}`;
  $("score").textContent = `${score} p.`;
  $("progress").style.width = `${(index / ROUND_SIZE) * 100}%`;
  $("question").textContent = item.q;
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  $("nextBtn").hidden = true;
  updateStreak();

  $("answers").innerHTML = "";
  item.options.forEach((text, i) => {
    const b = document.createElement("button");
    b.className = "answer";
    b.innerHTML = `<span class="key">${"ABCD"[i]}</span>${text}`;
    b.addEventListener("click", () => answer(i));
    $("answers").appendChild(b);
  });

  startTimer();
}

function startTimer() {
  clearInterval(timer);
  startedAt = Date.now();
  const bar = $("timerBar");
  bar.style.transition = "none";
  bar.style.width = "100%";
  bar.offsetWidth; // pārzīmē, lai animācija sāktos no jauna
  bar.style.transition = `width ${TIME_LIMIT}s linear`;
  bar.style.width = "0%";
  $("timeLeft").textContent = TIME_LIMIT;

  timer = setInterval(() => {
    const left = Math.max(0, TIME_LIMIT - Math.floor((Date.now() - startedAt) / 1000));
    $("timeLeft").textContent = left;
    if (left === 0) answer(-1);
  }, 200);
}

function answer(choice) {
  if (answered) return;
  answered = true;
  clearInterval(timer);
  $("timerBar").style.transition = "none";
  $("timerBar").style.width = $("timerBar").getBoundingClientRect().width + "px";

  const item = round[index];
  const buttons = [...$("answers").children];
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (i === item.a) b.classList.add("right");
    else if (i === choice) b.classList.add("wrong");
  });

  if (choice === item.a) {
    const secondsUsed = (Date.now() - startedAt) / 1000;
    const speedBonus = Math.round(Math.max(0, 1 - secondsUsed / TIME_LIMIT) * 50);
    streak++;
    bestStreak = Math.max(bestStreak, streak);
    const streakBonus = streak >= 3 ? 25 : 0;
    const gained = 100 + speedBonus + streakBonus;
    score += gained;
    correct++;
    $("feedback").textContent = `Pareizi! +${gained} p.` + (streakBonus ? " (sērijas bonuss)" : "");
    $("feedback").classList.add("ok");
  } else {
    streak = 0;
    mistakes.push(item);
    $("feedback").textContent = choice === -1
      ? `Laiks beidzās! Pareizā atbilde: ${item.options[item.a]}`
      : `Nepareizi. Pareizā atbilde: ${item.options[item.a]}`;
    $("feedback").classList.add("bad");
  }

  $("score").textContent = `${score} p.`;
  updateStreak();
  $("nextBtn").textContent = index === ROUND_SIZE - 1 ? "Skatīt rezultātu →" : "Nākamais jautājums →";
  $("nextBtn").hidden = false;
  $("nextBtn").focus();
}

function updateStreak() {
  $("streak").hidden = streak < 2;
  $("streakNum").textContent = streak;
}

function next() {
  index++;
  if (index < ROUND_SIZE) showQuestion();
  else finish();
}

function finish() {
  $("progress").style.width = "100%";
  const titles = [
    [10, "Futbola eksperts! 🏆"],
    [8, "Lieliski! ⚽"],
    [5, "Labs rezultāts! 👏"],
    [0, "Vēl jātrenējas! 💪"],
  ];
  $("resultTitle").textContent = titles.find(([min]) => correct >= min)[1];
  $("finalScore").textContent = score;
  $("finalCorrect").textContent = `${correct}/${ROUND_SIZE}`;
  $("finalStreak").textContent = bestStreak;

  const isBest = score > getBest();
  if (isBest) setBest(score);
  $("newBest").hidden = !isBest;
  $("best").textContent = getBest();

  $("reviewBox").hidden = mistakes.length === 0;
  $("reviewBox").open = false;
  $("review").innerHTML = mistakes
    .map((m) => `<li>${m.q}<br><strong>${m.options[m.a]}</strong></li>`)
    .join("");

  show("result");
}

// Tastatūra: 1–4 vai A–D atbildēm, Enter – nākamais
document.addEventListener("keydown", (e) => {
  if ($("game").hidden) return;
  const k = e.key.toUpperCase();
  const i = "1234".indexOf(k) >= 0 ? "1234".indexOf(k) : "ABCD".indexOf(k);
  if (!answered && i >= 0 && k.length === 1) answer(i);
});

$("startBtn").addEventListener("click", startGame);
$("againBtn").addEventListener("click", startGame);
$("nextBtn").addEventListener("click", next);
$("best").textContent = getBest();
