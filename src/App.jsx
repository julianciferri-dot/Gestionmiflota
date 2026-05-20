import { useState, useEffect, useRef } from "react";

const SUPA_URL = "https://jlkvrjaojvncwzwzdurx.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impsa3ZyamFvanZuY3d6d3pkdXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNjAxMjMsImV4cCI6MjA5NDYzNjEyM30.pBKoWOrcqcLog_nOiwYaZeQI_23X2bwe3FVghc71A2o";

const supa = async (path, method = "GET", body = null) => {
  const headers = {
    "apikey": SUPA_KEY,
    "Authorization": "Bearer " + SUPA_KEY,
    "Content-Type": "application/json",
  };
  if (method === "POST") headers["Prefer"] = "return=representation";
  if (method === "PATCH") headers["Prefer"] = "return=representation";
  const res = await fetch(SUPA_URL + "/rest/v1/" + path, {
    method, headers, body: body ? JSON.stringify(body) : null,
  });
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  if (!text) return null;
  return JSON.parse(text);
};

const db = {
  get: (table, query = "") => supa(`${table}?${query}`),
  insert: (table, data) => supa(table, "POST", data),
  update: (table, id, data) => supa(`${table}?id=eq.${id}`, "PATCH", data),
  delete: (table, id) => supa(`${table}?id=eq.${id}`, "DELETE"),
};

const DEFAULT_VEHICLES = [
  { id: "v1", name: "Volkswagen Virtus AH401ZN", type: "own", owner_pct: 100 },
  { id: "v2", name: "Fiat Cronos AH668PJ", type: "own", owner_pct: 100 },
  { id: "v3", name: "Chevrolet Prisma AB331TM", type: "own", owner_pct: 100 },
  { id: "v4", name: "Volkswagen Gol Trend PQX715", type: "own", owner_pct: 100 },
  { id: "v5", name: "Fiat Cronos AH692DD", type: "third", owner_pct: 25 },
  { id: "v6", name: "Nissan Versa AC432BM", type: "third", owner_pct: 25 },
  { id: "v7", name: "Toyota Corolla NAA803", type: "third", owner_pct: 25 },
  { id: "v8", name: "Volkswagen Gol Trend AC387NY", type: "third", owner_pct: 30 },
];

const fmt = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n || 0);

const arDate = (offsetDays = 0) => {
  const now = new Date();
  const ar = new Date(now.getTime() + (-3 * 60 - now.getTimezoneOffset()) * 60000 + offsetDays * 86400000);
  return ar.toISOString().split("T")[0];
};

const monthOf = (d) => d.slice(0, 7);

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

const OWNER_PIN = "1803";
const getOwnerPin = () => OWNER_PIN;

const C = {
  bg: "#070b14", surface: "#0e1525", hi: "#151f35",
  border: "#1e2d50", accent: "#f59e0b", teal: "#14b8a6",
  red: "#f43f5e", text: "#e2e8f0", muted: "#64748b", white: "#fff",
};

const inp = { background: C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" };
const lbl = { display: "block", fontSize: 10, letterSpacing: 2, color: C.muted, textTransform: "uppercase", marginBottom: 6, fontWeight: 600 };
const card = { background: C.surface, borderRadius: 16, padding: 18, border: "1px solid " + C.border, marginBottom: 12 };
const btn = (bg, fg) => ({ width: "100%", background: bg || C.accent, border: "none", borderRadius: 12, padding: 14, color: fg || "#000", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" });

export default function App() {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [records, setRecords] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [dayoffs, setDayoffs] = useState([]);
  const [ownerPin, setOwnerPinState] = useState(getOwnerPin());
  const [view, setView] = useState("login");
  const [currentDriver, setCurrentDriver] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, v, r, e, o] = await Promise.all([
        db.get("drivers").catch(() => []),
        db.get("vehicles").catch(() => []),
        db.get("records").catch(() => []),
        db.get("expenses").catch(() => []),
        db.get("dayoffs").catch(() => []),
      ]);
      setDrivers(d || []);
      if (!v || v.length === 0) {
        try { await Promise.all(DEFAULT_VEHICLES.map(veh => db.insert("vehicles", veh))); } catch {}
        setVehicles(DEFAULT_VEHICLES);
      } else { setVehicles(v); }
      setRecords(r || []);
      setExpenses(e || []);
      setDayoffs(o || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const dName = (id) => drivers.find(d => d.id === id)?.name || id;
  const vName = (id) => vehicles.find(v => v.id === id)?.name || id;

  if (loading) return (
    <div style={{ fontFamily: "'DM Mono', monospace", background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <div style={{ fontSize: 44, marginBottom: 16 }}>🚕</div>
      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 12 }}>Mi Flota</div>
      <div style={{ color: C.muted, fontSize: 13 }}>Conectando...</div>
    </div>
  );

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", background: C.bg, minHeight: "100vh", maxWidth: 480, margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      {view === "login" && <LoginScreen drivers={drivers} ownerPin={ownerPin} onDriver={(d) => { setCurrentDriver(d); setView("driver"); }} onOwner={() => setView("owner")} />}
      {view === "driver" && <DriverScreen driver={currentDriver} vehicles={vehicles} records={records} dayoffs={dayoffs} setDayoffs={setDayoffs} setRecords={setRecords} showToast={showToast} onBack={() => setView("login")} vName={vName} />}
      {view === "owner" && <OwnerScreen drivers={drivers} vehicles={vehicles} records={records} expenses={expenses} dayoffs={dayoffs} setDrivers={setDrivers} setVehicles={setVehicles} setRecords={setRecords} setExpenses={setExpenses} setDayoffs={setDayoffs} ownerPin={ownerPin} saveOwnerPin={setOwnerPinState} onBack={() => setView("login")} dName={dName} vName={vName} showToast={showToast} reload={loadAll} />}
      {toast && <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", background: C.accent, color: "#000", padding: "12px 24px", borderRadius: 100, fontSize: 14, fontWeight: 700, zIndex: 999, whiteSpace: "nowrap" }}>{toast}</div>}
    </div>
  );
}

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

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🚕</div>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800, color: C.white }}>Mi Flota</div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Ingresá tu PIN de 4 dígitos</div>
      </div>
      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        {[0,1,2,3].map(i => <div key={i} style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid " + C.accent, background: i < pin.length ? C.accent : "transparent", transition: "all .15s" }} />)}
      </div>
      {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 16 }}>{error}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 72px)", gap: 12 }}>
        {["1","2","3","4","5","6","7","8","9","_","0","X"].map((d, i) => (
          <button key={i} onClick={() => d !== "_" && press(d)}
            style={{ height: 72, background: d !== "_" ? C.surface : "transparent", border: d !== "_" ? "1px solid " + C.border : "none", borderRadius: 16, color: C.text, fontSize: d === "X" ? 18 : 24, cursor: d !== "_" ? "pointer" : "default", fontFamily: "'DM Mono', monospace" }}>
            {d === "X" ? "⌫" : d === "_" ? "" : d}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 32, fontSize: 11, color: C.muted, letterSpacing: 1 }}>DUEÑO: usá tu PIN de administrador</div>
    </div>
  );
}

function DriverScreen({ driver, vehicles, records, dayoffs, setDayoffs, setRecords, showToast, onBack, vName }) {
  const [screen, setScreen] = useState("form");
  const [vehicleId, setVehicleId] = useState("");
  const [uberAmt, setUberAmt] = useState("");
  const [fuelAmt, setFuelAmt] = useState("");
  const [particular, setParticular] = useState("");
  const [uberPreview, setUberPreview] = useState("");
  const [fuelPreview, setFuelPreview] = useState("");
  const [selectedDate, setSelectedDate] = useState(arDate());

  const myRecords = records.filter(r => r.driver_id === driver.id).sort((a, b) => b.date.localeCompare(a.date));
  const driverPct = (driver.pct ?? 40) / 100;
  const parseAmt = (v) => parseFloat((v || "0").toString().replace(/\./g, "").replace(",", ".")) || 0;
  const total = parseAmt(uberAmt) + parseAmt(particular);
  const fuel = parseAmt(fuelAmt);
  const neto = total - fuel;
  const driverCut = neto * driverPct;
  const ownerCut = neto * (1 - driverPct);
  const todayStr = arDate();
  const hasDayoff = dayoffs.some(d => d.driver_id === driver.id && d.date === todayStr);

  const toggleDayoff = async () => {
    if (hasDayoff) {
      const d = dayoffs.find(o => o.driver_id === driver.id && o.date === todayStr);
      await db.delete("dayoffs", d.id);
      setDayoffs(dayoffs.filter(o => o.id !== d.id));
    } else {
      const newD = { id: Date.now().toString(), driver_id: driver.id, date: todayStr };
      await db.insert("dayoffs", newD);
      setDayoffs([...dayoffs, newD]);
      showToast("Franco marcado ✓");
    }
  };

  const handleImg = async (file, type) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === "uber") setUberPreview(url);
    else setFuelPreview(url);
  };

  const submit = async () => {
    const rec = {
      id: Date.now().toString(), date: selectedDate, week: weekOf(selectedDate), month: monthOf(selectedDate),
      driver_id: driver.id, vehicle_id: vehicleId,
      uber: parseAmt(uberAmt), particular: parseAmt(particular),
      facturado: total, combustible: fuel, neto, ganancia: ownerCut, chofer: driverCut,
      driver_pct: driver.pct ?? 40,
    };
    try {
      await db.insert("records", rec);
      setRecords(prev => [...prev, rec]);
      showToast("Enviado al dueño ✓");
      setScreen("form");
      setVehicleId(""); setUberAmt(""); setFuelAmt(""); setParticular(""); setSelectedDate(arDate());
      setUberPreview(""); setFuelPreview("");
    } catch { showToast("Error al guardar. Intentá de nuevo."); }
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ background: C.surface, padding: "16px 20px", borderBottom: "1px solid " + C.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase" }}>Chofer</div>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: C.white }}>{driver.name}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setScreen(screen === "history" ? "form" : "history")} style={{ background: C.hi, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 14px", color: C.text, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
            {screen === "history" ? "← Cargar" : "Historial"}
          </button>
          <button onClick={onBack} style={{ background: "none", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Salir</button>
        </div>
      </div>
      <div style={{ padding: 20 }}>
        {screen === "form" && (
          hasDayoff ? (
            <div style={{ background: C.hi, border: "1px solid " + C.teal + "44", borderRadius: 12, padding: 14, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: C.teal, fontWeight: 700 }}>✅ Hoy marcado como franco</div>
                <div style={{ fontSize: 11, color: C.muted }}>No aparecerás en el recordatorio</div>
              </div>
              <button onClick={toggleDayoff} style={{ background: "none", border: "1px solid " + C.border, borderRadius: 8, padding: "6px 12px", color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Quitar</button>
            </div>
          ) : (
            <button onClick={toggleDayoff} style={{ ...btn(C.hi, C.teal), border: "1px solid " + C.teal + "44", marginBottom: 16, fontSize: 13 }}>
              🏖️ Marcar hoy como franco
            </button>
          )
        )}

        {screen === "history" && (
          <div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Mis registros</div>
            {myRecords.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No tenés registros aún</div>}
            {myRecords.map(r => (
              <div key={r.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.white }}>{r.date}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{vName(r.vehicle_id)}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: C.teal }}>Tu parte</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.teal, fontFamily: "'Syne', sans-serif" }}>{fmt(r.chofer)}</div>
                    </div>
                    <button onClick={async () => {
                      if (!window.confirm("¿Borrar este registro?")) return;
                      try { await db.delete("records", r.id); setRecords(prev => prev.filter(x => x.id !== r.id)); }
                      catch { showToast("Error al borrar"); }
                    }} style={{ background: "none", border: "none", color: C.red + "88", fontSize: 20, cursor: "pointer", paddingTop: 2 }}>×</button>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid " + C.border, paddingTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11 }}>
                  <div><div style={{ color: C.muted }}>Uber</div><div style={{ color: C.white, fontWeight: 600 }}>{fmt(r.uber)}</div></div>
                  <div><div style={{ color: C.muted }}>Combustible</div><div style={{ color: C.red, fontWeight: 600 }}>{fmt(r.combustible)}</div></div>
                  <div><div style={{ color: C.muted }}>Neto</div><div style={{ color: C.white, fontWeight: 600 }}>{fmt(r.neto)}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {screen === "form" && (
          <div style={{ ...card, borderColor: C.accent + "33" }}>
            <div style={{ fontSize: 11, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Cargar turno de hoy</div>
            <label style={lbl}>Fecha</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ ...inp, marginBottom: 16 }} />
            <label style={lbl}>Vehículo</label>
            <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} style={{ ...inp, marginBottom: 16 }}>
              <option value="">Seleccioná tu vehículo...</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <label style={lbl}>📱 Captura de Uber</label>
            <ImgUpload preview={uberPreview} label="Subir captura de Uber" onChange={f => handleImg(f, "uber")} />
            <label style={lbl}>Monto Uber $</label>
            <input type="text" inputMode="numeric" value={uberAmt} onChange={e => {
              const raw = e.target.value.replace(/\D/g, "");
              setUberAmt(raw ? Number(raw).toLocaleString("es-AR") : "");
            }} placeholder="0" style={{ ...inp, marginBottom: 16 }} />
            <label style={lbl}>🚗 Viajes particulares $ (opcional)</label>
            <input type="text" inputMode="numeric" value={particular} onChange={e => {
              const raw = e.target.value.replace(/\D/g, "");
              setParticular(raw ? Number(raw).toLocaleString("es-AR") : "");
            }} placeholder="0" style={{ ...inp, marginBottom: 16 }} />
            <label style={lbl}>⛽ Ticket de combustible</label>
            <ImgUpload preview={fuelPreview} label="Subir foto del ticket" onChange={f => handleImg(f, "fuel")} />
            <label style={lbl}>Monto combustible $</label>
            <input type="text" inputMode="numeric" value={fuelAmt} onChange={e => {
              const raw = e.target.value.replace(/\D/g, "");
              setFuelAmt(raw ? Number(raw).toLocaleString("es-AR") : "");
            }} placeholder="0" style={{ ...inp, marginBottom: 20 }} />
            {total > 0 && (
              <div style={{ background: C.bg, borderRadius: 10, padding: 12, marginBottom: 16, border: "1px solid " + C.border }}>
                <Row label="Neto" val={fmt(neto)} />
                <Row label={"Tu parte (" + (driver.pct ?? 40) + "%)"} val={fmt(driverCut)} color={C.teal} bold />
              </div>
            )}
            <button onClick={() => setScreen("confirm")} style={btn()}>Calcular mis ganancias →</button>
          </div>
        )}

        {screen === "confirm" && (
          <div>
            <div style={{ fontSize: 11, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Confirmá los datos</div>
            <div style={card}>
              <Row label="Uber" val={fmt(parseAmt(uberAmt))} />
              <Row label="Particulares" val={fmt(parseAmt(particular))} />
              <Row label="Total facturado" val={fmt(total)} bold />
              <div style={{ borderTop: "1px solid " + C.border, margin: "10px 0" }} />
              <Row label="Combustible" val={fmt(fuel)} color={C.red} />
              <Row label="Neto" val={fmt(neto)} bold />
              <div style={{ borderTop: "1px solid " + C.border, margin: "10px 0" }} />
              <Row label={"Al dueño (" + Math.round((1 - driverPct) * 100) + "%)"} val={fmt(ownerCut)} color={C.muted} />
              <Row label={"Tu parte (" + (driver.pct ?? 40) + "%)"} val={fmt(driverCut)} color={C.teal} bold />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setScreen("form")} style={{ ...btn(C.hi, C.text), flex: 1, border: "1px solid " + C.border }}>← Editar</button>
              <button onClick={submit} style={{ ...btn(), flex: 2 }}>Enviar al dueño ✓</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OwnerScreen({ drivers, vehicles, records, expenses, dayoffs, setDrivers, setVehicles, setRecords, setExpenses, setDayoffs, ownerPin, saveOwnerPin, onBack, dName, vName, showToast, reload }) {
  const TABS = ["Dashboard", "Vehículos", "Choferes", "Planilla", "Gastos", "Config"];
  const [tab, setTab] = useState(0);
  const [period, setPeriod] = useState("dia");
  const [filterDay, setFilterDay] = useState(arDate());
  const [planillaWeek, setPlanillaWeek] = useState(weekOf(arDate()));
  const [filterWeek, setFilterWeek] = useState(weekOf(arDate()));
  const [filterMonth, setFilterMonth] = useState(monthOf(arDate()));
  const [newDrv, setNewDrv] = useState({ name: "", pin: "", vehicle_id: "", pct: "40" });
  const [newOwnerPin, setNewOwnerPin] = useState(ownerPin);
  const [newExpense, setNewExpense] = useState({ vehicle_id: "", category: "mecanico", description: "", amount: "", date: arDate() });

  const weeks = [...new Set(records.map(r => r.week))].sort().reverse();
  const months = [...new Set(records.map(r => r.month || r.date.slice(0,7)))].sort().reverse();

  const filtered = records.filter(r => {
    if (period === "dia") return r.date === filterDay;
    if (period === "semana") return r.week === filterWeek;
    return (r.month || r.date.slice(0,7)) === filterMonth;
  });

  const filteredExp = expenses.filter(e => {
    if (period === "dia") return e.date === filterDay;
    if (period === "semana") return weekOf(e.date) === filterWeek;
    return e.date.slice(0,7) === filterMonth;
  });

  const vStats = vehicles.map(v => {
    const rs = filtered.filter(r => r.vehicle_id === v.id);
    const exps = filteredExp.filter(e => e.vehicle_id === v.id);
    const facturado = rs.reduce((a, r) => a + Number(r.facturado), 0);
    const combustible = rs.reduce((a, r) => a + Number(r.combustible), 0);
    const neto = rs.reduce((a, r) => a + Number(r.neto), 0);
    const totalChofer = rs.reduce((a, r) => a + Number(r.chofer), 0);
    const otrosGastos = exps.reduce((a, e) => a + Number(e.amount), 0);
    const ownerPct = Number(v.owner_pct) || 100;
    const gananciaBruta = neto - totalChofer;
    const gananciaBase = v.type === "own" ? gananciaBruta : (gananciaBruta * ownerPct / 100);
    const gananciaReal = gananciaBase - otrosGastos;
    const choferes = [...new Set(rs.map(r => r.driver_id))];
    return { ...v, facturado, combustible, neto, totalChofer, otrosGastos, gananciaBase, gananciaReal, dias: rs.length, choferes, records: rs };
  });

  const totalGanancia = vStats.reduce((a, v) => a + v.gananciaReal, 0);
  const totalFacturado = vStats.reduce((a, v) => a + v.facturado, 0);
  const totalGastos = filteredExp.reduce((a, e) => a + Number(e.amount), 0);

  const dStats = drivers.map(d => {
    const rs = filtered.filter(r => r.driver_id === d.id);
    const fac = rs.reduce((a, r) => a + Number(r.facturado), 0);
    return { ...d, facturado: fac, combustible: rs.reduce((a, r) => a + Number(r.combustible), 0), neto: rs.reduce((a, r) => a + Number(r.neto), 0), chofer: rs.reduce((a, r) => a + Number(r.chofer), 0), debe: rs.reduce((a, r) => a + Number(r.ganancia), 0), dias: rs.length, promDiario: rs.length > 0 ? fac / rs.length : 0 };
  }).filter(d => d.facturado > 0).sort((a, b) => b.facturado - a.facturado);

  const addDriver = async () => {
    if (!newDrv.name.trim() || newDrv.pin.length !== 4) { showToast("Nombre y PIN de 4 dígitos requeridos"); return; }
    if (drivers.some(d => d.pin === newDrv.pin)) { showToast("Ese PIN ya existe"); return; }
    const pct = Math.min(100, Math.max(0, parseFloat(newDrv.pct) || 40));
    const d = { id: Date.now().toString(), ...newDrv, pct };
    try { await db.insert("drivers", d); setDrivers(prev => [...prev, d]); setNewDrv({ name: "", pin: "", vehicle_id: "", pct: "40" }); showToast("Chofer agregado ✓"); }
    catch { showToast("Error al agregar chofer"); }
  };

  const deleteDriver = async (id) => { await db.delete("drivers", id); setDrivers(prev => prev.filter(d => d.id !== id)); };
  const updateDriver = async (id, changes) => { await db.update("drivers", id, changes); setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...changes } : d)); };

  const addExpense = async () => {
    if (!newExpense.vehicle_id || !newExpense.amount) { showToast("Completá todos los campos"); return; }
    const e = { id: Date.now().toString(), ...newExpense, amount: parseFloat(newExpense.amount) || 0 };
    try { await db.insert("expenses", e); setExpenses(prev => [...prev, e]); setNewExpense({ vehicle_id: "", category: "mecanico", description: "", amount: "", date: arDate() }); showToast("Gasto registrado ✓"); }
    catch { showToast("Error al guardar gasto"); }
  };

  const deleteExpense = async (id) => { await db.delete("expenses", id); setExpenses(prev => prev.filter(e => e.id !== id)); };

  const toggleDayoff = async (driverId, dateStr) => {
    const existing = dayoffs.find(o => o.driver_id === driverId && o.date === dateStr);
    if (existing) { await db.delete("dayoffs", existing.id); setDayoffs(prev => prev.filter(o => o.id !== existing.id)); }
    else { const newD = { id: Date.now().toString(), driver_id: driverId, date: dateStr }; await db.insert("dayoffs", newD); setDayoffs(prev => [...prev, newD]); }
  };

  const sendReminder = () => {
    const yesterday = arDate(-1);
    const withDayoff = drivers.filter(d => dayoffs.some(o => o.driver_id === d.id && o.date === yesterday));
    const loaded = drivers.filter(d => records.some(r => r.driver_id === d.id && r.date === yesterday));
    const missing = drivers.filter(d => !records.some(r => r.driver_id === d.id && r.date === yesterday) && !dayoffs.some(o => o.driver_id === d.id && o.date === yesterday));
    const fechaStr = new Date(yesterday + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
    let msg = "📋 *Recordatorio - " + fechaStr + "*\n\n";
    if (missing.length === 0) msg += "✅ ¡Todos cargaron o tenían franco! Gracias.";
    else msg += "❌ *No cargaron aún:*\n" + missing.map(d => "• " + d.name).join("\n");
    if (loaded.length > 0) msg += "\n\n✅ *Ya cargaron:*\n" + loaded.map(d => "• " + d.name).join("\n");
    if (withDayoff.length > 0) msg += "\n\n🏖️ *Franco:*\n" + withDayoff.map(d => "• " + d.name).join("\n");
    if (missing.length > 0) msg += "\n\nPor favor carguen su facturación de ayer 🙏";
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  };

  const whatsappDriver = (d, dayFilter) => {
    const dRecords = dayFilter
      ? records.filter(r => r.driver_id === d.id && r.date === dayFilter)
      : filtered.filter(r => r.driver_id === d.id);
    if (dRecords.length === 0) { alert("No hay registros para este período"); return; }
    const fact = dRecords.reduce((a, r) => a + Number(r.facturado), 0);
    const comb = dRecords.reduce((a, r) => a + Number(r.combustible), 0);
    const neto = dRecords.reduce((a, r) => a + Number(r.neto), 0);
    const choferPart = dRecords.reduce((a, r) => a + Number(r.chofer), 0);
    const debe = dRecords.reduce((a, r) => a + Number(r.ganancia), 0);
    const periodoLabel = dayFilter ? dayFilter : (period === "dia" ? filterDay : period === "semana" ? "Semana del " + filterWeek : filterMonth);
    const msg = [
      "Hola " + d.name + "! 🚕",
      "",
      "📅 *" + periodoLabel + "*",
      "",
      "• Facturado: " + fmt(fact),
      "• Combustible: " + fmt(comb),
      "• Neto: " + fmt(neto),
      "• Tu parte (" + (d.pct ?? 40) + "%): " + fmt(choferPart),
      "• *Me tenés que pasar: " + fmt(debe) + "*",
      "",
      "Gracias! 👍",
    ].join("\n");
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  };

  const catLabel = (c) => ({ mecanico: "🔧 Mecánico", repuesto: "⚙️ Repuesto", manoobra: "👷 Mano de obra", otro: "📦 Otro" })[c] || c;

  return (
    <div style={{ minHeight: "100vh" }}>
      <div style={{ background: C.surface, borderBottom: "1px solid " + C.border, padding: "16px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2, textTransform: "uppercase" }}>Panel del dueño</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800, color: C.white }}>Mi Flota</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={reload} style={{ background: C.hi, border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.teal, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>↻</button>
            <button onClick={onBack} style={{ background: "none", border: "1px solid " + C.border, borderRadius: 8, padding: "8px 12px", color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Salir</button>
          </div>
        </div>
        <div style={{ display: "flex", overflowX: "auto" }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ flex: "0 0 auto", background: "none", border: "none", borderBottom: "2px solid " + (tab === i ? C.accent : "transparent"), color: tab === i ? C.accent : C.muted, padding: "10px 14px", fontSize: 12, fontWeight: tab === i ? 700 : 400, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 20 }}>
        {tab < 3 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {["dia","semana","mes"].map((p, i) => (
                <button key={p} onClick={() => setPeriod(p)} style={{ flex: 1, background: period === p ? C.accent : C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: "10px", color: period === p ? "#000" : C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {["Día","Semana","Mes"][i]}
                </button>
              ))}
            </div>
            {period === "dia" && <input type="date" value={filterDay} onChange={e => setFilterDay(e.target.value)} style={inp} />}
            {period === "semana" && (
              <select value={filterWeek} onChange={e => setFilterWeek(e.target.value)} style={inp}>
                {weeks.length === 0 && <option value={weekOf(arDate())}>Semana actual</option>}
                {weeks.map(w => <option key={w} value={w}>Semana del {w}</option>)}
              </select>
            )}
            {period === "mes" && (
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={inp}>
                {months.length === 0 && <option value={monthOf(arDate())}>{monthOf(arDate())}</option>}
                {months.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            )}
          </div>
        )}

        {tab === 0 && (
          <div>
            <button onClick={sendReminder} style={{ ...btn("#25d366", "#fff"), marginBottom: 16 }}>
              📲 Ver quién no cargó ayer → WhatsApp
            </button>
            <DayoffCard drivers={drivers} dayoffs={dayoffs} toggleDayoff={toggleDayoff} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[
                { label: "Facturado total", val: totalFacturado, color: C.text },
                { label: "Gastos mecánicos", val: totalGastos, color: C.red },
                { label: "Mi ganancia", val: totalGanancia, color: C.accent },
                { label: "Vehículos activos", val: vStats.filter(v => v.dias > 0).length, color: C.teal, isNum: true },
              ].map(c => (
                <div key={c.label} style={{ background: C.surface, borderRadius: 14, padding: 16, border: "1px solid " + C.border }}>
                  <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: c.color, fontFamily: "'Syne', sans-serif" }}>{c.isNum ? c.val : fmt(c.val)}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Ranking de vehículos</div>
            {vStats.filter(v => v.dias > 0).sort((a,b) => b.gananciaReal - a.gananciaReal).map((v, i) => (
              <div key={v.id} style={{ ...card, borderColor: i === 0 ? C.accent + "44" : C.border }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: v.type === "own" ? C.teal : C.accent, marginBottom: 2 }}>{v.type === "own" ? "🚗 Propio" : "🤝 Tercero " + v.owner_pct + "%"}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 700, color: C.white }}>{v.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: C.accent }}>Mi ganancia</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: C.accent }}>{fmt(v.gananciaReal)}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11, marginBottom: v.records.length > 0 ? 10 : 0 }}>
                  <div><div style={{ color: C.muted }}>Facturado</div><div>{fmt(v.facturado)}</div></div>
                  <div><div style={{ color: C.muted }}>Gastos</div><div style={{ color: C.red }}>{fmt(v.otrosGastos)}</div></div>
                  <div><div style={{ color: C.muted }}>Días</div><div>{v.dias}</div></div>
                </div>
                {v.records.length > 0 && (
                  <div style={{ borderTop: "1px solid " + C.border, paddingTop: 8 }}>
                    {v.records.map(r => {
                      const ownerPct = Number(v.owner_pct) || 100;
                      const gananciaBruta = Number(r.ganancia);
                      const myGain = v.type === "own" ? gananciaBruta : (gananciaBruta * ownerPct / 100);
                      return (
                        <div key={r.id} style={{ background: C.bg, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ color: C.text, fontWeight: 600, fontSize: 13 }}>{dName(r.driver_id)}</div>
                              <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>{r.date}</div>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, fontSize: 11 }}>
                                <div><span style={{ color: C.muted }}>Fact: </span><span>{fmt(r.facturado)}</span></div>
                                <div><span style={{ color: C.muted }}>Comb: </span><span style={{ color: C.red }}>{fmt(r.combustible)}</span></div>
                                <div><span style={{ color: C.muted }}>Neto: </span><span>{fmt(r.neto)}</span></div>
                              </div>
                              <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 11 }}>
                                <span style={{ color: C.muted }}>{"Chofer (" + r.driver_pct + "%): "}</span><span style={{ color: C.teal }}>{fmt(r.chofer)}</span>
                                <span style={{ color: C.muted }}>{"Tuyo: "}</span><span style={{ color: C.accent, fontWeight: 700 }}>{fmt(myGain)}</span>
                              </div>
                            </div>
                            <button onClick={async () => {
                              if (!window.confirm("¿Borrar este registro?")) return;
                              try { await db.delete("records", r.id); setRecords(prev => prev.filter(x => x.id !== r.id)); }
                              catch { showToast("Error al borrar"); }
                            }} style={{ background: "none", border: "none", color: C.red + "88", fontSize: 20, cursor: "pointer", flexShrink: 0 }}>×</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {vStats.filter(v => v.dias > 0).length === 0 && <div style={{ textAlign: "center", padding: 30, color: C.muted }}>Sin registros en este período</div>}
          </div>
        )}

        {tab === 1 && (
          <div>
            {vStats.map(v => (
              <div key={v.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: v.type === "own" ? C.teal : C.accent, marginBottom: 2 }}>{v.type === "own" ? "🚗 PROPIO" : "🤝 TERCERO · " + v.owner_pct + "% tuyo"}</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: C.white }}>{v.name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: C.accent }}>Mi ganancia</div>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: C.accent }}>{fmt(v.gananciaReal)}</div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  {[
                    { label: "Facturado", val: fmt(v.facturado), color: C.text },
                    { label: "Combustible", val: fmt(v.combustible), color: C.red },
                    { label: "Gastos mecánicos", val: fmt(v.otrosGastos), color: C.red },
                    { label: "Ganancia bruta", val: fmt(v.gananciaBase), color: C.muted },
                  ].map(s => (
                    <div key={s.label} style={{ background: C.bg, borderRadius: 8, padding: 10 }}>
                      <div style={{ fontSize: 9, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: s.color }}>{s.val}</div>
                    </div>
                  ))}
                </div>
                {v.choferes.length > 0 && (
                  <div style={{ borderTop: "1px solid " + C.border, paddingTop: 10 }}>
                    <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Choferes</div>
                    {v.choferes.map(dId => {
                      const drs = v.records.filter(r => r.driver_id === dId);
                      const dn = drs.reduce((a, r) => a + Number(r.neto), 0);
                      const dc = drs.reduce((a, r) => a + Number(r.chofer), 0);
                      return (
                        <div key={dId} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid " + C.border, fontSize: 12 }}>
                          <div>
                            <div style={{ color: C.white }}>{dName(dId)}</div>
                            <div style={{ color: C.muted, fontSize: 11 }}>{drs.length} días · Neto {fmt(dn)}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ color: C.teal, fontWeight: 600 }}>{fmt(dc)}</div>
                            <div style={{ color: C.muted, fontSize: 11 }}>su parte</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {v.dias === 0 && <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: 10 }}>Sin actividad en este período</div>}
              </div>
            ))}
          </div>
        )}

        {tab === 2 && (
          <div>
            <div style={{ ...card, marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Agregar chofer</div>
              <label style={lbl}>Nombre</label>
              <input value={newDrv.name} onChange={e => setNewDrv({ ...newDrv, name: e.target.value })} placeholder="Nombre completo" style={{ ...inp, marginBottom: 10 }} />
              <label style={lbl}>PIN (4 dígitos)</label>
              <input type="number" value={newDrv.pin} onChange={e => setNewDrv({ ...newDrv, pin: e.target.value.slice(0, 4) })} placeholder="Ej: 4821" style={{ ...inp, marginBottom: 10 }} />
              <label style={lbl}>Porcentaje del chofer (%)</label>
              <input type="number" min="0" max="100" value={newDrv.pct} onChange={e => setNewDrv({ ...newDrv, pct: e.target.value })} placeholder="40" style={{ ...inp, marginBottom: 6 }} />
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 14 }}>El dueño recibe el {100 - (parseFloat(newDrv.pct) || 0)}%</div>
              <button onClick={addDriver} style={btn()}>+ Agregar chofer</button>
            </div>
            {dStats.length > 0 && (
              <div>
                <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Estadísticas del período</div>
                {dStats.map((d, i) => (
                  <div key={d.id} style={{ ...card, borderColor: i === 0 ? C.accent + "44" : C.border }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                      <div>
                        {i === 0 && <div style={{ fontSize: 10, color: C.accent, marginBottom: 2 }}>⭐ MÁS FACTURÓ</div>}
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: C.white }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: C.muted }}>{d.dias} días · Prom {fmt(d.promDiario)}/día</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: C.accent }}>Te debe</div>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: C.accent }}>{fmt(d.debe)}</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 11, marginBottom: 12 }}>
                      <div><div style={{ color: C.muted }}>Facturado</div><div style={{ color: C.white, fontWeight: 600 }}>{fmt(d.facturado)}</div></div>
                      <div><div style={{ color: C.muted }}>Combustible</div><div style={{ color: C.red, fontWeight: 600 }}>{fmt(d.combustible)}</div></div>
                      <div><div style={{ color: C.muted }}>Su parte</div><div style={{ color: C.teal, fontWeight: 600 }}>{fmt(d.chofer)}</div></div>
                    </div>
                    <WhatsAppBtn d={d} records={records} filtered={filtered} period={period} filterDay={filterDay} filterWeek={filterWeek} filterMonth={filterMonth} whatsappDriver={whatsappDriver} />
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", margin: "20px 0 12px" }}>Editar choferes</div>
            {drivers.map(d => (
              <DriverCard key={d.id} d={d} drivers={drivers} onUpdate={(changes) => updateDriver(d.id, changes)} onDelete={() => deleteDriver(d.id)} showToast={showToast} />
            ))}
          </div>
        )}

        {tab === 3 && (
          <PlanillaTab records={records} vehicles={vehicles} drivers={drivers} weeks={weeks} />
        )}

        {tab === 4 && (
          <div>
            <div style={card}>
              <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Registrar gasto</div>
              <label style={lbl}>Vehículo</label>
              <select value={newExpense.vehicle_id} onChange={e => setNewExpense({ ...newExpense, vehicle_id: e.target.value })} style={{ ...inp, marginBottom: 10 }}>
                <option value="">Seleccioná un vehículo...</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
              <label style={lbl}>Categoría</label>
              <select value={newExpense.category} onChange={e => setNewExpense({ ...newExpense, category: e.target.value })} style={{ ...inp, marginBottom: 10 }}>
                <option value="mecanico">🔧 Mecánico</option>
                <option value="repuesto">⚙️ Repuesto</option>
                <option value="manoobra">👷 Mano de obra</option>
                <option value="otro">📦 Otro</option>
              </select>
              <label style={lbl}>Descripción</label>
              <input value={newExpense.description} onChange={e => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="Ej: Cambio de aceite" style={{ ...inp, marginBottom: 10 }} />
              <label style={lbl}>Monto $</label>
              <input type="number" value={newExpense.amount} onChange={e => setNewExpense({ ...newExpense, amount: e.target.value })} placeholder="0" style={{ ...inp, marginBottom: 10 }} />
              <label style={lbl}>Fecha</label>
              <input type="date" value={newExpense.date} onChange={e => setNewExpense({ ...newExpense, date: e.target.value })} style={{ ...inp, marginBottom: 14 }} />
              <button onClick={addExpense} style={btn()}>+ Registrar gasto</button>
            </div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Historial de gastos</div>
            {expenses.length === 0 && <div style={{ textAlign: "center", padding: 30, color: C.muted }}>No hay gastos registrados</div>}
            {expenses.slice().reverse().map(e => (
              <div key={e.id} style={{ ...card, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.accent, marginBottom: 2 }}>{catLabel(e.category)}</div>
                    <div style={{ fontSize: 13, color: C.white, fontWeight: 600 }}>{e.description || "Sin descripción"}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{vName(e.vehicle_id)} · {e.date}</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: C.red }}>{fmt(e.amount)}</div>
                    <button onClick={() => deleteExpense(e.id)} style={{ background: "none", border: "none", color: C.red + "88", fontSize: 20, cursor: "pointer" }}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 5 && (
          <div>
            <div style={card}>
              <div style={{ fontSize: 10, color: C.accent, letterSpacing: 2, textTransform: "uppercase", marginBottom: 14 }}>Tu PIN de dueño</div>
              <label style={lbl}>Nuevo PIN (4 dígitos)</label>
              <input type="number" value={newOwnerPin} onChange={e => setNewOwnerPin(e.target.value.slice(0, 4))} placeholder="4 dígitos" style={{ ...inp, marginBottom: 12 }} />
              <button onClick={() => { if (newOwnerPin.length === 4) { saveOwnerPin(newOwnerPin); showToast("PIN actualizado ✓"); } else showToast("El PIN debe tener 4 dígitos"); }} style={btn()}>Guardar PIN</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DayoffCard({ drivers, dayoffs, toggleDayoff }) {
  const [dayoffDate, setDayoffDate] = useState(arDate());
  return (
    <div style={{ background: "#0e1525", borderRadius: 16, padding: 18, border: "1px solid #1e2d50", marginBottom: 12 }}>
      <div style={{ fontSize: 10, color: "#f59e0b", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Marcar franco</div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", fontSize: 10, letterSpacing: 2, color: "#64748b", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>Fecha</label>
        <input type="date" value={dayoffDate} onChange={e => setDayoffDate(e.target.value)}
          style={{ background: "#0e1525", border: "1px solid #1e2d50", borderRadius: 10, padding: "12px 14px", color: "#e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", boxSizing: "border-box" }} />
      </div>
      {drivers.map(d => {
        const hasDayoff = dayoffs.some(o => o.driver_id === d.id && o.date === dayoffDate);
        return (
          <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #1e2d50" }}>
            <div style={{ fontSize: 13, color: hasDayoff ? "#14b8a6" : "#e2e8f0" }}>{hasDayoff ? "🏖️ " : ""}{d.name}</div>
            <button onClick={() => toggleDayoff(d.id, dayoffDate)}
              style={{ background: hasDayoff ? "#14b8a622" : "#151f35", border: "1px solid " + (hasDayoff ? "#14b8a6" : "#1e2d50"), borderRadius: 8, padding: "6px 14px", color: hasDayoff ? "#14b8a6" : "#64748b", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
              {hasDayoff ? "Quitar" : "Franco"}
            </button>
          </div>
        );
      })}
      {drivers.length === 0 && <div style={{ fontSize: 12, color: "#64748b" }}>No hay choferes cargados</div>}
    </div>
  );
}

function PlanillaTab({ records, vehicles, drivers, weeks }) {
  const [planillaWeek, setPlanillaWeek] = useState(weekOf(arDate()));
  const [vista, setVista] = useState("chofer"); // "chofer" | "auto"

  const mon = new Date(planillaWeek + "T00:00:00");
  const days = Array.from({length: 7}, (_, i) => { const d = new Date(mon); d.setDate(mon.getDate() + i); return d.toISOString().split("T")[0]; });
  const dayLabels = ["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"];
  const weekRecords = records.filter(r => r.week === planillaWeek);

  const rows = [
    { label: "Fact.", color: C.text, key: "facturado" },
    { label: "Comb.", color: C.red, key: "combustible" },
    { label: "Neto", color: C.muted, key: "neto" },
    { label: "Mío", color: C.accent, key: "mio" },
  ];

  const getMio = (r) => {
    const v = vehicles.find(vv => vv.id === r.vehicle_id);
    const ownerPct = v ? Number(v.owner_pct) : 100;
    return v && v.type === "third" ? Number(r.ganancia) * ownerPct / 100 : Number(r.ganancia);
  };

  const getVal = (r, key) => key === "mio" ? getMio(r) : Number(r[key]);

  const renderTable = (groupRecords, days) => {
    const totals = { facturado: 0, combustible: 0, neto: 0, mio: 0 };
    days.forEach(day => {
      groupRecords.filter(r => r.date === day).forEach(r => {
        totals.facturado += Number(r.facturado);
        totals.combustible += Number(r.combustible);
        totals.neto += Number(r.neto);
        totals.mio += getMio(r);
      });
    });
    return (
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", color: C.muted, padding: "4px 6px", fontWeight: 600, fontSize: 10 }}></th>
              {days.map((day, i) => (
                <th key={day} style={{ textAlign: "center", color: day === arDate() ? C.accent : C.muted, padding: "4px 6px", fontWeight: 600, fontSize: 10, minWidth: 52 }}>
                  {dayLabels[i]}<br/><span style={{ fontSize: 9 }}>{day.slice(8)}</span>
                </th>
              ))}
              <th style={{ textAlign: "center", color: C.accent, padding: "4px 6px", fontWeight: 700, fontSize: 10 }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key}>
                <td style={{ color: row.color, padding: "3px 6px", fontWeight: 600, fontSize: 10, whiteSpace: "nowrap" }}>{row.label}</td>
                {days.map(day => {
                  const dayRecs = groupRecords.filter(r => r.date === day);
                  const val = dayRecs.reduce((a, r) => a + getVal(r, row.key), 0);
                  const hasData = dayRecs.length > 0;
                  return (
                    <td key={day} style={{ textAlign: "center", padding: "3px 4px", color: hasData ? row.color : C.border, fontSize: 10, background: hasData ? C.hi : "transparent", borderRadius: 4 }}>
                      {hasData ? ("$" + Math.round(val/1000) + "k") : "—"}
                    </td>
                  );
                })}
                <td style={{ textAlign: "center", padding: "3px 6px", color: row.color, fontWeight: 700, fontSize: 10 }}>
                  {"$" + Math.round(totals[row.key]/1000) + "k"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Semana</label>
        <select value={planillaWeek} onChange={e => setPlanillaWeek(e.target.value)} style={{ ...inp, marginBottom: 12 }}>
          {weeks.length === 0 && <option value={weekOf(arDate())}>Semana actual</option>}
          {weeks.map(w => <option key={w} value={w}>Semana del {w}</option>)}
        </select>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setVista("chofer")} style={{ flex: 1, background: vista === "chofer" ? C.accent : C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: "10px", color: vista === "chofer" ? "#000" : C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            👤 Por chofer
          </button>
          <button onClick={() => setVista("auto")} style={{ flex: 1, background: vista === "auto" ? C.accent : C.surface, border: "1px solid " + C.border, borderRadius: 10, padding: "10px", color: vista === "auto" ? "#000" : C.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            🚗 Por auto
          </button>
        </div>
      </div>

      {vista === "chofer" && (
        <div>
          {drivers.map(d => {
            const driverRecords = weekRecords.filter(r => r.driver_id === d.id);
            if (driverRecords.length === 0) return null;
            return (
              <div key={d.id} style={{ ...card, padding: 14, marginBottom: 16 }}>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 12 }}>{d.name}</div>
                {renderTable(driverRecords, days)}
              </div>
            );
          })}
          {drivers.filter(d => weekRecords.some(r => r.driver_id === d.id)).length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No hay registros esta semana</div>
          )}
        </div>
      )}

      {vista === "auto" && (
        <div>
          {vehicles.map(v => {
            const vRecords = weekRecords.filter(r => r.vehicle_id === v.id);
            if (vRecords.length === 0) return null;
            return (
              <div key={v.id} style={{ ...card, padding: 14, marginBottom: 16 }}>
                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 10, color: v.type === "own" ? C.teal : C.accent }}>{v.type === "own" ? "🚗 PROPIO" : "🤝 TERCERO " + v.owner_pct + "%"}</div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: C.white, marginBottom: 12 }}>{v.name}</div>
                </div>
                {renderTable(vRecords, days)}
              </div>
            );
          })}
          {vehicles.filter(v => weekRecords.some(r => r.vehicle_id === v.id)).length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: C.muted }}>No hay registros esta semana</div>
          )}
        </div>
      )}
    </div>
  );
}

function WhatsAppBtn({ d, records, filtered, period, filterDay, filterWeek, filterMonth, whatsappDriver }) {
  const [mode, setMode] = useState("period");
  const [selectedDay, setSelectedDay] = useState(arDate());
  const driverDays = [...new Set(records.filter(r => r.driver_id === d.id).map(r => r.date))].sort().reverse();
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button onClick={() => setMode("period")} style={{ flex: 1, background: mode === "period" ? "#25d366" : C.hi, border: "none", borderRadius: 8, padding: "8px", color: mode === "period" ? "#fff" : C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Período actual</button>
        <button onClick={() => setMode("day")} style={{ flex: 1, background: mode === "day" ? "#25d366" : C.hi, border: "none", borderRadius: 8, padding: "8px", color: mode === "day" ? "#fff" : C.muted, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Día específico</button>
      </div>
      {mode === "day" && (
        <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)} style={{ ...inp, marginBottom: 8 }}>
          {driverDays.map(day => <option key={day} value={day}>{day}</option>)}
        </select>
      )}
      <button onClick={() => whatsappDriver(d, mode === "day" ? selectedDay : null)} style={{ width: "100%", background: "#25d366", border: "none", borderRadius: 12, padding: 12, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
        📲 Enviar resumen por WhatsApp
      </button>
    </div>
  );
}

function DriverCard({ d, drivers, onUpdate, onDelete, showToast }) {
  const [pctVal, setPctVal] = useState(String(d.pct ?? 40));
  const [pinVal, setPinVal] = useState(d.pin);
  const savePct = async () => { const val = Math.min(100, Math.max(0, parseFloat(pctVal) || 40)); await onUpdate({ pct: val }); showToast("Porcentaje actualizado ✓"); };
  const savePin = async () => {
    if (pinVal.length !== 4) { showToast("El PIN debe tener 4 dígitos"); return; }
    if (drivers.some(dr => dr.id !== d.id && dr.pin === pinVal)) { showToast("Ese PIN ya lo usa otro chofer"); return; }
    await onUpdate({ pin: pinVal }); showToast("PIN actualizado ✓");
  };
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: C.white }}>{d.name}</div>
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
      <div onClick={() => ref.current.click()} style={{ border: "2px dashed " + C.border, borderRadius: 12, padding: preview ? 4 : 20, textAlign: "center", cursor: "pointer", background: C.hi, overflow: "hidden" }}>
        {preview ? <img src={preview} alt="" style={{ width: "100%", borderRadius: 8, maxHeight: 160, objectFit: "cover" }} /> : <div style={{ color: C.muted, fontSize: 13 }}>📸 {label}</div>}
      </div>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files[0] && onChange(e.target.files[0])} />
    </div>
  );
}
