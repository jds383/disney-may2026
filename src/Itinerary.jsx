import { useState, useEffect, useRef } from "react";
import { ParkRides, Summary, RIDES, saveMetaToNotion, isClosed } from "./LLPlanner";


const STATUS_COLORS = {
  "Scheduled": "#2C5F8A", "On Time": "#1A6B4A", "Delayed": "#C8832A",
  "Cancelled": "#CC4444", "Landed": "#4A2C6B", "En Route": "#1A6B4A",
};

const fmt = (iso) => {
  try { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
  catch (_) { return "—"; }
};

const parseFlight = (data) => {
  try {
    const f = data?.data?.[0];
    if (!f) return null;
    return {
      status: f.flight_status ? f.flight_status.charAt(0).toUpperCase() + f.flight_status.slice(1) : "Unknown",
      gate_dep: f.departure?.gate || "—",
      gate_arr: f.arrival?.gate || "—",
      terminal_dep: f.departure?.terminal || "—",
      terminal_arr: f.arrival?.terminal || "—",
      actual_dep: fmt(f.departure?.actual || f.departure?.estimated),
      actual_arr: fmt(f.arrival?.actual || f.arrival?.estimated),
      live: true,
    };
  } catch (_) { return null; }
};

function FlightStatus({ flightNumber, flightDate, schedDep, schedArr, color }) {
  const [live, setLive] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    if (!flightNumber || !flightDate) return;
    setSpinning(true);
    const today = new Date().toISOString().split("T")[0];
    if (today !== flightDate) {
      await new Promise(r => setTimeout(r, 600));
      setLastUpdated(`as of: ${new Date().toLocaleDateString("en-US", { month: "numeric", day: "2-digit" })} ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · no live data yet`);
      setSpinning(false);
      return;
    }
    try {
      const res = await fetch(`https://api.aviationstack.com/v1/flights?access_key=67e59f674eef0dc0ceefbdbd984e9f19&flight_iata=${flightNumber}&flight_date=${flightDate}`);
      const data = await res.json();
      const parsed = parseFlight(data);
      if (parsed) setLive(parsed);
      setLastUpdated(`as of: ${new Date().toLocaleDateString("en-US", { month: "numeric", day: "2-digit" })} ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`);
    } catch (_) { setLastUpdated("check failed"); }
    setSpinning(false);
  };

  useEffect(() => { fetchData(); }, [flightNumber, flightDate]);

  const d = live || { status: "Scheduled", gate_dep: "—", gate_arr: "—", terminal_dep: "—", terminal_arr: "—", actual_dep: schedDep || "—", actual_arr: schedArr || "—", live: false };
  const statusColor = STATUS_COLORS[d.status] || "#888";
  const isLive = d.live;

  return (
    <div style={{ margin: "0", borderTop: "1px solid rgba(0,0,0,0.06)", background: "#FAFAF8" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 22px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#888" }}>{flightNumber}</span>
          <span style={{ fontSize: 10, background: statusColor + "22", color: statusColor, border: `1px solid ${statusColor}44`, borderRadius: 20, padding: "1px 8px", fontFamily: "'DM Sans', sans-serif" }}>{d.status}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: isLive ? "#27AE60" : "#CCC", boxShadow: isLive ? "0 0 4px #27AE60" : "none" }} />
          <span style={{ fontSize: 9, color: "#AAA", fontFamily: "'DM Sans', sans-serif" }}>
            {lastUpdated || `as of: ${new Date().toLocaleDateString("en-US", { month: "numeric", day: "2-digit" })} ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · no live data yet`}
          </span>
          <button onClick={e => { e.stopPropagation(); fetchData(); }} style={{ fontSize: 13, background: "none", border: "none", cursor: "pointer", color: "#BBB", padding: "0 2px", lineHeight: 1, display: "inline-flex", alignItems: "center", transform: spinning ? "rotate(180deg)" : "none", transition: "transform 0.4s ease" }}>↻</button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "0 22px 12px", gap: "4px 0" }}>
        {[
          { label: "Sched Dep", val: schedDep || "—" }, { label: "Sched Arr", val: schedArr || "—" },
          { label: "Actual Dep", val: d.actual_dep },  { label: "Actual Arr", val: d.actual_arr },
          { label: "Terminal (Dep)", val: d.terminal_dep }, { label: "Terminal (Arr)", val: d.terminal_arr },
          { label: "Gate (Dep)", val: d.gate_dep },    { label: "Gate (Arr)", val: d.gate_arr },
        ].map(({ label, val }) => (
          <div key={label} style={{ padding: "4px 0" }}>
            <div style={{ fontSize: 9, color: "#AAA", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
            <div style={{ fontSize: 14, color: val === "—" ? "#DDD" : "#1A1A1A" }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const BASE = "https://disneyworld.disney.go.com/dining";
const quickServiceData = {
  breakfast: [
    { name: "Friar's Nook", where: "Magic Kingdom · Fantasyland", url: `${BASE}/magic-kingdom/friars-nook/menus/lunch-and-dinner/` },
    { name: "Lunching Pad", where: "Magic Kingdom · Tomorrowland", url: `${BASE}/magic-kingdom/lunching-pad/menus/breakfast/` },
    { name: "Main Street Bakery", where: "Magic Kingdom · Main Street", url: `${BASE}/magic-kingdom/main-street-bakery/menus/` },
    { name: "Sleepy Hollow", where: "Magic Kingdom · Liberty Square", url: `${BASE}/magic-kingdom/sleepy-hollow/menus/` },
    { name: "Capt. Cook's", where: "Polynesian Resort", url: `${BASE}/polynesian-resort/capt-cooks/menus/` },
    { name: "Kona Island", where: "Polynesian Resort", url: `${BASE}/polynesian-resort/kona-island/menus/` },
  ],
  lunch: [
    { name: "Casey's Corner", where: "Magic Kingdom · Main Street", url: `${BASE}/magic-kingdom/caseys-corner/menus/lunch-and-dinner/` },
    { name: "Columbia Harbour House", where: "Magic Kingdom · Liberty Square", url: `${BASE}/magic-kingdom/columbia-harbour-house/menus/` },
    { name: "Cosmic Ray's Starlight Café", where: "Magic Kingdom · Tomorrowland", url: `${BASE}/magic-kingdom/cosmic-ray-starlight-cafe/menus/` },
    { name: "Friar's Nook", where: "Magic Kingdom · Fantasyland", url: `${BASE}/magic-kingdom/friars-nook/menus/lunch-and-dinner/` },
    { name: "Lunching Pad", where: "Magic Kingdom · Tomorrowland", url: `${BASE}/magic-kingdom/lunching-pad/menus/lunch%20and%20dinner/` },
    { name: "Pecos Bill Tall Tale Inn & Café", where: "Magic Kingdom · Frontierland", url: `${BASE}/magic-kingdom/pecos-bill-tall-tale-inn-and-cafe/menus/` },
    { name: "Pinocchio Village Haus", where: "Magic Kingdom · Fantasyland", url: `${BASE}/magic-kingdom/pinocchio-village-haus/menus/` },
    { name: "Sleepy Hollow", where: "Magic Kingdom · Liberty Square", url: `${BASE}/magic-kingdom/sleepy-hollow/menus/` },
    { name: "Capt. Cook's", where: "Polynesian Resort", url: `${BASE}/polynesian-resort/capt-cooks/menus/lunch%20and%20dinner/` },
    { name: "Kona Island", where: "Polynesian Resort", url: `${BASE}/polynesian-resort/kona-island/menus/lunch/` },
    { name: "Oasis Bar & Grill", where: "Polynesian Resort (resort guests)", url: `${BASE}/polynesian-resort/oasis-bar-and-grill/menus/` },
  ],
  dinner: [
    { name: "Casey's Corner", where: "Magic Kingdom · Main Street", url: `${BASE}/magic-kingdom/caseys-corner/menus/lunch-and-dinner/` },
    { name: "Columbia Harbour House", where: "Magic Kingdom · Liberty Square", url: `${BASE}/magic-kingdom/columbia-harbour-house/menus/` },
    { name: "Cosmic Ray's Starlight Café", where: "Magic Kingdom · Tomorrowland", url: `${BASE}/magic-kingdom/cosmic-ray-starlight-cafe/menus/` },
    { name: "Friar's Nook", where: "Magic Kingdom · Fantasyland", url: `${BASE}/magic-kingdom/friars-nook/menus/lunch-and-dinner/` },
    { name: "Lunching Pad", where: "Magic Kingdom · Tomorrowland", url: `${BASE}/magic-kingdom/lunching-pad/menus/lunch%20and%20dinner/` },
    { name: "Pecos Bill Tall Tale Inn & Café", where: "Magic Kingdom · Frontierland", url: `${BASE}/magic-kingdom/pecos-bill-tall-tale-inn-and-cafe/menus/` },
    { name: "Pinocchio Village Haus", where: "Magic Kingdom · Fantasyland", url: `${BASE}/magic-kingdom/pinocchio-village-haus/menus/` },
    { name: "Sleepy Hollow", where: "Magic Kingdom · Liberty Square", url: `${BASE}/magic-kingdom/sleepy-hollow/menus/` },
    { name: "Capt. Cook's", where: "Polynesian Resort", url: `${BASE}/polynesian-resort/capt-cooks/menus/lunch%20and%20dinner/` },
    { name: "Kona Island", where: "Polynesian Resort", url: `${BASE}/polynesian-resort/kona-island/menus/lunch/` },
    { name: "Oasis Bar & Grill", where: "Polynesian Resort (resort guests)", url: `${BASE}/polynesian-resort/oasis-bar-and-grill/menus/` },
  ],
};

function QuickServiceDining({ color }) {
  const [open, setOpen] = useState(null);
  const meals = [
    { key: "breakfast", label: "📖 Breakfast" },
    { key: "lunch", label: "📖 Lunch" },
    { key: "dinner", label: "📖 Dinner" },
  ];
  return (
    <div style={{ borderTop: "1px solid #F5F0EA", background: "#FAFAF8" }}>
      {meals.map(({ key, label }) => (
        <div key={key}>
          <div onClick={() => setOpen(open === key ? null : key)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 22px", cursor: "pointer", borderTop: "1px solid #F5F0EA", background: open === key ? color + "11" : "transparent" }}>
            <span style={{ fontSize: 14, color: "#1A1A1A", fontWeight: open === key ? "bold" : "normal" }}>{label}</span>
            <span style={{ fontSize: 12, color: "#AAA", transition: "transform 0.2s", display: "inline-block", transform: open === key ? "rotate(180deg)" : "none" }}>▾</span>
          </div>
          {open === key && (
            <div style={{ background: "#FFF", borderTop: "1px solid #F0EBE3" }}>
              {quickServiceData[key].map((r, i) => (
                <div key={i} style={{ padding: "9px 22px", borderBottom: i < quickServiceData[key].length - 1 ? "1px solid #F5F0EA" : "none" }}>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: color, fontWeight: 400, textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3, display: "block", textAlign: "left" }}>{r.name} ↗</a>
                  <div style={{ fontSize: 11, color: "#AAA", marginTop: 2, textAlign: "left" }}>{r.where}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ReservationBadges({ reservations, color, icon, text, url }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 22px", cursor: "pointer" }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
        <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          {url ? (
            <a href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 13, color, lineHeight: 1.5, textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>
              {text} ↗
            </a>
          ) : (
            <span style={{ fontSize: 13, color: "#2A2A2A", lineHeight: 1.5 }}>{text}</span>
          )}
          <span style={{ fontSize: 11, color: "#CCC", flexShrink: 0, transition: "transform 0.2s", display: "inline-block", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
        </div>
      </div>
      {open && (
        <div style={{ display: "flex", gap: 8, padding: "0 22px 10px" }}>
          {reservations.map((r, i) => (
            <div key={i} style={{ flex: 1, background: "#FAFAF8", border: "1px solid #EDE8E1", borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 11, fontWeight: "bold", color, marginBottom: 3 }}>{r.party}</div>
              <div style={{ fontSize: 10, color: "#AAA", fontFamily: "'DM Sans', sans-serif", letterSpacing: "0.04em", marginBottom: 2 }}>#{r.conf}</div>
              <div style={{ fontSize: 10, color: "#888" }}>{r.size} @ {r.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const days = [
  {
    date: "Thu May 21", label: "Arrival Day", hotel: "Home → Villas at Grand Floridian",
    weatherDate: "2026-05-21", weatherLat: 28.4104, weatherLon: -81.5868, isoDate: "2026-05-21",
    rooms: [{ label: "S FAMILY" }, { label: "M FAMILY" }], color: "#2C5F8A", emoji: "✈️",
    parkId: null,
    highlights: []
  },
  {
    date: "Fri May 22", label: "Amenities Day", hotel: "Villas at Grand Floridian → Polynesian Villas & Bungalows",
    weatherDate: "2026-05-22", weatherLat: 28.4094, weatherLon: -81.5840, isoDate: "2026-05-22",
    rooms: [{ label: "S FAMILY" }, { label: "M FAMILY" }], color: "#7B4F2E", emoji: "🌴",
    parkId: null,
    highlights: []
  },
  {
    date: "Sat May 23", label: "Magic Kingdom", hotel: "Polynesian Villas & Bungalows",
    weatherDate: "2026-05-23", weatherLat: 28.4177, weatherLon: -81.5812, isoDate: "2026-05-23",
    rooms: [{ label: "S FAMILY" }, { label: "M FAMILY" }], color: "#1A6B4A", emoji: "🏰",
    parkId: "mk",
    highlights: []
  },
  {
    date: "Sun May 24", label: "Amenities Day", hotel: "Polynesian Villas & Bungalows → Riviera Resort",
    weatherDate: "2026-05-24", weatherLat: 28.3613, weatherLon: -81.5588, isoDate: "2026-05-24",
    rooms: [{ label: "S FAMILY" }, { label: "M FAMILY" }], color: "#7B4F2E", emoji: "🌴",
    parkId: null,
    highlights: []
  },
  {
    date: "Mon May 25", label: "EPCOT", hotel: "Riviera Resort",
    weatherDate: "2026-05-25", weatherLat: 28.3747, weatherLon: -81.5494, isoDate: "2026-05-25",
    rooms: [{ label: "S FAMILY" }, { label: "M FAMILY" }], color: "#4A2C6B", emoji: "🌐",
    parkId: "ep",
    highlights: []
  },
  {
    date: "Tue May 26", label: "Hollywood Studios", hotel: "Riviera Resort",
    weatherDate: "2026-05-26", weatherLat: 28.3575, weatherLon: -81.5583, isoDate: "2026-05-26",
    rooms: [{ label: "S FAMILY" }, { label: "M FAMILY" }], color: "#8A3A2C", emoji: "🎬",
    parkId: "hs",
    highlights: []
  },
  {
    date: "Wed May 27", label: "Departure Day", hotel: "Riviera Resort → Home",
    weatherDate: "2026-05-27", weatherLat: 28.3613, weatherLon: -81.5588, isoDate: "2026-05-27",
    rooms: [{ label: "S FAMILY" }, { label: "M FAMILY" }], color: "#2C5F8A", emoji: "🏠",
    parkId: null,
    highlights: []
  }
];


const WORKER_URL = "https://disney-ll-proxy.45-reactor-puritan.workers.dev";

// Parse "9:15 AM" → sortable integer 915, "10:30 PM" → 2230
function parseTimeToInt(str) {
  if (!str) return 9999;
  const m = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 9999;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const ampm = m[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 100 + min;
}

// Returns true if the LL window closed more than 60 mins ago
function isLLExpired(endTime, isoDate) {
  if (!endTime || !isoDate) return false;
  const today = new Date().toISOString().split("T")[0];
  if (isoDate !== today) return false; // only expire on the actual day
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const t = parseTimeToInt(endTime);
  const endH = Math.floor(t / 100);
  const endM = t % 100;
  const endMins = endH * 60 + endM;
  return nowMins > endMins + 60;
}

async function fetchBookedLLs() {
  try {
    const res = await fetch(`${WORKER_URL}/activities`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results) return [];
    return data.results
      .filter(page => (page.properties["Visibility"]?.select?.name ?? "Show") !== "Delete")
      .map((page) => {
        const props = page.properties;
        return {
          rideName:   props["Name"]?.title?.[0]?.text?.content ?? "",
          rideId:     props["Ride ID"]?.rich_text?.[0]?.text?.content ?? "",
          park:       props["Park"]?.select?.name ?? "",
          date:       props["Date"]?.date?.start ?? "",
          startTime:  props["Start Time"]?.rich_text?.[0]?.text?.content ?? "",
          endTime:    props["End Time"]?.rich_text?.[0]?.text?.content ?? "",
          party:      props["Party"]?.rich_text?.[0]?.text?.content ?? "All",
          type:       props["Type"]?.select?.name ?? "LL",
          location:   props["Location"]?.rich_text?.[0]?.text?.content ?? "",
          resort:     props["Resort"]?.select?.name ?? "",
          optional:   props["Optional"]?.checkbox ?? false,
          visibility: props["Visibility"]?.select?.name ?? "Show",
          pageId:     page.id,
          icon:       props["Icon"]?.rich_text?.[0]?.text?.content ?? "",
          url:        props["userDefined:URL"]?.url ?? props["URL"]?.url ?? props["userDefined:URL"]?.rich_text?.[0]?.text?.content ?? "",
          subtext:    props["Subtext"]?.rich_text?.[0]?.text?.content ?? "",
          sortTime:   props["Sort Time"]?.number ?? 9999,
        };
      });
  } catch (_) { return []; }
}

async function fetchCalendar() {
  try {
    const res = await fetch(`${WORKER_URL}/calendar`);
    if (!res.ok) return {};
    const data = await res.json();
    if (!data.results) return {};
    const map = {};
    data.results.forEach(page => {
      const props = page.properties;
      const date = props["Date"]?.date?.start;
      if (!date) return;
      map[date] = {
        latStart: props["Lat Start"]?.number ?? null,
        lonStart: props["Lon Start"]?.number ?? null,
        latEnd:   props["Lat End"]?.number ?? null,
        lonEnd:   props["Lon End"]?.number ?? null,
        locationStart: props["Location Start"]?.rich_text?.[0]?.text?.content ?? null,
        locationEnd:   props["Location End"]?.rich_text?.[0]?.text?.content ?? null,
      };
    });
    return map;
  } catch (_) { return {}; }
}

function Countdown() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dep = new Date(2026, 4, 21);
  const ret = new Date(2026, 4, 27);
  let mode, value, sublabel;
  if (today < dep) { mode = "pre"; value = Math.round((dep - today) / 86400000); sublabel = value === 1 ? "DAY TO GO" : "DAYS TO GO"; }
  else if (today <= ret) { mode = "trip"; value = Math.round((today - dep) / 86400000) + 1; sublabel = "OF 7"; }
  else { mode = "done"; }
  if (mode === "done") return <div style={{ textAlign: "center", padding: "12px 0 20px" }}><div style={{ fontSize: 20, color: "#C8A96E", fontFamily: "'DM Sans', sans-serif", fontStyle: "italic" }}>See ya real soon! 👋🏰</div></div>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 0 20px" }}>
      <div style={{ position: "relative", width: 82, height: 88, flexShrink: 0, background: "#F0EDE8", borderRadius: 10, boxShadow: "0 6px 18px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.9)", border: "1px solid #D5CFC7", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: -5, transform: "translateY(-50%)", width: 10, height: 10, borderRadius: "50%", background: "#C0BAB2", zIndex: 3 }} />
        <div style={{ position: "absolute", top: "50%", right: -5, transform: "translateY(-50%)", width: 10, height: 10, borderRadius: "50%", background: "#C0BAB2", zIndex: 3 }} />
        <span style={{ fontSize: 72, fontWeight: "bold", color: "#1C2B4A", fontFamily: "'DM Sans', sans-serif", lineHeight: 1, userSelect: "none", letterSpacing: "-2px" }}>{String(value).padStart(2, "0")}</span>
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 3, background: "#C0BAB2", transform: "translateY(-50%)", zIndex: 2 }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "rgba(255,255,255,0.12)", borderRadius: "10px 10px 0 0", zIndex: 1, pointerEvents: "none" }} />
      </div>
      <div>
        <div style={{ fontSize: 16, letterSpacing: "0.12em", color: "#1C2B4A", fontFamily: "'DM Sans', sans-serif", fontWeight: "bold" }}>{sublabel}</div>
        {mode === "trip" && <div style={{ fontSize: 11, color: "#C8A96E", fontFamily: "'DM Sans', sans-serif", fontStyle: "italic", marginTop: 4 }}>See ya real soon! 🎉</div>}
      </div>
    </div>
  );
}

function isToday(dateStr) {
  const now = new Date();
  const [y, m, d] = dateStr.split("-").map(Number);
  return now.getFullYear() === y && now.getMonth() + 1 === m && now.getDate() === d;
}

function Fireworks() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    const particles = [];
    const colors = ["#FFD700","#FF6B6B","#4ECDC4","#45B7D1","#FFA07A","#98D8C8","#C8A96E","#FFB347"];
    function burst(x, y) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 60; i++) { const angle = (Math.PI * 2 / 60) * i; const speed = 1.5 + Math.random() * 3; particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, alpha: 1, color, size: 1.5 + Math.random() * 2 }); }
    }
    let frame = 0;
    const launches = [{ t:10,x:0.2 },{ t:35,x:0.75 },{ t:60,x:0.45 },{ t:85,x:0.15 },{ t:100,x:0.85 },{ t:120,x:0.5 },{ t:145,x:0.3 },{ t:165,x:0.65 },{ t:185,x:0.4 }];
    function animate() {
      ctx.fillStyle = "rgba(251,247,242,0.25)"; ctx.fillRect(0,0,canvas.width,canvas.height);
      launches.forEach(l => { if (frame===l.t) burst(canvas.width*l.x, canvas.height*(0.2+Math.random()*0.4)); });
      for (let i = particles.length-1; i>=0; i--) { const p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.05; p.alpha-=0.014; if(p.alpha<=0){particles.splice(i,1);continue;} ctx.globalAlpha=p.alpha; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); }
      ctx.globalAlpha=1; frame++;
      if (frame < 220) requestAnimationFrame(animate); else ctx.clearRect(0,0,canvas.width,canvas.height);
    }
    animate();
  }, []);
  return <canvas ref={canvasRef} style={{ position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:999 }} />;
}

const WMO_ICON = { 0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",51:"🌦️",53:"🌦️",55:"🌧️",61:"🌧️",63:"🌧️",65:"🌧️",80:"🌦️",81:"🌧️",82:"🌧️",95:"⛈️",96:"⛈️",99:"⛈️" };
const WMO_LABEL = { 0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Foggy",48:"Foggy",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",80:"Rain showers",81:"Rain showers",82:"Heavy showers",95:"Thunderstorms",96:"Thunderstorms",99:"Thunderstorms" };
const fmtHour = (t) => { try { return new Date(t).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}); } catch(_){return "";} };
const WEATHER_CACHE_KEY = "dw2026-weather-cache";
const getCachedWeather = (dk) => { try { const raw=localStorage.getItem(WEATHER_CACHE_KEY); if(!raw)return null; const cache=JSON.parse(raw); const entry=cache[dk]; if(!entry)return null; const dateOnly=dk.split('|')[0]; const ttl=(dateOnly===new Date().toISOString().split("T")[0]||dateOnly===new Date(Date.now()+86400000).toISOString().split("T")[0])?3600000:86400000; if(Date.now()-entry.fetchedAt<ttl)return entry.weather; return null; } catch(_){return null;} };
const setCachedWeather = (dk,w) => { try { let cache={}; try{const raw=localStorage.getItem(WEATHER_CACHE_KEY);if(raw)cache=JSON.parse(raw);}catch(_){} cache[dk]={weather:w,fetchedAt:Date.now()}; localStorage.setItem(WEATHER_CACHE_KEY,JSON.stringify(cache)); } catch(_){} };

function useWeather(date, lat, lon) {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const cacheKey = `${date}|${lat}|${lon}`;
  useEffect(() => {
    if (!date||!lat||!lon) return;
    setWeather(null);
    setError(null);
    (async () => {
      const cached = getCachedWeather(cacheKey);
      if (cached) { setWeather(cached); return; }
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode,precipitation_probability&temperature_unit=fahrenheit&timezone=America%2FNew_York&start_date=${date}&end_date=${date}`;
        const res = await fetch(url); const data = await res.json();
        const hours = data.hourly; const temps=hours.temperature_2m; const codes=hours.weathercode; const precip=hours.precipitation_probability;
        const highIdx=temps.indexOf(Math.max(...temps)); const lowIdx=temps.indexOf(Math.min(...temps));
        let stormWindow=null;
        const stormHours=hours.time.map((t,i)=>({t,code:codes[i],prob:precip[i]})).filter(h=>h.code>=95&&h.prob>=50);
        if(stormHours.length>0){const start=fmtHour(stormHours[0].t);const end=fmtHour(stormHours[stormHours.length-1].t);const maxProb=Math.max(...stormHours.map(h=>h.prob));stormWindow={start,end,prob:maxProb,label:"Storm possible"};}
        const dayCodes=codes.slice(9,18);
        const dominantCode=dayCodes.sort((a,b)=>dayCodes.filter(v=>v===b).length-dayCodes.filter(v=>v===a).length)[0];
        const w={high:Math.round(Math.max(...temps)),low:Math.round(Math.min(...temps)),highTime:fmtHour(hours.time[highIdx]),lowTime:fmtHour(hours.time[lowIdx]),icon:WMO_ICON[dominantCode]||"🌡️",label:WMO_LABEL[dominantCode]||"Unknown",stormWindow};
        setCachedWeather(cacheKey,w); setWeather(w);
      } catch(e){setError("failed");}
    })();
  }, [cacheKey]);
  return { weather, error };
}

function WeatherStack({ weather, error }) {
  if (error==="not yet available") return <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>no data</div></div>;
  if (error) return <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:18,lineHeight:1,marginBottom:4}}>⚠️</div><div style={{fontSize:9,color:"rgba(255,255,255,0.5)",fontFamily:"'DM Sans',sans-serif",maxWidth:100,wordBreak:"break-all"}}>{error}</div></div>;
  if (!weather) return <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:16,lineHeight:1,marginBottom:4}}>🌡️</div><div style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>fetching...</div></div>;
  return (
    <div style={{textAlign:"right",flexShrink:0}}>
      <div style={{fontSize:24,lineHeight:1,marginBottom:4}}>{weather.stormWindow?"⛈️":weather.icon}</div>
      <div style={{fontSize:11,color:"rgba(255,255,255,0.9)",fontFamily:"'DM Sans',sans-serif",lineHeight:1.5,whiteSpace:"nowrap"}}><span style={{color:"#FFF",fontWeight:"bold"}}>{weather.high}°</span><span style={{color:"rgba(255,255,255,0.5)",fontSize:9}}> ↑{weather.highTime}</span></div>
      <div style={{fontSize:11,color:"rgba(255,255,255,0.9)",fontFamily:"'DM Sans',sans-serif",lineHeight:1.5,whiteSpace:"nowrap"}}><span style={{color:"rgba(255,255,255,0.75)"}}>{weather.low}°</span><span style={{color:"rgba(255,255,255,0.5)",fontSize:9}}> ↓{weather.lowTime}</span></div>
    </div>
  );
}

function WeatherAlert({ weather }) {
  if (!weather?.stormWindow) return null;
  const { start, end, prob, label } = weather.stormWindow;
  return (
    <div style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 22px",background:"rgba(0,0,0,0.08)",borderBottom:"1px solid rgba(0,0,0,0.06)",fontSize:11,color:"rgba(255,255,255,0.9)",fontFamily:"'DM Sans',sans-serif" }}>
      <span>⛈️</span><span>{label} {start}–{end} · {prob}% chance</span>
    </div>
  );
}

// ── LLRow ─────────────────────────────────────────────────────────────────────
const ACTIVITY_STYLES = {
  "LL":             { bg: "transparent", badge: "⚡ LL",     badgeBg: "#D1FAE5", badgeColor: "#065F46", badgeBorder: "#6EE7B7" },
  "Character Meet": { bg: "transparent", badge: "🧸 Meet",   badgeBg: "#EDE9FE", badgeColor: "#4C1D95", badgeBorder: "#C4B5FD" },
  "Resort Activity":{ bg: "transparent", badge: "🏨 Resort", badgeBg: "#DBEAFE", badgeColor: "#1E40AF", badgeBorder: "#93C5FD" },
};
function LLRow({ h, color, borderBottom, onSkip }) {
  const [open, setOpen] = useState(false);
  const isMeet = h.type === "Character Meet";
  const isResort = h.type === "Resort Activity";
  const style = ACTIVITY_STYLES[h.type] || ACTIVITY_STYLES["LL"];
  const MEET_URLS = {
    "Meet Stitch (D. Visa)":            "https://disneyrewards.com/parks-and-vacations/walt-disney-world-perks/#stitchcharacterexperience",
    "Star Wars Photo (D. Visa)":        "https://disneyrewards.com/parks-and-vacations/walt-disney-world-perks/#starwarscharacterexperience",
    "Mystery Character Meet (D. Visa)": "https://disneyrewards.com/parks-and-vacations/walt-disney-world-perks/#characterexperience",
  };
  const rideUrl = h.url || (isMeet
    ? MEET_URLS[h.rideName] ?? RIDES.find(r => r.name === h.rideName)?.url ?? null
    : isResort ? null
    : RIDES.find(r => r.id === h.rideId)?.url);
  // subtext from Notion is collapsible; location/resort shown inline
  const collapsibleText = h.subtext || null;
  const locationStr = !h.subtext && (h.resort
    ? (h.location ? `${h.resort} · ${h.location}` : h.resort)
    : (h.location || null));
  const timeStr = (h.startTime && h.startTime !== "TBD") ? h.startTime + (h.endTime ? ` – ${h.endTime}` : "") : "";
  const partyStr = h.party && h.party !== "All" ? ` · ${h.party}` : "";
  const nameStr = h.rideName;
  const isFlight = h.type === "Flight";
  const fullText = isFlight
    ? [h.startTime, nameStr, h.endTime].filter(Boolean).join(" · ") + (rideUrl ? " ↗" : "")
    : [timeStr, nameStr + partyStr].filter(Boolean).join(" · ") + (rideUrl ? " ↗" : "");
  return (
    <div style={{ borderBottom, background: style.bg }}>
      <div
        onClick={() => !isFlight && collapsibleText && setOpen(o => !o)}
        style={{ display:"flex", alignItems:"center", gap:8, padding:`6px 22px 6px ${h.optional ? "34px" : "22px"}`, cursor: (!isFlight && collapsibleText) ? "pointer" : "default" }}
      >
        <span style={{ fontSize:14, flexShrink:0 }}>{h.icon}</span>
        <div style={{ flex:1 }}>
          {rideUrl
            ? <a href={rideUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize:13, color, fontWeight:400, fontFamily:"'DM Sans',sans-serif", textDecoration:"underline", textDecorationStyle:"dotted", textUnderlineOffset:3, display:"block", textAlign:"left" }}>{fullText}</a>
            : <span style={{ fontSize:13, color:"#1A1A1A", fontWeight:400, fontFamily:"'DM Sans',sans-serif", display:"block", textAlign:"left" }}>{fullText}</span>
          }
          {locationStr && (
            <span style={{ fontSize:11, color:"#888", fontFamily:"'DM Sans',sans-serif", display:"block", marginTop:1, textAlign:"left" }}>{locationStr}</span>
          )}
        </div>
        {h.optional && onSkip && (
          <button onClick={e => { e.stopPropagation(); onSkip(h.pageId); }} style={{ fontSize:10, color:"#AAA", background:"none", border:"1px solid #EDE8E1", borderRadius:12, padding:"2px 8px", cursor:"pointer", flexShrink:0, fontFamily:"'DM Sans',sans-serif" }}>Skip</button>
        )}
        {!isFlight && collapsibleText && (
          <span style={{ fontSize:11, color:"#CCC", flexShrink:0, transition:"transform 0.2s", display:"inline-block", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
        )}
      </div>
      {isFlight && (
        <FlightStatus
          flightNumber={h.location}
          flightDate={h.date}
          schedDep={h.startTime}
          schedArr={h.endTime}
          color={color}
        />
      )}
      {!isFlight && open && collapsibleText && (
        <div style={{ padding:`0 22px 8px ${h.optional ? "56px" : "44px"}`, fontSize:11, color:"#888", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5 }}>
          {collapsibleText}
        </div>
      )}
    </div>
  );
}

function ArchivedSection({ archivedLLs, onRestore }) {
  const [open, setOpen] = useState(false);
  if (!archivedLLs || archivedLLs.length === 0) return null;
  return (
    <div style={{ borderTop:"1px solid #EDE8E1" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 22px", cursor:"pointer", background:"#FAFAF8" }}>
        <span style={{ fontSize:12, color:"#AAA", fontFamily:"'DM Sans',sans-serif" }}>Past & Declined ({archivedLLs.length})</span>
        <span style={{ fontSize:10, color:"#CCC", transform:open?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▾</span>
      </div>
      {open && (
        <div style={{ padding:"4px 0 8px" }}>
          {archivedLLs.map((ll, i) => {
            const timeStr = ll.startTime + (ll.endTime ? ` – ${ll.endTime}` : "");
            const locationStr = ll.resort ? (ll.location ? `${ll.resort} · ${ll.location}` : ll.resort) : ll.location;
            return (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 22px", borderBottom:i<archivedLLs.length-1?"1px solid #F5F0EA":"none", opacity:0.5 }}>
                <span style={{ fontSize:13 }}>{ll.type === "Character Meet" ? "🧸" : ll.type === "Resort Activity" ? "🏨" : "⚡"}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, color:"#555", fontFamily:"'DM Sans',sans-serif" }}>{timeStr} · {ll.rideName}</div>
                  {locationStr && <div style={{ fontSize:10, color:"#AAA", fontFamily:"'DM Sans',sans-serif" }}>{locationStr}</div>}
                </div>
                <button onClick={() => onRestore(ll.pageId)} style={{ fontSize:10, color:"#4A7C59", background:"none", border:"1px solid #B7DFC8", borderRadius:12, padding:"2px 8px", cursor:"pointer", flexShrink:0, fontFamily:"'DM Sans',sans-serif" }}>Restore</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── DiningCredits ─────────────────────────────────────────────────────────────
async function fetchDiningCredits() {
  try {
    const res = await fetch(`${WORKER_URL}/credits`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results) return [];
    return data.results.map(page => {
      const props = page.properties;
      return {
        pageId:     page.id,
        person:     props["Person"]?.rich_text?.[0]?.text?.content ?? "",
        family:     props["Family"]?.select?.name ?? "",
        resort:     props["Resort"]?.select?.name ?? "",
        creditType: props["Credit Type"]?.select?.name ?? "",
        creditNum:  props["Credit #"]?.number ?? 1,
        dateUsed:   props["Date Used"]?.date?.start ?? null,
      };
    });
  } catch (_) { return []; }
}

const CREDIT_ICONS = { "Sit Down":"🍽", "Quick Service":"🥡", "Snack":"🍿", "Mug":"☕" };

function getActiveResorts(isoDate) {
  const active = [];
  if (isoDate >= "2026-05-22" && isoDate <= "2026-05-24") active.push("Polynesian");
  if (isoDate >= "2026-05-24" && isoDate <= "2026-05-27") active.push("Riviera");
  return active;
}

function DiningCredits({ isoDate }) {
  const [credits, setCredits] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchDiningCredits().then(setCredits).catch(() => {});
  }, [isoDate]);

  const activeResorts = getActiveResorts(isoDate);
  if (activeResorts.length === 0) return null;

  const handleToggle = async (pageId, currentlyUsed) => {
    const today = new Date().toISOString().split("T")[0];
    const newDateUsed = currentlyUsed ? null : today;
    setCredits(prev => prev.map(c => c.pageId === pageId
      ? { ...c, dateUsed: newDateUsed }
      : c
    ));
    try {
      await fetch(`${WORKER_URL}/credits`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, used: !currentlyUsed, dateUsed: newDateUsed }),
      });
    } catch (_) {
      // Revert on failure
      setCredits(prev => prev.map(c => c.pageId === pageId ? { ...c, dateUsed: currentlyUsed ? today : null } : c));
    }
  };

  const isUsedOnOrBefore = (credit) => {
    if (!credit.dateUsed) return false;
    return credit.dateUsed <= isoDate;
  };

  const visibleCredits = (resort) => credits.filter(c => c.resort === resort);

  const remaining = (resort, type) =>
    visibleCredits(resort).filter(c => c.creditType === type && !isUsedOnOrBefore(c)).length;

  const grouped = (resort) => {
    const vc = visibleCredits(resort);
    const famOrder = ["S", "M"];
    const personOrder = { S: ["J","A","w","r"], M: ["B","T","t","q","b"] };
    return famOrder.map(fam => {
      const famCredits = vc.filter(c => c.family === fam);
      if (!famCredits.length) return null;
      const persons = personOrder[fam].filter(p => famCredits.some(c => c.person === p));
      return {
        family: fam,
        persons: persons.map(person => {
          const pc = famCredits.filter(c => c.person === person);
          const types = ["Sit Down","Quick Service","Snack","Mug"];
          return {
            person,
            credits: types.map(type => ({
              type,
              items: pc.filter(c => c.creditType === type).sort((a,b) => a.creditNum - b.creditNum),
            })).filter(t => t.items.length > 0),
          };
        }),
      };
    }).filter(Boolean);
  };

  const trackableTypes = ["Quick Service","Snack","Mug"];

  return (
    <div style={{ marginTop:12, borderRadius:12, border:"1px solid #EDE8E1", overflow:"hidden", background:"#FFF" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 16px", cursor:"pointer", background:"#FAFAF8" }}>
        <span style={{ fontSize:13, fontWeight:600, color:"#1A1A1A", fontFamily:"'DM Sans',sans-serif" }}>🍽️ Dining Plan Credits</span>
        <span style={{ fontSize:10, color:"#CCC", transform:open?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▾</span>
      </div>
      {open && activeResorts.map(resort => (
        <div key={resort} style={{ borderTop:"1px solid #EDE8E1" }}>
          <div style={{ padding:"8px 16px 4px", background:"#F8F5F0" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#888", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>
              {resort} · {resort === "Polynesian" ? "expires May 24" : "expires May 27"}
            </div>
            <div style={{ display:"flex", gap:12 }}>
              {trackableTypes.map(type => {
                const total = credits.filter(c => c.resort === resort && c.creditType === type).length;
                if (!total) return null;
                const rem = remaining(resort, type);
                return (
                  <span key={type} style={{ fontSize:10, color: rem === 0 ? "#CCC" : "#555", fontFamily:"'DM Sans',sans-serif" }}>
                    {CREDIT_ICONS[type]} {rem}/{total}
                  </span>
                );
              })}
            </div>
          </div>
          {/* Side by side families */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderTop:"1px solid #F0EBE3" }}>
            {grouped(resort).map(({ family, persons }) => (
              <div key={family} style={{ borderRight: family === "S" ? "1px solid #F0EBE3" : "none" }}>
                <div style={{ padding:"5px 10px 2px", fontSize:10, fontWeight:700, color:"#AAA", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.1em" }}>
                  {family === "S" ? "S FAMILY" : "M FAMILY"}
                </div>
                {persons.map(({ person, credits: pc }) => (
                  <div key={person} style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", borderBottom:"1px solid #F5F0EA" }}>
                    <span style={{ fontSize:12, fontWeight:700, color:"#555", fontFamily:"'DM Sans',sans-serif", width:12, flexShrink:0 }}>{person}</span>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {pc.map(({ type, items }) => (
                        <div key={type} style={{ display:"flex", alignItems:"center", gap:2 }}>
                          <span style={{ fontSize:10 }}>{CREDIT_ICONS[type]}</span>
                          {items.map(credit => (
                            <button
                              key={credit.pageId}
                              onClick={() => handleToggle(credit.pageId, isUsedOnOrBefore(credit))}
                              style={{
                                width:16, height:16, borderRadius:3,
                                border: isUsedOnOrBefore(credit) ? "none" : "1.5px solid #CCC",
                                background: isUsedOnOrBefore(credit) ? "#4CAF50" : "#FFF",
                                cursor: "pointer",
                                display:"flex", alignItems:"center", justifyContent:"center",
                                fontSize:9, color:"#FFF", flexShrink:0,
                              }}
                            >{isUsedOnOrBefore(credit) ? "✓" : ""}</button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function HighlightRow({ h, color, borderBottom }) {
  const [open, setOpen] = useState(false);
  const hasSubtext = !!h.subtext;
  return (
    <div style={{ borderBottom }}>
      <div
        onClick={() => hasSubtext && setOpen(o => !o)}
        style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"6px 22px", cursor: hasSubtext ? "pointer" : "default" }}
      >
        <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{h.icon}</span>
        <div style={{ flex:1, textAlign:"left" }}>
          {h.url
            ? <a href={h.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize:13, color, lineHeight:1.5, textDecoration:"underline", textDecorationStyle:"dotted", textUnderlineOffset:3, textAlign:"left", fontWeight:400, fontFamily:"'DM Sans',sans-serif" }}>{h.text} ↗</a>
            : <span style={{ fontSize:13, color:"#2A2A2A", lineHeight:1.5, textAlign:"left", fontWeight:400, fontFamily:"'DM Sans',sans-serif" }}>{h.text}</span>
          }
        </div>
        {hasSubtext && (
          <span style={{ fontSize:11, color:"#CCC", flexShrink:0, marginTop:2, transition:"transform 0.2s", display:"inline-block", transform: open ? "rotate(180deg)" : "none" }}>▾</span>
        )}
      </div>
      {open && hasSubtext && (
        <div style={{ padding:"0 22px 8px 50px", fontSize:11, color:"#888", fontFamily:"'DM Sans',sans-serif", lineHeight:1.5 }}>
          {h.subtext}
        </div>
      )}
    </div>
  );
}

function ViewToggle({ view, setView }) {
  return (
    <div style={{
      display: "flex",
      background: "#EDE8E1",
      borderRadius: 20,
      padding: 3,
      marginBottom: 16,
    }}>
      {[
        { id: "itinerary", label: "🗓 Itinerary" },
        { id: "llsummary", label: "⚡ LL Summary" },
      ].map(({ id, label }) => (
        <button
          key={id}
          onClick={() => setView(id)}
          style={{
            flex: 1,
            padding: "7px 0",
            border: "none",
            borderRadius: 17,
            fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 600,
            cursor: "pointer",
            transition: "background 0.15s, color 0.15s",
            background: view === id ? "#FFF" : "transparent",
            color: view === id ? "#1A1A1A" : "#999",
            boxShadow: view === id ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Main Itinerary export ──────────────────────────────────────────────────────
export function Itinerary({ view, setView, prefs, syncing, loading, syncError, onPref, onNotes, onClosed, onRdNom, onRdConfirm, onLLStatus }) {
  const [activeDay, setActiveDayRaw] = useState(() => {
    try { const s = localStorage.getItem("dw2026-activeDay"); return s !== null ? parseInt(s) : 0; } catch(_) { return 0; }
  });
  const setActiveDay = (i) => {
    setActiveDayRaw(i);
    try { localStorage.setItem("dw2026-activeDay", String(i)); } catch(_) {}
  };
  const day = days[activeDay];
  const [rooms, setRooms] = useState({});
  const [bookedLLs, setBookedLLs] = useState([]);
  const [calendarData, setCalendarData] = useState({});

  useEffect(() => {
    fetchCalendar().then(setCalendarData).catch(() => {});
  }, []);

  // Weather carousel — driven by Trip Calendar Notion data
  const cal = calendarData[day.isoDate];
  const weatherLocs = (() => {
    if (!cal) return [{lat: day.weatherLat, lon: day.weatherLon, label: null}];
    const start = {lat: cal.latStart, lon: cal.lonStart, label: cal.locationStart};
    const end   = {lat: cal.latEnd,   lon: cal.lonEnd,   label: cal.locationEnd};
    // Only show carousel if start and end are different locations
    if (!end.lat || (Math.abs(start.lat - end.lat) < 0.001 && Math.abs(start.lon - end.lon) < 0.001)) {
      return [start];
    }
    return [start, end];
  })();
  const [locIdx, setLocIdx] = useState(0);
  const activeLoc = weatherLocs[locIdx % weatherLocs.length];
  const { weather, error: weatherError } = useWeather(day.weatherDate, activeLoc.lat, activeLoc.lon);

  // Reset locIdx when switching days
  useEffect(() => { setLocIdx(0); }, [activeDay]);

  // Auto-rotate every 5 seconds on days with multiple locations
  useEffect(() => {
    if (weatherLocs.length < 2) return;
    const timer = setInterval(() => setLocIdx(i => (i + 1) % weatherLocs.length), 5000);
    return () => clearInterval(timer);
  }, [activeDay, weatherLocs.length]);

  useEffect(() => {
    try { const r = localStorage.getItem("dw2026-rooms"); if (r) setRooms(JSON.parse(r)); } catch(_) {}
  }, []);

  useEffect(() => {
    fetchBookedLLs().then(setBookedLLs).catch(() => {});
  }, []);

  const updateVisibility = async (pageId, visibility) => {
    try {
      await fetch(`${WORKER_URL}/activities`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, visibility }),
      });
      fetchBookedLLs().then(setBookedLLs).catch(() => {});
    } catch (_) {}
  };

  // Merge highlights with booked LLs for the current day, sorted by time
  const mergedHighlights = (() => {
    const base = day.highlights.map(h => ({ ...h, _type: "highlight" }));
    const llsForDay = bookedLLs
      .filter(ll => ll.date === day.isoDate && (ll.visibility === "Show" || !ll.visibility) && !isLLExpired(ll.endTime, ll.date))
      .map(ll => ({
        _type: "ll",
        sortTime: ll.sortTime ?? parseTimeToInt(ll.startTime),
        icon: ll.icon || (ll.type === "Character Meet" ? "🧸" : ll.type === "Resort Activity" ? "🏨" : "⚡"),
        rideName: ll.rideName,
        startTime: ll.startTime,
        endTime: ll.endTime,
        party: ll.party,
        rideId: ll.rideId,
        type: ll.type,
        location: ll.location,
        resort: ll.resort,
        optional: ll.optional,
        visibility: ll.visibility,
        pageId: ll.pageId,
        url: ll.url,
        subtext: ll.subtext,
      }));
    return [...base, ...llsForDay].sort((a, b) => (a.sortTime ?? 9999) - (b.sortTime ?? 9999));
  })();

  const archivedLLs = bookedLLs.filter(ll =>
    ll.date === day.isoDate && (ll.visibility === "Archive" || isLLExpired(ll.endTime, ll.date))
  );

  const swipeStart = useRef(null);
  const scrollStripRef = useRef(null);
  const activePillRef = useRef(null);

  // Auto-scroll active dot to center of strip
  useEffect(() => {
    if (!scrollStripRef.current || !activePillRef.current) return;
    const strip = scrollStripRef.current;
    const pill  = activePillRef.current;
    const stripCenter = strip.offsetWidth / 2;
    const pillCenter  = pill.offsetLeft + pill.offsetWidth / 2;
    strip.scrollTo({ left: pillCenter - stripCenter, behavior: "smooth" });
  }, [activeDay]);

  const goTo = (i) => setActiveDay(Math.max(0, Math.min(days.length - 1, i)));
  const onPointerDown = (e) => { swipeStart.current = e.clientX; };
  const onPointerUp = (e) => {
    if (swipeStart.current === null) return;
    const diff = swipeStart.current - e.clientX;
    if (Math.abs(diff) > 40) goTo(activeDay + (diff > 0 ? 1 : -1));
    swipeStart.current = null;
  };

  // Wrap handlers to inject ride object and saveMetaToNotion
  const w_onPref      = (rideId, pid, pref) => onPref(rideId, pid, pref, RIDES.find(r => r.id === rideId));
  const w_onNotes     = (rideId, val)        => onNotes(rideId, val, RIDES.find(r => r.id === rideId), saveMetaToNotion);
  const w_onClosed    = (rideId)             => onClosed(rideId, RIDES.find(r => r.id === rideId), isClosed, saveMetaToNotion);
  const w_onRdNom     = (rideId)             => onRdNom(rideId, RIDES.find(r => r.id === rideId), saveMetaToNotion);
  const w_onRdConfirm = (parkId, rideId)     => onRdConfirm(parkId, rideId, RIDES.filter(r => r.park === parkId), saveMetaToNotion);
  const w_onLLStatus  = (rideId, status)     => onLLStatus(rideId, status, RIDES.find(r => r.id === rideId), saveMetaToNotion);

  const llHandlers = {
    onPref: w_onPref, onNotes: w_onNotes, onClosed: w_onClosed,
    onRdNom: w_onRdNom, onRdConfirm: w_onRdConfirm, onLLStatus: w_onLLStatus,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FBF7F2", fontFamily: "'DM Sans', sans-serif", padding: "28px 20px 40px" }}>
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        {isToday("2026-05-21") && <Fireworks />}

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: "normal", margin: "0 0 6px 0", letterSpacing: "-0.02em", color: "#1A1A1A", textAlign: "left", fontFamily: "'DM Sans', sans-serif" }}>Disney World May 2026</h1>
        </div>
        <Countdown />

        {/* Permanent view toggle — always visible */}
        <ViewToggle view={view} setView={setView} />

        {/* Date selector row — always rendered, visibility hidden in LL view to hold space */}
        <div style={{
          visibility: view === "llsummary" ? "hidden" : "visible",
          height: view === "llsummary" ? 0 : "auto",
          overflow: "hidden",
          marginBottom: view === "llsummary" ? 0 : 16,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          {/* Date pills — scrollable, active day shown as dot */}
          <div ref={scrollStripRef} style={{ flex: 1, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
            {days.map((d, i) => {
              const parts = d.date.split(" "); const num = parseInt(parts[2]);
              const s = [1,21].includes(num)?"st":[2,22].includes(num)?"nd":[3,23].includes(num)?"rd":"th";
              const isActive = activeDay === i;
              return isActive ? (
                <div key={i} ref={activePillRef} style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", background: days[i].color, display: "flex", alignItems: "center", justifyContent: "center", alignSelf: "center" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.9)" }} />
                </div>
              ) : (
                <button key={i} onClick={() => setActiveDay(i)} style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 20, border: "none", background: "#EDE8E1", color: "#888", fontSize: 11, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                  {num}{s}
                </button>
              );
            })}
          </div>

          {/* Prev / Next grouped on the right */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => goTo(activeDay - 1)}
              disabled={activeDay === 0}
              style={{ padding: "6px 10px", borderRadius: 20, border: "1px solid #EDE8E1", background: "#FFF", color: activeDay === 0 ? "#CCC" : "#555", fontSize: 12, cursor: activeDay === 0 ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif" }}
            >←</button>
            <button
              onClick={() => goTo(activeDay + 1)}
              disabled={activeDay === days.length - 1}
              style={{ padding: "6px 10px", borderRadius: 20, border: "1px solid #EDE8E1", background: "#FFF", color: activeDay === days.length - 1 ? "#CCC" : "#555", fontSize: 12, cursor: activeDay === days.length - 1 ? "default" : "pointer", fontFamily: "'DM Sans', sans-serif" }}
            >→</button>
          </div>
        </div>

        {/* ── LL Summary view ────────────────────────────────────────────── */}
        {view === "llsummary" && (
          <Summary prefs={prefs} onLLStatus={w_onLLStatus} />
        )}

        {/* ── Itinerary view ──────────────────────────────────────────────── */}
        {view === "itinerary" && (
          <>
            {loading   && <div style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", padding: "6px 10px", borderRadius: 8, marginBottom: 14, background: "#E3F2FD", color: "#0D47A1" }}>Loading votes from server…</div>}
            {syncError && <div style={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", padding: "6px 10px", borderRadius: 8, marginBottom: 14, background: "#FFF8E1", color: "#E65100" }}>{syncError}</div>}

            {/* Day card */}
            <div onPointerDown={onPointerDown} onPointerUp={onPointerUp} style={{ background:"#FFF", borderRadius:16, overflow:"hidden", boxShadow:"0 4px 24px rgba(0,0,0,0.08)", border:"1px solid #EDE8E1", touchAction:"pan-y", userSelect:"none" }}>
              {/* Header */}
              <div style={{ background: day.color }}>
                <div style={{ padding:"20px 22px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1, minWidth:0, textAlign:"left" }}>
                    <div style={{ fontSize:10, letterSpacing:"0.15em", textTransform:"uppercase", color:"rgba(255,255,255,0.6)", fontFamily:"'DM Sans', sans-serif", marginBottom:4 }}>
                      {(() => { const [dow,mon,num]=day.date.split(" "); const dowFull={Thu:"Thursday",Fri:"Friday",Sat:"Saturday",Sun:"Sunday",Mon:"Monday",Tue:"Tuesday",Wed:"Wednesday"}; const n=parseInt(num); const s=[1,21].includes(n)?"st":[2,22].includes(n)?"nd":[3,23].includes(n)?"rd":"th"; return `${dowFull[dow]}, ${mon} ${n}${s}, 2026`; })()}
                    </div>
                    <div style={{ fontSize:22, color:"#FFF", fontWeight:"normal", marginBottom:4 }}>{day.emoji} {day.label}</div>
                    <div style={{ fontSize:12, color:"rgba(255,255,255,0.6)" }}>{day.hotel}</div>
                    {day.rooms && (
                      <div style={{ display:"flex", gap:8, marginTop:6 }}>
                        {day.rooms.map((r,ri) => (
                          <div key={ri} style={{ display:"flex", alignItems:"center", gap:4 }}>
                            <span style={{ fontSize:9, color:"rgba(255,255,255,0.45)", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.08em" }}>{r.label}</span>
                            <input value={rooms[`${activeDay}-${ri}`]||""} onChange={e => { const key=`${activeDay}-${ri}`; setRooms(prev => { const next={...prev,[key]:e.target.value}; try{localStorage.setItem("dw2026-rooms",JSON.stringify(next));}catch(_){} return next; }); }} placeholder="Room #" onClick={e=>e.stopPropagation()} style={{ fontSize:10, width:58, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", borderRadius:4, padding:"2px 5px", color:"#FFF", fontFamily:"'DM Sans',sans-serif", outline:"none" }} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ flexShrink:0, textAlign:"right", cursor: weatherLocs.length > 1 ? "pointer" : "default" }} onClick={() => weatherLocs.length > 1 && setLocIdx(i => (i + 1) % weatherLocs.length)}>
                    {weatherLocs.length > 1 && (
                      <div style={{ display:"flex", justifyContent:"flex-end", gap:4, marginBottom:4 }}>
                        {weatherLocs.map((_, i) => (
                          <div key={i} style={{ width:5, height:5, borderRadius:"50%", background: i === locIdx % weatherLocs.length ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.35)" }} />
                        ))}
                      </div>
                    )}
                    <WeatherStack weather={weather} error={weatherError} />
                    {weatherLocs.length > 1 && activeLoc.label && (
                      <div style={{ fontSize:8, color:"rgba(255,255,255,0.45)", fontFamily:"'DM Sans',sans-serif", marginTop:2 }}>{activeLoc.label}</div>
                    )}
                  </div>
                </div>
                <WeatherAlert weather={weather} />
              </div>

              {/* Highlights */}
              <div style={{ padding:"8px 0" }}>
                {mergedHighlights.map((h, hi) => (
                  <div key={hi}>
                    {h._type === "ll" ? (
                      h.rideName?.toLowerCase().includes("quick service") ? (
                        <>
                          <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 22px", borderTop:"1px solid #F5F0EA" }}>
                            <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>🍽️</span>
                            <span style={{ fontSize:13, color:"#2A2A2A", lineHeight:1.5, fontFamily:"'DM Sans',sans-serif" }}>Quick Service Options</span>
                          </div>
                          <QuickServiceDining color={day.color} />
                        </>
                      ) : (
                        <LLRow h={h} color={day.color} borderBottom={hi < mergedHighlights.length - 1 ? "1px solid #F5F0EA" : "none"} onSkip={(pageId) => updateVisibility(pageId, "Archive")} />
                      )
                    ) : h.alternatives ? (
                      <div style={{ borderTop:"1px solid #F5F0EA" }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, padding:"12px 12px" }}>
                          {h.alternatives.map((alt, ai) => (
                            <div key={ai} style={{ background:"#FAFAF8", borderRadius:10, border:"1px solid #EDE8E1", padding:"10px 10px", textAlign:"center" }}>
                              <div style={{ fontSize:20, marginBottom:4 }}>{alt.icon}</div>
                              <div style={{ fontSize:11, fontWeight:"bold", color:day.color, marginBottom:4, lineHeight:1.2 }}>{alt.title}</div>
                              <div style={{ fontSize:10, color:"#888", lineHeight:1.4 }}>
                                {Array.isArray(alt.segments) ? alt.segments.map((seg,si) => seg.url ? <a key={si} href={seg.url} target="_blank" rel="noopener noreferrer" style={{color:day.color,textDecoration:"underline",textDecorationStyle:"dotted"}}>{seg.text}</a> : <span key={si}>{seg.text}</span>) : alt.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <HighlightRow h={h} color={day.color} borderBottom={!h.flight&&!h.quickService&&hi<mergedHighlights.length-1?"1px solid #F5F0EA":"none"} />
                        {h.quickService && <QuickServiceDining color={day.color} />}
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Past & Declined */}
              <ArchivedSection archivedLLs={archivedLLs} onRestore={(pageId) => updateVisibility(pageId, "Show")} />
            </div>

            {/* Dining Credits */}
            <DiningCredits isoDate={day.isoDate} />

            {/* LL sections below tile — park days only */}
            {day.parkId && (
              <div style={{ marginTop: 16 }}>
                <ParkRides
                  parkId={day.parkId}
                  prefs={prefs}
                  syncing={syncing}
                  {...llHandlers}
                />
              </div>
            )}

            <div style={{ marginTop:32, fontSize:10, color:"#CCC", textAlign:"center", fontFamily:"'DM Sans',sans-serif", letterSpacing:"0.1em" }}>DISNEY WORLD — MAY 2026</div>
          </>
        )}
      </div>
    </div>
  );
}
