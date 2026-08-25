"use strict";

const GAME_TIME = 30;
const CARD_PAIR_COUNT = 6;
const MATCH_SCORE = 100;
const MISMATCH_DELAY = 700;
const STORAGE_KEY = "pairUpStats";
const CARD_ICONS = ["🍎", "🍋", "🍇", "🍒", "🥝", "🍉", "🍓", "🍊"];
const DEFAULT_STATS = Object.freeze({ bestScore: 0, totalGames: 0, totalWins: 0 });

const gameState = {
  status: "ready",
  score: 0,
  timeLeft: GAME_TIME,
  firstCard: null,
  secondCard: null,
  matchedPairs: 0,
  inputLocked: false,
  paused: false,
  manualPaused: false,
  focusPaused: false,
  timerId: null,
  compareTimeoutId: null,
  clearEffectTimeoutId: null,
  clearEffectPlayed: false,
  gameRecorded: false,
  deck: [],
  stats: { ...DEFAULT_STATS }
};

const elements = {};

document.addEventListener("DOMContentLoaded", initApp, { once: true });

function initApp() {
  cacheElements();
  bindEvents();
  gameState.stats = loadStats();
  renderStats();
  initGame();
}

function cacheElements() {
  elements.board = document.querySelector("#game-board");
  elements.gamePanel = document.querySelector(".game-panel");
  elements.timeLeft = document.querySelector("#time-left");
  elements.score = document.querySelector("#score");
  elements.matchedPairs = document.querySelector("#matched-pairs");
  elements.totalPairs = document.querySelector("#total-pairs");
  elements.status = document.querySelector("#game-status");
  elements.bestScore = document.querySelector("#best-score");
  elements.totalGames = document.querySelector("#total-games");
  elements.totalWins = document.querySelector("#total-wins");
  elements.pauseButton = document.querySelector("#pause-button");
  elements.restartButton = document.querySelector("#restart-button");
  elements.resetStatsButton = document.querySelector("#reset-stats-button");
  elements.reduceMotion = document.querySelector("#reduce-motion");
  elements.pauseOverlay = document.querySelector("#pause-overlay");
  elements.result = document.querySelector("#result");
  elements.resultKicker = document.querySelector("#result-kicker");
  elements.resultTitle = document.querySelector("#result-title");
  elements.resultMessage = document.querySelector("#result-message");
}

function bindEvents() {
  elements.board.addEventListener("click", handleBoardClick);
  elements.pauseButton.addEventListener("click", toggleManualPause);
  elements.restartButton.addEventListener("click", restartGame);
  elements.resetStatsButton.addEventListener("click", resetStats);
  elements.reduceMotion.addEventListener("change", updateMotionSetting);
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("blur", handleWindowBlur);
  window.addEventListener("focus", handleWindowFocus);
}

function initGame() {
  clearAllTimers();
  Object.assign(gameState, {
    status: "playing",
    score: 0,
    timeLeft: GAME_TIME,
    firstCard: null,
    secondCard: null,
    matchedPairs: 0,
    inputLocked: false,
    paused: false,
    manualPaused: false,
    focusPaused: false,
    clearEffectPlayed: false,
    gameRecorded: false,
    deck: createDeck()
  });
  elements.result.hidden = true;
  elements.result.className = "result";
  elements.gamePanel.classList.remove("clear-effect");
  elements.pauseButton.disabled = false;
  elements.pauseButton.textContent = "일시정지";
  elements.pauseOverlay.hidden = true;
  elements.totalPairs.textContent = CARD_PAIR_COUNT;
  renderCards();
  updateDisplay();
  startTimer();
}

function createDeck() {
  const selectedIcons = CARD_ICONS.slice(0, CARD_PAIR_COUNT);
  return shuffleCards([...selectedIcons, ...selectedIcons].map((icon, index) => ({
    id: index,
    icon,
    matched: false,
    flipped: false
  })));
}

function shuffleCards(cards) {
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[randomIndex]] = [cards[randomIndex], cards[index]];
  }
  return cards;
}

function renderCards() {
  const fragment = document.createDocumentFragment();
  gameState.deck.forEach((card, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card";
    button.dataset.index = String(index);
    button.setAttribute("aria-label", `${index + 1}번 뒤집힌 카드`);
    button.innerHTML = `<span class="card-inner"><span class="card-face card-back" aria-hidden="true"></span><span class="card-face card-front" aria-hidden="true">${card.icon}</span></span>`;
    fragment.append(button);
  });
  elements.board.replaceChildren(fragment);
}

function handleBoardClick(event) {
  const cardElement = event.target.closest(".card");
  if (!cardElement || !elements.board.contains(cardElement)) return;
  handleCardClick(Number(cardElement.dataset.index), cardElement);
}

function handleCardClick(index, cardElement) {
  if (gameState.status !== "playing" || gameState.paused || gameState.inputLocked) return;
  const card = gameState.deck[index];
  if (!card || card.flipped || card.matched) return;

  card.flipped = true;
  cardElement.classList.add("flipped");
  cardElement.setAttribute("aria-label", `${card.icon} 카드, 열림`);

  if (gameState.firstCard === null) {
    gameState.firstCard = index;
    return;
  }

  gameState.secondCard = index;
  gameState.inputLocked = true;
  checkMatch();
}

function checkMatch() {
  const first = gameState.deck[gameState.firstCard];
  const second = gameState.deck[gameState.secondCard];
  if (first.icon === second.icon) {
    first.matched = true;
    second.matched = true;
    gameState.score += MATCH_SCORE;
    gameState.matchedPairs += 1;
    markMatchedCards();
    resetSelection();
    updateDisplay();
    if (gameState.matchedPairs === CARD_PAIR_COUNT) finishGame("clear");
    return;
  }
  gameState.compareTimeoutId = window.setTimeout(hideMismatchedCards, MISMATCH_DELAY);
}

function markMatchedCards() {
  [gameState.firstCard, gameState.secondCard].forEach((index) => {
    const cardElement = elements.board.querySelector(`[data-index="${index}"]`);
    cardElement.classList.add("matched");
    cardElement.disabled = true;
    cardElement.setAttribute("aria-label", `${gameState.deck[index].icon} 카드, 맞춤`);
  });
}

function hideMismatchedCards() {
  if (gameState.paused || gameState.status !== "playing") return;
  [gameState.firstCard, gameState.secondCard].forEach((index) => {
    const card = gameState.deck[index];
    const cardElement = elements.board.querySelector(`[data-index="${index}"]`);
    if (card && cardElement) {
      card.flipped = false;
      cardElement.classList.remove("flipped");
      cardElement.setAttribute("aria-label", `${index + 1}번 뒤집힌 카드`);
    }
  });
  gameState.compareTimeoutId = null;
  resetSelection();
}

function resetSelection() {
  gameState.firstCard = null;
  gameState.secondCard = null;
  gameState.inputLocked = false;
}

function startTimer() {
  clearInterval(gameState.timerId);
  gameState.timerId = window.setInterval(() => {
    if (gameState.status !== "playing" || gameState.paused) return;
    gameState.timeLeft = Math.max(0, gameState.timeLeft - 1);
    updateDisplay();
    if (gameState.timeLeft === 0) finishGame("time-over");
  }, 1000);
}

function toggleManualPause() {
  if (gameState.status !== "playing") return;
  gameState.manualPaused = !gameState.manualPaused;
  syncPauseState();
}

function handleVisibilityChange() {
  gameState.focusPaused = document.hidden;
  syncPauseState();
}

function handleWindowBlur() {
  gameState.focusPaused = true;
  syncPauseState();
}

function handleWindowFocus() {
  if (!document.hidden) {
    gameState.focusPaused = false;
    syncPauseState();
  }
}

function syncPauseState() {
  if (gameState.status !== "playing") return;
  const shouldPause = gameState.manualPaused || gameState.focusPaused;
  if (shouldPause === gameState.paused) return;
  gameState.paused = shouldPause;

  if (shouldPause) {
    if (gameState.compareTimeoutId !== null) {
      clearTimeout(gameState.compareTimeoutId);
      gameState.compareTimeoutId = null;
    }
  } else if (gameState.inputLocked && gameState.firstCard !== null && gameState.secondCard !== null) {
    gameState.compareTimeoutId = window.setTimeout(hideMismatchedCards, MISMATCH_DELAY);
  }
  elements.pauseButton.textContent = gameState.manualPaused ? "계속하기" : "일시정지";
  elements.pauseOverlay.hidden = !shouldPause;
  updateDisplay();
}

function finishGame(result) {
  if (gameState.status !== "playing") return;
  gameState.status = result === "clear" ? "clear" : "time-over";
  gameState.paused = false;
  clearAllTimers();
  recordFinishedGame(result === "clear");
  disableAllCards();
  elements.pauseButton.disabled = true;
  elements.pauseOverlay.hidden = true;

  if (result === "clear") {
    elements.result.className = "result clear";
    elements.resultKicker.textContent = "MISSION COMPLETE";
    elements.resultTitle.textContent = "CLEAR!";
    elements.resultMessage.textContent = `모든 카드를 찾았습니다. 점수: ${gameState.score}`;
    playClearEffect();
  } else {
    elements.result.className = "result time-over";
    elements.resultKicker.textContent = "30 SECONDS ENDED";
    elements.resultTitle.textContent = "TIME OVER";
    elements.resultMessage.textContent = `찾은 카드: ${gameState.matchedPairs} / ${CARD_PAIR_COUNT} · 점수: ${gameState.score}`;
  }
  elements.result.hidden = false;
  updateDisplay();
}

function disableAllCards() {
  elements.board.querySelectorAll(".card").forEach((card) => { card.disabled = true; });
}

function restartGame() {
  initGame();
}

function recordFinishedGame(won) {
  if (gameState.gameRecorded) return;
  gameState.gameRecorded = true;
  gameState.stats.totalGames += 1;
  if (won) gameState.stats.totalWins += 1;
  gameState.stats.bestScore = Math.max(gameState.stats.bestScore, gameState.score);
  saveStats();
  renderStats();
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return { ...DEFAULT_STATS };
    const parsed = JSON.parse(raw);
    if (!validateStats(parsed)) throw new Error("Invalid saved statistics");
    return parsed;
  } catch (_error) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STATS)); } catch (_storageError) { /* 게임은 저장소 없이도 실행한다. */ }
    return { ...DEFAULT_STATS };
  }
}

function validateStats(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return ["bestScore", "totalGames", "totalWins"].every((key) => Number.isSafeInteger(value[key]) && value[key] >= 0)
    && value.totalWins <= value.totalGames;
}

function saveStats() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState.stats)); } catch (_error) { /* 저장 실패가 게임을 막지 않는다. */ }
}

function resetStats() {
  if (!window.confirm("최고 점수와 누적 플레이 기록을 초기화할까요?")) return;
  gameState.stats = { ...DEFAULT_STATS };
  saveStats();
  renderStats();
}

function renderStats() {
  elements.bestScore.textContent = gameState.stats.bestScore;
  elements.totalGames.textContent = gameState.stats.totalGames;
  elements.totalWins.textContent = gameState.stats.totalWins;
}

function playClearEffect() {
  if (gameState.clearEffectPlayed) return;
  gameState.clearEffectPlayed = true;
  elements.gamePanel.classList.add("clear-effect");
  gameState.clearEffectTimeoutId = window.setTimeout(() => {
    elements.gamePanel.classList.remove("clear-effect");
    gameState.clearEffectTimeoutId = null;
  }, 800);
}

function updateMotionSetting() {
  elements.gamePanel.classList.toggle("reduce-motion", elements.reduceMotion.checked);
  if (elements.reduceMotion.checked) elements.gamePanel.classList.remove("clear-effect");
}

function updateDisplay() {
  elements.timeLeft.textContent = gameState.timeLeft;
  elements.score.textContent = gameState.score;
  elements.matchedPairs.textContent = gameState.matchedPairs;
  const statusLabels = {
    ready: "게임 준비",
    playing: gameState.paused ? "일시정지" : "게임 진행 중",
    clear: "CLEAR",
    "time-over": "TIME OVER"
  };
  elements.status.textContent = statusLabels[gameState.status];
}

function clearAllTimers() {
  clearInterval(gameState.timerId);
  clearTimeout(gameState.compareTimeoutId);
  clearTimeout(gameState.clearEffectTimeoutId);
  gameState.timerId = null;
  gameState.compareTimeoutId = null;
  gameState.clearEffectTimeoutId = null;
}
