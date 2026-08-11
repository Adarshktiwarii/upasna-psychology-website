/**
 * Razorpay Payment Links configuration.
 * Key ID is public-safe. Never put Key Secret in frontend code.
 */
var RAZORPAY_CONFIG = {
  mode: 'test',
  keyId: 'rzp_test_TOFdgBfiRmuhW5',
  paymentLinks: {
    '15min': 'https://rzp.io/rzp/ESSEiTH',
    '30min': 'https://rzp.io/rzp/cxZwsy1Z',
    '50min': 'https://rzp.io/rzp/ggSH4jx'
  }
};
