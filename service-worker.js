const CACHE_NAME = "read-by-syllables-v10-fullscreen-pictures";
const APP_ASSETS = [
  "./AUDIO-RENAMING.txt",
  "./README-GITHUB-PAGES.txt",
  "./README.txt",
  "./app.js",
  "./audio/praise/praise-01.wav",
  "./audio/praise/praise-02.wav",
  "./audio/praise/praise-03.wav",
  "./audio/praise/praise-04.wav",
  "./audio/praise/praise-05.wav",
  "./audio/praise/praise-06.wav",
  "./audio/praise/praise-07.wav",
  "./audio/praise/praise-08.wav",
  "./audio/praise/praise-09.wav",
  "./audio/praise/praise-10.wav",
  "./audio/praise/praise-11.wav",
  "./audio/praise/praise-12.wav",
  "./audio/praise/praise-13.wav",
  "./audio/praise/praise-14.wav",
  "./audio/syllables/ba.wav",
  "./audio/syllables/be.wav",
  "./audio/syllables/bel.wav",
  "./audio/syllables/che.wav",
  "./audio/syllables/da.wav",
  "./audio/syllables/du.wav",
  "./audio/syllables/ga.wav",
  "./audio/syllables/ge.wav",
  "./audio/syllables/ka.wav",
  "./audio/syllables/kha.wav",
  "./audio/syllables/kni.wav",
  "./audio/syllables/ko.wav",
  "./audio/syllables/kosh.wav",
  "./audio/syllables/li.wav",
  "./audio/syllables/lo.wav",
  "./audio/syllables/lu.wav",
  "./audio/syllables/ma.wav",
  "./audio/syllables/mis.wav",
  "./audio/syllables/mish.wav",
  "./audio/syllables/mot.wav",
  "./audio/syllables/mysh.wav",
  "./audio/syllables/na.wav",
  "./audio/syllables/no.wav",
  "./audio/syllables/nok.wav",
  "./audio/syllables/ny.wav",
  "./audio/syllables/pa.wav",
  "./audio/syllables/ra.wav",
  "./audio/syllables/re.wav",
  "./audio/syllables/ru.wav",
  "./audio/syllables/ry.wav",
  "./audio/syllables/sa.wav",
  "./audio/syllables/shi.wav",
  "./audio/syllables/so.wav",
  "./audio/syllables/te.wav",
  "./audio/syllables/ut.wav",
  "./audio/syllables/va.wav",
  "./audio/syllables/vo.wav",
  "./audio/syllables/za.wav",
  "./audio/syllables/zai.wav",
  "./audio/syllables/zy.wav",
  "./audio/words/banany.wav",
  "./audio/words/begemot.wav",
  "./audio/words/belka.wav",
  "./audio/words/cherepakha.wav",
  "./audio/words/kniga.wav",
  "./audio/words/korova.wav",
  "./audio/words/koshka.wav",
  "./audio/words/kotenok.wav",
  "./audio/words/koza.wav",
  "./audio/words/lisa.wav",
  "./audio/words/luna.wav",
  "./audio/words/malina.wav",
  "./audio/words/mama.wav",
  "./audio/words/mashina.wav",
  "./audio/words/mishka.wav",
  "./audio/words/miska.wav",
  "./audio/words/moloko.wav",
  "./audio/words/myshka.wav",
  "./audio/words/noga.wav",
  "./audio/words/papa.wav",
  "./audio/words/raduga.wav",
  "./audio/words/rozy.wav",
  "./audio/words/ruka.wav",
  "./audio/words/ryba.wav",
  "./audio/words/sobaka.wav",
  "./audio/words/sova.wav",
  "./audio/words/utka.wav",
  "./audio/words/voda.wav",
  "./audio/words/vorona.wav",
  "./audio/words/zaika.wav",
  "./data.js",
  "./icons/apple-touch-icon.png",
  "./icons/favicon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./images/banany.jpg",
  "./images/begemot.jpg",
  "./images/belka.jpg",
  "./images/cherepaha.jpg",
  "./images/kniga.jpg",
  "./images/korova.jpg",
  "./images/koshka.jpg",
  "./images/kotenok.jpg",
  "./images/koza.jpg",
  "./images/lisa.jpg",
  "./images/luna.jpg",
  "./images/malina.jpg",
  "./images/mama.jpg",
  "./images/mashina.jpg",
  "./images/mishka.jpg",
  "./images/miska.jpg",
  "./images/moloko.jpg",
  "./images/myshka.jpg",
  "./images/noga.jpg",
  "./images/papa.jpg",
  "./images/raduga.jpg",
  "./images/rozy.jpg",
  "./images/ruka.jpg",
  "./images/ryba.jpg",
  "./images/sobaka.jpg",
  "./images/sova.jpg",
  "./images/utka.jpg",
  "./images/voda.jpg",
  "./images/vorona.jpg",
  "./images/zaika.jpg",
  "./index.html",
  "./list-active-first.png",
  "./list-neutral.png",
  "./manifest.webmanifest",
  "./speaker.svg",
  "./style.css",
  "./ui-reference.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(event.request, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone());
        return fresh;
      } catch {
        return (await caches.match("./index.html")) || Response.error();
      }
    })());
    return;
  }

  const isCoreFile = /\.(?:js|css|webmanifest)$/.test(url.pathname);

  event.respondWith((async () => {
    if (isCoreFile) {
      try {
        const fresh = await fetch(event.request, { cache: "no-store" });
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, fresh.clone());
        }
        return fresh;
      } catch {
        return (await caches.match(event.request)) || Response.error();
      }
    }

    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      const fresh = await fetch(event.request);
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, fresh.clone());
      }
      return fresh;
    } catch {
      return new Response("Ресурс недоступен без интернета", {
        status: 503,
        statusText: "Offline"
      });
    }
  })());
});
