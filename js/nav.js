(function () {
  var page = document.body.getAttribute('data-page');
  if (!page) return;
  var link = document.querySelector('[data-nav="' + page + '"]');
  if (link) link.classList.add('active');
})();
