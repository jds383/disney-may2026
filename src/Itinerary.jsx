import { useState, useEffect, useRef } from "react";
import { ParkRides, Summary, RIDES, saveMetaToNotion, isClosed } from "./LLPlanner";

const FLIGHTS = {
  0: { flight: "AA2531", date: "2026-05-21", from: "PHL", to: "MCO", sched_dep: "5:50 PM", sched_arr: "8:46 PM" },
  6: { flight: "AA810",  date: "2026-05-27", from: "MCO", to: "PHL", sched_dep: "3:51 PM", sched_arr: "6:35 PM" },
};

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

function FlightStatus({ dayIndex, color }) {
  const info = FLIGHTS[dayIndex];
  const [live, setLive] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = async () => {
    if (!info) return;
    setSpinning(true);
    const today = new Date().toISOString().split("T")[0];
    if (today !== info.date) {
      await new Promise(r => setTimeout(r, 600));
      setLastUpdated(`as of: ${new Date().toLocaleDateString("en-US", { month: "numeric", day: "2-digit" })} ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · no live data yet`);
      setSpinning(false);
      return;
    }
    try {
      const res = await fetch(`https://api.aviationstack.com/v1/flights?access_key=DEMO&flight_iata=${info.flight}&flight_date=${info.date}`);
      const data = await res.json();
      const parsed = parseFlight(data);
      if (parsed) setLive(parsed);
      setLastUpdated(`as of: ${new Date().toLocaleDateString("en-US", { month: "numeric", day: "2-digit" })} ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`);
    } catch (_) { setLastUpdated("check failed"); }
    setSpinning(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (!info) return null;

  const d = live || { status: "Scheduled", gate_dep: "—", gate_arr: "—", terminal_dep: "—", terminal_arr: "—", actual_dep: info.sched_dep, actual_arr: info.sched_arr, live: false };
  const statusColor = STATUS_COLORS[d.status] || "#888";
  const isLive = d.live;

  return (
    <div style={{ margin: "0", borderTop: "1px solid rgba(0,0,0,0.06)", background: "#FAFAF8" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 22px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: "bold", color: "#1A1A1A", fontFamily: "'DM Sans', sans-serif" }}>{info.flight}</span>
          <span style={{ fontSize: 11, color: "#888" }}>{info.from} → {info.to}</span>
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
          { label: "Sched Dep", val: info.sched_dep }, { label: "Sched Arr", val: info.sched_arr },
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
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 22px 9px 32px", borderBottom: i < quickServiceData[key].length - 1 ? "1px solid #F5F0EA" : "none", textDecoration: "none" }}>
                  <div>
                    <div style={{ fontSize: 13, color: color, fontWeight: "500" }}>{r.name} ↗</div>
                    <div style={{ fontSize: 11, color: "#AAA", marginTop: 1 }}>{r.where}</div>
                  </div>
                </a>
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
    highlights: [
      { sortTime: 1030, icon: "✈️", text: "Depart PHL 5:50 PM · Arrive MCO 8:46 PM", flight: true, url: "https://www.flightaware.com/live/flight/AAL2531" },
      { sortTime: 2035, icon: "🚤", text: "8:35 - 10:05 PM · Electrical Water Pageant", url: "https://disneyworld.disney.go.com/entertainment/magic-kingdom/electrical-water-pageant/" },
      { sortTime: 2115, icon: "🚐", text: "9:15 PM · Away We Go pickup · MCO → Grand Floridian", url: "https://awaywegoco.com/faqs" },
      { sortTime: 2200, icon: "🏨", text: "~10:00 PM · Arrive Grand Floridian · Unpack & rest" },
    ]
  },
  {
    date: "Fri May 22", label: "Amenities Day", hotel: "Villas at Grand Floridian → Polynesian Villas & Bungalows",
    weatherDate: "2026-05-22", weatherLat: 28.4094, weatherLon: -81.5840, isoDate: "2026-05-22",
    rooms: [{ label: "S FAMILY" }, { label: "M FAMILY" }], color: "#7B4F2E", emoji: "🌴",
    parkId: null,
    highlights: [
      { sortTime:  930, icon: "🛺", text: "9:30 AM · Kingdom Strollers delivery · outside Grand Floridian main lobby near vintage car" },
      { sortTime: 1100, icon: "🏨", text: "11:00 AM · Checkout / Drop bags with Bell Services" },
      { sortTime: 1300, alternatives: [
        { icon: "🏊", title: "Resort Pools", segments: [{ text: "Grand Floridian Beach Pool", url: "https://disneyworld.disney.go.com/recreation/grand-floridian-resort-and-spa/pools-grand-floridian-resort-and-spa/" }, { text: " or ", url: null }, { text: "Polynesian Pool", url: "https://disneyworld.disney.go.com/recreation/polynesian-resort/pools-polynesian-village-resort/" }, { text: " · 9 AM–11 PM", url: null }] },
        { icon: "🌊", title: "Water Park", segments: [{ text: "Typhoon Lagoon", url: "https://disneyworld.disney.go.com/destinations/typhoon-lagoon/" }, { text: " or ", url: null }, { text: "Blizzard Beach", url: "https://disneyworld.disney.go.com/destinations/blizzard-beach/" }, { text: " · 10 AM–5 PM · Free on check-in day", url: null }] },
        { icon: "🐴", title: "Tri-Circle-D Ranch", segments: [{ text: "Fort Wilderness", url: "https://disneyworld.disney.go.com/recreation/fort-wilderness-resort/tri-circle-d-ranch/" }, { text: " · pony rides, horses, farm animals · via bus or water taxi", url: null }] },
      ]},
      { sortTime: 1500, icon: "🏨", text: "~3:00 PM · Poly room ready · Bell Services delivers" },
      { sortTime: 1600, icon: "🍽️", text: "4:00 PM · 1900 Park Fare Dinner · Grand Floridian", url: "https://disneyworld.disney.go.com/dining/grand-floridian-resort-and-spa/1900-park-fare/menus/dinner/", reservations: [
        { party: "S Family", time: "4:00 PM", size: "4 guests", conf: "356081988915" },
        { party: "M Family", time: "4:00 PM", size: "5 guests", conf: "356081988915" },
      ]},
      { sortTime: 2035, icon: "🚤", text: "8:35 - 10:05 PM · Electrical Water Pageant", url: "https://disneyworld.disney.go.com/entertainment/magic-kingdom/electrical-water-pageant/" },
    ]
  },
  {
    date: "Sat May 23", label: "Magic Kingdom", hotel: "Polynesian Villas & Bungalows",
    weatherDate: "2026-05-23", weatherLat: 28.4177, weatherLon: -81.5812, isoDate: "2026-05-23",
    rooms: [{ label: "S FAMILY" }, { label: "M FAMILY" }], color: "#1A6B4A", emoji: "🏰",
    parkId: "mk",
    highlights: [
      { sortTime:  830, icon: "🏰", text: "8:30 AM Early Entry · 9:00 AM Park Open · 10:00 PM Park Close", url: "https://disneyworld.disney.go.com/calendars/" },
      { sortTime: 1130, icon: "🍽️", text: "Quick Service Options", quickService: true },
      { sortTime: 2015, icon: "🌟", text: "8:15 PM · Disney Starlight: Dream the Night Away Parade", url: "https://disneyworld.disney.go.com/entertainment/magic-kingdom/starlight-dream-night-away-parade/" },
      { sortTime: 2035, icon: "🚤", text: "8:35 - 10:05 PM · Electrical Water Pageant", url: "https://disneyworld.disney.go.com/entertainment/magic-kingdom/electrical-water-pageant/" },
      { sortTime: 2200, icon: "🎆", text: "10:00 PM · Happily Ever After Fireworks", url: "https://disneyworld.disney.go.com/entertainment/magic-kingdom/happily-ever-after-fireworks/" },
    ]
  },
  {
    date: "Sun May 24", label: "Amenities Day", hotel: "Polynesian Villas & Bungalows → Riviera Resort",
    weatherDate: "2026-05-24", weatherLat: 28.3613, weatherLon: -81.5588, isoDate: "2026-05-24",
    rooms: [{ label: "S FAMILY" }, { label: "M FAMILY" }], color: "#7B4F2E", emoji: "🌴",
    parkId: null,
    highlights: [
      { sortTime:  840, icon: "🍽️", text: "8:40 AM · 'Ohana Breakfast · Polynesian", url: "https://disneyworld.disney.go.com/dining/polynesian-resort/ohana/menus/breakfast/", reservations: [
        { party: "S Family", time: "8:40 AM", size: "4 guests", conf: "356081979570" },
        { party: "M Family", time: "8:55 AM", size: "5 guests", conf: "356099140407" },
      ]},
      { sortTime: 1100, icon: "🏨", text: "11:00 AM · Checkout / Drop bags with Bell Services" },
      { sortTime: 1300, alternatives: [
        { icon: "🏊", title: "Resort Pools", segments: [{ text: "Polynesian Pool", url: "https://disneyworld.disney.go.com/recreation/polynesian-resort/pools-polynesian-village-resort/" }, { text: " or ", url: null }, { text: "Riviera Pool", url: "https://disneyworld.disney.go.com/recreation/riviera-resort/pools-riviera-resort/" }, { text: " · 9 AM–11 PM", url: null }] },
        { icon: "🌊", title: "Water Park", segments: [{ text: "Typhoon Lagoon", url: "https://disneyworld.disney.go.com/destinations/typhoon-lagoon/" }, { text: " or ", url: null }, { text: "Blizzard Beach", url: "https://disneyworld.disney.go.com/destinations/blizzard-beach/" }, { text: " · 10 AM–5 PM · Free on check-in day", url: null }] },
        { icon: "🐴", title: "Tri-Circle-D Ranch", segments: [{ text: "Fort Wilderness", url: "https://disneyworld.disney.go.com/recreation/fort-wilderness-resort/tri-circle-d-ranch/" }, { text: " · pony rides, horses, farm animals · via bus or water taxi", url: null }] },
      ]},
      { sortTime: 1500, icon: "🏨", text: "~3:00 PM · Riviera room ready · Bell Services delivers" },
    ]
  },
  {
    date: "Mon May 25", label: "EPCOT", hotel: "Riviera Resort",
    weatherDate: "2026-05-25", weatherLat: 28.3747, weatherLon: -81.5494, isoDate: "2026-05-25",
    rooms: [{ label: "S FAMILY" }, { label: "M FAMILY" }], color: "#4A2C6B", emoji: "🌐",
    parkId: "ep",
    highlights: [
      { sortTime:  830, icon: "🌐", text: "8:30 AM Early Entry · 9:00 AM Park Open · 9:00 PM Park Close", url: "https://disneyworld.disney.go.com/calendars/" },
      { sortTime: 1125, icon: "👸", text: "11:25 AM · Akershus Princess Storybook Dining", url: "https://disneyworld.disney.go.com/dining/epcot/akershus-royal-banquet-hall/menus/breakfast/", reservations: [
        { party: "S + M Family", time: "11:25 AM", size: "9 guests", conf: "356081980073" },
      ]},
      { sortTime: 2100, icon: "🎆", text: "9:00 PM · Luminous: The Symphony of Us Fireworks", url: "https://disneyworld.disney.go.com/entertainment/epcot/luminous-the-symphony-us/" },
      { sortTime: 2100, icon: "🌙", text: "9:00–11:00 PM · Extended Evening Hours" },
    ]
  },
  {
    date: "Tue May 26", label: "Hollywood Studios", hotel: "Riviera Resort",
    weatherDate: "2026-05-26", weatherLat: 28.3575, weatherLon: -81.5583, isoDate: "2026-05-26",
    rooms: [{ label: "S FAMILY" }, { label: "M FAMILY" }], color: "#8A3A2C", emoji: "🎬",
    parkId: "hs",
    highlights: [
      { sortTime:  830, icon: "🎬", text: "8:30 AM Early Entry · 9:00 AM Park Open · 9:00 PM Park Close", url: "https://disneyworld.disney.go.com/calendars/" },
      { sortTime: 1610, icon: "🍽️", text: "4:10 PM · Hollywood & Vine Fantasmic! Dining Package", url: "https://disneyworld.disney.go.com/dining/hollywood-studios/hollywood-and-vine/menus/dinner/", reservations: [
        { party: "S + M Family", time: "4:10 PM", size: "9 guests", conf: "356081979580" },
      ]},
      { sortTime: 2100, icon: "🎆", text: "9:00 PM · Fantasmic! (8:30 seating)", url: "https://disneyworld.disney.go.com/entertainment/hollywood-studios/fantasmic/" },
    ]
  },
  {
    date: "Wed May 27", label: "Departure Day", hotel: "Riviera Resort → Home",
    weatherDate: "2026-05-27", weatherLat: 28.3613, weatherLon: -81.5588, isoDate: "2026-05-27",
    rooms: [{ label: "S FAMILY" }, { label: "M FAMILY" }], color: "#2C5F8A", emoji: "🏠",
    parkId: null,
    highlights: [
      { sortTime: 1000, icon: "🛺", text: "10:00 AM · Kingdom Strollers pickup · outside Riviera main lobby near valet station" },
      { sortTime: 1100, icon: "🍽️", text: "11:00 AM · Topolino's Terrace Character Breakfast", url: "https://disneyworld.disney.go.com/dining/riviera-resort/topolinos-terrace/menus/breakfast/", reservations: [
        { party: "S Family", time: "11:00 AM", size: "4 guests", conf: "356081980082" },
        { party: "M Family", time: "11:10 AM", size: "5 guests", conf: "356081979581" },
      ]},
      { sortTime: 1101, icon: "🏨", text: "11:00 AM · Checkout / Drop bags with Bell Services" },
      { sortTime: 1300, icon: "🚐", text: "1:00 PM · Away We Go pickup · Riviera → MCO", url: "https://awaywegoco.com/faqs" },
      { sortTime: 1551, icon: "✈️", text: "Depart MCO 3:51 PM · Arrive PHL 6:35 PM", flight: true, url: "https://www.flightaware.com/live/flight/AAL810" },
    ]
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
    const res = await fetch(`${WORKER_URL}/bookings`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results) return [];
    return data.results.map((page) => {
      const props = page.properties;
      return {
        rideName:  props["Name"]?.title?.[0]?.text?.content ?? "",
        rideId:    props["Ride ID"]?.rich_text?.[0]?.text?.content ?? "",
        park:      props["Park"]?.select?.name ?? "",
        date:      props["Date"]?.date?.start ?? "",
        startTime: props["Start Time"]?.rich_text?.[0]?.text?.content ?? "",
        endTime:   props["End Time"]?.rich_text?.[0]?.text?.content ?? "",
        party:     props["Party"]?.rich_text?.[0]?.text?.content ?? "All",
        type:      props["Type"]?.select?.name ?? "LL",
      };
    });
  } catch (_) { return []; }
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
const getCachedWeather = (dk) => { try { const raw=localStorage.getItem(WEATHER_CACHE_KEY); if(!raw)return null; const cache=JSON.parse(raw); const entry=cache[dk]; if(!entry)return null; const ttl=(dk===new Date().toISOString().split("T")[0]||dk===new Date(Date.now()+86400000).toISOString().split("T")[0])?3600000:86400000; if(Date.now()-entry.fetchedAt<ttl)return entry.weather; return null; } catch(_){return null;} };
const setCachedWeather = (dk,w) => { try { let cache={}; try{const raw=localStorage.getItem(WEATHER_CACHE_KEY);if(raw)cache=JSON.parse(raw);}catch(_){} cache[dk]={weather:w,fetchedAt:Date.now()}; localStorage.setItem(WEATHER_CACHE_KEY,JSON.stringify(cache)); } catch(_){} };

function useWeather(date, lat, lon) {
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!date||!lat||!lon) return;
    const tripStart = new Date("2026-05-05");
    const targetDate = new Date(date);
    if (targetDate > tripStart && targetDate > new Date()) { setError("not yet available"); return; }
    (async () => {
      const cached = getCachedWeather(date);
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
        setCachedWeather(date,w); setWeather(w);
      } catch(e){setError("failed: "+e.message);}
    })();
  }, [date]);
  return { weather, error };
}

function WeatherStack({ weather, error }) {
  if (error==="not yet available") return <div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:20,lineHeight:1,marginBottom:4}}>📅</div><div style={{fontSize:9,color:"rgba(255,255,255,0.35)",fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap"}}>not yet available</div></div>;
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
function LLRow({ h, color, borderBottom }) {
  const isMeet = h.entryType === "Character Meet";
  const rideUrl = isMeet ? null : RIDES.find(r => r.id === h.rideId)?.url;
  const location = isMeet ? h.rideId : null;
  const timeStr = h.startTime + (h.endTime ? ` – ${h.endTime}` : "");
  const partyStr = h.party && h.party !== "All" ? ` · ${h.party}` : "";
  const fullText = `${timeStr} · ${h.rideName}${partyStr} ↗`;
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 22px", borderBottom }}>
      <span style={{ fontSize:14, flexShrink:0, marginTop:2 }}>{h.icon}</span>
      <div style={{ flex:1 }}>
        {rideUrl
          ? <a href={rideUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color, fontWeight:400, fontFamily:"'DM Sans',sans-serif", textDecoration:"underline", textDecorationStyle:"dotted", textUnderlineOffset:3, display:"block", textAlign:"left" }}>{fullText}</a>
          : <span style={{ fontSize:13, color, fontWeight:400, fontFamily:"'DM Sans',sans-serif", display:"block", textAlign:"left" }}>{fullText}</span>
        }
        {location && (
          <span style={{ fontSize:11, color:"#AAA", fontFamily:"'DM Sans',sans-serif", display:"block", marginTop:2, textAlign:"left" }}>{location}</span>
        )}
      </div>

    </div>
  );
}

// ── ViewToggle ─────────────────────────────────────────────────────────────────
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
  const [activeDay, setActiveDay] = useState(0);
  const day = days[activeDay];
  const [rooms, setRooms] = useState({});
  const [bookedLLs, setBookedLLs] = useState([]);
  const { weather, error: weatherError } = useWeather(day.weatherDate, day.weatherLat, day.weatherLon);

  useEffect(() => {
    try { const r = localStorage.getItem("dw2026-rooms"); if (r) setRooms(JSON.parse(r)); } catch(_) {}
  }, []);

  useEffect(() => {
    fetchBookedLLs().then(setBookedLLs).catch(() => {});
  }, []);

  // Merge highlights with booked LLs for the current day, sorted by time
  const mergedHighlights = (() => {
    const base = day.highlights.map(h => ({ ...h, _type: "highlight" }));
    const llsForDay = bookedLLs
      .filter(ll => ll.date === day.isoDate && !isLLExpired(ll.endTime, ll.date))
      .map(ll => ({
        _type: "ll",
        sortTime: parseTimeToInt(ll.startTime),
        icon: ll.type === "Character Meet" ? "🧸" : "⚡",
        rideName: ll.rideName,
        startTime: ll.startTime,
        endTime: ll.endTime,
        party: ll.party,
        rideId: ll.rideId,
        entryType: ll.type,
      }));
    return [...base, ...llsForDay].sort((a, b) => (a.sortTime ?? 9999) - (b.sortTime ?? 9999));
  })();

  const swipeStart = useRef(null);
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
          {/* Date pills — left justified, scrollable */}
          <div style={{ flex: 1, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
            {days.map((d, i) => {
              const parts = d.date.split(" "); const num = parseInt(parts[2]);
              const s = [1,21].includes(num)?"st":[2,22].includes(num)?"nd":[3,23].includes(num)?"rd":"th";
              return (
                <button key={i} onClick={() => setActiveDay(i)} style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 20, border: "none", background: activeDay === i ? days[i].color : "#EDE8E1", color: activeDay === i ? "#FFF" : "#888", fontSize: 11, fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
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
                  <WeatherStack weather={weather} error={weatherError} />
                </div>
                <WeatherAlert weather={weather} />
              </div>

              {/* Highlights */}
              <div style={{ padding:"8px 0" }}>
                {mergedHighlights.map((h, hi) => (
                  <div key={hi}>
                    {h._type === "ll" ? (
                      <LLRow h={h} color={day.color} borderBottom={hi < mergedHighlights.length - 1 ? "1px solid #F5F0EA" : "none"} />
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
                        {!h.reservations && (
                          <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 22px", borderBottom:!h.flight&&!h.quickService&&hi<mergedHighlights.length-1?"1px solid #F5F0EA":"none" }}>
                            <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{h.icon}</span>
                            {h.url ? <a href={h.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color:day.color, lineHeight:1.5, textDecoration:"underline", textDecorationStyle:"dotted", textUnderlineOffset:3, textAlign:"left", fontWeight:400, fontFamily:"'DM Sans',sans-serif" }}>{h.text} ↗</a> : <span style={{ fontSize:13, color:"#2A2A2A", lineHeight:1.5, textAlign:"left", fontWeight:400, fontFamily:"'DM Sans',sans-serif" }}>{h.text}</span>}
                          </div>
                        )}
                        {h.reservations && <div style={{ borderBottom:hi<mergedHighlights.length-1?"1px solid #F5F0EA":"none" }}><ReservationBadges reservations={h.reservations} color={day.color} icon={h.icon} text={h.text} url={h.url} /></div>}
                        {h.quickService && <QuickServiceDining color={day.color} />}
                        {h.flight && FLIGHTS[activeDay] && <div style={{ borderBottom:hi<mergedHighlights.length-1?"1px solid #F5F0EA":"none" }}><FlightStatus dayIndex={activeDay} color={day.color} /></div>}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

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
