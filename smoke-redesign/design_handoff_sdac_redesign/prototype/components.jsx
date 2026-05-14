// ============================================================
// SDAC — shared components
// ============================================================

const { useState, useEffect, useRef, useMemo, createContext, useContext } = React;

// ---- Logo / wordmark ----
function Wordmark({ size = "md", tone = "ink" }) {
  const sizes = {
    sm: { word: 16, sub: 9 },
    md: { word: 22, sub: 10 },
    lg: { word: 34, sub: 11 },
  };
  const s = sizes[size];
  const color = tone === "parchment" ? "#F0E6CC" : "var(--ink)";
  const subColor = tone === "parchment" ? "rgba(240,230,204,.6)" : "var(--ink-3)";
  return (
    <div style={{display:"flex", flexDirection:"column", lineHeight:1}}>
      <span style={{
        fontFamily:"var(--font-display)",
        fontWeight:500,
        fontSize:s.word,
        letterSpacing:"-0.01em",
        color,
      }}>
        Saint-Hubert
      </span>
      <span style={{
        fontFamily:"var(--font-mono)",
        fontSize:s.sub,
        letterSpacing:"0.18em",
        textTransform:"uppercase",
        color: subColor,
        marginTop:3,
      }}>
        Église Adventiste · Est. 1986
      </span>
    </div>
  );
}

// ---- Eyebrow / micro label ----
function Eyebrow({ children, tone, n }) {
  const cls = ["eyebrow", tone === "gilt" && "eyebrow-gilt", tone === "parch" && "eyebrow-parch"].filter(Boolean).join(" ");
  return (
    <div className={cls} style={{display:"flex", alignItems:"center", gap:10}}>
      {n !== undefined && <span style={{fontFamily:"var(--font-mono)", fontWeight:400}}>{String(n).padStart(2,"0")}</span>}
      {n !== undefined && <span style={{width:14, height:1, background:"currentColor", opacity:0.5}}></span>}
      <span>{children}</span>
    </div>
  );
}

// ---- Hairline rule ----
function Rule({ tone, thick }) {
  return <hr className={"rule" + (tone === "dark" ? " rule-dark" : "") + (thick ? " rule-thick" : "")} />;
}

// ---- Live badge ----
function Live({ label = "En direct" }) {
  return <span className="live">{label}</span>;
}

// ---- Tag ----
function Tag({ children, tone }) {
  return <span className={"tag" + (tone === "gilt" ? " tag-gilt" : "")}>{children}</span>;
}

// ---- Avatar ----
function Avatar({ initials, size = "md", tint }) {
  const cls = "avatar" + (size === "lg" ? " avatar-lg" : size === "sm" ? " avatar-sm" : "");
  const style = tint ? { background: tint, color: "var(--parchment)", borderColor: tint } : {};
  return <span className={cls} style={style}>{initials}</span>;
}

// ---- Department swatch ----
function DeptSwatch({ color }) {
  return <span className="dept-swatch" style={{background:color}}></span>;
}

// ---- Numerated display ----
function Numerator({ children, size = 96, weight = 300 }) {
  return (
    <span className="numerator" style={{fontSize:size, fontWeight:weight, display:"inline-block"}}>{children}</span>
  );
}

// ---- Ornament (sparing use) ----
function Ornament() { return <span className="ornament" />; }

// ---- Button ----
function Btn({ children, kind = "ghost", size, onClick, as: As = "button", href, ...rest }) {
  const cls = "btn btn-" + kind + (size === "sm" ? " btn-sm" : "");
  if (href) return <a href={href} className={cls} onClick={(e) => { e.preventDefault(); onClick && onClick(e); }} {...rest}>{children}</a>;
  return <As className={cls} onClick={onClick} {...rest}>{children}</As>;
}

// ---- Department palette (24 tokens; admins pick one per dept) ----
// Color is the SECONDARY identifier; the abbreviation (code) is primary.
const DEPT_COLORS = {
  DIACONNAT: "var(--dept-08)",   // moss
  JA:        "var(--dept-20)",   // bordeaux
  MUSIC:     "var(--dept-13)",   // azure
  MIFEM:     "var(--dept-04)",   // umber
  MF:        "var(--dept-17)",   // plum
  PASTORAL:  "var(--dept-07)",   // fern
  AS:        "var(--dept-03)",   // rust
};
const DEPTS = [
  { code: "DIACONNAT", name: "Diaconat",                  color: DEPT_COLORS.DIACONNAT, count: 12 },
  { code: "JA",        name: "Jeunesse Adventiste",       color: DEPT_COLORS.JA,        count: 9  },
  { code: "MUSIC",     name: "Ministère de la musique",   color: DEPT_COLORS.MUSIC,     count: 14 },
  { code: "MIFEM",     name: "Ministère des femmes",      color: DEPT_COLORS.MIFEM,     count: 7  },
  { code: "MF",        name: "Ministère des familles",    color: DEPT_COLORS.MF,        count: 6  },
  { code: "PASTORAL",  name: "Pastoral",                  color: DEPT_COLORS.PASTORAL,  count: 4  },
];

// ---- Phone chrome (status bar) ----
function PhoneChrome({ children, dark }) {
  const fg = dark ? "#F0E6CC" : "var(--ink)";
  return (
    <div className="frame frame-mobile">
      <div style={{
        height:36, display:"flex", justifyContent:"space-between", alignItems:"center",
        padding:"0 24px",
        fontFamily:"var(--font-mono)", fontSize:11, fontWeight:500,
        color: fg,
        background: dark ? "var(--ink)" : "var(--parchment)",
      }}>
        <span>9:41</span>
        <span style={{display:"inline-flex", gap:6, alignItems:"center"}}>
          <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 7 L4 4 L7 7 L13 1" stroke="currentColor" strokeWidth="1.2" fill="none"/></svg>
          <svg width="14" height="10" viewBox="0 0 14 10"><rect x="0.5" y="1.5" width="11" height="7" rx="1" stroke="currentColor" fill="none"/><rect x="2" y="3" width="8" height="4" fill="currentColor"/><rect x="12" y="3.5" width="1" height="3" fill="currentColor"/></svg>
        </span>
      </div>
      <div className="app" style={{height:"calc(100% - 36px)"}}>{children}</div>
    </div>
  );
}

// ---- Desktop chrome (just the frame + title bar) ----
function DesktopChrome({ children, url = "saint-hubert.qc/" }) {
  return (
    <div className="frame frame-desktop" style={{aspectRatio:"auto", height:880, maxWidth:1280}}>
      <div style={{
        height:36, display:"flex", alignItems:"center", gap:10, padding:"0 14px",
        borderBottom:"1px solid #3A332A", background:"#26221C",
        fontFamily:"var(--font-mono)", fontSize:11, color:"#8E8267",
      }}>
        <span style={{display:"inline-flex", gap:6}}>
          <span style={{width:10,height:10,borderRadius:"50%",background:"#5C5040"}}/>
          <span style={{width:10,height:10,borderRadius:"50%",background:"#5C5040"}}/>
          <span style={{width:10,height:10,borderRadius:"50%",background:"#5C5040"}}/>
        </span>
        <span style={{
          flex:1, textAlign:"center", padding:"4px 12px", margin:"0 80px",
          background:"#1F1B16", borderRadius:6, color:"#A89878",
        }}>{url}</span>
      </div>
      <div className="app" style={{height:"calc(100% - 36px)"}}>{children}</div>
    </div>
  );
}

// ---- Image slot wrapper (uses our <image-slot> web component) ----
function ImageSlot({ id, placeholder, shape, radius, style, mask }) {
  // React passes camelCase attrs that web component expects as kebab-case
  return (
    <image-slot
      id={id}
      placeholder={placeholder}
      shape={shape}
      radius={radius}
      mask={mask}
      style={style}
    />
  );
}

// ---- Section heading (display serif, with eyebrow above) ----
function SectionHead({ eyebrow, n, title, subtitle, align = "left" }) {
  return (
    <div style={{textAlign: align}}>
      {eyebrow && <Eyebrow n={n}>{eyebrow}</Eyebrow>}
      <h2 style={{
        fontFamily:"var(--font-display)",
        fontWeight:400,
        fontSize:38, lineHeight:1.05, letterSpacing:"-0.015em",
        marginTop: eyebrow ? 14 : 0,
        color:"var(--ink)",
      }}>{title}</h2>
      {subtitle && <p style={{
        marginTop:10, fontSize:15, color:"var(--ink-3)", maxWidth:"60ch",
        fontFamily:"var(--font-sans)",
      }}>{subtitle}</p>}
    </div>
  );
}

// ---- Big numbered date block (used in hero) ----
function DateBlock({ day, weekday, month, year, tone = "ink" }) {
  const fg = tone === "parchment" ? "#F0E6CC" : "var(--ink)";
  const dim = tone === "parchment" ? "rgba(240,230,204,.55)" : "var(--ink-3)";
  return (
    <div style={{display:"flex", alignItems:"flex-end", gap:14, color:fg, lineHeight:1}}>
      <div className="numerator" style={{fontSize:124, fontWeight:300, letterSpacing:"-0.04em"}}>{day}</div>
      <div style={{display:"flex", flexDirection:"column", gap:6, paddingBottom:10}}>
        <div style={{
          fontFamily:"var(--font-display)", fontStyle:"italic",
          fontSize:24, fontWeight:400, color:fg,
        }}>{weekday}</div>
        <div className="eyebrow" style={{color:dim}}>{month} · {year}</div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Wordmark, Eyebrow, Rule, Live, Tag, Avatar, DeptSwatch, Numerator, Ornament,
  Btn, PhoneChrome, DesktopChrome, ImageSlot, SectionHead, DateBlock,
  DEPTS, DEPT_COLORS,
});
