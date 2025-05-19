const map = L.map('map').setView([35.6895, 139.6917], 12); // 東京中心

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// お題リスト（表示用＋チェック用）
const keywords = ["江","松","神","府","宇","水","永","長","分","高","広","取","鳥","道",
  "路","島","手","井","石","岩","森","山", "海", "川", "谷", "一","二","三","四","五","寺","北",
   "南", "東", "西","原","田","口","新","阪","千","平","国","京","福","木","名","宮","浜",
   "本","豊","富","佐","崎","岡","野","上","下","前","後","里","郷"];
const categories = ["学校", "駅"];

const quizList = [];

keywords.forEach(keyword => {
  categories.forEach(category => {
    quizList.push({
      text: `${keyword}が付く${category}を探せ`,
      keyword,
      category:category === "駅" ? "" : "学"
      
    });
  });
});

let mode = "normal"; // or "survival"
let survivalStreak = 0; // サバイバル用の連続正解カウンター


document.getElementById('survivalBtn').addEventListener('click', () => {
  mode = "survival";
  usedQuizzes = [];
  survivalStreak = 0;
  score = 0;
  document.getElementById("score-display").textContent = `スコア: ${score}点`;
  document.getElementById("question-counter").textContent = "";
  nextQuiz();
});

let usedQuizzes = [];
let currentQuiz = null;
let timer;
let timeLeft = 30;
let score = 0;

// UI要素
const quizElem = document.getElementById('quiz');
const timerElem = document.getElementById('timer');

// ルールモーダル操作
document.getElementById('ruleBtn').addEventListener('click', () => {
  document.getElementById('ruleModal').classList.remove('hidden');
});
document.getElementById('closeModal').addEventListener('click', () => {
  document.getElementById('ruleModal').classList.add('hidden');
});

// スタートボタン → 最初の出題
document.getElementById('startBtn').addEventListener('click', () => {
  mode="normal"
  usedQuizzes = [];
  score = 0;
  document.getElementById("score-display").textContent = `スコア: ${score}点`;
  nextQuiz();
});

// 出題＋タイマー処理まとめ
function nextQuiz() {
  clearInterval(timer);

  if (mode === "normal" && usedQuizzes.length >= 5) {
    alert(`🎉 ゲーム終了！あなたのスコアは ${score}/50です`);
    quizElem.textContent = "スタートを押して再挑戦してね";
    timerElem.textContent = "";
    return;
  }

  if (mode === "survival" && quizList.length === usedQuizzes.length) {
    alert(`全問制覇！連続正解: ${survivalStreak}問！`);
    return;
  }

  // 未出題からランダム出題
  const remainingQuizzes = quizList.filter(q => !usedQuizzes.includes(q));
  currentQuiz = remainingQuizzes[Math.floor(Math.random() * remainingQuizzes.length)];
  usedQuizzes.push(currentQuiz);

  quizElem.textContent = currentQuiz.text;

  if (mode === "normal"){
    document.getElementById("question-counter").textContent = `${usedQuizzes.length}/5問目`;
  } else {
    document.getElementById("question-counter").textContent = `連続正解: ${survivalStreak}問`;
  }

  

  // 考える時間 5秒
  let thinkTime = 5;
  timerElem.textContent = `考える時間: ${thinkTime}`;
  const thinkInterval = setInterval(() => {
    thinkTime--;
    timerElem.textContent = `考える時間: ${thinkTime}`;
    if (thinkTime <= 0) {
      clearInterval(thinkInterval);
      startTimer();
    }
  }, 1000);
}

// 30秒タイマー開始
let isclickable = false
function startTimer() {
  timeLeft = 30;
  timerElem.textContent = timeLeft;
  timer = setInterval(() => {
    timeLeft--;
    timerElem.textContent = timeLeft;
    if (timeLeft <= 0) {
      clearInterval(timer);
      if (mode === "survival") {
        alert(`時間切れ！あなたの連続正解数は ${survivalStreak}問で、スコアは${score}でした！`);
        quizElem.textContent = "スタートを押して再挑戦してね";
        timerElem.textContent = "";
        return;
      } else {
        alert("時間切れ！");
        nextQuiz();
      }
    }
  }, 1000);
}

// マップクリック処理
map.on('click', async (e) => {
  if (!currentQuiz) return;

  const lat = e.latlng.lat;
  const lon = e.latlng.lng;

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
    const data = await res.json();
    const name = data.name;
    if (!name) return;

    const isCorrect = name.includes(currentQuiz.keyword) && name.includes(currentQuiz.category);
    const iconColor = isCorrect ? 'green' : 'red';
    const customIcon = L.icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${iconColor}.png`,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
    });

    if (isCorrect) {
      clearInterval(timer);

      const elapsed = 30 - timeLeft;
      let point = 0;
      if (elapsed >= 20) point = 3;
      else if (elapsed >= 10) point = 5;
      else point = 10;

      score += point;
      document.getElementById("score-display").textContent = `スコア: ${score}点`;
      if (mode === "survival") survivalStreak++;

      L.marker([lat, lon], { icon: customIcon }).addTo(map)
        .bindPopup(`<strong>正解！（+${point}点）<br>${name}</strong>`)
        .openPopup();

      setTimeout(() => {
        nextQuiz();
      }, 1000);

    } else {
      L.marker([lat, lon], { icon: customIcon }).addTo(map)
        .bindPopup(`<strong>不正解<br>${name}</strong>`)
        .openPopup();
      // サバイバルモードでも終了しない（時間切れでのみ終了）
    }

  } catch (err) {
    console.error("逆ジオコーディング失敗", err);
  }
});