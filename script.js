import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyAOFO7vGOy6j_iaTLOksIz-ACk6NAuvK7o",
  authDomain: "howwasyourday-48ed0.firebaseapp.com",
  projectId: "howwasyourday-48ed0",
  storageBucket: "howwasyourday-48ed0.firebasestorage.app",
  messagingSenderId: "520047025531",
  appId: "1:520047025531:web:c6f557c8b77d112b36f1de",
  measurementId: "G-SE6F17NCP4"
};

const hasFirebaseConfig = !!firebaseConfig.apiKey && !!firebaseConfig.projectId && !!firebaseConfig.appId;
const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
const db = hasFirebaseConfig ? getFirestore(app) : null;

const TIMEZONE = 'Asia/Singapore';
const LAUNCH_DATE_KEY = '2026-04-11';

const els = {
  topError: document.getElementById('topError'),
  todayTab: document.getElementById('todayTab'),
  historyTab: document.getElementById('historyTab'),
  todayScreen: document.getElementById('todayScreen'),
  historyScreen: document.getElementById('historyScreen'),
  todayBubble: document.getElementById('todayBubble'),
  heroDate: document.getElementById('heroDate'),
  heroMonthDay: document.getElementById('heroMonthDay'),
  openReviewBtn: document.getElementById('openReviewBtn'),
  avgRating: document.getElementById('avgRating'),
  avgStars: document.getElementById('avgStars'),
  reviewCount: document.getElementById('reviewCount'),
  todayReviewsList: document.getElementById('todayReviewsList'),
  prevMonthBtn: document.getElementById('prevMonthBtn'),
  nextMonthBtn: document.getElementById('nextMonthBtn'),
  monthTitle: document.getElementById('monthTitle'),
  calendarGrid: document.getElementById('calendarGrid'),
  pickedDateTitle: document.getElementById('pickedDateTitle'),
  pickedDateSub: document.getElementById('pickedDateSub'),
  historyAvg: document.getElementById('historyAvg'),
  historyStars: document.getElementById('historyStars'),
  historyCount: document.getElementById('historyCount'),
  historyReviewsHeading: document.getElementById('historyReviewsHeading'),
  historyReviewsList: document.getElementById('historyReviewsList'),
  reviewModal: document.getElementById('reviewModal'),
  modalDateText: document.getElementById('modalDateText'),
  starPicker: document.getElementById('starPicker'),
  nameInput: document.getElementById('nameInput'),
  reviewInput: document.getElementById('reviewInput'),
  modalError: document.getElementById('modalError'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  closeModalBtn2: document.getElementById('closeModalBtn2'),
  submitReviewBtn: document.getElementById('submitReviewBtn')
};

let selectedRating = 0;
let currentView = 'today';
let selectedHistoryDateKey = getTodayKeyUTC8();
let displayedMonth = getMonthState(selectedHistoryDateKey);
const datesWithData = new Set();

function getDatePartsInUTC8(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}

function getTodayKeyUTC8() {
  const p = getDatePartsInUTC8(new Date());
  return `${p.year}-${p.month}-${p.day}`;
}

function keyToUTCDate(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function formatPrettyDate(dateKey) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(keyToUTCDate(dateKey));
}

function getWeekday(dateKey) {
  return new Intl.DateTimeFormat('en-US', { timeZone: TIMEZONE, weekday: 'long' }).format(keyToUTCDate(dateKey));
}

function getMonthDay(dateKey) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(keyToUTCDate(dateKey));
}

function monthLabel(year, monthIndex) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

function getMonthState(dateKey) {
  const [y, m] = dateKey.split('-').map(Number);
  return { year: y, monthIndex: m - 1 };
}

function stateToKey(year, monthIndex, day = 1) {
  const mm = String(monthIndex + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

function compareKeys(a, b) {
  return a.localeCompare(b);
}

function escapeHtml(str = '') {
  return str.replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function renderStars(target, value, max = 5) {
  target.innerHTML = Array.from({ length: max }, (_, i) => `<span class="star ${i < Math.round(value) ? 'filled' : ''}">★</span>`).join('');
}

function setTopError(msg = '') {
  if (!msg) {
    els.topError.classList.add('hidden');
    els.topError.textContent = '';
    return;
  }
  els.topError.innerHTML = msg;
  els.topError.classList.remove('hidden');
}

function setModalError(msg = '') {
  if (!msg) {
    els.modalError.classList.add('hidden');
    els.modalError.textContent = '';
    return;
  }
  els.modalError.innerHTML = msg;
  els.modalError.classList.remove('hidden');
}

function buildStarPicker() {
  els.starPicker.innerHTML = Array.from({ length: 5 }, (_, i) => `<span class="pick" data-value="${i + 1}">★</span>`).join('');
  updatePicker();
  [...els.starPicker.querySelectorAll('.pick')].forEach(node => {
    node.addEventListener('click', () => {
      selectedRating = Number(node.dataset.value);
      updatePicker();
    });
  });
}

function updatePicker() {
  [...els.starPicker.querySelectorAll('.pick')].forEach(node => {
    node.classList.toggle('active', Number(node.dataset.value) <= selectedRating);
  });
}

function openModal() {
  setTopError('');
  if (currentView !== 'today' || selectedHistoryDateKey !== getTodayKeyUTC8()) {
    setTopError('You can only submit a review for the current active UTC+8 day.');
    return;
  }
  els.modalDateText.textContent = `How was ${formatPrettyDate(getTodayKeyUTC8())} for you?`;
  els.reviewModal.classList.remove('hidden');
  els.reviewModal.setAttribute('aria-hidden', 'false');
  setModalError('');
}

function closeModal() {
  els.reviewModal.classList.add('hidden');
  els.reviewModal.setAttribute('aria-hidden', 'true');
  setModalError('');
}

function switchView(view) {
  currentView = view;
  els.todayTab.classList.toggle('nav-btn--active', view === 'today');
  els.historyTab.classList.toggle('nav-btn--active', view === 'history');
  els.todayScreen.classList.toggle('screen--visible', view === 'today');
  els.historyScreen.classList.toggle('screen--visible', view === 'history');
  if (view === 'today') {
    selectedHistoryDateKey = getTodayKeyUTC8();
  }
  displayedMonth = getMonthState(selectedHistoryDateKey);
  renderStaticShell();
  if (view === 'today') {
    loadTodayReviews();
  } else {
    renderCalendar();
    loadHistoryReviews(selectedHistoryDateKey);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderStaticShell() {
  const todayKey = getTodayKeyUTC8();
  els.todayBubble.textContent = 'Live in UTC+8';
  els.heroDate.textContent = getWeekday(todayKey);
  els.heroMonthDay.textContent = getMonthDay(todayKey);
  els.pickedDateTitle.textContent = formatPrettyDate(selectedHistoryDateKey);
  els.pickedDateSub.textContent = selectedHistoryDateKey === todayKey
    ? 'This is today in UTC+8. You can still browse it here, but the review action stays on the Today tab.'
    : 'A past date from the archive. You can read ratings and reviews here, but only today can receive new ones.';
  els.historyReviewsHeading.textContent = `Reviews for ${formatPrettyDate(selectedHistoryDateKey)}`;
  els.monthTitle.textContent = monthLabel(displayedMonth.year, displayedMonth.monthIndex);
}

function renderReviewCards(target, reviews, emptyMessage) {
  if (!reviews.length) {
    target.innerHTML = `<div class="empty">${emptyMessage}</div>`;
    return;
  }
  target.innerHTML = reviews.map(review => {
    const created = review.createdAt?.toDate ? review.createdAt.toDate() : null;
    const createdText = created ? new Intl.DateTimeFormat('en-US', {
      timeZone: TIMEZONE,
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
    }).format(created) : 'Just now';
    const stars = Array.from({ length: 5 }, (_, i) => `<span class="star ${i < review.rating ? 'filled' : ''}">★</span>`).join('');
    return `
      <article class="review">
        <div class="review-top">
          <div>
            <div class="review-name">${escapeHtml(review.name || 'Anonymous')}</div>
            <div class="stars">${stars}</div>
          </div>
          <div class="review-date">${createdText}</div>
        </div>
        <div class="review-body">${escapeHtml(review.text || '')}</div>
      </article>
    `;
  }).join('');
}

function renderSummary(targetAvg, targetStars, targetCount, reviews) {
  const count = reviews.length;
  const avg = count ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count : 0;
  targetAvg.textContent = count ? avg.toFixed(2) : '—';
  targetCount.textContent = new Intl.NumberFormat('en-US').format(count);
  renderStars(targetStars, avg || 0);
}

async function fetchReviewsByDate(dateKey) {
  if (!hasFirebaseConfig) throw new Error('Firebase not connected');
  const reviewsRef = collection(db, 'reviews');
  const q = query(reviewsRef, where('dateKey', '==', dateKey));
  const snap = await getDocs(q);
  return snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const aMs = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bMs = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bMs - aMs;
    });
}

async function loadTodayReviews() {
  els.todayReviewsList.innerHTML = '<div class="empty">Loading today’s reviews…</div>';
  if (!hasFirebaseConfig) {
    setTopError('Firebase is not connected yet. Once connected, live shared reviews will appear here.');
    renderSummary(els.avgRating, els.avgStars, els.reviewCount, []);
    renderReviewCards(els.todayReviewsList, [], 'Firebase is not connected yet.');
    return;
  }
  setTopError('');
  try {
    const reviews = await fetchReviewsByDate(getTodayKeyUTC8());
    renderSummary(els.avgRating, els.avgStars, els.reviewCount, reviews);
    renderReviewCards(els.todayReviewsList, reviews, 'No reviews yet for today. Be the first one.');
  } catch (err) {
    console.error(err);
    setTopError('Could not load today’s reviews yet. Check your Firestore setup or rules.');
    renderSummary(els.avgRating, els.avgStars, els.reviewCount, []);
    renderReviewCards(els.todayReviewsList, [], 'No reviews could be loaded right now.');
  }
}

async function loadHistoryReviews(dateKey) {
  els.historyReviewsList.innerHTML = '<div class="empty">Loading reviews…</div>';
  if (!hasFirebaseConfig) {
    renderSummary(els.historyAvg, els.historyStars, els.historyCount, []);
    renderReviewCards(els.historyReviewsList, [], 'Firebase is not connected yet.');
    return;
  }
  try {
    const reviews = await fetchReviewsByDate(dateKey);
    if (reviews.length) datesWithData.add(dateKey);
    renderSummary(els.historyAvg, els.historyStars, els.historyCount, reviews);
    renderReviewCards(els.historyReviewsList, reviews, 'No reviews were posted on this date.');
    renderCalendar();
  } catch (err) {
    console.error(err);
    renderSummary(els.historyAvg, els.historyStars, els.historyCount, []);
    renderReviewCards(els.historyReviewsList, [], 'No reviews could be loaded right now.');
  }
}

function renderCalendar() {
  const todayKey = getTodayKeyUTC8();
  const launch = getMonthState(LAUNCH_DATE_KEY);
  const atLaunchMonth = displayedMonth.year === launch.year && displayedMonth.monthIndex === launch.monthIndex;
  const todayMonth = getMonthState(todayKey);
  const atTodayMonth = displayedMonth.year === todayMonth.year && displayedMonth.monthIndex === todayMonth.monthIndex;

  els.prevMonthBtn.disabled = atLaunchMonth;
  els.nextMonthBtn.disabled = atTodayMonth;
  els.monthTitle.textContent = monthLabel(displayedMonth.year, displayedMonth.monthIndex);

  const firstDay = new Date(Date.UTC(displayedMonth.year, displayedMonth.monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(displayedMonth.year, displayedMonth.monthIndex + 1, 0)).getUTCDate();
  const startWeekday = firstDay.getUTCDay();
  const cells = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push('<div class="day-blank"></div>');
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = stateToKey(displayedMonth.year, displayedMonth.monthIndex, day);
    const disabled = compareKeys(dateKey, LAUNCH_DATE_KEY) < 0 || compareKeys(dateKey, todayKey) > 0;
    const classes = [
      'day-btn',
      disabled ? 'disabled' : '',
      dateKey === todayKey ? 'today' : '',
      dateKey === selectedHistoryDateKey ? 'selected' : '',
      datesWithData.has(dateKey) ? 'has-data' : ''
    ].filter(Boolean).join(' ');
    cells.push(`<button class="${classes}" type="button" data-date="${dateKey}" ${disabled ? 'disabled' : ''}>${day}</button>`);
  }

  els.calendarGrid.innerHTML = cells.join('');
  [...els.calendarGrid.querySelectorAll('.day-btn:not(.disabled)')].forEach(btn => {
    btn.addEventListener('click', () => {
      selectedHistoryDateKey = btn.dataset.date;
      renderStaticShell();
      renderCalendar();
      loadHistoryReviews(selectedHistoryDateKey);
    });
  });
}

async function submitReview() {
  setModalError('');
  if (!hasFirebaseConfig) {
    setModalError('Firebase is not connected yet. Add your config first, then submitting will work.');
    return;
  }
  const name = els.nameInput.value.trim();
  const text = els.reviewInput.value.trim();
  if (!selectedRating) return setModalError('Please choose a star rating.');
  if (!name) return setModalError('Please enter your name.');
  if (!text) return setModalError('Please write a short review.');
  if (name.length > 32) return setModalError('Your name is a bit too long.');
  if (text.length > 280) return setModalError('Please keep your review under 280 characters.');

  try {
    const todayKey = getTodayKeyUTC8();
    await addDoc(collection(db, 'reviews'), {
      dateKey: todayKey,
      rating: selectedRating,
      name,
      text,
      createdAt: serverTimestamp()
    });
    datesWithData.add(todayKey);
    els.nameInput.value = '';
    els.reviewInput.value = '';
    selectedRating = 0;
    updatePicker();
    closeModal();
    selectedHistoryDateKey = todayKey;
    displayedMonth = getMonthState(todayKey);
    renderStaticShell();
    loadTodayReviews();
  } catch (err) {
    console.error(err);
    setModalError('Could not submit review yet. Check your Firestore rules and Firebase config.');
  }
}

els.todayTab.addEventListener('click', () => switchView('today'));
els.historyTab.addEventListener('click', () => switchView('history'));
els.openReviewBtn.addEventListener('click', openModal);
els.closeModalBtn.addEventListener('click', closeModal);
els.closeModalBtn2.addEventListener('click', closeModal);
els.submitReviewBtn.addEventListener('click', submitReview);
els.reviewModal.addEventListener('click', (e) => { if (e.target === els.reviewModal) closeModal(); });
window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

els.prevMonthBtn.addEventListener('click', () => {
  const nextIndex = displayedMonth.monthIndex - 1;
  displayedMonth = nextIndex < 0
    ? { year: displayedMonth.year - 1, monthIndex: 11 }
    : { year: displayedMonth.year, monthIndex: nextIndex };
  renderCalendar();
  renderStaticShell();
});

els.nextMonthBtn.addEventListener('click', () => {
  const nextIndex = displayedMonth.monthIndex + 1;
  displayedMonth = nextIndex > 11
    ? { year: displayedMonth.year + 1, monthIndex: 0 }
    : { year: displayedMonth.year, monthIndex: nextIndex };
  renderCalendar();
  renderStaticShell();
});

buildStarPicker();
renderStaticShell();
loadTodayReviews();
