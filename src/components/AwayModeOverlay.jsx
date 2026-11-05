import { useEffect, useRef, useState } from "react";
import logo from "../assets/logo.png";
import "./AwayMode.css";

const RESULT_MS = 1500;
const NOTICE_RESULT_MS = 4000;
const BUFFER_IDLE_MS = 3000;

const ICONS = {
  idle: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" />
    </>
  ),
  success: <polyline points="4 12.5 10 18.5 20 6.5" />,
  denied: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  banned: (
    <>
      <circle cx="12" cy="12" r="9" />
      <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
    </>
  ),
  notChecked: (
    <>
      <line x1="12" y1="4" x2="12" y2="14" />
      <line x1="12" y1="19.5" x2="12" y2="20" />
    </>
  ),
};

function toResult({ success, name, reason, unavailable, queued }) {
  if (unavailable) return { kind: "notChecked", heading: "Not Checked", sub: reason, showMs: NOTICE_RESULT_MS };
  if (success && queued) {
    return { kind: "success", heading: "ID Accepted", sub: `Welcome, ${name}! Your swipe will save when the connection returns.`, showMs: NOTICE_RESULT_MS };
  }
  if (success) return { kind: "success", heading: "ID Accepted", sub: `Welcome, ${name}!` };
  if (reason?.toLowerCase().includes("banned")) return { kind: "banned", heading: "BANNED", sub: reason };
  return { kind: "denied", heading: "ID Denied", sub: reason };
}

function AwayScreen({ gym, onDismiss, onSwipe }) {
  const [result, setResult] = useState(null);
  const bufferRef = useRef("");
  const lastKeyRef = useRef(0);
  const latestSwipeRef = useRef(0);
  const resetTimerRef = useRef(null);

  // Keys are read at the window so a swipe registers wherever focus happens to be.
  useEffect(() => {
    const submit = async (id) => {
      const swipe = ++latestSwipeRef.current;
      clearTimeout(resetTimerRef.current);
      setResult({ kind: "checking", heading: "Checking ID", sub: "" });

      let next;
      try {
        next = toResult(await onSwipe(id));
      } catch {
        next = toResult({ success: false, unavailable: true, reason: "Swipe not saved. Please swipe again." });
      }

      // A newer swipe owns the screen; this one is still saved.
      if (swipe !== latestSwipeRef.current) return;
      setResult(next);
      resetTimerRef.current = setTimeout(() => setResult(null), next.showMs ?? RESULT_MS);
    };

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Stray keys must not end up as the prefix of the next swipe.
      if (e.timeStamp - lastKeyRef.current > BUFFER_IDLE_MS) bufferRef.current = "";
      lastKeyRef.current = e.timeStamp;

      if (e.key === "Enter") {
        const id = bufferRef.current.trim();
        bufferRef.current = "";
        if (id) submit(id);
      } else if (e.key === "Backspace") {
        bufferRef.current = bufferRef.current.slice(0, -1);
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      } else {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onSwipe]);

  useEffect(() => {
    document.activeElement?.blur();
    return () => clearTimeout(resetTimerRef.current);
  }, []);

  const kind = result?.kind ?? "idle";

  return (
    <div className={`away-overlay away-${kind}`} onClick={onDismiss}>
      <img className="away-logo" src={logo} alt="" />

      <div key={kind} className="away-content">
        {kind === "checking" ? (
          <div className="away-spinner" />
        ) : (
          <svg className="away-icon" viewBox="0 0 24 24" aria-hidden="true">
            {ICONS[kind]}
          </svg>
        )}
        <h1 className="away-heading">{result ? result.heading : "PLEASE SWIPE IN"}</h1>
        <p className="away-sub">{result ? result.sub : `${gym}: scan your ID, or type it and press Enter`}</p>
      </div>

      {!result && <p className="away-dismiss">Click anywhere to dismiss</p>}
    </div>
  );
}

function AwayModeOverlay({ isActive, ...screenProps }) {
  return isActive ? <AwayScreen {...screenProps} /> : null;
}

export default AwayModeOverlay;
