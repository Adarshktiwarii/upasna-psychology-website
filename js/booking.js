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

  var BOOKING_TOKEN_KEY = 'heyupasna_booking_token';

  var selectedSession = null;
  var activeBookingToken = null;
  var activePaymentId = null;
  var razorpayKeyId = null;
  var checkoutReady = false;
  var paymentInProgress = false;
  var completingBooking = false;

  var cards = document.querySelectorAll('.session-card');
  var paymentSection = document.getElementById('payment');
  var scheduleSection = document.getElementById('schedule');
  var scheduleLocked = document.getElementById('schedule-locked');
  var razorpayPayBtn = document.getElementById('razorpayPayBtn');
  var tidycalEmbed = document.getElementById('tidycalEmbed');
  var completeBookingBtn = document.getElementById('completeBookingBtn');
  var completeBookingError = document.getElementById('completeBookingError');
  var scheduleSessionLabel = document.getElementById('scheduleSessionLabel');
  var paymentIdNote = document.getElementById('paymentIdNote');
  var paymentError = document.getElementById('paymentError');

  function apiUrl(path) {
    var base = (typeof RAZORPAY_CONFIG !== 'undefined' && RAZORPAY_CONFIG.apiBase) || '';
    return base + path;
  }

  function showCompleteBookingError(message) {
    if (!completeBookingError) return;
    completeBookingError.textContent = message;
    completeBookingError.hidden = !message;
  }

  function finishBookingAndGoHome() {
    clearBookingToken();
    window.location.href = 'index.html';
  }

  function showPaymentError(message) {
    if (!paymentError) return;
    paymentError.textContent = message;
    paymentError.hidden = !message;
  }

  function saveBookingToken(token) {
    activeBookingToken = token;
    try {
      localStorage.setItem(BOOKING_TOKEN_KEY, token);
    } catch (err) {
      // localStorage may be unavailable in private mode
    }
  }

  function loadBookingToken() {
    if (activeBookingToken) return activeBookingToken;
    try {
      activeBookingToken = localStorage.getItem(BOOKING_TOKEN_KEY);
    } catch (err) {
      activeBookingToken = null;
    }
    return activeBookingToken;
  }

  function clearBookingToken() {
    activeBookingToken = null;
    activePaymentId = null;
    try {
      localStorage.removeItem(BOOKING_TOKEN_KEY);
    } catch (err) {
      // ignore
    }
  }

  function setPayButtonLoading(isLoading) {
    if (!razorpayPayBtn || !selectedSession) return;
    var info = SESSIONS[selectedSession];
    if (!info) return;

    razorpayPayBtn.disabled = isLoading || !checkoutReady;
    if (isLoading) {
      razorpayPayBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      return;
    }

    razorpayPayBtn.innerHTML = '<i class="fas fa-shield-halved"></i> Pay ₹' + info.price.toLocaleString('en-IN') + ' securely';
  }

  function setCompleteButtonLoading(isLoading) {
    if (!completeBookingBtn) return;
    completeBookingBtn.disabled = isLoading;
    if (isLoading) {
      completeBookingBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finishing up...';
      return;
    }
    completeBookingBtn.innerHTML = '<i class="fas fa-check"></i> I\'ve booked my slot';
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
    if (!info || !razorpayPayBtn) return;
    razorpayPayBtn.disabled = !checkoutReady;
    if (!checkoutReady) {
      razorpayPayBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparing checkout...';
      return;
    }
    razorpayPayBtn.innerHTML = '<i class="fas fa-shield-halved"></i> Pay ₹' + info.price.toLocaleString('en-IN') + ' securely';
  }

  function updateTidyCalEmbed(sessionKey) {
    var info = SESSIONS[sessionKey];
    if (!info) return;

    if (scheduleSessionLabel) scheduleSessionLabel.textContent = info.label;
    if (tidycalEmbed) tidycalEmbed.src = info.tidycal;
  }

  function showPaymentId(paymentId) {
    if (!paymentId || !paymentIdNote) return;
    paymentIdNote.textContent = 'Payment reference: ' + paymentId + ' — save this if you need to return later.';
    paymentIdNote.hidden = false;
  }

  function resetBookingFlow() {
    clearBookingToken();
    selectedSession = null;
    paymentInProgress = false;
    completingBooking = false;

    cards.forEach(function (c) { c.classList.remove('selected'); });

    if (paymentIdNote) {
      paymentIdNote.textContent = '';
      paymentIdNote.hidden = true;
    }

    if (scheduleSessionLabel) scheduleSessionLabel.textContent = 'session';
    if (document.getElementById('summarySession')) document.getElementById('summarySession').textContent = '—';
    if (document.getElementById('summaryAmount')) document.getElementById('summaryAmount').textContent = '₹0';
    if (tidycalEmbed) tidycalEmbed.src = 'about:blank';
    if (razorpayPayBtn) {
      razorpayPayBtn.disabled = !checkoutReady;
      razorpayPayBtn.innerHTML = '<i class="fas fa-shield-halved"></i> Pay now';
    }

    scheduleSection.hidden = true;
    paymentSection.hidden = true;
    scheduleLocked.hidden = false;
    setStepActive(1);
    showPaymentError('');

    if (window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    var chooseSession = document.getElementById('choose-session');
    if (chooseSession) scrollToEl(chooseSession);
  }

  function unlockSchedule(sessionKey, paymentId, bookingToken, skipScroll) {
    selectedSession = sessionKey;
    activePaymentId = paymentId || null;
    updateTidyCalEmbed(sessionKey);
    if (paymentId) showPaymentId(paymentId);
    if (bookingToken) saveBookingToken(bookingToken);

    var card = document.querySelector('.session-card[data-session="' + sessionKey + '"]');
    if (card) {
      cards.forEach(function (c) { c.classList.remove('selected'); });
      card.classList.add('selected');
    }

    paymentSection.hidden = true;
    scheduleSection.hidden = false;
    scheduleLocked.hidden = true;
    setStepActive(3);
    showPaymentError('');

    if (!skipScroll) scrollToEl(scheduleSection);

    if (window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname + '?session=' + sessionKey);
    }
  }

  function fetchBookingStatus(token) {
    return fetch(apiUrl('/api/booking-status'), {
      headers: { Authorization: 'Bearer ' + token }
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          throw new Error(data.error || 'Could not restore your booking.');
        }
        return data;
      });
    });
  }

  function restoreBookingState() {
    var token = loadBookingToken();
    if (!token) return Promise.resolve();

    return fetchBookingStatus(token)
      .then(function (data) {
        if (data.status === 'completed') {
          clearBookingToken();
          return;
        }

        if (data.booking_token) saveBookingToken(data.booking_token);
        unlockSchedule(data.session_key, data.payment_id, data.booking_token, true);
      })
      .catch(function () {
        clearBookingToken();
      });
  }

  function selectSession(card, skipScroll) {
    var sessionKey = card.getAttribute('data-session');

    cards.forEach(function (c) { c.classList.remove('selected'); });
    card.classList.add('selected');
    selectedSession = sessionKey;

    updateSummary(sessionKey);
    updatePayButton(sessionKey);
    updateTidyCalEmbed(sessionKey);
    paymentSection.hidden = false;
    scheduleSection.hidden = true;
    scheduleLocked.hidden = false;
    setStepActive(2);
    showPaymentError('');
    if (!skipScroll) scrollToEl(paymentSection);
  }

  function loadCheckoutScript() {
    return new Promise(function (resolve, reject) {
      if (window.Razorpay) {
        resolve();
        return;
      }

      var script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error('Failed to load Razorpay checkout')); };
      document.head.appendChild(script);
    });
  }

  function fetchRazorpayConfig() {
    return fetch(apiUrl('/api/config'))
      .then(function (response) {
        return response.text().then(function (text) {
          var data;
          try {
            data = JSON.parse(text);
          } catch (err) {
            throw new Error('Payment service is unavailable. Please try again later.');
          }
          if (!response.ok) {
            throw new Error(data.error || 'Payment service is unavailable. Please try again later.');
          }
          if (!data.keyId) throw new Error('Payment configuration is missing.');
          razorpayKeyId = data.keyId;
          checkoutReady = true;
          if (selectedSession) updatePayButton(selectedSession);
        });
      });
  }

  function createOrder(sessionKey) {
    var info = SESSIONS[sessionKey];
    var receipt = 'session_' + sessionKey + '_' + Date.now();

    return fetch(apiUrl('/api/create-order'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: info.price * 100,
        currency: 'INR',
        receipt: receipt,
        session_key: sessionKey
      })
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) {
          var message = data.error || 'Could not start payment. Please try again.';
          if (response.status === 401) message = 'Payment authentication failed. Please contact support.';
          throw new Error(message);
        }
        return data;
      });
    });
  }

  function verifyPayment(payload) {
    return fetch(apiUrl('/api/verify-payment'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Payment verification failed. Please contact support with your payment ID.');
        }
        return data;
      });
    });
  }

  function completeBooking() {
    if (completingBooking) return;

    var token = loadBookingToken();
    if (!token) {
      finishBookingAndGoHome();
      return;
    }

    completingBooking = true;
    setCompleteButtonLoading(true);
    showCompleteBookingError('');

    fetch(apiUrl('/api/complete-booking'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token
      },
      body: JSON.stringify({ booking_token: token })
    })
      .then(function (response) {
        return response.json().then(function (data) {
          if (!response.ok || !data.success) {
            throw new Error(data.error || 'Could not complete booking.');
          }
          finishBookingAndGoHome();
        });
      })
      .catch(function (err) {
        showCompleteBookingError(err.message);
      })
      .finally(function () {
        completingBooking = false;
        setCompleteButtonLoading(false);
      });
  }

  function openRazorpayCheckout(order, sessionKey) {
    var info = SESSIONS[sessionKey];
    var config = typeof RAZORPAY_CONFIG !== 'undefined' ? RAZORPAY_CONFIG : {};

    var options = {
      key: razorpayKeyId,
      amount: order.amount,
      currency: order.currency,
      name: config.businessName || 'Hey Upasna',
      description: info.label,
      order_id: order.order_id,
      handler: function (response) {
        paymentInProgress = false;
        setPayButtonLoading(true);

        verifyPayment({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        })
          .then(function (data) {
            unlockSchedule(
              data.session_key || sessionKey,
              data.payment_id || response.razorpay_payment_id,
              data.booking_token
            );
          })
          .catch(function (err) {
            showPaymentError(err.message + ' Your payment may still have gone through — please contact support on WhatsApp with payment ID ' + response.razorpay_payment_id + '.');
          })
          .finally(function () {
            setPayButtonLoading(false);
          });
      },
      modal: {
        ondismiss: function () {
          paymentInProgress = false;
          setPayButtonLoading(false);
          showPaymentError('Payment was cancelled. You can try again when ready.');
        }
      },
      theme: {
        color: '#6B7D6D'
      }
    };

    var razorpay = new window.Razorpay(options);

    razorpay.on('payment.failed', function (response) {
      paymentInProgress = false;
      setPayButtonLoading(false);
      var reason = response.error && response.error.description
        ? response.error.description
        : 'Payment failed. Please try again or use a different method.';
      showPaymentError(reason);
    });

    razorpay.open();
  }

  function startPayment() {
    if (!selectedSession || !checkoutReady || paymentInProgress) return;

    showPaymentError('');
    paymentInProgress = true;
    setPayButtonLoading(true);

    createOrder(selectedSession)
      .then(function (order) {
        setPayButtonLoading(false);
        openRazorpayCheckout(order, selectedSession);
      })
      .catch(function (err) {
        paymentInProgress = false;
        setPayButtonLoading(false);
        showPaymentError(err.message);
      });
  }

  cards.forEach(function (card) {
    card.addEventListener('click', function () { selectSession(card); });
  });

  if (razorpayPayBtn) {
    razorpayPayBtn.addEventListener('click', startPayment);
  }

  if (completeBookingBtn) {
    completeBookingBtn.addEventListener('click', completeBooking);
  }

  Promise.all([loadCheckoutScript(), fetchRazorpayConfig()])
    .then(function () {
      return restoreBookingState();
    })
    .catch(function (err) {
      checkoutReady = false;
      if (razorpayPayBtn) razorpayPayBtn.disabled = true;
      showPaymentError(err.message);
    });

  var params = new URLSearchParams(window.location.search);
  var preselect = params.get('session');

  if (preselect && !loadBookingToken()) {
    var target = document.querySelector('.session-card[data-session="' + preselect + '"]');
    if (target) selectSession(target, true);
  }
})();
