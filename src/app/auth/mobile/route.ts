function intentUrl(search: string) {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const path = query ? `login-callback?${query}` : "login-callback";
  return `intent://${path}#Intent;scheme=loadout;package=com.loadout.shop;end`;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

export function GET(request: Request) {
  const { search } = new URL(request.url);
  const open = intentUrl(search);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Returning to Loadout</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #10130f; color: #f4f1e8; font-family: sans-serif; }
    main { max-width: 24rem; padding: 2rem; text-align: center; }
    a { display: inline-block; margin-top: 1.5rem; background: #d6ff4a; color: #14180f; text-decoration: none; font-weight: 700; padding: 0.85rem 1.2rem; border-radius: 999px; }
  </style>
</head>
<body>
  <main>
    <h1>Returning to Loadout</h1>
    <p>Google sign-in is done. Open the app to see this account, the cart, and your orders.</p>
    <a id="open" href="${escapeHtml(open)}">Open Loadout</a>
  </main>
  <script>
    const params = new URLSearchParams(location.search);
    if (location.hash.length > 1) {
      const hash = new URLSearchParams(location.hash.slice(1));
      hash.forEach((value, key) => params.set(key, value));
    }
    const query = params.toString();
    const path = query ? "login-callback?" + query : "login-callback";
    const intent = "intent://" + path + "#Intent;scheme=loadout;package=com.loadout.shop;end";
    const scheme = "loadout://" + path;
    const link = document.getElementById("open");
    link.href = intent;
    location.replace(intent);
    setTimeout(() => { location.href = scheme; }, 700);
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
