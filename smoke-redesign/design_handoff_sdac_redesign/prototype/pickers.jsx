// ============================================================
// SDAC — Form fields & pickers
// ============================================================

// ---- Generic field wrapper ----
function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <div className="field-help">{hint}</div>}
    </div>
  );
}

// ---- Plain text field (with optional leading/trailing) ----
function TextField({ value, defaultValue, placeholder, leading, trailing, display, onChange }) {
  return (
    <div className="field-shell">
      {leading && <span className="leading">{leading}</span>}
      <input
        className={display ? "display-input" : ""}
        defaultValue={defaultValue ?? value}
        placeholder={placeholder}
        onChange={onChange}
      />
      {trailing && <span className="trailing">{trailing}</span>}
    </div>
  );
}

function TextAreaField({ value, defaultValue, placeholder, rows = 3 }) {
  return (
    <div className="field-shell" style={{alignItems:"flex-start"}}>
      <textarea defaultValue={defaultValue ?? value} placeholder={placeholder} rows={rows}/>
    </div>
  );
}

// ---- Select-style field (styled, mock dropdown shown via prop) ----
function SelectField({ value, leading, trailing, options = [], open = false, onPick }) {
  return (
    <div style={{position:"relative"}}>
      <div className="field-shell field-select">
        {leading}
        <span style={{flex:1, color:"var(--ink)"}}>{value}</span>
      </div>
      {open && (
        <div className="anim-popover-in" style={{
          position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:10,
          background:"var(--parchment)", border:"1px solid var(--hairline-2)", borderRadius:6,
          boxShadow:"0 20px 40px -20px rgba(27, 37, 48, 0.25)",
          padding:"6px 0",
        }}>
          {options.map((o, i) => (
            <div key={i} onClick={()=>onPick && onPick(o)} style={{
              padding:"10px 14px",
              display:"flex", alignItems:"center", gap:10,
              cursor:"pointer",
              background: o.active ? "var(--parchment-2)" : "transparent",
              fontSize:14, color:"var(--ink)",
            }}>
              {o.swatch && <DeptSwatch color={o.swatch}/>}
              <span style={{flex:1}}>{o.label}</span>
              {o.meta && <span className="eyebrow">{o.meta}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Mini calendar — for date picker popover ----
function MiniCalendar({ month = "Mai 2026", selected = 23, today = 13, marked = [2, 9, 16, 23, 30] }) {
  // Sunday-first, May 2026 starts Friday
  const cells = [];
  for (let i = 0; i < 5; i++) cells.push({ d: 26 + i, dim: true });
  for (let d = 1; d <= 31; d++) cells.push({ d });
  while (cells.length < 35) cells.push({ d: cells.length - 35 + 7, dim: true });

  return (
    <div style={{padding:14, background:"var(--parchment)", border:"1px solid var(--hairline-2)", borderRadius:6, width:280}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
        <button style={{background:"none", border:0, color:"var(--ink-3)", cursor:"pointer", padding:4}}>‹</button>
        <span style={{fontFamily:"var(--font-display)", fontSize:15, color:"var(--ink)"}}>{month}</span>
        <button style={{background:"none", border:0, color:"var(--ink-3)", cursor:"pointer", padding:4}}>›</button>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:2}}>
        {["D","L","M","M","J","V","S"].map((w, i) => (
          <div key={i} style={{textAlign:"center", padding:"4px 0", fontFamily:"var(--font-mono)", fontSize:9, letterSpacing:"0.14em", color: i===0 ? "var(--gilt-2)" : "var(--ink-3)"}}>{w}</div>
        ))}
        {cells.map((c, i) => {
          const isSel = !c.dim && c.d === selected;
          const isToday = !c.dim && c.d === today;
          const isMarked = !c.dim && marked.includes(c.d);
          return (
            <div key={i} style={{
              textAlign:"center", padding:"6px 0",
              fontFamily:"var(--font-mono)", fontSize:11,
              color: c.dim ? "var(--ink-4)" : isSel ? "var(--parchment)" : "var(--ink)",
              background: isSel ? "var(--ink)" : "transparent",
              borderRadius:3,
              cursor: c.dim ? "default" : "pointer",
              fontWeight: isToday ? 600 : 400,
              position:"relative",
            }}>
              {c.d}
              {isMarked && !isSel && <span style={{position:"absolute", bottom:2, left:"50%", transform:"translateX(-50%)", width:3, height:3, borderRadius:"50%", background:"var(--gilt)"}}/>}
            </div>
          );
        })}
      </div>
      <hr className="rule" style={{margin:"14px -14px 12px"}}/>
      <div style={{display:"flex", justifyContent:"space-between", fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--ink-3)"}}>
        <span>● Sabbat</span>
        <span>Aujourd'hui · 13</span>
      </div>
    </div>
  );
}

// ---- Date field — shows calendar popover when open ----
function DateField({ value, label, open = false }) {
  return (
    <div className="field" style={{position:"relative"}}>
      <label>{label}</label>
      <div className="field-shell field-select">
        <svg width="14" height="14" viewBox="0 0 14 14" style={{color:"var(--ink-3)", flexShrink:0}}>
          <rect x="1" y="2.5" width="12" height="10" rx="1" stroke="currentColor" fill="none"/>
          <line x1="1" y1="5" x2="13" y2="5" stroke="currentColor"/>
          <line x1="4" y1="1" x2="4" y2="4" stroke="currentColor"/>
          <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor"/>
        </svg>
        <span style={{flex:1, color:"var(--ink)"}}>{value}</span>
      </div>
      {open && (
        <div className="anim-popover-in" style={{position:"absolute", top:"calc(100% + 8px)", left:0, zIndex:10}}>
          <MiniCalendar/>
        </div>
      )}
    </div>
  );
}

// ---- Time field — shows time grid popover ----
function TimeField({ value, label, open = false }) {
  return (
    <div className="field" style={{position:"relative"}}>
      <label>{label}</label>
      <div className="field-shell field-select">
        <svg width="14" height="14" viewBox="0 0 14 14" style={{color:"var(--ink-3)", flexShrink:0}}>
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" fill="none"/>
          <path d="M7 3.5 V7 L9.5 8.5" stroke="currentColor" fill="none"/>
        </svg>
        <span style={{flex:1, color:"var(--ink)"}}>{value}</span>
      </div>
      {open && (
        <div className="anim-popover-in" style={{
          position:"absolute", top:"calc(100% + 8px)", left:0, zIndex:10,
          background:"var(--parchment)", border:"1px solid var(--hairline-2)", borderRadius:6,
          boxShadow:"0 20px 40px -20px rgba(27, 37, 48, 0.25)",
          padding:14, width:260,
        }}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12}}>
            <span className="eyebrow">Début</span>
            <span style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-3)"}}>Pas de 15 min</span>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:4, maxHeight:200, overflow:"auto"}}>
            {["9h00","9h15","9h30","9h45","10h00","10h15","10h30","10h45","11h00","11h15","11h30","11h45","12h00","12h15","12h30","12h45"].map(t => {
              const active = t === "10h00";
              return (
                <div key={t} style={{
                  padding:"7px 0", textAlign:"center",
                  fontFamily:"var(--font-mono)", fontSize:11,
                  color: active ? "var(--parchment)" : "var(--ink-2)",
                  background: active ? "var(--ink)" : "transparent",
                  border:"1px solid " + (active ? "var(--ink)" : "var(--hairline)"),
                  borderRadius:3, cursor:"pointer",
                }}>{t}</div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Department field ----
function DeptField({ value, label, swatch, open = false }) {
  const opts = [
    { label:"Pastoral",                 swatch: DEPT_COLORS.PASTORAL, active: value === "Pastoral", meta:"04 actifs" },
    { label:"Diaconat",                 swatch: DEPT_COLORS.DIACONNAT, meta:"12 actifs" },
    { label:"Jeunesse Adventiste",      swatch: DEPT_COLORS.JA,        meta:"09 actifs" },
    { label:"Ministère de la musique",  swatch: DEPT_COLORS.MUSIC,     meta:"14 actifs" },
    { label:"Ministère des femmes",     swatch: DEPT_COLORS.MIFEM,     meta:"07 actifs" },
    { label:"Ministère des familles",   swatch: DEPT_COLORS.MF,        meta:"06 actifs" },
  ];
  return (
    <div className="field" style={{position:"relative"}}>
      <label>{label}</label>
      <div className="field-shell field-select">
        {swatch && <DeptSwatch color={swatch}/>}
        <span style={{flex:1, color:"var(--ink)"}}>{value}</span>
      </div>
      {open && (
        <div className="anim-popover-in" style={{position:"absolute", top:"calc(100% + 8px)", left:0, right:0, zIndex:10}}>
          <SelectField value={value} open={true} options={opts} />
        </div>
      )}
    </div>
  );
}

// ---- Contact picker — grouped people popover with chips ----
function ContactPickerField({ label, chips = [], open = false, suggestionGroups = [] }) {
  return (
    <div className="field" style={{position:"relative"}}>
      <label>{label}</label>
      <div className="field-shell" style={{alignItems:"flex-start", flexWrap:"wrap", padding:"10px 12px"}}>
        {chips.map((c, i) => (
          <span key={i} style={{
            display:"inline-flex", alignItems:"center", gap:8,
            padding:"4px 12px 4px 4px",
            background:"var(--parchment)", border:"1px solid var(--hairline-2)",
            borderRadius:999,
          }}>
            <Avatar initials={c.initials} size="sm" tint={c.tint || "var(--parchment-3)"}/>
            <span style={{fontSize:13, color:"var(--ink)"}}>{c.name}</span>
            <span style={{color:"var(--ink-3)", cursor:"pointer", fontSize:14, marginLeft:2}}>×</span>
          </span>
        ))}
        <input style={{flex:1, minWidth:120, background:"transparent", border:0, outline:"none", fontSize:14, color:"var(--ink)", padding:"6px 0"}}
          placeholder="Chercher ou choisir…"/>
      </div>
      {open && (
        <div className="anim-popover-in" style={{
          position:"absolute", top:"calc(100% + 8px)", left:0, right:0, zIndex:10,
          background:"var(--parchment)", border:"1px solid var(--hairline-2)", borderRadius:6,
          boxShadow:"0 20px 40px -20px rgba(27, 37, 48, 0.25)",
          padding:"14px 0", maxHeight:340, overflow:"auto",
        }}>
          {suggestionGroups.map((g, gi) => (
            <div key={gi}>
              <div style={{padding:"6px 16px", display:"flex", alignItems:"center", gap:10}}>
                <DeptSwatch color={g.color}/>
                <span className="eyebrow">{g.dept}</span>
                <span style={{flex:1}}/>
                <span style={{fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-3)"}}>{g.people.length}</span>
              </div>
              {g.people.map((p, pi) => (
                <div key={pi} style={{
                  display:"flex", alignItems:"center", gap:12,
                  padding:"8px 16px",
                  background: p.selected ? "var(--parchment-2)" : "transparent",
                  cursor:"pointer",
                }}>
                  <Avatar initials={p.initials} size="sm" tint={g.color}/>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontFamily:"var(--font-display)", fontSize:14, color:"var(--ink)"}}>{p.name}</div>
                    {p.role && <div className="eyebrow" style={{color:"var(--ink-3)", fontSize:9, marginTop:2}}>{p.role}</div>}
                  </div>
                  {p.selected && <span style={{color:"var(--gilt-2)", fontFamily:"var(--font-mono)", fontSize:14}}>✓</span>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Tag picker (single-select pill row) ----
function TagPicker({ label, options = [], value }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
        {options.map(o => {
          const active = o === value;
          return (
            <span key={o} style={{
              fontFamily:"var(--font-mono)",
              fontSize:10, letterSpacing:"0.14em", textTransform:"uppercase",
              padding:"7px 12px",
              border:"1px solid " + (active ? "var(--ink)" : "var(--hairline-2)"),
              color: active ? "var(--parchment)" : "var(--ink-2)",
              background: active ? "var(--ink)" : "transparent",
              borderRadius:2, cursor:"pointer",
              display:"inline-flex", alignItems:"center", gap:6,
            }}>
              {active && <span>✓</span>}
              {o}
            </span>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, {
  Field, TextField, TextAreaField, SelectField,
  DateField, TimeField, DeptField, ContactPickerField,
  TagPicker, MiniCalendar,
});
