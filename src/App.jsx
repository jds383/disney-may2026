import { useState, useEffect } from "react";
import { Itinerary } from "./Itinerary";
import { LLPlanner } from "./LLPlanner";

const WORKER_URL = "https://disney-ll-proxy.45-reactor-puritan.workers.dev";

const LL_STATUS = {
  FIRST:    "Pre-Book (1st)",
  PREBOOK:  "Pre-Book",
  SECOND:   "2nd Round",
  LATER:    "Later",
  DONTBOOK: "Don't Book",
};

const PARK_COLORS = {
  mk: { color: "#1A6B4A", bg: "#F1F8F4", border: "#A5D6A7" },
  ep: { color: "#4A2C6B", bg: "#EDE8F5", border: "#C5B8E8" },
  hs: { color: "#8A3A2C", bg: "#F5EDEB", border: "#E8C5BF" },
};

// Minimal ride name lookup for the itinerary LL summary
const RIDE_NAMES = {
  mk1:"Seven Dwarfs Mine Train", mk2:"Peter Pan's Flight", mk10:"TRON Lightcycle / Run",
  mk11:"Space Mountain", mk18:"Big Thunder Mountain Railroad", mk19:"Tiana's Bayou Adventure",
  mk20:"Jungle Cruise", ep1:"Guardians of the Galaxy: Cosmic Rewind", ep2:"Test Track",
  ep5:"Soarin' Around the World", ep10:"Frozen Ever After", ep11:"Remy's Ratatouille Adventure",
  hs1:"Star Wars: Rise of the Resistance", hs2:"Millennium Falcon: Smugglers Run",
  hs3:"Slinky Dog Dash", hs4:"Toy Story Mania!", hs6:"Rock 'n' Roller Coaster",
  hs7:"The Twilight Zone Tower of Terror", hs8:"Beauty and the Beast Live on Stage",
  hs10:"Indiana Jones Epic Stunt Spectacular", hs11:"Mickey & Minnie's Runaway Railway",
  hs12:"For the First Time in Forever: A Frozen Sing-Along", hs13:"The Little Mermaid - A Musical Adventure",
};

const RIDE_URLS = {
  mk1:"https://disneyworld.disney.go.com/attractions/magic-kingdom/seven-dwarfs-mine-train/",
  mk2:"https://disneyworld.disney.go.com/attractions/magic-kingdom/peter-pan-flight/",
  mk10:"https://disneyworld.disney.go.com/attractions/magic-kingdom/tron-lightcycle-run/",
  mk11:"https://disneyworld.disney.go.com/attractions/magic-kingdom/space-mountain/",
  mk18:"https://disneyworld.disney.go.com/attractions/magic-kingdom/big-thunder-mountain-railroad/",
  mk19:"https://disneyworld.disney.go.com/attractions/magic-kingdom/tianas-bayou-adventure/",
  mk20:"https://disneyworld.disney.go.com/attractions/magic-kingdom/jungle-cruise/",
  ep1:"https://disneyworld.disney.go.com/attractions/epcot/guardians-of-the-galaxy-cosmic-rewind/",
  ep2:"https://disneyworld.disney.go.com/attractions/epcot/test-track/",
  ep5:"https://disneyworld.disney.go.com/attractions/epcot/soarin-around-world/",
  ep10:"https://disneyworld.disney.go.com/attractions/epcot/frozen-ever-after/",
  ep11:"https://disneyworld.disney.go.com/attractions/epcot/remys-ratatouille-adventure/",
  hs1:"https://disneyworld.disney.go.com/attractions/hollywood-studios/star-wars-rise-of-the-resistance/",
  hs2:"https://disneyworld.disney.go.com/attractions/hollywood-studios/millennium-falcon-smugglers-run/",
  hs3:"https://disneyworld.disney.go.com/attractions/hollywood-studios/slinky-dog-dash/",
  hs4:"https://disneyworld.disney.go.com/attractions/hollywood-studios/toy-story-mania/",
  hs6:"https://disneyworld.disney.go.com/attractions/hollywood-studios/rock-and-roller-coaster-starring-muppets/",
  hs7:"https://disneyworld.disney.go.com/attractions/hollywood-studios/twilight-zone-tower-of-terror/",
  hs8:"https://disneyworld.disney.go.com/entertainment/hollywood-studios/beauty-and-the-beast-live-on-stage/",
  hs10:"https://disneyworld.disney.go.com/entertainment/hollywood-studios/indiana-jones-epic-stunt-spectacular/",
  hs11:"https://disneyworld.disney.go.com/attractions/hollywood-studios/mickey-minnies-runaway-railway/",
  hs12:"https://disneyworld.disney.go.com/entertainment/hollywood-studios/frozen-sing-along-celebration/",
  hs13:"https://disneyworld.disney.go.com/entertainment/hollywood-studios/little-mermaid-musical-adventure/",
};

const PARK_IDS = ["mk", "ep", "hs"];

// Fetch and build LL plan summary per park from Notion
async function fetchLLPlan() {
  try {
    const res = await fetch(`${WORKER_URL}/meta`);
    const data = await res.json();
    const plan = { mk: [], ep: [], hs: [] };

    if (!data.results) return plan;

    // Index meta by rideId
    const metaByRide = {};
    data.results.forEach((page) => {
      const rideId   = page.properties["Ride ID"]?.rich_text?.[0]?.text?.content;
      const llStatus = (page.properties["LL Status"]?.select?.name ?? null)?.replace(/[\u2018\u2019\u201A\u201B]/g, "'") ?? null;
      const rdConf   = page.properties["Rope Drop Confirmed"]?.checkbox ?? false;
      if (rideId) metaByRide[rideId] = { llStatus, rdConf };
    });

    PARK_IDS.forEach((parkId) => {
      const c = PARK_COLORS[parkId];

      // RD confirmed
      const rdRide = Object.entries(metaByRide).find(([id, m]) => id.startsWith(parkId) && m.rdConf);
      if (rdRide) {
        plan[parkId].push({
          badge: "🏃 Rope Drop",
          badgeBg: "#F1F8F4", badgeColor: "#1A6B4A", badgeBorder: "#A5D6A7",
          name: RIDE_NAMES[rdRide[0]] || rdRide[0],
          url: RIDE_URLS[rdRide[0]] || "#",
          order: 0,
        });
      }

      // First LL
      const firstLL = Object.entries(metaByRide).find(([id, m]) => id.startsWith(parkId) && m.llStatus === LL_STATUS.FIRST);
      if (firstLL) {
        plan[parkId].push({
          badge: "1st LL",
          badgeBg: "#E8F5E9", badgeColor: "#0A4A2E", badgeBorder: "#A5D6A7",
          name: RIDE_NAMES[firstLL[0]] || firstLL[0],
          url: RIDE_URLS[firstLL[0]] || "#",
          order: 1,
        });
      }

      // Pre-Books
      const preBooks = Object.entries(metaByRide)
        .filter(([id, m]) => id.startsWith(parkId) && m.llStatus === LL_STATUS.PREBOOK)
        .map(([id]) => id);
      preBooks.forEach((id, i) => {
        plan[parkId].push({
          badge: `Pre-Book ${i + 1}`,
          badgeBg: "#F1F8F4", badgeColor: "#1A6B4A", badgeBorder: "#A5D6A7",
          name: RIDE_NAMES[id] || id,
          url: RIDE_URLS[id] || "#",
          order: 2 + i,
        });
      });

      // 2nd Round
      const secondRound = Object.entries(metaByRide)
        .filter(([id, m]) => id.startsWith(parkId) && m.llStatus === LL_STATUS.SECOND)
        .map(([id]) => id);
      secondRound.forEach((id, i) => {
        plan[parkId].push({
          badge: `2nd Round ${i + 1}`,
          badgeBg: "#FFFDE7", badgeColor: "#B8860B", badgeBorder: "#FFE082",
          name: RIDE_NAMES[id] || id,
          url: RIDE_URLS[id] || "#",
          order: 10 + i,
        });
      });

      plan[parkId].sort((a, b) => a.order - b.order);
    });

    return plan;
  } catch (e) {
    console.error("LL plan fetch failed:", e);
    return { mk: [], ep: [], hs: [] };
  }
}

export default function App() {
  const [view, setView] = useState("itinerary");
  const [llPlan, setLlPlan] = useState(null);

  useEffect(() => {
    fetchLLPlan().then(setLlPlan);
  }, []);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#FBF7F2", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; padding-bottom: 64px; }
      `}</style>

      {/* Main content */}
      {view === "itinerary"
        ? <Itinerary llPlanByPark={llPlan} />
        : <LLPlanner />
      }

      {/* Bottom nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "#FFF",
        borderTop: "1px solid #EDE8E1",
        display: "flex",
        zIndex: 50,
        maxWidth: 480,
        margin: "0 auto",
      }}>
        {[
          { id: "itinerary", label: "Itinerary", icon: "🗓️" },
          { id: "planner",   label: "LL Planner", icon: "⚡" },
        ].map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            style={{
              flex: 1,
              padding: "10px 0 12px",
              border: "none",
              background: "none",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              borderTop: view === id ? "2px solid #1A6B4A" : "2px solid transparent",
            }}
          >
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span style={{
              fontSize: 10,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 600,
              color: view === id ? "#1A6B4A" : "#AAA",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
