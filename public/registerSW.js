(() => {
  if (!("serviceWorker" in navigator)) return;

  const reloadKey = "cmi-map:service-worker-cleaned";

  const clearCaches = async () => {
    if (!("caches" in window)) return;
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
  };

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .getRegistrations()
      .then(async (registrations) => {
        await Promise.all(registrations.map((registration) => registration.unregister()));
        await clearCaches();

        if (sessionStorage.getItem(reloadKey) === "1") return;
        sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
      })
      .catch(() => {});
  });
})();
