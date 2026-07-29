/* global React, ReactDOM, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakSlider, TweakToggle, TweakColor,
   Hero, Rings, Wholesaling, Coaching, Habits, TaskList, RealEstate, WeekStrip, ImportantDates, Banner */
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "numFont": "Orbitron",
  "glow": 100,
  "accent": ["#00E5FF", "#FF6B9D", "#FFD166"],
  "caliAccent": ["#4F7BC7", "#BD8A5E", "#C6A24C"],
  "caliPaper": "airy",
  "inspiration": false
}/*EDITMODE-END*/;

const ACCENTS = [
  ["#00FFD1", "#FF8C00", "#FFD166"], // spec: teal / orange / gold
  ["#34E5C0", "#7AA2F7", "#C0A0FF"], // cool: mint / blue / violet
  ["#00E5FF", "#FF6B9D", "#FFD166"], // cyan / pink / gold
  ["#4ADE80", "#FBBF24", "#F87171"], // green / amber / red
];

// California light palettes — soft, airy, coastal
const CALI_ACCENTS = [
  ["#4F7BC7", "#BD8A5E", "#C6A24C"], // Tag Homes — soft blue / warm sand / gold
  ["#6E8E6A", "#C0815A", "#CDA63F"], // Sage — muted sage / clay / honey
  ["#2F8475", "#C06A48", "#C2912F"], // Coast — sea green / terracotta / gold
  ["#5388A6", "#D08267", "#C9A24A"], // Tide — dusty blue / coral / sand gold
  ["#7E8B57", "#A87B5E", "#C79A3E"], // Olive — olive / taupe / amber
];

// Per-palette ink + display font (keyed by the primary accent).
// Tag Homes uses its cooler blue-gray ink + Cormorant serif; the rest keep warm espresso + Spectral.
const CALI_INK = {
  "#4F7BC7": { text: "#2A2E3A", mid: "#565B6B", dim: "#8B8F9C", rule: "#D8D1BF", font: "'Cormorant Garamond'" },
};

const PAPERS = {
  airy:  { bg: "#FAF6EF", bg2: "#F1EADD", card: "#FFFFFF", card2: "#FAF5EC" }, // lightest
  cream: { bg: "#F3EAD8", bg2: "#E9DBC2", card: "#FFFDF7", card2: "#F7EFDF" },
  warm:  { bg: "#EFE3CB", bg2: "#E3D3B4", card: "#FBF4E6", card2: "#F1E6CF" },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const D = window.DASH;
  const [quoteIdx] = useState(() => Math.floor(Math.random() * D.quotes.length));

  // theme + tokens
  useEffect(() => {
    const r = document.documentElement;
    r.setAttribute("data-theme", t.theme);
    const light = t.theme === "light";
    r.style.setProperty("--gm", String(light ? Math.min(t.glow / 100, 0.10) : t.glow / 100));
    r.style.setProperty("--num-font", light ? "'Spectral'" : (t.numFont === "Orbitron" ? "'Orbitron'" : "'Space Mono'"));
    if (light) {
      const ac = t.caliAccent;
      r.style.setProperty("--teal", ac[0]);
      r.style.setProperty("--orange", ac[1]);
      r.style.setProperty("--gold", ac[2]);
      const p = PAPERS[t.caliPaper] || PAPERS.airy;
      r.style.setProperty("--bg", p.bg);
      r.style.setProperty("--bg-2", p.bg2);
      r.style.setProperty("--card", p.card);
      r.style.setProperty("--card-2", p.card2);
      const ink = CALI_INK[ac[0]];
      if (ink) {
        r.style.setProperty("--text", ink.text);
        r.style.setProperty("--text-mid", ink.mid);
        r.style.setProperty("--text-dim", ink.dim);
        r.style.setProperty("--border", ink.rule);
        r.style.setProperty("--num-font", ink.font);
      } else {
        ["--text", "--text-mid", "--text-dim", "--border"].forEach((k) => r.style.removeProperty(k));
        r.style.setProperty("--num-font", "'Spectral'");
      }
    } else {
      r.style.setProperty("--teal", t.accent[0]);
      r.style.setProperty("--orange", t.accent[1]);
      r.style.setProperty("--gold", t.accent[2]);
      r.style.setProperty("--num-font", t.numFont === "Orbitron" ? "'Orbitron'" : "'Space Mono'");
      ["--bg", "--bg-2", "--card", "--card-2", "--text", "--text-mid", "--text-dim", "--border"].forEach((k) => r.style.removeProperty(k));
    }
    r.style.setProperty("--insp-img",
      "radial-gradient(60% 80% at 18% 12%, " + t.accent[0] + "55, transparent 60%)," +
      "radial-gradient(55% 75% at 85% 20%, " + t.accent[1] + "44, transparent 60%)," +
      "radial-gradient(70% 90% at 60% 100%, " + t.accent[2] + "33, transparent 60%)");
  }, [t.theme, t.glow, t.numFont, t.accent, t.caliAccent, t.caliPaper]);

  return (
    <div className={"stage" + (t.inspiration ? " insp" : "")}>
      <div className="wrap">
        <div className="topbar">
          <div className="brand">
            <span className="dot" />
            <span className="ttl">Morning Command Center</span>
          </div>
          <div className="meta">
            <div className="skin-switch">
              <button className={t.theme === "dark" ? "active" : ""} onClick={() => setTweak("theme", "dark")}>Control Room</button>
              <button className={t.theme === "light" ? "active" : ""} onClick={() => setTweak("theme", "light")}>California</button>
            </div>
            <span className="chip">SYNC <b>· live</b></span>
            <span className="chip num">{D.now.time}<b style={{ marginLeft: 4 }}>{D.now.ampm}</b></span>
          </div>
        </div>

        <div className="grid">
          <Hero d={D} skin={t.theme} />
          <Rings d={D.health} />
          <Wholesaling d={D.wholesaling} />

          <Habits d={D.habits} />
          <Coaching d={D.coaching} />
          <TaskList label="Business Tasks" accent="orange" items={D.bizTasks} />

          <RealEstate d={D.realEstate} />
          <TaskList label="Personal Tasks" accent="teal" items={D.personalTasks} />
          <ImportantDates d={D.importantDates} />

          <WeekStrip d={D.week} />
          <Banner quote={D.quotes[quoteIdx]} goals={D.weeklyGoals} />
        </div>
      </div>

      <TweaksPanel>
        <TweakSection label="Skin" />
        <TweakRadio label="Mode" value={t.theme} options={["dark", "light"]} onChange={(v) => setTweak("theme", v)} />
        <div style={{ fontSize: 11, color: "var(--text-dim)", padding: "2px 2px 6px", lineHeight: 1.4 }}>
          dark = Control Room · light = California
        </div>
        <TweakColor label="Accents (dark)" value={t.accent} options={ACCENTS} onChange={(v) => setTweak("accent", v)} />
        <TweakColor label="Accents (California)" value={t.caliAccent} options={CALI_ACCENTS} onChange={(v) => setTweak("caliAccent", v)} />
        <TweakRadio label="Paper tone" value={t.caliPaper} options={["airy", "cream", "warm"]} onChange={(v) => setTweak("caliPaper", v)} />
        <TweakSection label="Type & Glow" />
        <TweakRadio label="Number font" value={t.numFont} options={["Orbitron", "Space Mono"]} onChange={(v) => setTweak("numFont", v)} />
        <TweakSlider label="Glow intensity" value={t.glow} min={0} max={100} step={5} unit="%" onChange={(v) => setTweak("glow", v)} />
        <TweakSection label="Atmosphere" />
        <TweakToggle label="Inspiration backdrop" value={t.inspiration} onChange={(v) => setTweak("inspiration", v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
