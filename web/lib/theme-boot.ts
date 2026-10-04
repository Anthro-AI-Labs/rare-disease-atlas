export const THEME_KEY = "rda-theme";
/** Inline script run before first paint: saved choice wins; with no saved choice the site is LIGHT (the OS preference is deliberately ignored). */
export const THEME_BOOT = `try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.dataset.theme=(t==="dark"||t==="light")?t:"light"}catch(e){document.documentElement.dataset.theme="light"}`;
