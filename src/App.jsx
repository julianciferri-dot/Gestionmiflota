import { useState, useRef } from "react";

// ─── Storage ─────────────────────────────────────────────────────────────────
const K = { records: "flota3-records", drivers: "flota3-drivers", vehicles: "flota3-vehicles", ownerPin: "flota3-owner-pin" };
const DEFAULT_VEHICLES = [
    { id: "v1", name: "Volkswagen Virtus AH401ZN" },
    { id: "v2", name: "Fiat Cronos AH668PJ" },
    { id: "v3", name: "Chevrolet Prisma AB331TM" },
    { id: "v4", name: "Volkswagen Gol Trend PQX715" },
    { id: "v5", name: "Fiat Cronos AH692DD" },
    { id: "v6", name: "Nissan Versa AC432BM" },
    { id: "v7", name: "Toyota Corolla NAA803" },
    { id: "v8", name: "Volkswagen Gol Trend AC387NY" },
  ];

const load = (key, def) => { try { return JSON.parse(localStorage.getItem(key)) ?? def; } catch { return def; } };
const persist = (key, val) => localStorage.setItem(key, JSON.stringify(val));

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

const arDate = (offsetDays = 0) => {
  const now = new Date();
  const ar = new Date(now.getTime() + (-3 * 60 - now.getTimezoneOffset()) * 60000 + offsetDays * 86400000);
  return ar.toISOString().split("T")[0];
};

const weekOf = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().split("T")[0];
};

const toBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});

// ─── AI image reading ─────────────────────────────────────────────────────────
async function readImage(base64, mediaType, type) {
  const prompt = type === "uber"
    ? "Captura de Uber de un chofer argentino. Extraé el monto TOTAL ganado del día en pesos. Respondé SOLO con el número sin símbolos. Si no podés, respondé 0."
    : "Ticket de combustible argentino. Extraé el monto TOTAL pagado en pesos. Respondé SOLO con el número sin símbolos. Si no podés, respondé 0.";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
        { type: "text", text: prompt }
      ]}]
    })
  });
  const data = await res.json();
  return parseFloat((data.content?.[0]?.text || "0").replace(/[^\d.]/g, "")) || 0;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#070b14", surface: "#0e1525", hi: "#151f35",
  border: "#1e2d50", accent: "#f59e0b", teal: "#14b8a6",
  red: "#f43f5e", text: "#e2e8f0", muted: "#64748b", white: "#fff",
};

const inp = {
  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
  padding: "12px 14px", color: C.text, fontSize: 14, fontFamily: "inherit",
  outline: "none", width: "100%", boxSizing: "border-box",
};
const lbl = { display: "block", fontSize: 10, letterSpacing: 2, color: C.muted, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 };
const card = { background: C.surface, borderRadius: 16, padding: 18, border: `1px solid ${C.border}`, marginBottom: 12 };
const btn = (bg, fg) => ({ width: "100%", background: bg || C.accent, border: "none", borderRadius: 12, padding: 14, color: fg || "#000", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });

// ═════════════════════════════════════════════════════════════════════════════
// ROOT
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [drivers, setDrivers] = useState(() => load(K.drivers, []));
  const [vehicles, setVehicles] = useState(() => load(K.vehicles, DEFAULT_VEHICLES));
  const [records, setRecords] = useState(() => load(K.records, []));
  const [ownerPin, setOwnerPin] = useState(() => load(K.ownerPin, "1234"));
  const [view, setView] = useState("login");
  const [currentDriver, setCurrentDriver] = useState(null);
  const [toast, setToast] = useState("");

  const saveDrivers = (d) => { setDrivers(d); persist(K.drivers, d); };
  const saveVehicles = (v) => { setVehicles(v); persist(K.vehicles, v); };
  const saveRecords = (r) => { setRecords(r); persist(K.records, r); };
  const saveOwnerPin = (p) => { setOwnerPin(p); persist(K.ownerPin, p); };
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const dName = (id) => drivers.find(d => d.id === id)?.name || id;
  const vName = (id) => vehicles.find(v => v.id === id)?.name || id;

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", background: C.bg, minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      {view === "login" && <LoginScreen drivers={drivers} ownerPin={ownerPin} onDriver={(d) => { setCurrentDriver(d); setView("driver"); }} onOwner={() => setView("owner")} />}
      {view === "driver" && <DriverScreen driver={currentDriver} vehicles={vehicles} records={records} saveRecords={saveRecords} showToast={showToast} onBack={() => setView("login")} vName={vName} />}
      {view === "owner" && <OwnerScreen drivers={drivers} vehicles={vehicles} records={records} saveDrivers={saveDrivers} saveVehicles={saveVehicles} saveRecords={saveRecords} ownerPin={ownerPin} saveOwnerPin={saveOwnerPin} onBack={() => setView("login")} dName={dName} vName={vName} showToast={showToast} />}
      {toast && <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: C.accent, color: "#000", padding: "12px 24px", borderRadius: 100, fontSize: 14, fontWeight: 700, zIndex: 999, whiteSpace: "nowrap" }}>{toast}</div>}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═════════════════════════════════════════════════════════════════════════════
function LoginScreen({ drivers, ownerPin, onDriver, onOwner }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const press = (d) => {
    if (d === "X") { setPin(p => p.slice(0, -1)); return; }
    const next = pin + d;
    setPin(next);
    setError("");
    if (next.length === 4) {
      if (next === ownerPin) { setPin(""); onOwner(); return; }
      const drv = drivers.find(dr => dr.pin === next);
      if (drv) { setPin(""); onDriver(drv); return; }
      setError("PIN incorrecto");
      setTimeout(() => setPin(""), 600);
    }
  };

  const keys = ["1","2","3","4","5","6","7","8","9","_","0","X"];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🚕</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: C.white }}>Mi Flota</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Ingresá tu PIN de 4 dígitos</div>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${C.accent}`, background: i < pin.length ? C.accent : "transparent", transition: "all .15s" }} />
        ))}
      </div>
      {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 12 }}>
        {keys.map((d, i) => (
          <button key={i} onClick={() => d !== "_" && press(d)}
            style={{ height: 72, background: d !== "_" ? C.surface : "transparent", border: d !== "_" ? `1px solid ${C.border}` : "none", borderRadius: 16, color: C.text, fontSize: d === "X" ? 18 : 24, cursor: d !== "_" ? "pointer" : "default", fontFamily: "'DM Mono', monospace" }}>
            {d === "X" ? "⌫" : d === "_" ? "" : d}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 32, fontSize: 11, color: C.muted, letterSpacing: 1 }}>DUEÑO: usá tu PIN de administrador</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// DRIVER SCREEN
// ═════════════════════════════════════════════════════════════════════════════
function DriverScreen({ driver, vehicles, records, saveRecords, showToast, onBack, vName }) {
  const [screen, setScreen] = useState("form");
  const [vehicleId, setVehicleId] = useState("");
  const [uberAmt, setUberAmt] = useState("");
  const [fuelAmt, setFuelAmt] = useState("");
  const [particular, setParticular] = useState("");
  const [uberImg, setUberImg] = useState(null);
  const [fuelImg, setFuelImg] = useState(null);
  const [uberPreview, setUberPreview] = useState("");
  const [fuelPreview, setFuelPreview] = useState("");
  const [loading, setLoading] = useState(false);

  const myRecords = records.filter(r => r.driverId === driver.id).sort((a, b) => b.date.localeCompare(a.date));
  const driverPct = (driver.pct ?? 40) / 100;
  const ownerPct = 1 - driverPct;
  const total = (parseFloat(uberAmt) || 0) + (parseFloat(particular) || 0);
  const fuel = parseFloat(fuelAmt) || 0;
  const neto = total - fuel;
  const ownerCut = neto * ownerPct;
  const driverCut = neto * driverPct;

  const handleImg = async (file, type) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const b64 = await toBase64(file);
    if (type === "uber") { setUberImg({ b64, mt: file.type }); setUberPreview(url); }
    else { setFuelImg({ b64, mt: file.type }); setFuelPreview(url); }
  };

  const calculate = async () => {
    if (!uberAmt && !uberImg) { showToast("Subí la foto de Uber o ingresá el monto"); return; }
    setLoading(true);
    try {
      let ua = parseFloat(uberAmt) || 0;
      let fa = parseFloat(fuelAmt) || 0;
      if (uberImg && !uberAmt) ua = await readImage(uberImg.b64, uberImg.mt, "uber");
      if (fuelImg && !fuelAmt) fa = await readImage(fuelImg.b64, fuelImg.mt, "fuel");
      setUberAmt(String(ua));
      setFuelAmt(String(fa));
      setScreen("confirm");
    } catch { showToast("Error al leer imágenes. Ingresá los montos manualmente."); }
    setLoading(false);
  };

  const submit = () => {
    const rec = {
      id: Date.now().toString(), date: arDate(), week: weekOf(arDate()),
      driverId: driver.id, vehicleId,
      uber: parseFloat(uberAmt) || 0, particular: parseFloat(particular) || 0,
      facturado: total, combustible: fuel, neto, ganancia: ownerCut, chofer: driverCut,
      driverPct: driver.pct ?? 40, submitted: new Date().toISOString(),
    };
    saveRecords([...records, rec]);
    showToast("Enviado al dueño ✓");
    setScreen("form");
    setVehicleId(""); setUberAmt(""); setFuelAmt(""); setParticular("");
    setUberImg(null); setFuelImg(null); setUberPreview(""); setFuelPreview("");
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ background: C.surface, padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase" }}>Chofer</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: C.white }}>{driver.name}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setScreen(screen === "history" ? "form" : "history")} style={{ background: C.hi, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 14px", color: C.text, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            {screen === "history" ? "← Cargar" : "Historial"}
          </button>
          <button onClick={onBack} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Salir</button>
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {screen === "history" && (
          <div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Mis registros</div>
            {myRecords.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No tenés registros aún</div>}
            {myRecords.map(r => (
              <div key={r.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{r.date}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{vName(r.vehicleId)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: C.teal }}>Tu parte</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.teal, fontFamily: "'Syne', sans-serif" }}>{fmt(r.chofer)}</div>
                  </div>
                </div>
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11 }}>
                  <div><div style={{ color: C.muted }}>Uber</div><div>{fmt(r.uber)}</div></div>
                  <div><div style={{ color: C.muted }}>Combustible</div><div style={{ color: C.red }}>{fmt(r.combustible)}</div></div>
                  <div><div style={{ color: C.muted }}>Neto</div><div>{fmt(r.neto)}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === "form" && (
          <div style={{ ...card, borderColor: C.accent + "33" }}>
            <div style={{ fontSize: 11, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Cargar turno de hoy</div>
            <label style={lbl}>Vehículo</label>
            <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} style={{ ...inp, marginBottom: 16 }}>
              <option value="">Seleccioná tu vehículo...</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <label style={lbl}>📱 Captura de Uber</label>
            <ImgUpload preview={uberPreview} label="Subir captura de Uber" onChange={f => handleImg(f, "uber")} />
            <label style={lbl}>Monto Uber $</label>
            <input type="number" value={uberAmt} onChange={e => setUberAmt(e.target.value)} placeholder={uberImg ? "La IA lo leerá de la foto" : "0"} style={{ ...inp, marginBottom: 16 }} />
            <label style={lbl}>🚗 Viajes particulares $ (opcional)</label>
            <input type="number" value={particular} onChange={e => setParticular(e.target.value)} placeholder="0" style={{ ...inp, marginBottom: 16 }} />
            <label style={lbl}>⛽ Ticket de combustible</label>
            <ImgUpload preview={fuelPreview} label="Subir foto del ticket" onChange={f => handleImg(f, "fuel")} />
            <label style={lbl}>Monto combustible $</label>
            <input type="number" value={fuelAmt} onChange={e => setFuelAmt(e.target.value)} placeholder={fuelImg ? "La IA lo leerá de la foto" : "0"} style={{ ...inp, marginBottom: 20 }} />
            {total > 0 && (
              <div style={{ background: C.bg, borderRadius: 10, padding: 12, marginBottom: 16, border: `1px solid ${C.border}` }}>
                <Row label="Neto" val={fmt(neto)} />
                <Row label={"Tu parte (" + (driver.pct ?? 40) + "%)"} val={fmt(driverCut)} color={C.teal} bold />
              </div>
            )}
            <button onClick={calculate} disabled={loading} style={{ ...btn(), opacity: loading ? 0.7 : 1 }}>
              {loading ? "Leyendo imágenes..." : "Calcular mis ganancias →"}
            </button>
          </div>
        )}

        {screen === "confirm" && (
          <div>
            <div style={{ fontSize: 11, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Confirmá los datos</div>
            <div style={card}>
              <Row label="Uber" val={fmt(parseFloat(uberAmt) || 0)} />
              <Row label="Particulares" val={fmt(parseFloat(particular) || 0)} />
              <Row label="Total facturado" val={fmt(total)} bold />
              <div style={{ borderTop: `1px solid ${C.border}`, margin: "10px 0" }} />
              <Row label="Combustible" val={fmt(fuel)} color={C.red} />
              <Row label="Neto" val={fmt(neto)} bold />
              <div style={{ borderTop: `1px solid ${C.border}`, margin: "10px 0" }} />
              <Row label={"Al dueño (" + Math.round(ownerPct * 100) + "%)"} val={fmt(ownerCut)} color={C.muted} />
              <Row label={"Tu parte (" + (driver.pct ?? 40) + "%)"} val={fmt(driverCut)} color={C.teal} bold />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setScreen("form")} style={{ ...btn(C.hi, C.text), flex: 1, border: `1px solid ${C.border}` }}>← Editar</button>
              <button onClick={submit} style={{ ...btn(), flex: 2 }}>Enviar al dueño ✓</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// OWNER SCREEN
// ═════════════════════════════════════════════════════════════════════════════
function OwnerScreen({ drivers, vehicles, records, saveDrivers, saveVehicles, saveRecords, ownerPin, saveOwnerPin, onBack, dName, vName, showToast }) {
  const [tab, setTab] = useState(0);
  const [filterWeek, setFilterWeek] = useState("todas");
  const [newDrv, setNewDrv] = useState({ name: "", pin: "", vehicleId: "", pct: "40" });
  const [newVeh, setNewVeh] = useState("");
  const [newOwnerPin, setNewOwnerPin] = useState(ownerPin);

  const weeks = [...new Set(records.map(r => r.week))].sort().reverse();
  const filtered = records.filter(r => filterWeek === "todas" || r.week === filterWeek);
  const totals = filtered.reduce((a, r) => ({ facturado: a.facturado + r.facturado, combustible: a.combustible + r.combustible, neto: a.neto + r.neto, ganancia: a.ganancia + r.ganancia }), { facturado: 0, combustible: 0, neto: 0, ganancia: 0 });

  const byDriver = drivers.map(d => {
    const rs = filtered.filter(r => r.driverId === d.id);
    return { ...d, total: rs.reduce((a, r) => a + r.facturado, 0), neto: rs.reduce((a, r) => a + r.neto, 0), debe: rs.reduce((a, r) => a + r.ganancia, 0), chofer: rs.reduce((a, r) => a + r.chofer, 0), dias: rs.length };
  }).filter(d => d.total > 0).sort((a, b) => b.neto - a.neto);

  const addDriver = () => {
    if (!newDrv.name.trim() || newDrv.pin.length !== 4) { showToast("Nombre y PIN de 4 dígitos requeridos"); return; }
    if (drivers.some(d => d.pin === newDrv.pin)) { showToast("Ese PIN ya existe"); return; }
    const pct = Math.min(100, Math.max(0, parseFloat(newDrv.pct) || 40));
    saveDrivers([...drivers, { id: Date.now().toString(), ...newDrv, pct }]);
    setNewDrv({ name: "", pin: "", vehicleId: "", pct: "40" });
    showToast("Chofer agregado ✓");
  };

  const updateDriver = (id, changes) => saveDrivers(drivers.map(d => d.id === id ? { ...d, ...changes } : d));

  const addVehicle = () => {
    if (!newVeh.trim()) return;
    saveVehicles([...vehicles, { id: Date.now().toString(), name: newVeh.trim() }]);
    setNewVeh(""); showToast("Vehículo agregado ✓");
  };

  const whatsapp = (d) => {
    const pct = d.pct ?? 40;
    const msg = "Hola " + d.name + "! 🚕\n\nResumen del período:\n• Facturado: " + fmt(d.total) + "\n• Neto: " + fmt(d.neto) + "\n• Tu parte (" + pct + "%): " + fmt(d.chofer) + "\n• *Me tenés que pasar: " + fmt(d.debe) + "*\n\nGracias! 👍";
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  };

  const sendReminder = () => {
    const yesterday = arDate(-1);
    const missing = drivers.filter(d => !records.some(r => r.driverId === d.id && r.date === yesterday));
    const loaded = drivers.filter(d => records.some(r => r.driverId === d.id && r.date === yesterday));
    const fechaStr = new Date(yesterday + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
    let msg = "📋 *Recordatorio - " + fechaStr + "*\n\n";
    if (missing.length === 0) {
      msg += "✅ Todos cargaron su resumen. ¡Gracias a todos!";
    } else {
      msg += "❌ *No cargaron aún:*\n" + missing.map(d => "• " + d.name).join("\n");
      if (loaded.length > 0) msg += "\n\n✅ *Ya cargaron:*\n" + loaded.map(d => "• " + d.name).join("\n");
      msg += "\n\nPor favor carguen su facturación de ayer 🙏";
    }
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  };

  const TABS = ["Dashboard", "Choferes", "Vehículos", "Config"];

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "16px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2, textTransform: "uppercase" }}>Panel del dueño</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: C.white }}>Mi Flota</div>
          </div>
          <button onClick={onBack} style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Salir</button>
        </div>
        <div style={{ display: "flex" }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ flex: 1, background: "none", border: "none", borderBottom: "2px solid " + (tab === i ? C.accent : "transparent"), color: tab === i ? C.accent : C.muted, padding: "10px 0", fontSize: 12, fontWeight: tab === i ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 20 }}>

        {tab === 0 && (
          <div>
            <button onClick={sendReminder} style={{ ...btn("#25d366", "#fff"), marginBottom: 16 }}>
              📲 Ver quién no cargó ayer → WhatsApp
            </button>
            <label style={lbl}>Filtrar por semana</label>
            <select value={filterWeek} onChange={e => setFilterWeek(e.target.value)} style={{ ...inp, marginBottom: 16 }}>
              <option value="todas">Todas las semanas</option>
              {weeks.map(w => <option key={w} value={w}>Semana del {w}</option>)}
            </select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[{ label: "Facturado", val: totals.facturado, color: C.text }, { label: "Combustible", val: totals.combustible, color: C.red }, { label: "Neto total", val: totals.neto, color: C.text }, { label: "Tu ganancia", val: totals.ganancia, color: C.accent }].map(c => (
                <div key={c.label} style={{ background: C.surface, borderRadius: 14, padding: 16, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: c.color, fontFamily: "'Syne', sans-serif" }}>{fmt(c.val)}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Lo que te debe cada chofer</div>
            {byDriver.length === 0 && <div style={{ textAlign: "center", padding: 30, color: C.muted }}>No hay registros en este período</div>}
            {byDriver.map((d, i) => (
              <div key={d.id} style={{ ...card, borderColor: i === 0 ? C.accent + "44" : C.border }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: C.white }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{d.dias} días · {d.pct ?? 40}% chofer</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: C.accent }}>Te debe</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800, color: C.accent }}>{fmt(d.debe)}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11, marginBottom: 12 }}>
                  <div><div style={{ color: C.muted }}>Facturado</div><div>{fmt(d.total)}</div></div>
                  <div><div style={{ color: C.muted }}>Neto</div><div>{fmt(d.neto)}</div></div>
                  <div><div style={{ color: C.teal }}>Su parte</div><div style={{ color: C.teal }}>{fmt(d.chofer)}</div></div>
                </div>
                <button onClick={() => whatsapp(d)} style={{ ...btn("#25d366", "#fff"), fontSize: 13 }}>📲 Enviar resumen por WhatsApp</button>
              </div>
            ))}
          </div>
        )}

        {tab === 1 && (
          <div>
            <div style={card}>
              <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Agregar chofer</div>
              <label style={lbl}>Nombre</label>
              <input value={newDrv.name} onChange={e => setNewDrv({ ...newDrv, name: e.target.value })} placeholder="Nombre completo" style={{ ...inp, marginBottom: 10 }} />
              <label style={lbl}>PIN (4 dígitos)</label>
              <input type="number" value={newDrv.pin} onChange={e => setNewDrv({ ...newDrv, pin: e.target.value.slice(0, 4) })} placeholder="Ej: 4821" style={{ ...inp, marginBottom: 10 }} />
              <label style={lbl}>Vehículo asignado (opcional)</label>
              <select value={newDrv.vehicleId} onChange={e => setNewDrv({ ...newDrv, vehicleId: e.target.value })} style={{ ...inp, marginBottom: 10 }}>
                <option value="">Sin asignar</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <label style={lbl}>Porcentaje del chofer (%)</label>
              <input type="number" min="0" max="100" value={newDrv.pct} onChange={e => setNewDrv({ ...newDrv, pct: e.target.value })} placeholder="40" style={{ ...inp, marginBottom: 6 }} />
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>El dueño recibe el {100 - (parseFloat(newDrv.pct) || 0)}%</div>
              <button onClick={addDriver} style={btn()}>+ Agregar chofer</button>
            </div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Choferes actuales</div>
            {drivers.map(d => (
              <DriverCard key={d.id} d={d} vehicles={vehicles} vName={vName} drivers={drivers}
                onUpdate={(changes) => updateDriver(d.id, changes)}
                onDelete={() => saveDrivers(drivers.filter(x => x.id !== d.id))}
                showToast={showToast} />
            ))}
          </div>
        )}

        {tab === 2 && (
          <div>
            <div style={card}>
              <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Agregar vehículo</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={newVeh} onChange={e => setNewVeh(e.target.value)} onKeyDown={e => e.key === "Enter" && addVehicle()} placeholder="Ej: Toyota Corolla ABC123" style={inp} />
                <button onClick={addVehicle} style={{ ...btn(), width: "auto", padding: "0 18px", flexShrink: 0 }}>+</button>
              </div>
            </div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Vehículos</div>
            {vehicles.map(v => (
              <div key={v.id} style={{ background: C.hi, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: C.white }}>{v.name}</span>
                <button onClick={() => saveVehicles(vehicles.filter(x => x.id !== v.id))} style={{ background: "none", border: "none", color: C.red + "88", fontSize: 20, cursor: "pointer" }}>×</button>
              </div>
            ))}
          </div>
        )}

        {tab === 3 && (
          <div>
            <div style={card}>
              <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Tu PIN de dueño</div>
              <label style={lbl}>Nuevo PIN (4 dígitos)</label>
              <input type="number" value={newOwnerPin} onChange={e => setNewOwnerPin(e.target.value.slice(0, 4))} placeholder="4 dígitos" style={{ ...inp, marginBottom: 12 }} />
              <button onClick={() => { if (newOwnerPin.length === 4) { saveOwnerPin(newOwnerPin); showToast("PIN actualizado ✓"); } else showToast("El PIN debe tener 4 dígitos"); }} style={btn()}>Guardar PIN</button>
            </div>
            <div style={{ ...card, borderColor: C.red + "44" }}>
              <div style={{ fontSize: 10, color: C.red, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Zona de peligro</div>
              <button onClick={() => { if (window.confirm("¿Borrar TODOS los registros? No se puede deshacer.")) { saveRecords([]); showToast("Registros eliminados"); } }} style={btn(C.red, C.white)}>Borrar todos los registros</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Driver Card ──────────────────────────────────────────────────────────────
function DriverCard({ d, vehicles, vName, onUpdate, onDelete, drivers, showToast }) {
  const [pctVal, setPctVal] = useState(String(d.pct ?? 40));
  const [pinVal, setPinVal] = useState(d.pin);

  const savePct = () => {
    const val = Math.min(100, Math.max(0, parseFloat(pctVal) || 40));
    onUpdate({ pct: val }); showToast("Porcentaje actualizado ✓");
  };

  const savePin = () => {
    if (pinVal.length !== 4) { showToast("El PIN debe tener 4 dígitos"); return; }
    if (drivers.some(dr => dr.id !== d.id && dr.pin === pinVal)) { showToast("Ese PIN ya lo usa otro chofer"); return; }
    onUpdate({ pin: pinVal }); showToast("PIN actualizado ✓");
  };

  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: C.white }}>{d.name}</div>
          <div style={{ fontSize: 11, color: C.muted }}>{d.vehicleId ? vName(d.vehicleId) : "Sin vehículo asignado"}</div>
        </div>
        <button onClick={onDelete} style={{ background: "none", border: "none", color: C.red + "88", fontSize: 22, cursor: "pointer" }}>×</button>
      </div>
      <div style={{ background: C.hi, borderRadius: 10, padding: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: C.accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>% del chofer</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" min="0" max="100" value={pctVal} onChange={e => setPctVal(e.target.value)} style={{ ...inp, width: 72, textAlign: "center", padding: "8px", fontSize: 18, fontWeight: 700, color: C.accent }} />
          <span style={{ color: C.muted, fontSize: 14 }}>%</span>
          <div style={{ flex: 1, fontSize: 11, color: C.muted }}>Dueño: {100 - (parseFloat(pctVal) || 0)}%</div>
          <button onClick={savePct} style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 14px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
        </div>
      </div>
      <div style={{ background: C.hi, borderRadius: 10, padding: 12 }}>
        <div style={{ fontSize: 10, color: C.teal, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>PIN de acceso</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="number" value={pinVal} onChange={e => setPinVal(e.target.value.slice(0, 4))} style={{ ...inp, width: 90, textAlign: "center", padding: "8px", fontSize: 18, fontWeight: 700, color: C.teal, letterSpacing: 4 }} />
          <button onClick={savePin} style={{ background: C.teal, border: "none", borderRadius: 8, padding: "8px 14px", color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────
function Row({ label, val, bold, color }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
      <span style={{ fontSize: 13, color: C.muted }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: bold ? 700 : 400, color: color || C.text }}>{val}</span>
    </div>
  );
}

function ImgUpload({ preview, label, onChange }) {
  const ref = useRef();
  return (
    <div style={{ marginBottom: 12 }}>
      <div onClick={() => ref.current.click()} style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: preview ? 4 : 20, textAlign: "center", cursor: "pointer", background: C.hi, overflow: "hidden" }}>
        {preview ? <img src={preview} alt="" style={{ width: "100%", borderRadius: 8, maxHeight: 160, objectFit: "cover" }} /> : <div style={{ color: C.muted, fontSize: 13 }}>📸 {label}</div>}
      </div>
      <input ref={ref} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => e.target.files[0] && onChange(e.target.files[0])} />
    </div>
  );
}

