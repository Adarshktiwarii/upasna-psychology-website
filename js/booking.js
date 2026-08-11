(function () {
  var SESSIONS = {
    '15min': {
      label: '15 Minute Meeting',
      price: 500,
      tidycal: 'https://tidycal.com/consultupasnashil/15-minute-meeting'
    },
    '30min': {
      label: '30 Minute Meeting',
      price: 1000,
      tidycal: 'https://tidycal.com/consultupasnashil/30-minute-meeting'
    },
    '50min': {
      label: '50 Minute Meeting',
      price: 1500,
      tidycal: 'https://tidycal.com/consultupasnashil/60-minute-meeting'
    }
  };

  var STORAGE_KEY = 'heyupasna_booking_unlocked';
  var SESSION_KEY = 'heyupasna_booking_session';
  var PAYMENT_ID_KEY = 'heyupasna_payment_id';

  var selectedSession = null;
  var cards = document.querySelectorAll('.session-card');
  var paymentSection = document.getElementById('payment');
  var scheduleSection = document.getElementById('schedule');
  var scheduleLocked = document.getElementById('schedule-locked');
  var razorpayPayBtn = document.getElementById('razorpayPayBtn');
  var tidycalBookBtn = document.getElementById('tidycalBookBtn');
  var scheduleSessionLabel = document.getElementById('scheduleSessionLabel');
  var paymentIdNote = document.getElementById('paymentIdNote');

  function getPaymentLink(sessionKey) {
    if (typeof RAZORPAY_CONFIG !== 'undefined' && RAZORPAY_CONFIG.paymentLinks) {
      return RAZORPAY_CONFIG.paymentLinks[sessionKey];
    }
    return null;
  }

  function setStepActive(step) {
    document.querySelectorAll('.flow-step').forEach(function (el) {
      var n = parseInt(el.getAttribute('data-step'), 10);
      el.classList.toggle('active', n <= step);
      el.classList.toggle('completed', n < step);
    });
  }

  function scrollToEl(el) {
    if (!el) return;
    var nav = document.querySelector('.navbar');
    var offset = nav ? nav.offsetHeight + 16 : 80;
    var top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  function updateSummary(sessionKey) {
    var info = SESSIONS[sessionKey];
    if (!info) return;
    document.getElementById('summarySession').textContent = info.label;
    document.getElementById('summaryAmount').textContent = '₹' + info.price.toLocaleString('en-IN');
  }

  function updatePayButton(sessionKey) {
    var info = SESSIONS[sessionKey];
    var link = getPaymentLink(sessionKey);
    if (!info || !razorpayPayBtn || !link) return;
    razorpayPayBtn.disabled = false;
    razorpayPayBtn.dataset.paymentUrl = link;
    razorpayPayBtn.innerHTML = '<i class="fas fa-shield-halved"></i> Pay ₹' + info.price.toLocaleString('en-IN') + ' securely';
  }

  function updateTidyCalLink(sessionKey) {
    var info = SESSIONS[sessionKey];
    if (!info || !tidycalBookBtn) return;
    tidycalBookBtn.href = info.tidycal;
    tidycalBookBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Book ' + info.label + ' on TidyCal';
    if (scheduleSessionLabel) scheduleSessionLabel.textContent = info.label;
  }

  function showPaymentId(paymentId) {
    if (!paymentId || !paymentIdNote) return;
    paymentIdNote.textContent = 'Payment reference: ' + paymentId;
    paymentIdNote.hidden = false;
  }

  function unlockSchedule(sessionKey, paymentId) {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    sessionStorage.setItem(SESSION_KEY, sessionKey);
    if (paymentId) sessionStorage.setItem(PAYMENT_ID_KEY, paymentId);

    selectedSession = sessionKey;
    updateTidyCalLink(sessionKey);
    if (paymentId) showPaymentId(paymentId);
    else showPaymentId(sessionStorage.getItem(PAYMENT_ID_KEY));

    paymentSection.hidden = true;
    scheduleSection.hidden = false;
    scheduleLocked.hidden = true;
    setStepActive(3);
    scrollToEl(scheduleSection);

    // Clean URL params after handling redirect
    if (window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname + '?session=' + sessionKey);
    }
  }

  function restoreUnlockedState() {
    if (sessionStorage.getItem(STORAGE_KEY) !== 'true') return;
    var sessionKey = sessionStorage.getItem(SESSION_KEY);
    if (!sessionKey || !SESSIONS[sessionKey]) return;

    selectedSession = sessionKey;
    updateTidyCalLink(sessionKey);
    showPaymentId(sessionStorage.getItem(PAYMENT_ID_KEY));
    paymentSection.hidden = true;
    scheduleSection.hidden = false;
    scheduleLocked.hidden = true;
    setStepActive(3);

    var card = document.querySelector('.session-card[data-session="' + sessionKey + '"]');
    if (card) {
      cards.forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
    }
  }

  function isPaymentSuccess(params) {
    if (params.get('paid') === '1') return true;
    if (params.get('razorpay_payment_link_status') === 'paid') return true;
    if (params.get('razorpay_payment_id')) return true;
    return false;
  }

  function selectSession(card, skipScroll) {
    var sessionKey = card.getAttribute('data-session');

    cards.forEach(function (c) { c.classList.remove('selected'); });
    card.classList.add('selected');
    selectedSession = sessionKey;
    sessionStorage.setItem(SESSION_KEY, sessionKey);

    updateSummary(sessionKey);
    updatePayButton(sessionKey);
    updateTidyCalLink(sessionKey);
    paymentSection.hidden = false;
    scheduleSection.hidden = true;
    scheduleLocked.hidden = false;
    setStepActive(2);
    if (!skipScroll) scrollToEl(paymentSection);
  }

  function handlePaymentReturn() {
    var params = new URLSearchParams(window.location.search);
    var sessionKey = params.get('session');
    if (!sessionKey || !SESSIONS[sessionKey]) return;
    if (!isPaymentSuccess(params)) return;

    var paymentId = params.get('razorpay_payment_id') || params.get('payment_id');
    unlockSchedule(sessionKey, paymentId);
  }

  cards.forEach(function (card) {
    card.addEventListener('click', function () { selectSession(card); });
  });

  if (razorpayPayBtn) {
    razorpayPayBtn.addEventListener('click', function () {
      var url = razorpayPayBtn.dataset.paymentUrl;
      if (!url || razorpayPayBtn.disabled) return;
      window.location.href = url;
    });
  }

  var params = new URLSearchParams(window.location.search);
  var preselect = params.get('session');

  if (isPaymentSuccess(params) && preselect && SESSIONS[preselect]) {
    handlePaymentReturn();
  } else {
    if (preselect) {
      var target = document.querySelector('.session-card[data-session="' + preselect + '"]');
      if (target) selectSession(target, true);
    }
    restoreUnlockedState();
  }
})();
