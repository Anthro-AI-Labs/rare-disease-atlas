export const DEPTH_KEY = "rda-depth";
/** Inline script for <head>: applies the saved depth before first paint (no flash). */
export const DEPTH_BOOT = `try{if(/[?&]motion=force/.test(location.search))document.documentElement.classList.add("force-motion");var d=localStorage.getItem("${DEPTH_KEY}");if(d==="detailed"||d==="simple")document.documentElement.dataset.depth=d;else document.documentElement.dataset.depth="simple"}catch(e){document.documentElement.dataset.depth="simple"}`;
