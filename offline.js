(() => {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(new URL('./service-worker.js', document.baseURI).href)
      .catch(() => { /* Local preview still works if service workers are unavailable. */ });
  });
})();
