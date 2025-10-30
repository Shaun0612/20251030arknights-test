// 測驗系統的核心變數
let quizTable;
let questions = [];
let currentQuestionIndex = 0;
let score = 0;
let currentShuffledOptions = []; // 儲存當前問題隨機排序後的選項
let gameState = 'LOADING'; // 遊戲狀態: LOADING, START, QUIZZING, RESULTS

// UI 變數
let optionButtons = []; // 選項按鈕
let startButton, retryButton;
let feedbackText = ''; // 答題回饋

// 特效變數
let cursorParticles = []; // 游標粒子
let selectionEffect = null; // 點擊選項的特效
let resultParticles = []; // 最終成績的動畫粒子

// === 1. p5.js 載入階段 ===

function preload() {
  // 載入 CSV 檔案，指定 'csv' 格式和 'header' (第一行是標頭)
  quizTable = loadTable('quiz.csv', 'csv', 'header');
}

// === 2. p5.js 設定階段 ===

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Arial'); // 設定一個通用的字體

  // 解析 CSV 資料
  parseQuizData();

  // 初始化選項按鈕的結構
  for (let i = 0; i < 4; i++) {
    optionButtons.push({ text: '', isHover: false });
  }

  // 根據當前畫布大小更新所有 UI 元件的佈局
  updateLayout();

  // 載入完成，進入開始畫面
  gameState = 'START';
}

function parseQuizData() {
  // 遍歷 CSV 的每一行
  for (let row of quizTable.getRows()) {
    let questionText = row.getString('question');
    let options = [
      row.getString('optA'),
      row.getString('optB'),
      row.getString('optC'),
      row.getString('optD')
    ];
    let correctIndex = row.getNum('correctIndex');

    // 將問題物件存入陣列
    questions.push({
      text: questionText,
      options: options,
      correct: correctIndex
    });
  }
}

// 載入並隨機化指定題目的選項
function loadQuestion(qIndex) {
  if (qIndex >= questions.length) return;

  let q = questions[qIndex];
  currentShuffledOptions = [];

  // 1. 將選項與是否正確的資訊綁定
  for (let i = 0; i < q.options.length; i++) {
    currentShuffledOptions.push({
      text: q.options[i],
      isCorrect: (i === q.correct)
    });
  }

  // 2. 使用 p5.js 的 shuffle() 函式隨機排序
  shuffle(currentShuffledOptions, true); // true 表示原地修改陣列
}

// === 3. p5.js 繪圖迴圈 ===

function draw() {
  background(40, 40, 50); // 深藍灰色背景
  noStroke();

  // 根據不同的遊戲狀態，繪製不同的畫面
  switch (gameState) {
    case 'START':
      drawStartScreen();
      break;
    case 'QUIZZING':
      drawQuizScreen();
      break;
    case 'RESULTS':
      drawResultScreen();
      break;
    case 'LOADING':
      drawLoadingScreen();
      break;
  }

  // 繪製游標特效 (在所有畫面的最上層)
  drawCursorEffect();
  // 繪製點擊特效
  drawSelectionEffect();
}

// --- 繪製不同遊戲狀態的畫面 ---

function drawLoadingScreen() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(32);
  text('載入中...', width / 2, height / 2);
}

function drawStartScreen() {
  // 標題
  fill(255, 215, 0); // 金色
  textAlign(CENTER, CENTER);
  textSize(48);
  textStyle(BOLD);
  text('明日方舟測試問答（程度：中）', width / 2, height / 2 - 100);

  // 說明
  fill(255);
  textSize(20);
  textStyle(NORMAL);
  text(`共有 ${questions.length} 道題目`, width / 2, height / 2 - 20);

  // 繪製開始按鈕
  drawButton(startButton);
}

function drawQuizScreen() {
  if (currentQuestionIndex >= questions.length) {
    // 題目答完了
    gameState = 'RESULTS';
    // 觸發成績動畫
    spawnResultParticles();
    return;
  }

  // 取得目前的問題
  let q = questions[currentQuestionIndex];

  // 繪製問題
  fill(255);
  rectMode(CENTER); // 確保文字框以提供的 x,y 為中心
  textAlign(CENTER, TOP); // 將題目文字改為水平置中
  textSize(28);
  textStyle(BOLD);
  // 為了讓長題目能自動換行，我們需要提供一個文字框。
  text(`Q${currentQuestionIndex + 1}: ${q.text}`, width / 2, 120, width * 0.8); // (x, y, width)
  rectMode(CORNER); // 重設 rectMode，避免影響其他元件
  textAlign(LEFT, BASELINE); // 重設 textAlign

  // 繪製選項按鈕
  for (let i = 0; i < optionButtons.length; i++) {
    let btn = optionButtons[i];
    btn.text = currentShuffledOptions[i].text; // 使用隨機排序後的選項文字
    drawButton(btn);
  }

  // 繪製回饋文字 (例如：答對了！/ 答錯了)
  if (feedbackText) {
    fill(feedbackText.includes('正確') ? [0, 255, 0] : [255, 0, 0]);
    textSize(24);
    textAlign(CENTER, CENTER);
    text(feedbackText, width / 2, height - 80);
  }

  // 繪製進度
  fill(150);
  textSize(16);
  textAlign(CENTER, BOTTOM);
  text(`進度: ${currentQuestionIndex + 1} / ${questions.length} | 分數: ${score}`, width / 2, height - 30);
}

function drawResultScreen() {
  // 1. 繪製成績動畫
  // 這個動畫會在背景持續執行
  for (let i = resultParticles.length - 1; i >= 0; i--) {
    resultParticles[i].update();
    resultParticles[i].display();
    if (resultParticles[i].isDead()) {
      resultParticles.splice(i, 1);
    }
  }

  // 2. 繪製標題和分數
  let finalScore = (score / questions.length) * 100;
  let titleText = '';
  let titleColor;

  if (finalScore >= 80) {
    titleText = '這都被你答對了！';
    titleColor = color(0, 255, 150); // 亮綠色 (稱讚)
  } else if (finalScore >= 50) {
    titleText = '不錯喔！繼續加油！';
    titleColor = color(255, 215, 0); // 金色 (中等)
  } else {
    titleText = '別灰心！再多練習一下！';
    titleColor = color(150, 200, 255); // 淺藍色 (鼓勵)
  }

  fill(titleColor);
  textAlign(CENTER, CENTER);
  textSize(40);
  textStyle(BOLD);
  text(titleText, width / 2, height / 2 - 100);

  fill(255);
  textSize(32);
  textStyle(NORMAL);
  text(`你的分數: ${finalScore.toFixed(0)} 分`, width / 2, height / 2);
  text(`(答對 ${score} / ${questions.length} 題)`, width / 2, height / 2 + 60);


  // 3. 繪製重新開始按鈕
  drawButton(retryButton);
}


// --- 特效與互動 ---

// 繪製一個通用的按鈕
function drawButton(btn) {
  // 檢查滑鼠是否懸停
  btn.isHover = (mouseX > btn.x - btn.w / 2 && mouseX < btn.x + btn.w / 2 &&
                 mouseY > btn.y - btn.h / 2 && mouseY < btn.y + btn.h / 2);

  push(); // 保存繪圖設定
  translate(btn.x, btn.y);
  rectMode(CENTER);
  textAlign(CENTER, CENTER);
  textSize(22);
  textStyle(NORMAL);

  if (btn.isHover) {
    fill(100, 150, 255); // 懸停時的亮藍色
    stroke(255);
    strokeWeight(3);
    // 稍微放大特效
    rect(0, 0, btn.w + 10, btn.h + 5, 10);
  } else {
    fill(60, 80, 150); // 預設的深藍色
    stroke(200);
    strokeWeight(1);
    rect(0, 0, btn.w, btn.h, 10); // 圓角矩形
  }

  fill(255); // 按鈕文字顏色
  noStroke();
  text(btn.text, 0, 0);
  pop(); // 恢復繪圖設定
}

// 游標特效
function drawCursorEffect() {
  // 在游標位置產生新的粒子
  if (mouseIsPressed || frameCount % 5 === 0) { // 按下時或每 5 幀
      if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
           cursorParticles.push(new CursorParticle(mouseX, mouseY));
      }
  }

  // 更新和繪製所有游標粒子
  for (let i = cursorParticles.length - 1; i >= 0; i--) {
    cursorParticles[i].update();
    cursorParticles[i].display();
    if (cursorParticles[i].isDead()) {
      cursorParticles.splice(i, 1);
    }
  }
}

// 點擊選項時的特效
function drawSelectionEffect() {
  if (selectionEffect) {
    selectionEffect.update();
    selectionEffect.display();
    if (selectionEffect.isDead()) {
      selectionEffect = null;
    }
  }
}

// 檢查答案
function checkAnswer(selectedIndex) {
  if (feedbackText) return; // 如果還在顯示回饋，就不要重複觸發

  if (currentShuffledOptions[selectedIndex].isCorrect) {
    score++;
    feedbackText = '回答正確！';
    selectionEffect = new SelectionEffect(optionButtons[selectedIndex].x, optionButtons[selectedIndex].y, color(0, 255, 0));
  } else {
    feedbackText = `答錯了！`; // 簡化回饋，避免透露答案
    selectionEffect = new SelectionEffect(optionButtons[selectedIndex].x, optionButtons[selectedIndex].y, color(255, 0, 0));
  }

  // 停留 1.5 秒後跳到下一題
  setTimeout(() => {
    currentQuestionIndex++;
    feedbackText = '';
    selectionEffect = null;
    loadQuestion(currentQuestionIndex); // 載入下一題並隨機化選項
  }, 1500);
}

// 重設測驗
function resetQuiz() {
  score = 0;
  currentQuestionIndex = 0;
  resultParticles = []; // 清空動畫粒子
  gameState = 'START';
}

// === p5.js 事件處理 ===

function mousePressed() {
  if (gameState === 'START') {
    if (startButton.isHover) {
      gameState = 'QUIZZING';
      loadQuestion(currentQuestionIndex); // 第一次進入測驗時，載入第一題
    }
  } else if (gameState === 'QUIZZING') {
    // 只有在沒有顯示回饋時才能點擊
    if (!feedbackText) {
      for (let i = 0; i < optionButtons.length; i++) {
        if (optionButtons[i].isHover) {
          checkAnswer(i);
          break; // 點擊後就跳出迴圈
        }
      }
    }
  } else if (gameState === 'RESULTS') {
    if (retryButton.isHover) {
      resetQuiz();
    }
  }
}

function windowResized() {
  // 當視窗大小改變時，重新設定畫布大小並更新 UI 佈局
  resizeCanvas(windowWidth, windowHeight);
  updateLayout();
}

function mouseMoved() {
    // 立即在滑鼠移動的地方產生一個粒子
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        cursorParticles.push(new CursorParticle(mouseX, mouseY));
    }
}

// === 響應式佈局更新函式 ===

function updateLayout() {
  // 根據畫布寬度決定按鈕大小和間距
  const isWide = width > 700; // 判斷是否為寬螢幕
  const btnW = isWide ? 300 : width * 0.4;
  const btnH = 50;
  const gap = 20;

  // 1. 更新選項按鈕 (2x2 網格)
  const startX = width / 2;
  const startY = height / 2 + 80;
  for (let i = 0; i < optionButtons.length; i++) {
    let btn = optionButtons[i];
    // i=0 (左上), i=1 (右上), i=2 (左下), i=3 (右下)
    btn.x = startX + (i % 2 === 0 ? -1 : 1) * (btnW / 2 + gap / 2);
    btn.y = startY + (floor(i / 2) === 0 ? 0 : 1) * (btnH + gap);
    btn.w = btnW;
    btn.h = btnH;
  }

  // 2. 更新開始按鈕
  startButton = {
    x: width / 2,
    y: height / 2 + 100,
    w: 200,
    h: 60,
    text: '開始測驗',
    isHover: false
  };

  // 3. 更新重試按鈕
  retryButton = {
    x: width / 2,
    y: height - 100,
    w: 200,
    h: 50,
    text: '再試一次',
    isHover: false
  };
}

// === 特效的物件導向 (Class) ===

// 游標粒子 Class
class CursorParticle {
  constructor(x, y) {
    this.x = x + random(-5, 5);
    this.y = y + random(-5, 5);
    this.vx = random(-1, 1);
    this.vy = random(-1, 1);
    this.alpha = 255;
    this.size = random(3, 8);
    this.color = color(255, 230, 150, this.alpha); // 溫暖的黃色
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 5;
    this.color.setAlpha(this.alpha);
  }

  display() {
    noStroke();
    fill(this.color);
    ellipse(this.x, this.y, this.size);
  }

  isDead() {
    return this.alpha < 0;
  }
}

// 點擊選項特效 Class (擴散的圓圈)
class SelectionEffect {
  constructor(x, y, col) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = 80;
    this.alpha = 200;
    this.color = col;
  }

  update() {
    this.radius += 4;
    this.alpha -= 10;
    this.color.setAlpha(this.alpha);
  }

  display() {
    noFill();
    stroke(this.color);
    strokeWeight(4);
    ellipse(this.x, this.y, this.radius * 2);
  }

  isDead() {
    return this.alpha < 0;
  }
}

// 產生結果畫面的動畫粒子
function spawnResultParticles() {
  let finalScore = (score / questions.length) * 100;
  let particleCount = 100;

  if (finalScore >= 80) {
    // 稱讚：金色、綠色彩帶 (煙火)
    for (let i = 0; i < particleCount; i++) {
      resultParticles.push(new ResultParticle(width / 2, height / 2, 'praise'));
    }
  } else {
    // 鼓勵：緩慢上升的藍色氣泡
    for (let i = 0; i < particleCount; i++) {
      resultParticles.push(new ResultParticle(random(width), height + 20, 'encourage'));
    }
  }
}

// 結果動畫粒子 Class
class ResultParticle {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.alpha = 255;

    if (this.type === 'praise') {
      // 煙火效果
      this.vel = p5.Vector.random2D().mult(random(2, 8)); // 往四面八方
      this.gravity = createVector(0, 0.2);
      this.color = random([color(255, 215, 0), color(0, 255, 100), color(255)]);
      this.size = random(3, 6);
    } else {
      // 鼓勵的氣泡效果
      this.vx = random(-0.5, 0.5);
      this.vy = random(-1, -3); // 往上飄
      this.color = color(150, 200, 255, 150); // 鼓勵的淺藍色
      this.size = random(10, 30);
    }
  }

  update() {
    if (this.type === 'praise') {
      this.vel.add(this.gravity);
      this.x += this.vel.x;
      this.y += this.vel.y;
      this.alpha -= 3;
    } else {
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= 1.5; // 氣泡消失得比較慢
    }
    this.color.setAlpha(this.alpha);
  }

  display() {
    noStroke();
    fill(this.color);
    if (this.type === 'praise') {
      rectMode(CENTER);
      rect(this.x, this.y, this.size, this.size); // 方形彩帶
    } else {
      ellipse(this.x, this.y, this.size); // 圓形氣泡
    }
  }

  isDead() {
    return this.alpha < 0 || this.y > height + 50 || this.y < -50;
  }
}