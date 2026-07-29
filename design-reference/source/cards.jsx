/* global React */
const { useState } = React;

const ICON = {
  chev: (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...p}><path d="M9 6l6 6-6 6"/></svg>,
  home: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}><path d="M3 11l9-8 9 8M5 10v10h14V10"/></svg>,
  check: (p) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" {...p}><path d="M5 12l5 5L20 6"/></svg>,
  bolt: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></svg>,
};

function CardHead({ label, accent, right }) {
  return (
    <div className="card-head">
      <div className={"label acc-" + accent}>
        <span className="led" /> {label}
      </div>
      {right}
    </div>
  );
}

/* ---------- Hero ---------- */
const COAST_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='800' height='460'>" +
  "<defs>" +
  "<linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'>" +
  "<stop offset='0' stop-color='#CFE3F2'/><stop offset='0.55' stop-color='#A7C8E6'/><stop offset='1' stop-color='#86AED6'/>" +
  "</linearGradient>" +
  "<linearGradient id='sea' x1='0' y1='0' x2='0' y2='1'>" +
  "<stop offset='0' stop-color='#6FA0B4'/><stop offset='1' stop-color='#3E6E82'/>" +
  "</linearGradient></defs>" +
  "<rect width='800' height='300' fill='url(#sky)'/>" +
  "<circle cx='575' cy='196' r='52' fill='#F3ECD9' opacity='0.85'/>" +
  "<rect y='268' width='800' height='118' fill='url(#sea)'/>" +
  "<rect y='376' width='800' height='90' fill='#E9DEC4'/>" +
  "<ellipse cx='400' cy='376' rx='540' ry='24' fill='#DACFB2' opacity='0.6'/>" +
  "</svg>";
const COAST_SRC = "data:image/svg+xml," + encodeURIComponent(COAST_SVG);

function Hero({ d, skin }) {
  const stats = (
    <div className="stats">
      {d.heroStats.map((s, i) => (
        <div className={"stat acc-" + s.accent} key={i}>
          <div className="num v">{s.value}</div>
          <div className="l">{s.label}</div>
          <div className="d">{s.delta}</div>
        </div>
      ))}
    </div>
  );

  if (skin === "light") {
    return (
      <div className="card col2 acc-teal hero-cali">
        <image-slot id="coastline-hero" src={COAST_SRC} fit="cover" placeholder="Drop a California coastline photo"></image-slot>
        <div className="scrim"></div>
        <div className="photo-hint">Drag your own photo →</div>
        <div className="content">
          <div>
            <div className="label eyebrow">{d.greeting}</div>
            <div className="date">{d.now.dateLong} · {d.now.time}{d.now.ampm.toLowerCase()} · {d.now.weather} {d.now.temp}</div>
          </div>
          <div className="name">{d.user}.</div>
          <div className="intent">{d.intention}</div>
          {stats}
        </div>
      </div>
    );
  }

  return (
    <div className="card col2 acc-teal hero">
      <div>
        <div className="label eyebrow">{d.greeting}</div>
        <div className="date">{d.now.dateLong} · {d.now.time}{d.now.ampm.toLowerCase()} · {d.now.weather} {d.now.temp}</div>
      </div>
      <div className="num name acc-teal">{d.user}.</div>
      <div className="intent">{d.intention}</div>
      {stats}
    </div>
  );
}

/* ---------- Health rings ---------- */
function Rings({ d }) {
  const acc = { teal: "var(--teal)", orange: "var(--orange)", gold: "var(--gold)" };
  const radii = [72, 56, 40];
  const cx = 84, cy = 84;
  return (
    <div className="card acc-teal">
      <CardHead label="Health HQ" accent="teal" right={<div className="num" style={{ fontSize: 12, color: "var(--text-dim)" }}>SCORE</div>} />
      <div className="rings-wrap">
        <div style={{ position: "relative", width: 168, height: 168 }}>
          <svg className="ring-svg" viewBox="0 0 168 168">
            {d.rings.map((r, i) => {
              const R = radii[i], C = 2 * Math.PI * R;
              const col = acc[r.accent];
              return (
                <g key={i} transform={`rotate(-90 ${cx} ${cy})`}>
                  <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--track)" strokeWidth="9" />
                  <circle cx={cx} cy={cy} r={R} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - r.pct / 100)}
                    style={{ filter: "drop-shadow(0 0 calc(6px*var(--gm)) " + col + ")" }} />
                </g>
              );
            })}
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", flexDirection: "column" }}>
            <div style={{ textAlign: "center" }}>
              <div className="num ring-center acc-teal glow-text">{d.score}</div>
              <div className="ring-center-sub">Composite</div>
            </div>
          </div>
        </div>
        <div className="ring-legend">
          {d.rings.map((r, i) => (
            <div className={"row acc-" + r.accent} key={i}>
              <span className="led" />
              <span className="nm">{r.label}</span>
              <span className="num vl">{r.value}<span style={{ color: "var(--text-dim)" }}> / {r.target}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Wholesaling KPI ---------- */
function Wholesaling({ d }) {
  const pct = Math.round((d.mtd / d.goal) * 100);
  return (
    <div className="card acc-orange">
      <CardHead label="Wholesaling" accent="orange" right={<span className="trend acc-orange">▲ {d.trend}</span>} />
      <div className="num kpi-big acc-orange glow-text">{d.pipeline}</div>
      <div className="kpi-sub">Pipeline Potential</div>
      <div className="bar acc-orange"><span style={{ width: pct + "%" }} /></div>
      <div className="bar-meta"><span>MTD Revenue</span><span><b>${(d.mtd/1000).toFixed(1)}K</b> / ${(d.goal/1000)}K</span></div>
      <div className="stages">
        {d.stages.map((s, i) => (
          <div className={"stage-pill acc-" + s.accent} key={i}>
            <div className="num c" style={{ color: s.accent === "dim" ? "var(--text-mid)" : "var(--acc)" }}>{s.count}</div>
            <div className="n">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Coaching KPI ---------- */
function Coaching({ d }) {
  const pct = Math.round((d.published / d.goal) * 100);
  const max = Math.max(...d.byDay.map(x => x.v), 1);
  return (
    <div className="card acc-gold">
      <CardHead label="Coaching" accent="gold" right={<span className="trend acc-gold">▲ {d.trend} this wk</span>} />
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div className="num kpi-big acc-gold glow-text">{d.published}</div>
        <div style={{ color: "var(--text-dim)" }} className="num">/ {d.goal}</div>
      </div>
      <div className="kpi-sub">Content Published · MTD</div>
      <div className="bar acc-gold"><span style={{ width: pct + "%" }} /></div>
      <div className="bar-meta"><span>Monthly goal</span><span><b>{pct}%</b></span></div>
      <div className="minibars acc-gold">
        {d.byDay.map((b, i) => (
          <div className={"b" + (b.v === 0 ? " zero" : "")} key={i}>
            <i style={{ height: Math.max(6, (b.v / max) * 44) + "px" }} />
            <span>{b.d}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Habit tracker ---------- */
function Habits({ d }) {
  const [state, setState] = useState(() => Object.fromEntries(d.map(h => [h.id, h.done])));
  const toggle = (id) => setState(s => ({ ...s, [id]: !s[id] }));
  return (
    <div className="card col2 acc-teal">
      <CardHead label="Daily Practices" accent="teal" right={
        <span className="num" style={{ fontSize: 12, color: "var(--text-dim)" }}>
          {Object.values(state).filter(Boolean).length}/{d.length} DONE
        </span>} />
      <div className="habits">
        {d.map(h => {
          const done = state[h.id];
          const streak = h.streak + (done && !h.done ? 1 : (!done && h.done ? -1 : 0));
          return (
            <div className={"habit acc-" + h.accent + (done ? " done" : "")} key={h.id} onClick={() => toggle(h.id)}>
              <div className="check">{ICON.check()}</div>
              <div style={{ minWidth: 0 }}>
                <div className="nm">{h.name}</div>
                <div className="nt">{h.note}</div>
              </div>
              <div className="streak">
                <div className="num s">{streak}</div>
                <div className="sl">day streak</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Task list ---------- */
function TaskList({ label, accent, items }) {
  const [done, setDone] = useState(() => Object.fromEntries(items.map(t => [t.id, t.done])));
  const toggle = (id) => setDone(s => ({ ...s, [id]: !s[id] }));
  const open = items.filter(t => !done[t.id]).length;
  return (
    <div className={"card acc-" + accent}>
      <CardHead label={label} accent={accent} right={<span className="num" style={{ fontSize: 12, color: "var(--text-dim)" }}>{open} OPEN</span>} />
      <div className="tasks">
        {items.map(t => (
          <div className={"task" + (done[t.id] ? " done" : "")} key={t.id} onClick={() => toggle(t.id)}>
            <div className="box">{ICON.check({ width: 12, height: 12 })}</div>
            <span className={"pri pri-" + t.pri} />
            <span className="tt">{t.title}</span>
            <span className="due">{t.due}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Real estate ---------- */
function RealEstate({ d }) {
  const acc = { Active: "teal", Pending: "gold", Lead: "dim" };
  return (
    <div className="card col2 acc-teal">
      <CardHead label="Contract for Deed" accent="teal" right={<span className="num" style={{ fontSize: 12, color: "var(--text-dim)" }}>{d.length} PROPERTIES</span>} />
      <div>
        {d.map((r, i) => (
          <div className={"re-row acc-" + acc[r.status]} key={i}>
            <div className="re-ico">{ICON.home()}</div>
            <div className="re-main">
              <div className="a">{r.addr}</div>
              <div className="b">{r.buyer} · {r.due}</div>
            </div>
            <span className={"status-tag acc-" + acc[r.status]}>{r.status}</span>
            <div className="re-amt"><div className="num m">{r.amount}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Weekly calendar ---------- */
function WeekStrip({ d }) {
  return (
    <div className="card col4 acc-teal">
      <CardHead label="This Week" accent="teal" />
      <div className="week">
        {d.map((day, i) => (
          <div className={"day" + (day.today ? " today" : "")} key={i}>
            <div className="dl">{day.day}</div>
            <div className="num dn">{day.date}</div>
            {day.events.map((e, j) => (
              <div className="ev" key={j}><b>{e.t}</b>{e.label}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Important dates ---------- */
function ImportantDates({ d }) {
  return (
    <div className="card acc-gold">
      <CardHead label="On the Horizon" accent="gold" />
      <div className="dates">
        {d.map((it, i) => (
          <div className={"drow acc-" + it.accent} key={i}>
            <div className="dcount"><div className="num n">{it.days}</div><div className="u">days</div></div>
            <div className="dmain">
              <div className="l">{it.label} <span className="dt">· {it.date}</span></div>
              <div className="p">{it.plan}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Intention banner ---------- */
function Banner({ quote, goals }) {
  return (
    <div className="card col4 acc-teal banner">
      <div className="quote-side">
        <div className="qmark">// Daily Intention</div>
        <div className="quote">{quote}</div>
      </div>
      <div>
        <div className="label" style={{ marginBottom: 12 }}>This Week's Commitments</div>
        <div className="goals">
          {goals.map((g, i) => (
            <div className={"goal acc-" + g.accent + (g.done ? "" : " todo")} key={i}>
              <span className="gdot" />
              <span className="gl">{g.label}</span>
              <span className="gck">{g.done ? "✓" : ""}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Hero, Rings, Wholesaling, Coaching, Habits, TaskList, RealEstate, WeekStrip, ImportantDates, Banner, ICON });
