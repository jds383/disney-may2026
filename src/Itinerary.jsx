import { useState, useEffect, useRef } from "react";
import { ParkRides, Summary, RIDES, saveMetaToNotion, isClosed } from "./LLPlanner";

const FLIGHTS = {
  "2026-05-21": { flight: "AA2531", date: "2026-05-21", from: "PHL", to: "MCO", sched_dep: "5:50 PM", sched_arr: "8:46 PM" },
  "2026-05-27": { flight: "AA810",  date: "2026-05-27", from: "MCO", to: "PHL", sched_dep: "3:51 PM", sched_arr: "6:35 PM" },
};

const STATUS_COLORS = {
  "Scheduled": "#2C5F8A", "On Time": "#1A6B4A", "Delayed": "#C8832A",
  "Cancelled": "#CC4444", "Landed": "#4A2C6B", "En Route": "#1A6B4A",
};

const fmt = (iso) => {
  try { if (!iso) return "—"; return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }); }
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

function FlightStatus({ weatherDate, color }) {
  const info = FLIGHTS[weatherDate];
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
      const res = await fetch(`https://api.aviationstack.com/v1/flights?access_key=67e59f674eef0dc0ceefbdbd984e9f19&flight_iata=${info.flight}&flight_date=${info.date}`);
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
< truncated lines 118-670 >
              style={{ padding: "6px 10px", borderRadius: 20, border: "1px solid #EDE8E1", background: "#FFF", color: activeDay === 0 ? "#CCC" : "#555", fontSize: 12, cursor: activeDay === 0 ? "default" : "pointer", fontFamily: "'DM Serif Display', serif" }}
            >←</button>
            <button
              onClick={() => goTo(activeDay + 1)}
              disabled={activeDay === days.length - 1}
              style={{ padding: "6px 10px", borderRadius: 20, border: "1px solid #EDE8E1", background: "#FFF", color: activeDay === days.length - 1 ? "#CCC" : "#555", fontSize: 12, cursor: activeDay === days.length - 1 ? "default" : "pointer", fontFamily: "'DM Serif Display', serif" }}
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
                    ) : null}
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
                      <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"11px 22px", borderBottom: hi < mergedHighlights.length - 1 ? "1px solid #F5F0EA" : "none", background: "#F8FBF9" }}>
                        <span style={{ fontSize:14, flexShrink:0, marginTop:1 }}>⚡</span>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, color: day.color, fontWeight:500, fontFamily:"'DM Sans',sans-serif", textAlign:"left" }}>
                            {h.rideName}
                          </div>
                          <div style={{ fontSize:11, color:"#AAA", fontFamily:"'DM Sans',sans-serif", marginTop:2, textAlign:"left" }}>
                            {h.startTime}{h.endTime ? ` – ${h.endTime}` : ""}
                            {h.party && h.party !== "All" ? ` · ${h.party}` : ""}
                          </div>
                        </div>
                        <span style={{ fontSize:9, fontFamily:"'DM Sans',sans-serif", fontWeight:600, padding:"2px 8px", borderRadius:8, background:"#E8F5E9", color:"#1A6B4A", border:"1px solid #A5D6A7", flexShrink:0, marginTop:2 }}>LL</span>
                      </div>
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
                            {h.url ? <a href={h.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color:day.color, lineHeight:1.5, textDecoration:"underline", textDecorationStyle:"dotted", textUnderlineOffset:3, textAlign:"left" }}>{h.text} ↗</a> : <span style={{ fontSize:13, color:"#2A2A2A", lineHeight:1.5, textAlign:"left" }}>{h.text}</span>}
                          </div>
                        )}
                        {h.reservations && <div style={{ borderBottom:hi<mergedHighlights.length-1?"1px solid #F5F0EA":"none" }}><ReservationBadges reservations={h.reservations} color={day.color} icon={h.icon} text={h.text} url={h.url} /></div>}
                        {h.quickService && <QuickServiceDining color={day.color} />}
                        {h.flight && FLIGHTS[day.weatherDate] && <div style={{ borderBottom:hi<mergedHighlights.length-1?"1px solid #F5F0EA":"none" }}><FlightStatus weatherDate={day.weatherDate} color={day.color} /></div>}
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