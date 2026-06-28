import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  LayoutGrid, Building2, Sparkles, Calendar as CalIcon, BarChart3,
  Ghost, Settings, Plus, X, Check, Clock, Target, Users, Megaphone,
  Instagram, Facebook, Linkedin, Wand2, Copy, Save, Loader2, KanbanSquare,
  TrendingUp, ChevronRight, ChevronLeft, CircleDot, Send, Lightbulb, Hash,
  Mic2, Film, LayoutTemplate, ScanFace, Pencil, Trash2, RefreshCw, Plug,
  Download, Upload, RotateCcw, Menu, CalendarRange, ArrowRight, Compass,
  Globe, Search, AlertTriangle, Gauge, Activity, ExternalLink, Palette, Image as ImageIcon, MapPin
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid
} from "recharts";

/* ============================ config ============================ */
// URL del backend (Render). En local: http://localhost:8787
const API = import.meta.env.VITE_API_URL || "";

/* ============================ persistence (localStorage) ============================ */
// En la version desplegada guardamos en el navegador. Para datos en la nube/multi-dispositivo,
// cambia get/set por llamadas a `${API}/api/brands` y `${API}/api/posts`.
const store = {
  async get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  async set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};

/* ============================ constants ============================ */
const PLATFORMS = {
  instagram: { name: "Instagram", icon: Instagram, color: "#E1306C", best: "mar–jue, 12–1pm y 7–9pm" },
  facebook:  { name: "Facebook",  icon: Facebook,  color: "#1877F2", best: "mié–vie, 1–4pm" },
  tiktok:    { name: "TikTok",    icon: Film,      color: "#00E5D0", best: "mar–sáb, 6–10pm" },
  linkedin:  { name: "LinkedIn",  icon: Linkedin,  color: "#0A66C2", best: "mar–jue, 8–10am" },
  google:    { name: "Google Business", icon: MapPin, color: "#4285F4", best: "actualizar foto/post 1x semana" },
};
const CONTENT_TYPES = ["Reel / Video corto", "Carrusel", "Post imagen", "Historia", "Artículo LinkedIn"];
const STATUS_ORDER = ["idea", "draft", "approved", "scheduled", "published"];
const ACCENT = "#C7F051";
const BRAND_COLORS = ["#3DD6C4", "#FF8A5B", "#8B7BF7", "#F25C9A", "#C7F051", "#7BA7F7", "#F2C14E", "#9BE15D"];
const EMOJIS = ["🏢","🧾","✈️","🏠","🎉","💼","🍽️","💪","🛍️","🎨","📸","🚗","🐾","🏨","☕","🌿"];

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const uid = (p) => p + Math.random().toString(36).slice(2, 9);

const statusColor = (s) => ({ idea: "#8A93A6", draft: "#F2C14E", approved: "#3DD6C4", scheduled: "#7BA7F7", published: "#9BE15D" }[s] || "#8A93A6");
const statusLabel = (s) => ({ idea: "Idea", draft: "Borrador", approved: "Aprobado", scheduled: "Programado", published: "Publicado" }[s] || s);

/* ============================ demo data (opcional) ============================ */
const demoBrands = [
  { id: "b1", name: "Contafácil", type: "Contabilidad", emoji: "🧾", color: "#3DD6C4", website: "https://contafacil.co", gaId: "", objective: "Generar leads de pymes que necesitan asesoría contable y tributaria", goalMetric: "15 leads / mes", audience: "Dueños de pymes y emprendedores, 28–50 años", tone: "Profesional pero cercano y didáctico", offers: "Declaración de renta, contabilidad mensual, asesoría tributaria", networks: { instagram: "@contafacil", facebook: "Contafácil", linkedin: "Contafácil" }, faceless: true, pillars: [], cadence: "", lastAudit: null },
  { id: "b2", name: "Rumbo Viajes", type: "Agencia de Viajes", emoji: "✈️", color: "#FF8A5B", website: "https://rumboviajes.co", gaId: "", objective: "Aumentar cotizaciones por WhatsApp y vender paquetes", goalMetric: "30 cotizaciones / mes", audience: "Parejas y familias 25–55 que planean vacaciones", tone: "Inspirador, aspiracional y cálido", offers: "Paquetes nacionales e internacionales, lunas de miel, grupos", networks: { instagram: "@rumboviajes", tiktok: "@rumboviajes", facebook: "Rumbo Viajes" }, faceless: true, pillars: [], cadence: "", lastAudit: null },
];
const demoPosts = [
  { id: "p1", brandId: "b1", platform: "instagram", type: "Carrusel", title: "3 errores que te cuestan en la declaración de renta", date: addDays(1), time: "12:00", status: "approved", caption: "", hashtags: [], cta: "", visualIdea: "", script: "", objective: "Leads" },
  { id: "p2", brandId: "b2", platform: "tiktok", type: "Reel", title: "Destino sorpresa de la semana", date: addDays(0), time: "18:30", status: "scheduled", caption: "", hashtags: [], cta: "", visualIdea: "", script: "", objective: "Cotizaciones" },
];

/* ============================ AI helpers ============================ */
async function callClaude(prompt, tools) {
  // Llama al backend, que tiene la llave de Anthropic. Asi la clave nunca queda en el navegador.
  const res = await fetch(`${API}/api/ai`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, web: !!tools }),
  });
  if (!res.ok) throw new Error("AI backend error");
  const data = await res.json();
  return data.text || "";
}
function parseJSON(text) {
  const clean = (text || "").replace(/```json|```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const m = clean.match(/\{[\s\S]*\}/) || clean.match(/\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}
const brandCtx = (b) => `MARCA: ${b.name} (${b.type})
OBJETIVO DEL NEGOCIO: ${b.objective}
META: ${b.goalMetric}
AUDIENCIA: ${b.audience}
TONO: ${b.tone}
OFERTA: ${b.offers}
CUENTA SIN ROSTRO: ${b.faceless ? "Sí — usar voz en off, b-roll, texto o avatar; nunca mostrar la cara" : "No"}`;

/* ============================ APP ============================ */
export default function App() {
  const [view, setView] = useState("hoy");
  const [brands, setBrands] = useState([]);
  const [posts, setPosts] = useState([]);
  const [activeBrand, setActiveBrand] = useState("all");
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = "ok") => {
    const id = uid("t"); setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600);
  }, []);

  useEffect(() => { (async () => {
    const b = await store.get("cr_brands"); const p = await store.get("cr_posts");
    if (b) setBrands(b); if (p) setPosts(p); setLoaded(true);
  })(); }, []);
  useEffect(() => { if (loaded) store.set("cr_brands", brands); }, [brands, loaded]);
  useEffect(() => { if (loaded) store.set("cr_posts", posts); }, [posts, loaded]);

  const nav = [
    { id: "hoy", label: "Hoy", icon: LayoutGrid },
    { id: "marcas", label: "Marcas", icon: Building2 },
    { id: "estudio", label: "Estudio IA", icon: Sparkles },
    { id: "tablero", label: "Tablero", icon: KanbanSquare },
    { id: "calendario", label: "Calendario", icon: CalIcon },
    { id: "metricas", label: "Métricas", icon: BarChart3 },
    { id: "sitio", label: "Web & SEO", icon: Globe },
    { id: "guia", label: "Sin rostro", icon: Ghost },
    { id: "ajustes", label: "Ajustes", icon: Settings },
  ];
  const FONT = "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');";

  const go = (v) => { setView(v); setMenuOpen(false); };
  const empty = loaded && brands.length === 0;

  return (
    <div className="min-h-screen w-full text-[#E8ECF2]" style={{ background: "#0B0E14", fontFamily: "Inter, sans-serif" }}>
      <style>{FONT + `
        .disp{font-family:'Space Grotesk',sans-serif}.mono{font-family:'JetBrains Mono',monospace}
        *::-webkit-scrollbar{width:9px;height:9px}*::-webkit-scrollbar-thumb{background:#222a38;border-radius:8px}*::-webkit-scrollbar-track{background:transparent}
        button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid ${ACCENT};outline-offset:2px}
        @keyframes slideIn{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}
        @media (prefers-reduced-motion: reduce){*{transition:none!important;animation:none!important}}
      `}</style>

      {/* mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-[#1b2230]" style={{ background: "#0D111A" }}>
        <div className="flex items-center gap-2"><div className="h-7 w-7 rounded-lg grid place-items-center" style={{ background: ACCENT }}><CircleDot size={16} color="#0B0E14" /></div><span className="disp font-bold text-[14px]">Comando</span></div>
        <button onClick={() => setMenuOpen(o => !o)} className="h-9 w-9 grid place-items-center rounded-lg border border-[#2a3344]">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
      </div>
      {menuOpen && (
        <div className="md:hidden border-b border-[#1b2230] grid grid-cols-2 gap-1 p-2" style={{ background: "#0D111A" }}>
          {nav.map(n => { const I = n.icon; const on = view === n.id; return (
            <button key={n.id} onClick={() => go(n.id)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px]" style={{ background: on ? "#161d2b" : "transparent", color: on ? "#fff" : "#9099ab" }}><I size={16} style={{ color: on ? ACCENT : "#6f7a90" }} />{n.label}</button>
          ); })}
        </div>
      )}

      <div className="flex min-h-screen">
        {/* desktop sidebar */}
        <aside className="hidden md:flex w-[220px] shrink-0 border-r border-[#1b2230] flex-col" style={{ background: "#0D111A" }}>
          <div className="px-5 py-5 border-b border-[#1b2230]">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: ACCENT }}><CircleDot size={18} color="#0B0E14" /></div>
              <div><div className="disp font-bold leading-none text-[15px]">Comando</div><div className="text-[10px] tracking-widest text-[#6f7a90] mono mt-0.5">REDES · v0.2</div></div>
            </div>
          </div>
          <nav className="px-3 py-3 flex-1">
            {nav.map(n => { const I = n.icon; const on = view === n.id; return (
              <button key={n.id} onClick={() => go(n.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] mb-0.5 transition-colors" style={{ background: on ? "#161d2b" : "transparent", color: on ? "#fff" : "#9099ab" }}><I size={17} style={{ color: on ? ACCENT : "#6f7a90" }} />{n.label}</button>
            ); })}
          </nav>
          {brands.length > 0 && (
            <div className="px-3 pb-3">
              <div className="text-[10px] uppercase tracking-wider text-[#7c87a0] px-3 mb-2 mono">Marcas</div>
              {brands.map(b => (
                <button key={b.id} onClick={() => { setActiveBrand(b.id); go("marcas"); }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] hover:bg-[#141a26] transition-colors">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: b.color }} /><span className="truncate text-[#aeb6c6]">{b.name}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0">
          {empty ? <Welcome onCreate={() => go("marcas")} onDemo={() => { setBrands(demoBrands); setPosts(demoPosts); toast("Datos de ejemplo cargados"); }} setBrands={setBrands} setPosts={setPosts} toast={toast} />
            : <>
              {view === "hoy" && <Hoy brands={brands} posts={posts} setView={go} setActiveBrand={setActiveBrand} />}
              {view === "marcas" && <Marcas brands={brands} setBrands={setBrands} activeBrand={activeBrand} setActiveBrand={setActiveBrand} posts={posts} setView={setView} toast={toast} />}
              {view === "estudio" && <Estudio brands={brands} setPosts={setPosts} toast={toast} activeBrand={activeBrand} />}
              {view === "tablero" && <Tablero brands={brands} posts={posts} setPosts={setPosts} toast={toast} />}
              {view === "calendario" && <Calendario brands={brands} posts={posts} setPosts={setPosts} />}
              {view === "metricas" && <Metricas brands={brands} />}
              {view === "sitio" && <WebAnalytics brands={brands} setBrands={setBrands} toast={toast} />}
              {view === "guia" && <Guia />}
              {view === "ajustes" && <Ajustes brands={brands} posts={posts} setBrands={setBrands} setPosts={setPosts} toast={toast} />}
            </>}
        </main>
      </div>

      {/* toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[13px] shadow-lg" style={{ background: "#101622", borderColor: t.type === "err" ? "#F25C9A55" : "#9BE15D55", animation: "slideIn .2s ease" }}>
            {t.type === "err" ? <X size={15} style={{ color: "#F25C9A" }} /> : <Check size={15} style={{ color: "#9BE15D" }} />}<span className="text-[#dfe4ee]">{t.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================ WELCOME / ONBOARDING ============================ */
function Welcome({ onCreate, onDemo, setBrands, setPosts, toast }) {
  const [wizard, setWizard] = useState(false);
  return (
    <div className="min-h-screen grid place-items-center px-6 py-12">
      <div className="max-w-2xl w-full text-center">
        <div className="h-16 w-16 rounded-2xl grid place-items-center mx-auto mb-6" style={{ background: ACCENT }}><CircleDot size={32} color="#0B0E14" /></div>
        <div className="text-[11px] tracking-[0.25em] uppercase mono mb-3" style={{ color: ACCENT }}>Comando Redes · v0.2</div>
        <h1 className="disp text-[34px] md:text-[40px] font-bold leading-tight">Tu centro de mando para varias marcas</h1>
        <p className="text-[14px] text-[#8A93A6] mt-4 max-w-lg mx-auto leading-relaxed">Crea una marca por cada empresa o cuenta que manejes. La IA usará su objetivo, voz y oferta para proponerte contenido, guiones y un calendario que apunte a resultados — no solo a seguidores.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <button onClick={() => setWizard(true)} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-[14px]" style={{ background: ACCENT, color: "#0B0E14" }}><Plus size={18} /> Crear mi primera marca</button>
          <button onClick={onDemo} className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-[14px] border border-[#2a3344] text-[#aeb6c6]"><Compass size={18} /> Ver con datos de ejemplo</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-12 text-left">
          {[["Estudio IA","Contenido y guiones a la medida de cada marca."],["Tablero + Calendario","De idea a publicado, todo organizado."],["Sin rostro","Guía para crear sin dar la cara."]].map(([t,d],i)=>(
            <div key={i} className="rounded-2xl border border-[#1b2230] p-4" style={{ background: "#101622" }}><div className="disp font-semibold text-[14px] mb-1">{t}</div><div className="text-[12px] text-[#8A93A6]">{d}</div></div>
          ))}
        </div>
      </div>
      {wizard && <BrandWizard toast={toast} onClose={() => setWizard(false)} onSave={(b) => { setBrands([b]); toast("Marca creada"); setWizard(false); }} />}
    </div>
  );
}

/* ============================ BRAND WIZARD (crear/editar) ============================ */
function BrandWizard({ brand, onClose, onSave, onDelete, toast = () => {} }) {
  const [step, setStep] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [b, setB] = useState(brand || { id: uid("b"), name: "", type: "", emoji: "🏢", color: ACCENT, website: "", gaId: "", logo: "", palette: [], objective: "", goalMetric: "", audience: "", tone: "", offers: "", networks: {}, faceless: true, pillars: [], cadence: "", lastAudit: null });
  const up = (k, v) => setB(p => ({ ...p, [k]: v }));

  const isHex = (c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c.trim());
  const scanSite = async () => {
    if (!b.website) { toast("Escribe primero el sitio web", "err"); return; }
    setScanning(true);
    try {
      const res = await fetch(`${API}/api/scan-site`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: b.website }),
      });
      if (!res.ok) throw 0;
      const r = await res.json();
      if (!r || r.error) throw 0;
      const palette = (r.palette || []).filter(isHex);
      const primary = isHex(r.primary) ? r.primary : (palette[0] || b.color);
      setB(p => ({
        ...p,
        name: r.name || p.name,
        type: r.type || p.type,
        objective: r.objective || p.objective,
        goalMetric: r.goalMetric || p.goalMetric,
        audience: r.audience || p.audience,
        tone: r.tone || p.tone,
        offers: r.offers || p.offers,
        color: primary,
        palette,
        logo: r.logo && /^https?:\/\//.test(r.logo) ? r.logo : p.logo,
        networks: (r.networks && Object.keys(r.networks).length) ? { ...p.networks, ...r.networks } : p.networks,
      }));
      const nNets = r.networks ? Object.keys(r.networks).length : 0;
      toast(nNets ? `Sitio escaneado · ${nNets} red(es) detectada(s)` : "Sitio escaneado: revisa y ajusta lo que haga falta");
    } catch { toast("No se pudo escanear el sitio. Llena los campos a mano o reintenta.", "err"); }
    finally { setScanning(false); }
  };
  const toggleNet = (k) => setB(p => { const n = { ...(p.networks || {}) }; if (n[k] !== undefined) delete n[k]; else n[k] = k === "google" ? "" : "@" + (p.name || "marca").toLowerCase().replace(/\s/g, ""); return { ...p, networks: n }; });
  const steps = ["Identidad", "Objetivo", "Audiencia y voz", "Canales"];
  const canNext = [b.name && b.type, b.objective, b.audience && b.tone, Object.keys(b.networks).length > 0][step];

  return (
    <Modal title={brand ? "Editar marca" : "Nueva marca"} onClose={onClose} xl>
      <div className="flex items-center gap-2 mb-5">
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full grid place-items-center text-[11px] mono" style={{ background: i <= step ? ACCENT : "#161d2b", color: i <= step ? "#0B0E14" : "#6f7a90" }}>{i < step ? <Check size={13} /> : i + 1}</span>
              <span className="text-[12px] hidden sm:block" style={{ color: i === step ? "#fff" : "#6f7a90" }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className="flex-1 h-px" style={{ background: i < step ? ACCENT : "#1b2230" }} />}
          </React.Fragment>
        ))}
      </div>

      {step === 0 && <>
        <div className="grid grid-cols-2 gap-3"><Inp label="Nombre de la marca" v={b.name} on={v => up("name", v)} /><Inp label="Sector / tipo de negocio" v={b.type} on={v => up("type", v)} /></div>
        <div className="mt-3 flex gap-2 items-end">
          <Inp label="Sitio web" v={b.website} on={v => up("website", v)} className="flex-1" ph="https://tudominio.com" />
          <button onClick={scanSite} disabled={scanning || !b.website} className="flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-lg shrink-0 disabled:opacity-40" style={{ background: ACCENT, color: "#0B0E14" }}>{scanning ? <><Loader2 size={15} className="animate-spin" /> Escaneando…</> : <><Search size={15} /> Escanear y autocompletar</>}</button>
        </div>
        <p className="text-[11px] text-[#7c87a0] mt-1.5">La IA visita el sitio y rellena nombre, sector, objetivo, audiencia, tono, oferta, logo y paleta de colores. Luego revisa y ajusta cada paso.</p>

        <Lbl className="mt-4">Logo de la marca</Lbl>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="h-14 w-14 rounded-xl grid place-items-center overflow-hidden shrink-0" style={{ background: `${b.color}1f` }}>
            {b.logo ? <img src={b.logo} alt="logo" className="h-full w-full object-contain" onError={e => { e.currentTarget.style.display = "none"; }} /> : <ImageIcon size={22} style={{ color: "#6f7a90" }} />}
          </span>
          <input value={b.logo || ""} placeholder="URL del logo (se llena solo al escanear)" onChange={e => up("logo", e.target.value)} className="flex-1 rounded-lg bg-[#0d121c] border border-[#2a3344] px-3 py-2 text-[13px] text-[#e8ecf2] placeholder:text-[#7c87a0]" />
          <label className="flex items-center gap-1.5 text-[12px] px-3 py-2 rounded-lg border border-[#2a3344] text-[#aeb6c6] hover:bg-[#161d2b] cursor-pointer shrink-0">
            <Upload size={14} /> Subir
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              if (f.size > 600 * 1024) { toast("Imagen muy pesada (máx 600 KB)", "err"); return; }
              const reader = new FileReader();
              reader.onload = () => up("logo", reader.result);
              reader.readAsDataURL(f);
            }} />
          </label>
        </div>
        <p className="text-[11px] text-[#7c87a0] mt-1.5">El escaneo intenta tomar el logo solo. Si quedó mal o el sitio no tiene, pega una URL o sube tu archivo para reemplazarlo.</p>

        <Lbl className="mt-4">Paleta de marca <span className="text-[#7c87a0] normal-case tracking-normal">— colores que usaremos para crear el contenido</span></Lbl>
        {b.palette?.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-1.5">
            {b.palette.map((c, i) => (
              <button key={i} onClick={() => up("color", c)} title={`${c}${b.color === c ? " (principal)" : ""}`} className="flex items-center gap-1.5 text-[11px] px-2 py-1.5 rounded-lg border" style={{ background: "#0d121c", borderColor: b.color === c ? "#fff" : "#2a3344", color: "#aeb6c6" }}>
                <span className="h-4 w-4 rounded" style={{ background: c }} />{c}{b.color === c && <Check size={12} />}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex gap-1.5 mt-1.5">{BRAND_COLORS.map(c => <button key={c} onClick={() => up("color", c)} className="h-8 w-8 rounded-lg" style={{ background: c, outline: b.color === c ? "2px solid #fff" : "none", outlineOffset: 1 }} />)}</div>
        )}
        <p className="text-[11px] text-[#7c87a0] mt-1.5">{b.palette?.length > 0 ? "Toca un color para marcarlo como principal. Escanea el sitio para detectar la paleta automáticamente." : "Aún sin paleta. Escanea el sitio arriba para detectar los colores de la marca."}</p>
      </>}
      {step === 1 && <>
        <p className="text-[12px] text-[#8A93A6] mb-3">¿Qué quieres lograr con esta cuenta? El objetivo guía todo lo que la IA proponga.</p>
        <TextArea label="Objetivo principal" rows={4} v={b.objective} on={v => up("objective", v)} ph="Ej: generar leads de pymes que necesitan asesoría contable" />
        <Inp label="Meta medible" v={b.goalMetric} on={v => up("goalMetric", v)} className="mt-3" ph="Ej: 15 leads / mes" />
      </>}
      {step === 2 && <>
        <TextArea label="¿A quién le hablas? (audiencia)" rows={4} v={b.audience} on={v => up("audience", v)} ph="Edad, perfil, qué les preocupa, qué buscan" />
        <TextArea label="Tono de voz" rows={3} v={b.tone} on={v => up("tone", v)} ph="Ej: profesional pero cercano, didáctico, da tranquilidad" />
        <TextArea label="Oferta / servicios clave" rows={4} v={b.offers} on={v => up("offers", v)} ph="Qué vendes o promocionas" />
      </>}
      {step === 3 && <>
        <Lbl>Redes que vas a manejar</Lbl>
        <div className="flex gap-2 mt-1.5 flex-wrap">{Object.keys(PLATFORMS).map(k => { const P = PLATFORMS[k]; const I = P.icon; const on = b.networks?.[k] !== undefined; return (
          <button key={k} onClick={() => toggleNet(k)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border transition-colors" style={{ background: on ? `${P.color}22` : "#0d121c", borderColor: on ? `${P.color}66` : "#2a3344", color: on ? "#fff" : "#8A93A6" }}><I size={14} style={{ color: P.color }} />{P.name}{on && <Check size={13} />}</button>
        ); })}</div>
        {Object.keys(b.networks).map(k => <Inp key={k} label={k === "google" ? "Enlace de Google Business (g.page o maps.app.goo.gl)" : `Usuario en ${PLATFORMS[k].name}`} ph={k === "google" ? "https://g.page/tunegocio" : ""} v={b.networks[k]} on={v => setB(p => ({ ...p, networks: { ...p.networks, [k]: v } }))} className="mt-3" />)}
        <Inp label="ID de Google Analytics (GA4, opcional)" v={b.gaId} on={v => up("gaId", v)} className="mt-3" ph="G-XXXXXXXXXX" />
        <label className="flex items-center gap-2 mt-4 text-[13px] text-[#aeb6c6] cursor-pointer"><input type="checkbox" checked={b.faceless} onChange={e => up("faceless", e.target.checked)} className="accent-[#8B7BF7] h-4 w-4" /><Ghost size={15} style={{ color: "#8B7BF7" }} /> Cuenta sin rostro (no se muestra la cara)</label>
      </>}

      <div className="flex items-center justify-between mt-6 pt-5 border-t border-[#1b2230]">
        <div className="flex gap-2">
          {step > 0 ? <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1.5 text-[13px] px-4 py-2 rounded-lg border border-[#2a3344] text-[#aeb6c6]"><ChevronLeft size={15} /> Atrás</button> : <button onClick={onClose} className="text-[13px] px-4 py-2 rounded-lg border border-[#2a3344] text-[#aeb6c6]">Cancelar</button>}
          {brand && onDelete && <button onClick={() => { if (window.confirm(`¿Seguro que quieres eliminar la marca "${b.name}" y toda su información? Esta acción no se puede deshacer.`)) onDelete(b.id); }} className="flex items-center gap-1.5 text-[12px] text-[#F25C9A] px-3 py-2 rounded-lg hover:bg-[#1a1320]"><Trash2 size={14} /> Eliminar</button>}
        </div>
        {step < 3
          ? <button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="flex items-center gap-1.5 text-[13px] font-medium px-5 py-2 rounded-lg disabled:opacity-40" style={{ background: ACCENT, color: "#0B0E14" }}>Siguiente <ChevronRight size={15} /></button>
          : <button onClick={() => onSave(b)} disabled={!canNext} className="flex items-center gap-1.5 text-[13px] font-medium px-5 py-2 rounded-lg disabled:opacity-40" style={{ background: ACCENT, color: "#0B0E14" }}><Save size={15} /> {brand ? "Guardar" : "Crear marca"}</button>}
      </div>
    </Modal>
  );
}

/* ============================ HOY ============================ */
function Hoy({ brands, posts, setView, setActiveBrand }) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const todayPosts = posts.filter(p => p.date === todayISO());
  const pending = posts.filter(p => ["idea", "draft"].includes(p.status));
  return (
    <div className="pb-16">
      <Header kicker={`Check-in · ${new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}`} title={`${greet}. Esto es lo que pasa hoy.`} sub="Tu resumen diario en 30 segundos. Entra 1–2 veces al día, revisa y aprueba." />
      <div className="px-4 md:px-8 pt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Marcas" value={brands.length} sub="en operación" />
        <Kpi label="Hoy" value={todayPosts.length} sub="publicaciones del día" />
        <Kpi label="Pendientes" value={pending.length} sub="ideas + borradores" accent="#F2C14E" />
        <Kpi label="Foco" value="Convertir" sub="clientes, no solo seguidores" accent={ACCENT} />
      </div>
      <div className="px-4 md:px-8 pt-7">
        <div className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mb-3">Briefing por marca</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {brands.map(b => {
            const bp = posts.filter(p => p.brandId === b.id);
            const next = bp.filter(p => p.date >= todayISO()).sort((a, c) => (a.date + a.time).localeCompare(c.date + c.time))[0];
            const ideas = bp.filter(p => ["idea", "draft"].includes(p.status)).length;
            return (
              <div key={b.id} className="rounded-2xl p-5 border" style={{ background: "#101622", borderColor: `${b.color}26` }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0"><span className="h-9 w-9 rounded-xl grid place-items-center text-[18px] shrink-0" style={{ background: `${b.color}1f` }}>{b.emoji}</span><div className="min-w-0"><div className="disp font-semibold text-[15px] truncate">{b.name}</div><div className="text-[11px]" style={{ color: "#7c87a0" }}>{b.type}</div></div></div>
                  {b.goalMetric && <Pill color={b.color} soft><Target size={11} />{b.goalMetric}</Pill>}
                </div>
                <div className="mt-4 text-[12px]">{next ? <span className="text-[#aeb6c6] flex items-center gap-1.5"><Clock size={13} style={{ color: b.color }} /> Próximo: <strong className="text-white font-medium truncate">{next.title}</strong> <span className="text-[#6f7a90] shrink-0">· {next.date.slice(5)} {next.time}</span></span> : <span className="text-[#6f7a90] flex items-center gap-1.5"><Clock size={13} /> Sin nada programado</span>}</div>
                <div className="mt-3 flex items-center justify-between"><span className="text-[12px] text-[#8A93A6]">{ideas > 0 ? `${ideas} idea(s) por desarrollar` : "Todo al día ✓"}</span><button onClick={() => { setActiveBrand(b.id); setView("estudio"); }} className="text-[12px] font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ background: `${b.color}1f`, color: b.color }}><Wand2 size={13} /> Crear con IA</button></div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="px-4 md:px-8 pt-7">
        <div className="rounded-2xl p-5 border border-[#1b2230] flex items-start gap-3" style={{ background: "#0f1420" }}>
          <Lightbulb size={18} style={{ color: ACCENT }} className="mt-0.5 shrink-0" />
          <div className="text-[13px] text-[#aeb6c6]"><strong className="text-white">Rutina sugerida:</strong> en la mañana revisa este check-in y aprueba lo que sale hoy; en la tarde abre el <button className="underline" style={{ color: ACCENT }} onClick={() => setView("estudio")}>Estudio IA</button> y produce 2–3 piezas. Lo que generas pasa al <button className="underline" style={{ color: ACCENT }} onClick={() => setView("tablero")}>Tablero</button> y al <button className="underline" style={{ color: ACCENT }} onClick={() => setView("calendario")}>Calendario</button>.</div>
        </div>
      </div>
    </div>
  );
}

/* ============================ MARCAS ============================ */
function Marcas({ brands, setBrands, activeBrand, setActiveBrand, posts, setView, toast }) {
  const [editing, setEditing] = useState(null);
  const [stratLoad, setStratLoad] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [openId, setOpenId] = useState(null);
  const sel = brands.find(b => b.id === openId);
  const openBrand = (id) => { setOpenId(id); setActiveBrand(id); };

  const isHex = (c) => typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c.trim());
  const extractIdentity = async () => {
    if (!sel) return;
    if (!sel.website) { toast("Agrega el sitio web de la marca primero", "err"); return; }
    setExtracting(true);
    const prompt = `Mira el sitio web "${sel.website}" de la marca ${sel.name}. Usa búsqueda web para ver su identidad visual real.
Devuelve SOLO JSON válido sin markdown:
{"logo":"URL directa a la imagen del logo si la encuentras, o null","palette":["3 a 6 colores de marca en formato #RRGGBB"],"primary":"#RRGGBB color principal de la marca"}`;
    try {
      const r = parseJSON(await callClaude(prompt, [{ type: "web_search_20250305", name: "web_search" }]));
      if (!r) throw 0;
      const palette = (r.palette || []).filter(isHex);
      const primary = isHex(r.primary) ? r.primary : (palette[0] || sel.color);
      const nb = { ...sel, color: primary, palette, logo: r.logo && /^https?:\/\//.test(r.logo) ? r.logo : "" };
      setBrands(prev => prev.map(x => x.id === sel.id ? nb : x));
      toast("Identidad extraída del sitio");
    } catch { toast("No se pudo extraer la identidad. Intenta de nuevo.", "err"); }
    finally { setExtracting(false); }
  };

  const genStrategy = async () => {
    if (!sel) return; setStratLoad(true);
    const prompt = `${brandCtx(sel)}

Eres estratega de redes. Define la estrategia de contenido. Devuelve SOLO JSON válido sin markdown:
{"pillars":[{"name":"pilar","desc":"qué tipo de contenido y por qué sirve al objetivo"}],"cadence":"frecuencia y mezcla recomendada por plataforma","bestTimes":"mejores días/horas para esta audiencia"}
Da 4 pilares concretos para este negocio, en español.`;
    try { const r = parseJSON(await callClaude(prompt)); if (r) { const nb = { ...sel, pillars: r.pillars || [], cadence: r.cadence || "", bestTimes: r.bestTimes || "" }; setBrands(prev => prev.map(x => x.id === sel.id ? nb : x)); toast("Estrategia generada"); } else toast("No se pudo generar", "err"); }
    catch { toast("Error al generar", "err"); } finally { setStratLoad(false); }
  };

  return (
    <div className="pb-16">
      <Header kicker="Workspaces" title="Marcas" sub="Cada empresa o cuenta vive aquí. La IA usa esta info para crear contenido a la medida."
        right={<button onClick={() => setEditing("new")} className="flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-lg" style={{ background: ACCENT, color: "#0B0E14" }}><Plus size={16} /> Nueva</button>} />
      {!sel && (
        <div className="px-4 md:px-8 pt-6 grid grid-cols-2 lg:grid-cols-3 gap-3">
          {brands.map(b => (
            <button key={b.id} onClick={() => openBrand(b.id)} className="text-left rounded-2xl p-4 border hover:bg-[#131a27] transition-colors" style={{ background: "#101622", borderColor: `${b.color}26` }}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-10 w-10 rounded-xl grid place-items-center text-[20px] shrink-0 overflow-hidden" style={{ background: `${b.color}1f` }}>{b.logo ? <img src={b.logo} alt="" className="h-full w-full object-contain" onError={e => { e.currentTarget.style.display = "none"; }} /> : b.emoji}</span>
                <div className="min-w-0"><div className="disp font-semibold text-[14px] truncate">{b.name}</div><div className="text-[11px] text-[#8A93A6] truncate">{b.type}</div></div>
              </div>
              {b.goalMetric && <div className="mt-3"><Pill color={b.color} soft><Target size={11} />{b.goalMetric}</Pill></div>}
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#7c87a0]">
                <span>{Object.keys(b.networks || {}).length} red(es)</span>
                <span className="flex items-center gap-1 font-medium" style={{ color: b.color }}>Entrar <ChevronRight size={13} /></span>
              </div>
            </button>
          ))}
        </div>
      )}
      {sel && (
        <div className="px-4 md:px-8 pt-5">
        <button onClick={() => setOpenId(null)} className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg border border-[#2a3344] text-[#aeb6c6] hover:bg-[#161d2b] mb-4"><ChevronLeft size={15} /> Volver a marcas</button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border border-[#1b2230] p-6" style={{ background: "#101622" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0"><span className="h-12 w-12 rounded-2xl grid place-items-center text-[24px] shrink-0 overflow-hidden" style={{ background: `${sel.color}1f` }}>{sel.logo ? <img src={sel.logo} alt="" className="h-full w-full object-contain" onError={e => { e.currentTarget.style.display = "none"; }} /> : sel.emoji}</span><div className="min-w-0"><h2 className="disp text-[20px] font-bold truncate">{sel.name}</h2><div className="text-[12px] text-[#8A93A6]">{sel.type}</div></div></div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setEditing(sel)} className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-[#2a3344] text-[#aeb6c6] hover:bg-[#161d2b]"><Pencil size={13} /> Editar</button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <FieldV icon={Target} label="Objetivo" v={sel.objective} color={sel.color} />
              <FieldV icon={TrendingUp} label="Meta" v={sel.goalMetric} color={sel.color} />
              <FieldV icon={Users} label="Audiencia" v={sel.audience} color={sel.color} />
              <FieldV icon={Megaphone} label="Tono" v={sel.tone} color={sel.color} />
              <div className="sm:col-span-2"><FieldV icon={Sparkles} label="Oferta" v={sel.offers} color={sel.color} /></div>
            </div>
            {sel.palette?.length > 0 && (
              <div className="mt-5 pt-5 border-t border-[#1b2230] flex items-center gap-2 flex-wrap">
                <span className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mr-1">Paleta:</span>
                {sel.palette.map((c, i) => <span key={i} className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg border border-[#2a3344] text-[#aeb6c6]"><span className="h-3.5 w-3.5 rounded" style={{ background: c }} />{c}</span>)}
              </div>
            )}
            <div className="mt-5 pt-5 border-t border-[#1b2230] flex items-center gap-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mr-1">Redes:</span>
              {Object.keys(sel.networks || {}).map(k => { const P = PLATFORMS[k]; if (!P) return null; const I = P.icon; return <span key={k} className="flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-lg border border-[#2a3344] text-[#aeb6c6]"><I size={13} style={{ color: P.color }} />{sel.networks[k]}</span>; })}
              {sel.faceless && <Pill color="#8B7BF7" soft><Ghost size={11} /> Sin rostro</Pill>}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#1b2230] p-5" style={{ background: "#101622" }}>
              <div className="flex items-center justify-between mb-3"><span className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono">Estrategia IA</span><button onClick={genStrategy} disabled={stratLoad} className="text-[11px] flex items-center gap-1 px-2.5 py-1 rounded-lg" style={{ background: `${ACCENT}1f`, color: ACCENT }}>{stratLoad ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} {sel.pillars?.length ? "Regenerar" : "Generar"}</button></div>
              {sel.pillars?.length ? <div className="space-y-2">{sel.pillars.map((p, i) => <div key={i} className="rounded-lg bg-[#0d121c] border border-[#1b2230] p-2.5"><div className="text-[12px] font-semibold" style={{ color: sel.color }}>{p.name}</div><div className="text-[11px] text-[#8A93A6] mt-0.5">{p.desc}</div></div>)}{sel.cadence && <div className="text-[11px] text-[#aeb6c6] pt-1"><Clock size={11} className="inline mr-1" />{sel.cadence}</div>}</div>
                : <p className="text-[12px] text-[#6f7a90]">Genera pilares de contenido y cadencia recomendada para esta marca.</p>}
            </div>
            <div className="rounded-2xl border border-[#1b2230] p-5" style={{ background: "#101622" }}>
              <div className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mb-3">Contenido</div>
              {STATUS_ORDER.map(s => { const n = posts.filter(p => p.brandId === sel.id && p.status === s).length; return <div key={s} className="flex items-center justify-between py-1.5"><span className="flex items-center gap-2 text-[13px] text-[#aeb6c6]"><span className="h-2 w-2 rounded-full" style={{ background: statusColor(s) }} />{statusLabel(s)}</span><span className="mono text-[14px]" style={{ color: statusColor(s) }}>{n}</span></div>; })}
            </div>
          </div>
        </div>
        </div>
      )}
      {editing && <BrandWizard toast={toast} brand={editing === "new" ? null : editing} onClose={() => setEditing(null)}
        onSave={(b) => { setBrands(prev => prev.some(x => x.id === b.id) ? prev.map(x => x.id === b.id ? b : x) : [...prev, b]); setActiveBrand(b.id); setEditing(null); toast("Marca guardada"); }}
        onDelete={(id) => { setBrands(prev => prev.filter(x => x.id !== id)); setEditing(null); toast("Marca eliminada"); }} />}
    </div>
  );
}
const FieldV = ({ icon: Icon, label, v, color }) => (<div><div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#6f7a90] mono mb-1.5"><Icon size={12} style={{ color }} />{label}</div><div className="text-[13px] text-[#cfd5e0] leading-relaxed">{v || <span className="text-[#7c87a0]">—</span>}</div></div>);

/* ============================ ESTUDIO IA ============================ */
function Estudio({ brands, setPosts, toast, activeBrand }) {
  const [mode, setMode] = useState("pieza"); // pieza | plan
  const [brandId, setBrandId] = useState(activeBrand !== "all" && brands.some(b => b.id === activeBrand) ? activeBrand : brands[0]?.id);
  const [platform, setPlatform] = useState("instagram");
  const [ctype, setCtype] = useState(CONTENT_TYPES[0]);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState(null);
  const [plan, setPlan] = useState(null);
  const [copied, setCopied] = useState("");
  const brand = brands.find(b => b.id === brandId) || brands[0];
  const nets = Object.keys(brand?.networks || {});
  useEffect(() => { if (nets.length && !nets.includes(platform)) setPlatform(nets[0]); }, [brandId]);

  const genPiece = useCallback(async () => {
    if (!brand) return; setLoading(true); setErr(""); setResult(null);
    const isVideo = /Reel|Video/.test(ctype);
    const prompt = `Eres estratega senior de redes y copywriter en español de Colombia. Crea UNA pieza lista para publicar.
${brandCtx(brand)}
PLATAFORMA: ${PLATFORMS[platform]?.name}
FORMATO: ${ctype}
OBJETIVO DE ESTA PIEZA: ${goal || brand.objective}
Devuelve SOLO JSON válido sin markdown:
{"title":"título interno corto","hook":"gancho que detiene el scroll","caption":"caption completo persuasivo con \\n","hashtags":["6-10 sin #"],"cta":"llamado a la acción","visualIdea":"idea visual concreta y fácil",${isVideo ? '"script":"guión sin rostro 25-35s con ESCENAS numeradas: qué se ve (b-roll) + VOZ EN OFF, con \\n",' : '"script":null,'}"bestTime":"mejor día y hora"}`;
    try { const r = parseJSON(await callClaude(prompt)); if (!r) throw 0; setResult(r); }
    catch { setErr("No se pudo generar. Intenta de nuevo."); } finally { setLoading(false); }
  }, [brand, platform, ctype, goal]);

  const genPlan = useCallback(async () => {
    if (!brand) return; setLoading(true); setErr(""); setPlan(null);
    const prompt = `Eres estratega de redes en español de Colombia. Crea un PLAN de contenido de 7 días para la marca, alineado al objetivo, variando formatos y plataformas disponibles (${nets.map(k => PLATFORMS[k].name).join(", ")}).
${brandCtx(brand)}
Devuelve SOLO un array JSON sin markdown, 7 items:
[{"dayOffset":0,"platform":"${nets[0]}","type":"Reel","title":"título","hook":"gancho corto","objective":"qué busca esta pieza"}]
Usa solo plataformas disponibles. dayOffset de 0 a 6.`;
    try { const r = parseJSON(await callClaude(prompt)); if (!Array.isArray(r)) throw 0; setPlan(r); }
    catch { setErr("No se pudo generar el plan. Intenta de nuevo."); } finally { setLoading(false); }
  }, [brand]);

  const copy = (label, txt) => { navigator.clipboard?.writeText(txt); setCopied(label); setTimeout(() => setCopied(""), 1400); };
  const saveToBoard = (status) => {
    if (!result) return;
    const np = { id: uid("p"), brandId: brand.id, platform, type: ctype.split(" ")[0], title: result.title || result.hook?.slice(0, 50) || "Sin título", caption: result.caption || "", hashtags: result.hashtags || [], cta: result.cta || "", visualIdea: result.visualIdea || "", script: result.script || "", date: addDays(2), time: "18:00", status, objective: goal || brand.objective };
    setPosts(prev => [np, ...prev]); toast(status === "scheduled" ? "Programado en el calendario" : "Guardado en el tablero");
  };
  const savePlan = () => {
    if (!plan) return;
    const items = plan.map((it, i) => ({ id: uid("p"), brandId: brand.id, platform: nets.includes(it.platform) ? it.platform : nets[0], type: it.type || "Post", title: it.title || it.hook || "Idea", caption: "", hashtags: [], cta: "", visualIdea: "", script: "", date: addDays(Number(it.dayOffset) || i), time: "18:00", status: "idea", objective: it.objective || brand.objective }));
    setPosts(prev => [...items, ...prev]); toast(`${items.length} ideas añadidas al tablero y calendario`); setPlan(null);
  };

  return (
    <div className="pb-16">
      <Header kicker="Generador con IA · en vivo" title="Estudio de contenido" sub="La IA usa todo el contexto de la marca. Genera una pieza completa o un plan de toda la semana."
        right={<div className="flex gap-1 rounded-lg p-1 border border-[#2a3344]" style={{ background: "#101622" }}>
          {[["pieza", "Una pieza"], ["plan", "Plan semanal"]].map(([m, l]) => <button key={m} onClick={() => setMode(m)} className="px-3 py-1.5 rounded-md text-[12px]" style={{ background: mode === m ? ACCENT : "transparent", color: mode === m ? "#0B0E14" : "#9099ab" }}>{l}</button>)}
        </div>} />
      <div className="px-4 md:px-8 pt-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-[#1b2230] p-5 h-fit" style={{ background: "#101622" }}>
          <Lbl>Marca</Lbl>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5 mb-4">{brands.map(b => <button key={b.id} onClick={() => setBrandId(b.id)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] border" style={{ background: brandId === b.id ? `${b.color}1f` : "#0d121c", borderColor: brandId === b.id ? `${b.color}66` : "#2a3344", color: brandId === b.id ? "#fff" : "#8A93A6" }}><span>{b.emoji}</span><span className="truncate">{b.name}</span></button>)}</div>
          {mode === "pieza" && <>
            <Lbl>Plataforma</Lbl>
            <div className="flex gap-1.5 mt-1.5 mb-4 flex-wrap">{nets.map(k => { const P = PLATFORMS[k]; const I = P.icon; return <button key={k} onClick={() => setPlatform(k)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] border" style={{ background: platform === k ? `${P.color}22` : "#0d121c", borderColor: platform === k ? `${P.color}66` : "#2a3344", color: platform === k ? "#fff" : "#8A93A6" }}><I size={14} style={{ color: P.color }} />{P.name}</button>; })}</div>
            <Lbl>Formato</Lbl>
            <div className="grid gap-1.5 mt-1.5 mb-4">{CONTENT_TYPES.map(t => <button key={t} onClick={() => setCtype(t)} className="text-left px-3 py-2 rounded-lg text-[12px] border" style={{ background: ctype === t ? "#161d2b" : "#0d121c", borderColor: ctype === t ? `${ACCENT}66` : "#2a3344", color: ctype === t ? "#fff" : "#8A93A6" }}>{t}</button>)}</div>
          </>}
          <Lbl>{mode === "pieza" ? "¿Objetivo de esta pieza? (opcional)" : "Foco de la semana (opcional)"}</Lbl>
          <textarea value={goal} onChange={e => setGoal(e.target.value)} rows={2} placeholder={brand?.objective} className="w-full mt-1.5 rounded-lg bg-[#0d121c] border border-[#2a3344] px-3 py-2 text-[13px] text-[#e8ecf2] placeholder:text-[#7c87a0] resize-none" />
          <button onClick={mode === "pieza" ? genPiece : genPlan} disabled={loading} className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-[14px] disabled:opacity-60" style={{ background: ACCENT, color: "#0B0E14" }}>{loading ? <><Loader2 size={17} className="animate-spin" /> Generando…</> : <><Wand2 size={17} /> {mode === "pieza" ? "Generar contenido" : "Generar plan de 7 días"}</>}</button>
          <p className="text-[11px] text-[#7c87a0] mt-2 text-center">Generación real con IA · puede tardar unos segundos</p>
        </div>

        <div className="lg:col-span-3">
          {loading && <div className="rounded-2xl border border-[#1b2230] min-h-[420px] grid place-items-center" style={{ background: "#0e131e" }}><div className="text-center"><Loader2 size={30} className="animate-spin mx-auto" style={{ color: ACCENT }} /><p className="text-[13px] text-[#8A93A6] mt-3">Trabajando para {brand?.name}…</p></div></div>}
          {err && !loading && <div className="rounded-2xl border border-[#3a2230] p-5 text-[13px] text-[#F25C9A]" style={{ background: "#1a1320" }}>{err}</div>}
          {!loading && !err && !result && !plan && <div className="rounded-2xl border border-dashed border-[#2a3344] min-h-[420px] grid place-items-center text-center px-10" style={{ background: "#0e131e" }}><div><div className="h-14 w-14 rounded-2xl grid place-items-center mx-auto mb-4" style={{ background: "#161d2b" }}><Sparkles size={26} style={{ color: ACCENT }} /></div><p className="disp text-[17px] font-semibold">Listo para crear</p><p className="text-[13px] text-[#8A93A6] mt-1.5 max-w-sm">{mode === "pieza" ? "Genera gancho, caption, hashtags, CTA, idea visual y guión sin rostro." : "Genera un plan completo de 7 días que puedes mandar de una al tablero."}</p></div></div>}

          {result && !loading && mode === "pieza" && (
            <div className="rounded-2xl border border-[#1b2230] overflow-hidden" style={{ background: "#101622" }}>
              <div className="px-5 py-4 border-b border-[#1b2230] flex items-center justify-between gap-2 flex-wrap" style={{ background: `${brand.color}10` }}>
                <div className="flex items-center gap-2 min-w-0"><span className="text-[18px]">{brand.emoji}</span><div className="min-w-0"><div className="disp font-semibold text-[15px] truncate">{result.title || "Nueva pieza"}</div><div className="text-[11px] text-[#8A93A6]">{PLATFORMS[platform]?.name} · {ctype}</div></div></div>
                <div className="flex gap-2"><button onClick={genPiece} className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-[#2a3344] text-[#aeb6c6]"><RefreshCw size={13} /> Otra</button><button onClick={() => saveToBoard("draft")} className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-[#2a3344] text-[#aeb6c6]"><KanbanSquare size={13} /> Tablero</button><button onClick={() => saveToBoard("scheduled")} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg" style={{ background: ACCENT, color: "#0B0E14" }}><CalIcon size={13} /> Programar</button></div>
              </div>
              <div className="p-5 space-y-4 max-h-[58vh] overflow-y-auto">
                <Block icon={Lightbulb} label="Gancho" color={ACCENT} onCopy={() => copy("hook", result.hook)} copied={copied === "hook"}>{result.hook}</Block>
                <Block icon={Pencil} label="Caption / texto" color="#7BA7F7" onCopy={() => copy("cap", result.caption)} copied={copied === "cap"}><span className="whitespace-pre-wrap">{result.caption}</span></Block>
                {result.script && <Block icon={Film} label="Guión sin rostro" color="#8B7BF7" onCopy={() => copy("scr", result.script)} copied={copied === "scr"}><span className="whitespace-pre-wrap">{result.script}</span></Block>}
                <Block icon={ScanFace} label="Idea visual" color="#FF8A5B">{result.visualIdea}</Block>
                <Block icon={Send} label="Llamado a la acción">{result.cta}</Block>
                {result.hashtags?.length > 0 && <div><div className="flex items-center justify-between mb-2"><span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#6f7a90] mono"><Hash size={12} />Hashtags</span><button onClick={() => copy("tags", result.hashtags.map(h => "#" + h).join(" "))} className="text-[11px] text-[#8A93A6] flex items-center gap-1">{copied === "tags" ? <><Check size={12} />Copiado</> : <><Copy size={12} />Copiar</>}</button></div><div className="flex flex-wrap gap-1.5">{result.hashtags.map((h, i) => <span key={i} className="text-[12px] px-2 py-0.5 rounded-md bg-[#0d121c] border border-[#2a3344] text-[#aeb6c6]">#{h}</span>)}</div></div>}
                {result.bestTime && <div className="flex items-center gap-2 text-[12px] text-[#8A93A6] pt-1"><Clock size={13} style={{ color: ACCENT }} /> Mejor momento: <strong className="text-[#cfd5e0]">{result.bestTime}</strong></div>}
              </div>
            </div>
          )}

          {plan && !loading && mode === "plan" && (
            <div className="rounded-2xl border border-[#1b2230] overflow-hidden" style={{ background: "#101622" }}>
              <div className="px-5 py-4 border-b border-[#1b2230] flex items-center justify-between gap-2 flex-wrap" style={{ background: `${brand.color}10` }}>
                <div className="flex items-center gap-2"><CalendarRange size={17} style={{ color: brand.color }} /><span className="disp font-semibold text-[15px]">Plan de 7 días · {brand.name}</span></div>
                <div className="flex gap-2"><button onClick={genPlan} className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-[#2a3344] text-[#aeb6c6]"><RefreshCw size={13} /> Otro plan</button><button onClick={savePlan} className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg" style={{ background: ACCENT, color: "#0B0E14" }}><Plus size={13} /> Añadir todo</button></div>
              </div>
              <div className="p-4 space-y-2 max-h-[58vh] overflow-y-auto">
                {plan.map((it, i) => { const P = PLATFORMS[it.platform] || PLATFORMS[nets[0]]; const I = P.icon; return (
                  <div key={i} className="rounded-xl border border-[#1b2230] p-3.5 flex items-start gap-3" style={{ background: "#0d121c" }}>
                    <div className="text-center shrink-0 w-12"><div className="text-[10px] uppercase mono text-[#6f7a90]">Día</div><div className="disp text-[18px] font-bold" style={{ color: brand.color }}>{(Number(it.dayOffset) || i) + 1}</div></div>
                    <div className="min-w-0 flex-1"><div className="flex items-center gap-2 mb-1"><I size={13} style={{ color: P.color }} /><span className="text-[11px] text-[#8A93A6]">{P.name} · {it.type}</span></div><div className="text-[13px] text-[#dfe4ee] font-medium">{it.title}</div>{it.hook && <div className="text-[12px] text-[#8A93A6] mt-0.5 italic">"{it.hook}"</div>}{it.objective && <div className="text-[11px] mt-1" style={{ color: ACCENT }}><Target size={10} className="inline mr-1" />{it.objective}</div>}</div>
                  </div>
                ); })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
const Block = ({ icon: Icon, label, color = "#8A93A6", children, onCopy, copied }) => (<div><div className="flex items-center justify-between mb-1.5"><span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#6f7a90] mono"><Icon size={12} style={{ color }} />{label}</span>{onCopy && <button onClick={onCopy} className="text-[11px] text-[#8A93A6] flex items-center gap-1">{copied ? <><Check size={12} />Copiado</> : <><Copy size={12} />Copiar</>}</button>}</div><div className="text-[13px] text-[#dfe4ee] leading-relaxed rounded-lg bg-[#0d121c] border border-[#1b2230] px-3.5 py-3">{children}</div></div>);

/* ============================ TABLERO (Kanban) ============================ */
function Tablero({ brands, posts, setPosts, toast }) {
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState(null);
  const fposts = posts.filter(p => filter === "all" || p.brandId === filter);
  const brandOf = (id) => brands.find(b => b.id === id);
  const move = (p, dir) => { const i = STATUS_ORDER.indexOf(p.status); const ni = Math.min(STATUS_ORDER.length - 1, Math.max(0, i + dir)); if (ni !== i) setPosts(prev => prev.map(x => x.id === p.id ? { ...x, status: STATUS_ORDER[ni] } : x)); };
  return (
    <div className="pb-16">
      <Header kicker="Flujo de producción" title="Tablero de contenido" sub="De idea a publicado. Mueve cada pieza por el flujo con las flechas." />
      <div className="px-4 md:px-8 pt-6 flex gap-2 flex-wrap">
        <button onClick={() => setFilter("all")} className="px-3 py-1.5 rounded-lg text-[12px] border" style={{ background: filter === "all" ? "#161d2b" : "#101622", borderColor: filter === "all" ? `${ACCENT}66` : "#1b2230", color: filter === "all" ? "#fff" : "#9099ab" }}>Todas</button>
        {brands.map(b => <button key={b.id} onClick={() => setFilter(b.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border" style={{ background: filter === b.id ? `${b.color}1f` : "#101622", borderColor: filter === b.id ? `${b.color}66` : "#1b2230", color: filter === b.id ? "#fff" : "#9099ab" }}><span className="h-2 w-2 rounded-full" style={{ background: b.color }} />{b.name}</button>)}
      </div>
      <div className="px-4 md:px-8 pt-5 overflow-x-auto">
        <div className="flex gap-3" style={{ minWidth: 880 }}>
          {STATUS_ORDER.map(s => { const items = fposts.filter(p => p.status === s); return (
            <div key={s} className="flex-1 min-w-[170px]">
              <div className="flex items-center justify-between px-1 mb-2"><span className="flex items-center gap-1.5 text-[12px] font-medium"><span className="h-2 w-2 rounded-full" style={{ background: statusColor(s) }} />{statusLabel(s)}</span><span className="text-[11px] mono text-[#6f7a90]">{items.length}</span></div>
              <div className="space-y-2 rounded-xl p-2 min-h-[120px]" style={{ background: "#0e131e", border: "1px solid #161d2b" }}>
                {items.map(p => { const b = brandOf(p.brandId); const P = PLATFORMS[p.platform]; const I = P?.icon || Instagram; const idx = STATUS_ORDER.indexOf(s); return (
                  <div key={p.id} className="rounded-lg p-2.5" style={{ background: "#101622", border: `1px solid ${b?.color || "#888"}33` }}>
                    <button onClick={() => setEdit(p)} className="text-left w-full"><div className="flex items-center gap-1.5 mb-1"><I size={11} style={{ color: P?.color }} /><span className="text-[10px] mono text-[#8A93A6]">{p.date?.slice(5)} {p.time}</span></div><div className="text-[12px] text-[#dfe4ee] leading-tight line-clamp-3">{p.title}</div></button>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1b2230]"><span className="h-2 w-2 rounded-full" style={{ background: b?.color }} /><div className="flex gap-1"><button onClick={() => move(p, -1)} disabled={idx === 0} className="h-6 w-6 grid place-items-center rounded-md border border-[#2a3344] text-[#8A93A6] disabled:opacity-30"><ChevronLeft size={13} /></button><button onClick={() => move(p, 1)} disabled={idx === STATUS_ORDER.length - 1} className="h-6 w-6 grid place-items-center rounded-md border border-[#2a3344] text-[#8A93A6] disabled:opacity-30"><ChevronRight size={13} /></button></div></div>
                  </div>
                ); })}
                {items.length === 0 && <div className="text-[11px] text-[#7c87a0] text-center py-4">—</div>}
              </div>
            </div>
          ); })}
        </div>
      </div>
      {edit && <PostEditor post={edit} brands={brands} onClose={() => setEdit(null)} onSave={(p) => { setPosts(prev => prev.map(x => x.id === p.id ? p : x)); setEdit(null); toast("Guardado"); }} onDelete={(id) => { setPosts(prev => prev.filter(x => x.id !== id)); setEdit(null); toast("Eliminado"); }} />}
    </div>
  );
}

/* ============================ CALENDARIO ============================ */
function Calendario({ brands, posts, setPosts }) {
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState(null);
  const fposts = posts.filter(p => filter === "all" || p.brandId === filter);
  const days = Array.from({ length: 14 }, (_, i) => addDays(i));
  const byDay = (d) => fposts.filter(p => p.date === d).sort((a, c) => (a.time || "").localeCompare(c.time || ""));
  const brandOf = (id) => brands.find(b => b.id === id);
  return (
    <div className="pb-16">
      <Header kicker="Agenda global + por cuenta" title="Calendario de contenido" sub="Vista unificada de 14 días. Toca un día vacío para programar, o una pieza para editar."
        right={<button onClick={() => setEdit({ id: uid("p"), brandId: brands[0]?.id, platform: Object.keys(brands[0]?.networks || { instagram: 1 })[0], type: "Post", title: "", date: todayISO(), time: "18:00", status: "idea", caption: "", hashtags: [], cta: "", visualIdea: "", script: "", objective: "" })} className="flex items-center gap-1.5 text-[13px] font-medium px-3.5 py-2 rounded-lg" style={{ background: ACCENT, color: "#0B0E14" }}><Plus size={16} /> Programar</button>} />
      <div className="px-4 md:px-8 pt-6 flex gap-2 flex-wrap">
        <button onClick={() => setFilter("all")} className="px-3 py-1.5 rounded-lg text-[12px] border" style={{ background: filter === "all" ? "#161d2b" : "#101622", borderColor: filter === "all" ? `${ACCENT}66` : "#1b2230", color: filter === "all" ? "#fff" : "#9099ab" }}>Todas</button>
        {brands.map(b => <button key={b.id} onClick={() => setFilter(b.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border" style={{ background: filter === b.id ? `${b.color}1f` : "#101622", borderColor: filter === b.id ? `${b.color}66` : "#1b2230", color: filter === b.id ? "#fff" : "#9099ab" }}><span className="h-2 w-2 rounded-full" style={{ background: b.color }} />{b.name}</button>)}
      </div>
      <div className="px-4 md:px-8 pt-5 overflow-x-auto">
        <div className="grid grid-cols-7 gap-2" style={{ minWidth: 760 }}>
          {days.map(d => { const dd = new Date(d + "T12:00"); const isToday = d === todayISO(); return (
            <div key={d} className="rounded-xl border min-h-[150px] p-2" style={{ background: "#0f1420", borderColor: isToday ? `${ACCENT}66` : "#1b2230" }}>
              <div className="flex items-center justify-between mb-2 px-1"><span className="text-[11px] mono" style={{ color: isToday ? ACCENT : "#6f7a90" }}>{dd.toLocaleDateString("es-CO", { weekday: "short" })}</span><span className="disp text-[14px] font-semibold" style={{ color: isToday ? "#fff" : "#8A93A6" }}>{dd.getDate()}</span></div>
              <div className="space-y-1.5">
                {byDay(d).map(p => { const b = brandOf(p.brandId); const P = PLATFORMS[p.platform]; const I = P?.icon || Instagram; return (
                  <button key={p.id} onClick={() => setEdit(p)} className="w-full text-left rounded-lg p-2 hover:brightness-110" style={{ background: `${b?.color || "#888"}1a`, border: `1px solid ${b?.color || "#888"}33` }}><div className="flex items-center gap-1 mb-1"><I size={11} style={{ color: P?.color }} /><span className="text-[10px] mono text-[#8A93A6]">{p.time}</span><span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: statusColor(p.status) }} /></div><div className="text-[11px] leading-tight text-[#dfe4ee] line-clamp-2">{p.title}</div></button>
                ); })}
              </div>
            </div>
          ); })}
        </div>
      </div>
      {edit && <PostEditor post={edit} brands={brands} onClose={() => setEdit(null)} onSave={(p) => { setPosts(prev => prev.some(x => x.id === p.id) ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev]); setEdit(null); }} onDelete={(id) => { setPosts(prev => prev.filter(x => x.id !== id)); setEdit(null); }} />}
    </div>
  );
}

function PostEditor({ post, brands, onClose, onSave, onDelete }) {
  const [p, setP] = useState(post);
  const up = (k, v) => setP(prev => ({ ...prev, [k]: v }));
  const brand = brands.find(b => b.id === p.brandId);
  const nets = Object.keys(brand?.networks || {});
  return (
    <Modal title={post.title ? "Editar publicación" : "Nueva publicación"} onClose={onClose}>
      <Lbl>Marca</Lbl>
      <select value={p.brandId} onChange={e => up("brandId", e.target.value)} className="w-full mt-1.5 mb-3 rounded-lg bg-[#0d121c] border border-[#2a3344] px-3 py-2 text-[13px]">{brands.map(b => <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}</select>
      <Inp label="Título" v={p.title} on={v => up("title", v)} />
      <div className="grid grid-cols-3 gap-3 mt-3">
        <div><Lbl>Plataforma</Lbl><select value={p.platform} onChange={e => up("platform", e.target.value)} className="w-full mt-1.5 rounded-lg bg-[#0d121c] border border-[#2a3344] px-3 py-2 text-[13px]">{(nets.length ? nets : Object.keys(PLATFORMS)).map(k => <option key={k} value={k}>{PLATFORMS[k].name}</option>)}</select></div>
        <Inp label="Fecha" type="date" v={p.date} on={v => up("date", v)} />
        <Inp label="Hora" type="time" v={p.time} on={v => up("time", v)} />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3"><Inp label="Tipo" v={p.type} on={v => up("type", v)} /><div><Lbl>Estado</Lbl><select value={p.status} onChange={e => up("status", e.target.value)} className="w-full mt-1.5 rounded-lg bg-[#0d121c] border border-[#2a3344] px-3 py-2 text-[13px]">{STATUS_ORDER.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></div></div>
      {p.caption ? <TextArea label="Caption" v={p.caption} on={v => up("caption", v)} /> : null}
      {p.script ? <TextArea label="Guión" v={p.script} on={v => up("script", v)} /> : null}
      <div className="flex items-center justify-between mt-6">
        {post.title ? <button onClick={() => onDelete(p.id)} className="flex items-center gap-1.5 text-[12px] text-[#F25C9A] px-3 py-2 rounded-lg hover:bg-[#1a1320]"><Trash2 size={14} /> Eliminar</button> : <span />}
        <div className="flex gap-2"><button onClick={onClose} className="text-[13px] px-4 py-2 rounded-lg border border-[#2a3344] text-[#aeb6c6]">Cancelar</button><button onClick={() => onSave(p)} disabled={!p.title} className="flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-lg disabled:opacity-40" style={{ background: ACCENT, color: "#0B0E14" }}><Save size={15} /> Guardar</button></div>
      </div>
    </Modal>
  );
}

/* ============================ METRICAS ============================ */
function seededSeries(brandId, base, variance, len = 30) {
  let s = (brandId.charCodeAt(brandId.length - 1) || 50) * 7 + 13;
  const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = []; let v = base;
  for (let i = 0; i < len; i++) { v = Math.max(0, v + (rng() - 0.42) * variance); out.push({ d: addDays(i - len + 1).slice(5), v: Math.round(v) }); }
  return out;
}
function Metricas({ brands }) {
  const [sel, setSel] = useState(brands[0]?.id);
  const brand = brands.find(b => b.id === sel) || brands[0];
  const followers = useMemo(() => seededSeries(brand.id, 1800, 90), [brand.id]);
  const reach = useMemo(() => seededSeries(brand.id, 4200, 1600), [brand.id]);
  const leads = useMemo(() => seededSeries(brand.id, 12, 9), [brand.id]);
  const lastF = followers[followers.length - 1].v; const growth = lastF - followers[0].v;
  const totalReach = reach.reduce((a, x) => a + x.v, 0); const totalLeads = leads.reduce((a, x) => a + x.v, 0);
  return (
    <div className="pb-16">
      <Header kicker="Rendimiento" title="Métricas" sub="Crecimiento y, sobre todo, conversión: el objetivo no es solo seguidores sino clientes." />
      <div className="px-4 md:px-8 pt-3"><div className="rounded-lg border border-[#3a3220] px-4 py-2.5 text-[12px] text-[#F2C14E] flex items-center gap-2" style={{ background: "#1a1610" }}><CircleDot size={14} /> Datos de demostración. Las métricas reales se conectan vía las APIs oficiales (ver Ajustes → Integraciones).</div></div>
      <div className="px-4 md:px-8 pt-5 flex gap-2 flex-wrap">{brands.map(b => <button key={b.id} onClick={() => setSel(b.id)} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] border" style={{ background: sel === b.id ? `${b.color}1f` : "#101622", borderColor: sel === b.id ? `${b.color}66` : "#1b2230", color: sel === b.id ? "#fff" : "#9099ab" }}><span>{b.emoji}</span>{b.name}</button>)}</div>
      <div className="px-4 md:px-8 pt-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Seguidores" value={lastF.toLocaleString()} sub={`+${growth} en 30 días`} accent={brand.color} />
        <Kpi label="Alcance (30d)" value={totalReach.toLocaleString()} sub="impresiones" />
        <Kpi label="Leads / consultas" value={totalLeads} sub={`meta: ${brand.goalMetric || "—"}`} accent={ACCENT} />
        <Kpi label="Conversión" value={(totalLeads / totalReach * 100).toFixed(2) + "%"} sub="leads ÷ alcance" />
      </div>
      <div className="px-4 md:px-8 pt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Chart title="Seguidores" color={brand.color}><AreaChart data={followers}><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={brand.color} stopOpacity={0.4} /><stop offset="100%" stopColor={brand.color} stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#1b2230" vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 10, fill: "#7c87a0" }} interval={6} /><YAxis tick={{ fontSize: 10, fill: "#7c87a0" }} width={34} /><Tooltip contentStyle={tt} /><Area type="monotone" dataKey="v" stroke={brand.color} fill="url(#g1)" strokeWidth={2} /></AreaChart></Chart>
        <Chart title="Leads / consultas por día" color={ACCENT}><BarChart data={leads}><CartesianGrid stroke="#1b2230" vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 10, fill: "#7c87a0" }} interval={6} /><YAxis tick={{ fontSize: 10, fill: "#7c87a0" }} width={28} /><Tooltip contentStyle={tt} /><Bar dataKey="v" fill={ACCENT} radius={[3, 3, 0, 0]} /></BarChart></Chart>
        <div className="lg:col-span-2"><Chart title="Alcance" color="#7BA7F7"><LineChart data={reach}><CartesianGrid stroke="#1b2230" vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 10, fill: "#7c87a0" }} interval={4} /><YAxis tick={{ fontSize: 10, fill: "#7c87a0" }} width={42} /><Tooltip contentStyle={tt} /><Line type="monotone" dataKey="v" stroke="#7BA7F7" strokeWidth={2} dot={false} /></LineChart></Chart></div>
      </div>
    </div>
  );
}
const tt = { background: "#0d121c", border: "1px solid #2a3344", borderRadius: 8, fontSize: 12, color: "#fff" };
const Chart = ({ title, color, children }) => (<div className="rounded-2xl border border-[#1b2230] p-4" style={{ background: "#101622" }}><div className="flex items-center gap-2 mb-3"><span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} /><span className="text-[12px] text-[#aeb6c6] font-medium">{title}</span></div><div style={{ height: 180 }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div></div>);

/* ============================ GUIA ============================ */
function Guia() {
  const formats = [
    { icon: Mic2, c: ACCENT, t: "Voz en off + B-roll", d: "Narras (o IA narra) sobre clips de stock o grabados con el celular. El formato sin rostro #1 para educativo y promocional." },
    { icon: LayoutTemplate, c: "#7BA7F7", t: "Carrusel / texto en pantalla", d: "Solo diseño y texto. Ideal para tips, listas y 'antes/después'. Cero cámara, alta conversión en Instagram y LinkedIn." },
    { icon: ScanFace, c: "#8B7BF7", t: "Avatar IA presentador", d: "Un presentador digital lee tu guión (HeyGen, Synthesia). Da sensación de 'humano' sin que nadie aparezca." },
    { icon: Film, c: "#FF8A5B", t: "Manos / producto / pantalla", d: "Se ven manos, el producto o la pantalla, nunca la cara. Perfecto para demos y procesos." },
  ];
  const tools = [
    { cat: "Video sin rostro", items: ["HeyGen — mejor calidad de voz y avatares, pipeline completo", "InVideo AI / Revid — video desde un prompt con visuales generados", "Fliki — texto a video, +2000 voces en 80+ idiomas", "Predis.ai — crea y programa video sin rostro multiplataforma"] },
    { cat: "Voz que parece real", items: ["ElevenLabs — la voz IA más natural, clonación y emociones", "Usa voces con emoción y pausas: evita el tono robótico plano"] },
    { cat: "Diseño y carruseles", items: ["Canva — plantillas, Magic Studio, redimensionado por plataforma", "Brand Kit de Canva — logos, fuentes y colores consistentes"] },
    { cat: "El cerebro (guión + estrategia)", items: ["El Estudio IA de esta herramienta genera el guión y la estrategia", "Pega el guión en la herramienta de video y produces en minutos"] },
  ];
  const flow = ["Genera el guión en el Estudio IA con el objetivo de la marca.", "Conviértelo en voz natural (ElevenLabs o la voz de tu herramienta).", "Arma el visual: b-roll, imágenes IA, o pantalla/manos. Nunca la cara.", "Sube subtítulos siempre (85% ve sin sonido).", "Pásalo al tablero/calendario y programa en el mejor horario."];
  const realTips = ["Usa voces con emoción y variación de ritmo, no monótonas.", "Clips cortos (2–4s) y mucho movimiento: retiene atención.", "Subtítulos grandes y sincronizados; suben el watch time.", "Español neutro o colombiano natural; evita palabras 'de robot'.", "Gancho en los primeros 2 segundos o pierdes al espectador.", "Varía el b-roll: nada delata más a la IA que clips repetidos."];
  return (
    <div className="pb-16">
      <Header kicker="Guía operativa" title="Crear contenido con IA sin dar la cara" sub="Para las cuentas cuyos dueños no quieren aparecer. Formatos, herramientas, flujo y cómo lograr que se vea real." />
      <div className="px-4 md:px-8 pt-6 grid grid-cols-1 md:grid-cols-2 gap-3">{formats.map((f, i) => { const I = f.icon; return <div key={i} className="rounded-2xl border border-[#1b2230] p-5" style={{ background: "#101622" }}><div className="flex items-center gap-2.5 mb-2"><span className="h-9 w-9 rounded-xl grid place-items-center" style={{ background: `${f.c}1f` }}><I size={18} style={{ color: f.c }} /></span><span className="disp font-semibold text-[15px]">{f.t}</span></div><p className="text-[13px] text-[#aeb6c6] leading-relaxed">{f.d}</p></div>; })}</div>
      <div className="px-4 md:px-8 pt-7 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#1b2230] p-5" style={{ background: "#101622" }}><div className="disp font-semibold text-[15px] mb-3 flex items-center gap-2"><Send size={16} style={{ color: ACCENT }} /> Flujo de producción</div><ol className="space-y-2.5">{flow.map((s, i) => <li key={i} className="flex gap-3 text-[13px] text-[#cfd5e0]"><span className="h-5 w-5 shrink-0 rounded-md grid place-items-center mono text-[11px]" style={{ background: "#161d2b", color: ACCENT }}>{i + 1}</span>{s}</li>)}</ol></div>
        <div className="rounded-2xl border border-[#1b2230] p-5" style={{ background: "#101622" }}><div className="disp font-semibold text-[15px] mb-3 flex items-center gap-2"><Check size={16} style={{ color: "#9BE15D" }} /> Que se vea real, no de IA</div><ul className="space-y-2">{realTips.map((t, i) => <li key={i} className="flex gap-2.5 text-[13px] text-[#cfd5e0]"><Check size={15} className="mt-0.5 shrink-0" style={{ color: "#9BE15D" }} />{t}</li>)}</ul></div>
      </div>
      <div className="px-4 md:px-8 pt-7"><div className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mb-3">Herramientas recomendadas</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{tools.map((g, i) => <div key={i} className="rounded-2xl border border-[#1b2230] p-5" style={{ background: "#101622" }}><div className="text-[13px] font-semibold mb-2.5" style={{ color: ACCENT }}>{g.cat}</div><ul className="space-y-1.5">{g.items.map((it, j) => <li key={j} className="flex gap-2 text-[12.5px] text-[#aeb6c6]"><ChevronRight size={14} className="mt-0.5 shrink-0 text-[#7c87a0]" />{it}</li>)}</ul></div>)}</div></div>
      <div className="px-4 md:px-8 pt-7"><div className="rounded-2xl border p-5" style={{ background: "#130f1c", borderColor: "#8B7BF733" }}><div className="disp font-semibold text-[15px] mb-3 flex items-center gap-2"><Film size={16} style={{ color: "#8B7BF7" }} /> Plantilla de guión sin rostro (Reel 30s)</div><div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px]"><div className="rounded-lg bg-[#0d121c] border border-[#1b2230] p-3"><div className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mb-1">0–3s · Gancho</div><div className="text-[#cfd5e0]">Pregunta o dato que duele. B-roll llamativo + texto grande.</div></div><div className="rounded-lg bg-[#0d121c] border border-[#1b2230] p-3"><div className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mb-1">3–22s · Valor</div><div className="text-[#cfd5e0]">3 puntos rápidos. Voz en off + b-roll que cambia cada 2–3s + subtítulos.</div></div><div className="rounded-lg bg-[#0d121c] border border-[#1b2230] p-3"><div className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mb-1">22–30s · CTA</div><div className="text-[#cfd5e0]">Una sola acción: "Escríbenos", "Link en bio", "Cotiza gratis".</div></div></div></div></div>
    </div>
  );
}

/* ============================ AJUSTES (integraciones + datos) ============================ */
function Ajustes({ brands, posts, setBrands, setPosts, toast }) {
  const fileRef = useRef(null);
  const integ = [
    { name: "Instagram / Facebook", icon: Instagram, color: "#E1306C", status: "Demo", note: "Requiere Meta Graph API + app aprobada por Meta y login OAuth de cada cuenta." },
    { name: "TikTok", icon: Film, color: "#00E5D0", status: "Demo", note: "Requiere TikTok Content Posting API (aprobación) para publicar y leer métricas." },
    { name: "LinkedIn", icon: Linkedin, color: "#0A66C2", status: "Demo", note: "Requiere acceso al LinkedIn Marketing/Community API (programa de partners)." },
    { name: "Canva", icon: LayoutTemplate, color: "#7BA7F7", status: "Demo", note: "Canva Connect API genera y trae diseños; necesita OAuth y backend." },
    { name: "IA de contenido", icon: Sparkles, color: ACCENT, status: "Activo", note: "Copy, guiones, estrategia y plan semanal funcionando en vivo." },
    { name: "Guardado automático", icon: Save, color: "#9BE15D", status: "Activo", note: "Tus marcas y contenido se guardan solos en este navegador." },
  ];
  const exportData = () => { const blob = new Blob([JSON.stringify({ brands, posts, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `comando-redes-${todayISO()}.json`; a.click(); toast("Copia de seguridad descargada"); };
  const importData = (e) => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result); if (d.brands) setBrands(d.brands); if (d.posts) setPosts(d.posts); toast("Datos importados"); } catch { toast("Archivo inválido", "err"); } }; r.readAsText(f); e.target.value = ""; };
  const reset = () => { if (confirm("¿Borrar todas las marcas y contenido? Esto no se puede deshacer.")) { setBrands([]); setPosts([]); toast("Todo borrado"); } };
  return (
    <div className="pb-16">
      <Header kicker="Configuración" title="Ajustes" sub="Integraciones, copia de seguridad y datos. Honestidad total sobre qué funciona hoy." />
      <div className="px-4 md:px-8 pt-6"><div className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mb-3">Integraciones</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{integ.map((it, i) => { const I = it.icon; const on = it.status === "Activo"; return <div key={i} className="rounded-2xl border border-[#1b2230] p-5 flex items-start gap-3" style={{ background: "#101622" }}><span className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: `${it.color}1f` }}><I size={19} style={{ color: it.color }} /></span><div className="flex-1 min-w-0"><div className="flex items-center justify-between gap-2"><span className="disp font-semibold text-[15px]">{it.name}</span><Pill color={on ? "#9BE15D" : "#F2C14E"} soft>{on ? <Check size={11} /> : <Clock size={11} />}{it.status}</Pill></div><p className="text-[12.5px] text-[#8A93A6] mt-1.5 leading-relaxed">{it.note}</p></div></div>; })}</div></div>
      <div className="px-4 md:px-8 pt-7"><div className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mb-3">Tus datos</div>
        <div className="rounded-2xl border border-[#1b2230] p-5 flex flex-col sm:flex-row gap-3" style={{ background: "#101622" }}>
          <button onClick={exportData} className="flex items-center justify-center gap-2 text-[13px] px-4 py-2.5 rounded-lg border border-[#2a3344] text-[#aeb6c6] flex-1"><Download size={15} /> Exportar copia</button>
          <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 text-[13px] px-4 py-2.5 rounded-lg border border-[#2a3344] text-[#aeb6c6] flex-1"><Upload size={15} /> Importar</button>
          <input ref={fileRef} type="file" accept="application/json" onChange={importData} className="hidden" />
          <button onClick={reset} className="flex items-center justify-center gap-2 text-[13px] px-4 py-2.5 rounded-lg border border-[#3a2230] text-[#F25C9A] flex-1"><RotateCcw size={15} /> Empezar de cero</button>
        </div>
        <p className="text-[12px] text-[#6f7a90] mt-2">Los datos viven en este navegador. Exporta de vez en cuando para no perderlos al cambiar de equipo.</p>
      </div>
      <div className="px-4 md:px-8 pt-7"><div className="rounded-2xl border border-[#1b2230] p-6" style={{ background: "#0f1420" }}><div className="disp font-semibold text-[15px] mb-2">¿Por qué publicar y leer métricas reales necesita un backend?</div><p className="text-[13px] text-[#aeb6c6] leading-relaxed">Meta, TikTok y LinkedIn solo permiten publicar y leer datos por sus APIs oficiales, con apps registradas, revisión de la plataforma y autenticación OAuth por cuenta — eso vive en un servidor, no en el navegador. Esta versión deja lista la operación, la estrategia y la generación de contenido; el conector de publicación/métricas es el siguiente paso del roadmap.</p></div></div>
    </div>
  );
}

/* ============================ WEB & ANALYTICS ============================ */
const sevColor = (s) => ({ alta: "#F25C9A", media: "#F2C14E", baja: "#8A93A6" }[s] || "#8A93A6");
function WebAnalytics({ brands, setBrands, toast }) {
  const [sel, setSel] = useState(brands[0]?.id);
  const brand = brands.find(b => b.id === sel) || brands[0];
  const [auditing, setAuditing] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  useEffect(() => { setUrlDraft(brand?.website || ""); }, [brand?.id]);

  const ga = useMemo(() => ({
    users: seededSeries(brand.id + "u", 320, 130),
    sessions: seededSeries(brand.id + "s", 470, 190),
    conv: seededSeries(brand.id + "c", 7, 5),
  }), [brand.id]);
  const sources = [["Búsqueda orgánica", 42, "#9BE15D"], ["Redes sociales", 28, "#7BA7F7"], ["Directo", 18, "#F2C14E"], ["Referidos", 12, "#8B7BF7"]];
  const topPages = [["/", "Inicio"], ["/servicios", "Servicios"], ["/contacto", "Contacto"], ["/blog", "Blog"]];
  const totalUsers = ga.users.reduce((a, x) => a + x.v, 0);
  const totalSessions = ga.sessions.reduce((a, x) => a + x.v, 0);
  const totalConv = ga.conv.reduce((a, x) => a + x.v, 0);

  const daysSince = brand.lastAudit ? Math.floor((Date.now() - new Date(brand.lastAudit.date).getTime()) / 86400000) : null;
  const due = daysSince === null || daysSince >= 15;

  const saveUrl = () => { setBrands(prev => prev.map(x => x.id === brand.id ? { ...x, website: urlDraft } : x)); toast("Sitio guardado"); };
  const runAudit = async () => {
    const url = brand.website || urlDraft;
    if (!url) { toast("Agrega la URL del sitio primero", "err"); return; }
    setAuditing(true);
    const prompt = `Eres auditor web y consultor de SEO, UX y conversión. Revisa el sitio "${url}" de la marca ${brand.name} (${brand.type}). Objetivo del negocio: ${brand.objective}. Audiencia: ${brand.audience}. Usa búsqueda web para ver el sitio y su contenido real antes de opinar.
Devuelve SOLO JSON válido sin markdown:
{"overall":"estado general del sitio en 1-2 frases","working":["2-4 cosas que están bien"],"issues":[{"title":"problema concreto","severity":"alta|media|baja","fix":"cómo solucionarlo"}],"suggestions":["3-5 mejoras priorizadas para conseguir más leads/ventas"]}`;
    try {
      const txt = await callClaude(prompt, [{ type: "web_search_20250305", name: "web_search" }]);
      const r = parseJSON(txt);
      if (!r) throw 0;
      setBrands(prev => prev.map(x => x.id === brand.id ? { ...x, website: url, lastAudit: { date: new Date().toISOString(), data: r } } : x));
      toast("Auditoría completada");
    } catch { toast("No se pudo auditar. Intenta de nuevo.", "err"); }
    finally { setAuditing(false); }
  };

  const A = brand.lastAudit?.data;
  return (
    <div className="pb-16">
      <Header kicker="Sitio web + Analytics" title="Web & SEO" sub="Auditoría del sitio con IA y reporte de Google Analytics por marca." />
      <div className="px-4 md:px-8 pt-5 flex gap-2 flex-wrap">{brands.map(b => <button key={b.id} onClick={() => setSel(b.id)} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] border" style={{ background: sel === b.id ? `${b.color}1f` : "#101622", borderColor: sel === b.id ? `${b.color}66` : "#1b2230", color: sel === b.id ? "#fff" : "#9099ab" }}><span>{b.emoji}</span>{b.name}</button>)}</div>

      {/* SITE AUDIT */}
      <div className="px-4 md:px-8 pt-6">
        <div className="rounded-2xl border border-[#1b2230] p-5" style={{ background: "#101622" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0"><span className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ background: `${brand.color}1f` }}><Globe size={19} style={{ color: brand.color }} /></span>
              <div className="min-w-0"><div className="disp font-semibold text-[15px]">Auditoría del sitio</div>
                {brand.website ? <a href={brand.website} target="_blank" rel="noreferrer" className="text-[12px] text-[#7BA7F7] flex items-center gap-1 hover:underline">{brand.website}<ExternalLink size={11} /></a> : <span className="text-[12px] text-[#6f7a90]">Sin sitio configurado</span>}
              </div>
            </div>
            <button onClick={runAudit} disabled={auditing} className="flex items-center gap-1.5 text-[13px] font-medium px-4 py-2 rounded-lg disabled:opacity-60" style={{ background: ACCENT, color: "#0B0E14" }}>{auditing ? <><Loader2 size={15} className="animate-spin" /> Escaneando…</> : <><Search size={15} /> Auditar con IA</>}</button>
          </div>

          {!brand.website && (
            <div className="flex gap-2 mt-4">
              <input value={urlDraft} onChange={e => setUrlDraft(e.target.value)} placeholder="https://tudominio.com" className="flex-1 rounded-lg bg-[#0d121c] border border-[#2a3344] px-3 py-2 text-[13px] text-[#e8ecf2] placeholder:text-[#7c87a0]" />
              <button onClick={saveUrl} className="text-[13px] px-3 py-2 rounded-lg border border-[#2a3344] text-[#aeb6c6]">Guardar URL</button>
            </div>
          )}

          <div className={`mt-4 rounded-lg px-4 py-2.5 text-[12px] flex items-center gap-2`} style={{ background: due ? "#1a1610" : "#0f1a14", color: due ? "#F2C14E" : "#9BE15D" }}>
            <Clock size={14} />{daysSince === null ? "Aún no has auditado este sitio. Se recomienda revisar cada ~15 días." : due ? `Han pasado ${daysSince} días desde la última auditoría — toca revisar.` : `Última auditoría hace ${daysSince} días. Próxima sugerida en ${15 - daysSince} días.`}
          </div>

          {auditing && <div className="mt-4 grid place-items-center py-10"><div className="text-center"><Loader2 size={26} className="animate-spin mx-auto" style={{ color: ACCENT }} /><p className="text-[13px] text-[#8A93A6] mt-2">Revisando {brand.website}…</p></div></div>}

          {A && !auditing && (
            <div className="mt-5 space-y-4">
              <div className="rounded-lg bg-[#0d121c] border border-[#1b2230] p-3.5"><div className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mb-1">Estado general</div><div className="text-[13px] text-[#dfe4ee]">{A.overall}</div></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><div className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mb-2 flex items-center gap-1.5"><Check size={12} style={{ color: "#9BE15D" }} />Funciona bien</div><ul className="space-y-1.5">{(A.working || []).map((w, i) => <li key={i} className="flex gap-2 text-[12.5px] text-[#cfd5e0]"><Check size={14} className="mt-0.5 shrink-0" style={{ color: "#9BE15D" }} />{w}</li>)}</ul></div>
                <div><div className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mb-2 flex items-center gap-1.5"><Lightbulb size={12} style={{ color: ACCENT }} />Sugerencias</div><ul className="space-y-1.5">{(A.suggestions || []).map((s, i) => <li key={i} className="flex gap-2 text-[12.5px] text-[#cfd5e0]"><ArrowRight size={14} className="mt-0.5 shrink-0" style={{ color: ACCENT }} />{s}</li>)}</ul></div>
              </div>
              {(A.issues || []).length > 0 && <div><div className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono mb-2 flex items-center gap-1.5"><AlertTriangle size={12} style={{ color: "#F2C14E" }} />Problemas detectados</div><div className="space-y-2">{A.issues.map((it, i) => <div key={i} className="rounded-lg bg-[#0d121c] border border-[#1b2230] p-3"><div className="flex items-center gap-2 mb-1"><Pill color={sevColor(it.severity)} soft>{it.severity}</Pill><span className="text-[13px] text-[#dfe4ee] font-medium">{it.title}</span></div><div className="text-[12px] text-[#8A93A6]">{it.fix}</div></div>)}</div></div>}
              <p className="text-[11px] text-[#7c87a0]">Auditoría asistida por IA (contenido, SEO, UX, conversión). Para chequeos técnicos profundos —velocidad, uptime 24/7, enlaces rotos— se conecta el backend en el roadmap.</p>
            </div>
          )}
        </div>
      </div>

      {/* GOOGLE ANALYTICS */}
      <div className="px-4 md:px-8 pt-6">
        <div className="rounded-lg border border-[#3a3220] px-4 py-2.5 text-[12px] text-[#F2C14E] flex items-center gap-2 mb-4" style={{ background: "#1a1610" }}><CircleDot size={14} /> Reporte de demostración. Conecta Google Analytics 4 (API + OAuth) para datos reales y reporte diario automático.</div>
        <div className="rounded-2xl border border-[#1b2230] p-5" style={{ background: "#101622" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-2.5"><span className="h-10 w-10 rounded-xl grid place-items-center" style={{ background: "#F2980022" }}><Activity size={19} style={{ color: "#F29800" }} /></span><div><div className="disp font-semibold text-[15px]">Google Analytics</div><div className="text-[12px] text-[#8A93A6]">{brand.gaId ? `Propiedad ${brand.gaId}` : "Sin propiedad GA4 configurada"}</div></div></div>
            <Pill color="#F2C14E" soft><Clock size={11} />Pendiente de conexión</Pill>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Usuarios (30d)" value={totalUsers.toLocaleString()} sub="visitantes únicos" accent={brand.color} />
            <Kpi label="Sesiones (30d)" value={totalSessions.toLocaleString()} sub="visitas totales" />
            <Kpi label="Tasa interacción" value={(58 + (brand.id.charCodeAt(brand.id.length - 1) % 12)) + "%"} sub="sesiones activas" />
            <Kpi label="Conversiones" value={totalConv} sub="leads / acciones clave" accent={ACCENT} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
            <div className="lg:col-span-2"><Chart title="Usuarios por día" color={brand.color}><AreaChart data={ga.users}><defs><linearGradient id="ga1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={brand.color} stopOpacity={0.4} /><stop offset="100%" stopColor={brand.color} stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#1b2230" vertical={false} /><XAxis dataKey="d" tick={{ fontSize: 10, fill: "#7c87a0" }} interval={6} /><YAxis tick={{ fontSize: 10, fill: "#7c87a0" }} width={34} /><Tooltip contentStyle={tt} /><Area type="monotone" dataKey="v" stroke={brand.color} fill="url(#ga1)" strokeWidth={2} /></AreaChart></Chart></div>
            <div className="rounded-2xl border border-[#1b2230] p-4" style={{ background: "#101622" }}>
              <div className="text-[12px] text-[#aeb6c6] font-medium mb-3">Fuentes de tráfico</div>
              <div className="space-y-2.5">{sources.map(([n, p, c]) => <div key={n}><div className="flex justify-between text-[12px] mb-1"><span className="text-[#aeb6c6]">{n}</span><span className="mono" style={{ color: c }}>{p}%</span></div><div className="h-1.5 rounded-full bg-[#0d121c]"><div className="h-1.5 rounded-full" style={{ width: p + "%", background: c }} /></div></div>)}</div>
              <div className="text-[12px] text-[#aeb6c6] font-medium mt-5 mb-2">Páginas top</div>
              <div className="space-y-1.5">{topPages.map(([u, n], i) => <div key={u} className="flex items-center justify-between text-[12px]"><span className="text-[#cfd5e0]">{n} <span className="text-[#7c87a0] mono">{u}</span></span><span className="mono text-[#8A93A6]">{Math.round(totalUsers * [0.4, 0.25, 0.2, 0.15][i]).toLocaleString()}</span></div>)}</div>
            </div>
          </div>
          <p className="text-[11px] text-[#7c87a0] mt-4">Con GA4 conectado, este reporte se actualiza solo cada día con usuarios, sesiones, interacción, conversiones, fuentes, páginas top, embudo y comparativa contra el periodo anterior.</p>
        </div>
      </div>
    </div>
  );
}

/* ============================ shared bits ============================ */
const Header = ({ kicker, title, sub, right }) => (<div className="flex items-start justify-between gap-4 px-4 md:px-8 pt-7 md:pt-8 pb-5 border-b border-[#161d2b]"><div className="min-w-0"><div className="text-[11px] tracking-[0.2em] uppercase mono mb-1.5" style={{ color: ACCENT }}>{kicker}</div><h1 className="disp text-[22px] md:text-[26px] font-bold leading-tight">{title}</h1>{sub && <p className="text-[13px] text-[#8A93A6] mt-1 max-w-xl">{sub}</p>}</div>{right && <div className="shrink-0">{right}</div>}</div>);
const Kpi = ({ label, value, sub, accent = "#E8ECF2" }) => (<div className="rounded-2xl p-4 border border-[#1b2230]" style={{ background: "#101622" }}><div className="text-[11px] uppercase tracking-wider text-[#6f7a90] mono">{label}</div><div className="disp text-[26px] md:text-[30px] font-bold mt-1 leading-none" style={{ color: accent }}>{value}</div><div className="text-[11px] text-[#7c87a0] mt-1.5">{sub}</div></div>);
const Pill = ({ children, color, soft }) => (<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: soft ? `${color}1f` : color, color: soft ? color : "#0B0E14", border: `1px solid ${color}33` }}>{children}</span>);
const Lbl = ({ children, className = "" }) => <div className={`text-[11px] uppercase tracking-wider text-[#6f7a90] mono ${className}`}>{children}</div>;
const Inp = ({ label, v, on, type = "text", className = "", ph = "" }) => (<div className={className}><Lbl>{label}</Lbl><input type={type} value={v} placeholder={ph} onChange={e => on(e.target.value)} className="w-full mt-1.5 rounded-lg bg-[#0d121c] border border-[#2a3344] px-3 py-2 text-[13px] text-[#e8ecf2] placeholder:text-[#7c87a0]" /></div>);
const TextArea = ({ label, v, on, ph = "", rows = 3 }) => (<div className="mt-3"><Lbl>{label}</Lbl><textarea value={v} placeholder={ph} onChange={e => on(e.target.value)} rows={rows} className="w-full mt-1.5 rounded-lg bg-[#0d121c] border border-[#2a3344] px-3 py-2 text-[14px] text-[#e8ecf2] placeholder:text-[#7c87a0] resize-y leading-relaxed" /></div>);
function Modal({ title, children, onClose, wide, xl }) {
  const maxW = xl ? "max-w-3xl" : wide ? "max-w-xl" : "max-w-lg";
  return (<div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: "rgba(5,7,11,0.72)" }} onClick={onClose}><div className={`w-full ${maxW} rounded-2xl border border-[#222a38] max-h-[92vh] overflow-y-auto`} style={{ background: "#101622" }} onClick={e => e.stopPropagation()}><div className="flex items-center justify-between px-6 py-4 border-b border-[#1b2230] sticky top-0 z-10" style={{ background: "#101622" }}><h3 className="disp font-bold text-[17px]">{title}</h3><button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-[#161d2b] text-[#8A93A6]"><X size={18} /></button></div><div className="p-6">{children}</div></div></div>);
}
