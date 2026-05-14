// ============================================================
// SDAC — Public screens (Home + Calendar)
// ============================================================

// =========================
// Shared public top nav
// =========================
function PublicTopNav({ active, onNav, dense }) {
  const items = [
    { id: "home", label: "Accueil" },
    { id: "calendar", label: "Calendrier" },
    { id: "departments", label: "Départements" },
    { id: "live", label: "En direct" },
  ];
  return (
    <header style={{
      display:"flex", alignItems:"center", justifyContent:"space-between",
      padding: dense ? "14px 28px" : "22px 48px",
      background:"var(--parchment)",
      borderBottom:"1px solid var(--hairline)",
    }}>
      <div onClick={() => onNav && onNav("home")} style={{cursor:"pointer"}}>
        <Wordmark size={dense ? "sm" : "md"}/>
      </div>
      {!dense && (
        <nav style={{display:"flex", gap:36}}>
          {items.map(it => (
            <a key={it.id} href="#" onClick={(e)=>{e.preventDefault(); onNav && onNav(it.id);}}
              style={{
                fontFamily:"var(--font-sans)",
                fontSize:13, color: active===it.id ? "var(--ink)" : "var(--ink-3)",
                textDecoration: "none",
                paddingBottom:6,
                borderBottom: active===it.id ? "1px solid var(--gilt)" : "1px solid transparent",
              }}>{it.label}</a>
          ))}
        </nav>
      )}
      <div style={{display:"flex", gap:12, alignItems:"center"}}>
        <a href="#" style={{fontFamily:"var(--font-mono)", fontSize:11, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--ink-3)", textDecoration:"none"}}>FR / EN</a>
        <Btn kind="ghost" size="sm">Se connecter</Btn>
      </div>
    </header>
  );
}

function PublicMobileNav({ onMenu }) {
  return (
    <header style={{
      display:"flex", alignItems:"center", gap:14,
      padding:"14px 20px",
      background:"var(--parchment)",
      borderBottom:"1px solid var(--hairline)",
    }}>
      <button onClick={onMenu} style={{background:"none", border:0, padding:0, color:"var(--ink)", cursor:"pointer", display:"inline-flex"}}>
        <svg width="20" height="14" viewBox="0 0 20 14"><line x1="0" y1="1" x2="20" y2="1" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="13" x2="20" y2="13" stroke="currentColor" strokeWidth="1.5"/></svg>
      </button>
      <Wordmark size="sm"/>
      <span style={{flex:1}}/>
      <a href="#" className="eyebrow" style={{color:"var(--ink-3)", textDecoration:"none"}}>FR · EN</a>
    </header>
  );
}

// =========================
// Public mobile menu drawer (open state)
// =========================
function PublicMobileMenuOpen({ onClose }) {
  const navItems = [
    { id:"home",     label:"Accueil",      active:true },
    { id:"calendar", label:"Calendrier" },
    { id:"depts",    label:"Départements" },
    { id:"live",     label:"En direct",    badge:"En direct" },
  ];
  return (
    <div style={{background:"var(--parchment)", minHeight:"100%"}}>
      {/* Header with X */}
      <header style={{
        display:"flex", alignItems:"center", gap:14,
        padding:"14px 20px",
        background:"var(--parchment)",
        borderBottom:"1px solid var(--hairline)",
      }}>
        <button onClick={onClose} style={{background:"none", border:0, padding:0, color:"var(--ink)", cursor:"pointer", display:"inline-flex"}}>
          <svg width="16" height="16" viewBox="0 0 16 16"><line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5"/><line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="1.5"/></svg>
        </button>
        <Wordmark size="sm"/>
        <span style={{flex:1}}/>
        <a href="#" className="eyebrow" style={{color:"var(--ink-3)", textDecoration:"none"}}>FR · EN</a>
      </header>

      <nav style={{padding:"32px 24px 16px"}}>
        <div className="eyebrow" style={{marginBottom:24}}>Naviguer</div>
        {navItems.map((it, i) => (
          <a key={it.id} href="#" style={{
            display:"flex", alignItems:"baseline", gap:16,
            padding:"18px 0",
            borderTop: i === 0 ? "1px solid var(--hairline)" : 0,
            borderBottom:"1px solid var(--hairline)",
            textDecoration:"none",
          }}>
            <span style={{fontFamily:"var(--font-mono)", fontSize:11, color: it.active ? "var(--gilt-2)" : "var(--ink-3)", letterSpacing:"0.06em"}}>{String(i+1).padStart(2,"0")}</span>
            <span style={{
              flex:1,
              fontFamily:"var(--font-display)", fontSize:28, lineHeight:1.05,
              color: it.active ? "var(--ink)" : "var(--ink-2)",
              fontWeight: it.active ? 500 : 400,
              fontStyle: it.active ? "italic" : "normal",
            }}>{it.label}</span>
            {it.badge && <Live label={it.badge}/>}
            {it.active && <span style={{color:"var(--gilt)", fontSize:14}}>·</span>}
          </a>
        ))}
      </nav>

      <div style={{padding:"24px 24px 0"}}>
        <Eyebrow>Cette semaine</Eyebrow>
        <div style={{marginTop:14, padding:"20px", border:"1px solid var(--hairline)", borderRadius:6}}>
          <div className="eyebrow eyebrow-gilt">Ce Sabbat</div>
          <div style={{fontFamily:"var(--font-display)", fontSize:24, color:"var(--ink)", marginTop:8, lineHeight:1.05}}>Sainte-Cène</div>
          <hr className="rule" style={{margin:"12px 0"}}/>
          <div style={{display:"flex", justifyContent:"space-between"}}>
            <span className="eyebrow">Sam. 23 mai</span>
            <span className="eyebrow">10 h 00</span>
          </div>
        </div>
      </div>

      <div style={{padding:"32px 24px 24px"}}>
        <Btn kind="primary" size="sm">Se connecter →</Btn>
        <div style={{marginTop:18, fontFamily:"var(--font-mono)", fontSize:9, letterSpacing:"0.16em", textTransform:"uppercase", color:"var(--ink-3)"}}>
          ✣ &nbsp; Soli Deo gloria
        </div>
      </div>
    </div>
  );
}

// =========================
// Footer — used on every public page
// =========================
function PublicFooter({ compact }) {
  return (
    <footer style={{
      borderTop:"1px solid var(--hairline)",
      padding: compact ? "32px 20px 24px" : "60px 48px 40px",
      background:"var(--parchment-2)",
      color:"var(--ink-2)",
    }}>
      <div style={{maxWidth:1200, margin:"0 auto", display: compact ? "block" : "grid", gridTemplateColumns: compact ? "1fr" : "2fr 1fr 1fr 1fr", gap: compact ? 24 : 48}}>
        <div>
          <Wordmark size={compact ? "sm" : "md"}/>
          <p style={{marginTop:14, fontSize:13, lineHeight:1.7, color:"var(--ink-3)", maxWidth:"34ch"}}>
            5350 Chemin de Chambly, Saint-Hubert, QC J3Y 3N7. Une famille spirituelle ouverte à tous, chaque sabbat.
          </p>
        </div>
        {!compact && <FooterCol title="Horaires"><div className="eyebrow">Sabbat</div><div>École · 9h45</div><div>Culte · 10h45</div></FooterCol>}
        {!compact && <FooterCol title="Suivez-nous"><a href="#">YouTube</a><a href="#">Facebook</a><a href="#">Bulletin</a></FooterCol>}
        {!compact && <FooterCol title="Direction"><a href="#">Itinéraire</a><a href="#">Contactez-nous</a><a href="#">Stationnement</a></FooterCol>}
      </div>
      <div style={{maxWidth:1200, margin:"40px auto 0", display:"flex", justifyContent:"space-between", paddingTop:20, borderTop:"1px solid var(--hairline)", fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-3)", letterSpacing:"0.14em", textTransform:"uppercase"}}>
        <span>Église Adventiste de Saint-Hubert · Est. 1986</span>
        <span>Fédération du Québec · Conférence canadienne</span>
      </div>
    </footer>
  );
}
function FooterCol({ title, children }) {
  return (
    <div>
      <div className="eyebrow" style={{marginBottom:14}}>{title}</div>
      <div style={{display:"flex", flexDirection:"column", gap:8, fontSize:13, color:"var(--ink-2)"}}>{children}</div>
    </div>
  );
}

// =========================
// Sample data
// =========================
const NEXT_SABBATH = {
  weekday: "Samedi",
  day: 23,
  month: "mai",
  year: 2026,
  title: "Sainte-Cène",
  subtitle: "Service de communion mensuel",
  predicateur: { name: "L. Vicuna", role: "Pasteur · Pastoral", initials: "LV" },
  time: "10 h 00 – 11 h 30",
  location: "Sanctuaire principal",
  dept: "Pastoral",
  isLive: false,
};

const UPCOMING = [
  { day: 24, month: "MAI", weekday: "Dimanche", title: "École des cadets",     dept:"JA",      time:"14 h – 16 h",       note:"Sortie nature — Mont Saint-Bruno" },
  { day: 26, month: "MAI", weekday: "Mardi",    title: "Réunion de prière",   dept:"PASTORAL",time:"19 h 30 – 20 h 30", note:"Hybride · sanctuaire + Zoom" },
  { day: 28, month: "MAI", weekday: "Jeudi",    title: "Chorale · répétition",dept:"MUSIC",   time:"19 h – 21 h",       note:"Préparation Sainte-Cène" },
  { day: 30, month: "MAI", weekday: "Samedi",   title: "Culte de la jeunesse",dept:"JA",      time:"17 h – 18 h 30",    note:"Prédicateur invité · Soeur Ketsia" },
];

// =========================
// PUBLIC HOME — DESKTOP
// =========================
function PublicHomeDesktop({ onNav, isLive = true }) {
  return (
    <div style={{background:"var(--parchment)", minHeight:"100%"}}>
      <PublicTopNav active="home" onNav={onNav}/>

      {/* ===== HERO — the "Sabbath bulletin" ===== */}
      <section style={{padding:"64px 48px 56px", background:"var(--parchment)"}}>
        <div style={{maxWidth:1200, margin:"0 auto"}}>
          <div style={{display:"grid", gridTemplateColumns:"1.1fr 1fr", gap:64, alignItems:"start"}}>
            <div>
              <Eyebrow tone="gilt" n={1}>Ce Sabbat · 23ᵉ semaine</Eyebrow>
              <h1 style={{
                fontFamily:"var(--font-display)", fontWeight:400,
                fontSize:120, lineHeight:0.95, letterSpacing:"-0.03em",
                marginTop:18, color:"var(--ink)",
              }}>
                Sainte-<br/><span style={{fontStyle:"italic", color:"var(--ink-2)"}}>Cène</span>
              </h1>
              <p style={{marginTop:22, fontSize:17, lineHeight:1.55, color:"var(--ink-2)", maxWidth:"42ch"}}>
                Service mensuel de communion. Pasteur <strong style={{fontWeight:600}}>L. Vicuna</strong> nous accompagne au sanctuaire et en ligne.
              </p>

              <hr className="rule" style={{margin:"36px 0 24px"}}/>
              <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:24}}>
                <Meta label="Date" value="Samedi 23 mai"/>
                <Meta label="Horaire" value="10 h 00 – 11 h 30"/>
                <Meta label="Lieu" value="Sanctuaire principal"/>
              </div>

              <div style={{marginTop:36, display:"flex", gap:14, alignItems:"center"}}>
                <Btn kind="primary" onClick={()=>onNav && onNav("live")}>Suivre en direct →</Btn>
                <Btn kind="ghost" onClick={()=>onNav && onNav("calendar")}>Voir le programme</Btn>
                {isLive && <span style={{marginLeft:14}}><Live label="Diffusion · 142 spectateurs"/></span>}
              </div>
            </div>

            {/* Right — date plate + predicateur */}
            <div style={{paddingLeft:48, borderLeft:"1px solid var(--hairline)"}}>
              <div style={{display:"flex", alignItems:"flex-end", gap:6}}>
                <Numerator size={220}>23</Numerator>
                <div style={{paddingBottom:24}}>
                  <div style={{fontFamily:"var(--font-display)", fontStyle:"italic", fontSize:30, color:"var(--ink-2)"}}>mai</div>
                  <div className="eyebrow" style={{marginTop:4}}>MMXXVI · samedi</div>
                </div>
              </div>
              <hr className="rule" style={{marginTop:24, marginBottom:24}}/>
              <div className="eyebrow">Prédicateur</div>
              <div style={{display:"flex", alignItems:"center", gap:18, marginTop:14}}>
                <ImageSlot id="home-predicateur" placeholder="Pasteur Vicuna" shape="circle"
                  style={{width:72, height:72}}/>
                <div>
                  <div style={{fontFamily:"var(--font-display)", fontSize:24, color:"var(--ink)"}}>L. Vicuna</div>
                  <div className="eyebrow">Pastoral · Saint-Hubert</div>
                </div>
              </div>
              <hr className="rule" style={{margin:"24px 0"}}/>
              <div className="eyebrow">Texte du jour</div>
              <p style={{fontFamily:"var(--font-display)", fontSize:22, fontStyle:"italic", color:"var(--ink-2)", lineHeight:1.4, marginTop:10}}>
                « Faites ceci en mémoire de moi. »
              </p>
              <div className="eyebrow" style={{marginTop:8}}>Luc 22 · 19</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Live stream — only when live ===== */}
      {isLive && (
        <section style={{padding:"40px 48px", background:"var(--ink)", color:"var(--parchment)"}}>
          <div style={{maxWidth:1200, margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 2fr", gap:48, alignItems:"center"}}>
            <div>
              <Live label="En direct · maintenant"/>
              <h3 style={{fontFamily:"var(--font-display)", fontSize:42, fontWeight:400, marginTop:14, lineHeight:1.05, color:"#F0E6CC"}}>
                Suivez le culte<br/><em style={{color:"var(--gilt-soft)"}}>depuis chez vous.</em>
              </h3>
              <p style={{fontSize:14, color:"rgba(240,230,204,.65)", marginTop:14, lineHeight:1.6}}>
                Diffusion HD sur YouTube · 142 spectateurs en ligne. Le replay reste disponible jusqu'au sabbat suivant.
              </p>
              <div style={{marginTop:24}}><Btn kind="gilt" onClick={()=>{}}>Ouvrir sur YouTube ↗</Btn></div>
            </div>
            <div style={{position:"relative", aspectRatio:"16/9", background:"#0F141A", borderRadius:6, overflow:"hidden", border:"1px solid #3A4452"}}>
              <ImageSlot id="home-livestream" placeholder="Live stream still" style={{width:"100%", height:"100%"}}/>
              <div style={{position:"absolute", top:14, left:14, padding:"4px 10px", background:"var(--rose)", color:"#fff", fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.18em", textTransform:"uppercase", borderRadius:2}}>● En direct</div>
              <div style={{position:"absolute", bottom:14, left:14, right:14, display:"flex", justifyContent:"space-between", alignItems:"flex-end"}}>
                <div>
                  <div className="eyebrow" style={{color:"rgba(240,230,204,.7)"}}>Culte du sabbat</div>
                  <div style={{fontFamily:"var(--font-display)", fontSize:22, color:"#F0E6CC", marginTop:4}}>Sainte-Cène · L. Vicuna</div>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:6, color:"rgba(240,230,204,.7)", fontFamily:"var(--font-mono)", fontSize:11}}>
                  <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="5" r="3" stroke="currentColor" fill="none"/><path d="M2 12 q5 -5 10 0" stroke="currentColor" fill="none"/></svg>
                  142
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== Upcoming activities — print-style ===== */}
      <section style={{padding:"80px 48px"}}>
        <div style={{maxWidth:1200, margin:"0 auto"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:36}}>
            <SectionHead n={2} eyebrow="Cette semaine" title="À venir" subtitle="Le programme des prochaines activités, mis à jour par chaque département."/>
            <a href="#" onClick={(e)=>{e.preventDefault(); onNav && onNav("calendar");}} className="eyebrow" style={{color:"var(--gilt-2)", textDecoration:"underline", textUnderlineOffset:4}}>Calendrier complet →</a>
          </div>
          <div>
            {UPCOMING.map((u, i) => (
              <UpcomingRow key={i} idx={i+1} item={u}/>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Departments — typographic, no card grid ===== */}
      <section style={{padding:"40px 48px 80px", background:"var(--parchment-2)"}}>
        <div style={{maxWidth:1200, margin:"0 auto"}}>
          <SectionHead n={3} eyebrow="Communauté" title="Nos départements" subtitle="Six ministères et sous-ministères qui font vivre la communauté chaque semaine."/>
          <div style={{marginTop:36, display:"grid", gridTemplateColumns:"repeat(2, 1fr)", columnGap:64, rowGap:0}}>
            {DEPTS.map((d, i) => (
              <DeptRow key={d.code} idx={i+1} dept={d}/>
            ))}
          </div>
        </div>
      </section>

      <PublicFooter/>
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div style={{fontFamily:"var(--font-display)", fontSize:20, color:"var(--ink)", marginTop:6}}>{value}</div>
    </div>
  );
}

function UpcomingRow({ idx, item }) {
  const deptColor = DEPT_COLORS[item.dept] || "var(--ink-3)";
  return (
    <div style={{
      display:"grid", gridTemplateColumns:"56px 110px 1fr 160px 220px",
      gap:24, alignItems:"baseline",
      padding:"22px 0",
      borderTop:"1px solid var(--hairline)",
    }}>
      <span style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-3)", letterSpacing:"0.06em"}}>{String(idx).padStart(2,"0")}</span>
      <div>
        <div className="numerator" style={{fontSize:40, color:"var(--ink)", fontWeight:300}}>{item.day}</div>
        <div className="eyebrow" style={{marginTop:2}}>{item.month}</div>
      </div>
      <div>
        <div className="eyebrow" style={{color:"var(--ink-3)"}}>{item.weekday}</div>
        <div style={{fontFamily:"var(--font-display)", fontSize:24, color:"var(--ink)", marginTop:4}}>{item.title}</div>
        <div style={{fontSize:13, color:"var(--ink-3)", marginTop:4}}>{item.note}</div>
      </div>
      <div style={{display:"flex", alignItems:"center", gap:8}}>
        <DeptSwatch color={deptColor}/>
        <span className="eyebrow">{item.dept}</span>
      </div>
      <div style={{fontFamily:"var(--font-mono)", fontSize:12, color:"var(--ink-2)", letterSpacing:"0.06em", textAlign:"right"}}>{item.time}</div>
    </div>
  );
}

function DeptRow({ idx, dept }) {
  return (
    <div style={{
      display:"grid", gridTemplateColumns:"40px 1fr auto",
      gap:18, alignItems:"baseline",
      padding:"22px 0",
      borderTop:"1px solid var(--hairline)",
    }}>
      <span style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-3)"}}>{String(idx).padStart(2,"0")}</span>
      <div>
        <div style={{display:"flex", alignItems:"baseline", gap:14}}>
          <DeptSwatch color={dept.color}/>
          <span style={{fontFamily:"var(--font-display)", fontSize:22, color:"var(--ink)"}}>{dept.name}</span>
        </div>
        <div className="eyebrow" style={{marginTop:6, marginLeft:24}}>{dept.code} · {dept.count} membres actifs</div>
      </div>
      <a href="#" className="eyebrow" style={{color:"var(--gilt-2)"}}>Voir →</a>
    </div>
  );
}

// =========================
// PUBLIC HOME — MOBILE (with interactive menu)
// =========================
function PublicHomeMobile({ onNav, isLive = true }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div style={{position:"relative", height:"100%", overflow:"hidden"}}>
      <div style={{background:"var(--parchment)", paddingBottom:20, height:"100%", overflowY:"auto"}}>
      <PublicMobileNav onMenu={()=>setMenuOpen(true)}/>

      <section style={{padding:"28px 20px 32px"}}>
        <Eyebrow tone="gilt" n={1}>Ce Sabbat</Eyebrow>
        <h1 style={{fontFamily:"var(--font-display)", fontWeight:400, fontSize:64, letterSpacing:"-0.03em", lineHeight:0.95, marginTop:14, color:"var(--ink)"}}>
          Sainte-<br/><em style={{color:"var(--ink-2)"}}>Cène</em>
        </h1>
        <p style={{marginTop:14, fontSize:15, color:"var(--ink-2)", lineHeight:1.55}}>
          Service mensuel de communion · prédicateur <strong style={{fontWeight:600}}>L. Vicuna</strong>.
        </p>

        <hr className="rule" style={{margin:"22px 0 14px"}}/>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
          <Meta label="Date" value="Sam. 23 mai"/>
          <Meta label="Heure" value="10 h 00"/>
        </div>
        <hr className="rule" style={{margin:"18px 0"}}/>
        <div style={{display:"flex", alignItems:"center", gap:14}}>
          <ImageSlot id="home-mobile-predicateur" placeholder="Pasteur" shape="circle" style={{width:48, height:48}}/>
          <div>
            <div style={{fontFamily:"var(--font-display)", fontSize:18, color:"var(--ink)"}}>L. Vicuna</div>
            <div className="eyebrow">Pastoral</div>
          </div>
        </div>

        {isLive && (
          <div style={{marginTop:22, padding:"14px 16px", background:"var(--ink)", color:"var(--parchment)", borderRadius:6, display:"flex", alignItems:"center", gap:12}}>
            <Live label="En direct"/>
            <span style={{flex:1, fontSize:13, color:"rgba(240,230,204,.8)"}}>Le culte commence maintenant.</span>
            <Btn kind="gilt" size="sm">Suivre →</Btn>
          </div>
        )}
      </section>

      <hr className="rule" style={{margin:"0 20px"}}/>

      <section style={{padding:"28px 20px"}}>
        <Eyebrow n={2}>À venir</Eyebrow>
        <div style={{marginTop:18}}>
          {UPCOMING.slice(0,3).map((u, i) => (
            <div key={i} style={{
              display:"grid", gridTemplateColumns:"60px 1fr",
              gap:14, padding:"18px 0",
              borderBottom:"1px solid var(--hairline)",
            }}>
              <div>
                <div className="numerator" style={{fontSize:32, color:"var(--ink)"}}>{u.day}</div>
                <div className="eyebrow" style={{fontSize:9}}>{u.month}</div>
              </div>
              <div>
                <div className="eyebrow" style={{color:"var(--ink-3)"}}>{u.weekday} · {u.time}</div>
                <div style={{fontFamily:"var(--font-display)", fontSize:20, color:"var(--ink)", marginTop:4}}>{u.title}</div>
                <div style={{display:"flex", gap:6, marginTop:6, alignItems:"center"}}>
                  <DeptSwatch color={DEPT_COLORS[u.dept]}/>
                  <span className="eyebrow">{u.dept}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:18}}>
          <Btn kind="ghost" size="sm" onClick={()=>onNav&&onNav("calendar")}>Voir le calendrier →</Btn>
        </div>
      </section>

      <hr className="rule" style={{margin:"0 20px"}}/>

      <section style={{padding:"28px 20px"}}>
        <Eyebrow n={3}>Départements</Eyebrow>
        <div style={{marginTop:14}}>
          {DEPTS.slice(0,4).map((d, i) => (
            <div key={d.code} style={{
              display:"flex", alignItems:"center", gap:14,
              padding:"14px 0", borderBottom:"1px solid var(--hairline)",
            }}>
              <DeptSwatch color={d.color}/>
              <span style={{fontFamily:"var(--font-display)", fontSize:17, color:"var(--ink)", flex:1}}>{d.name}</span>
              <span className="eyebrow">{d.code}</span>
            </div>
          ))}
        </div>
      </section>

      <PublicFooter compact/>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <>
          <div onClick={()=>setMenuOpen(false)} className="anim-fade-in"
            style={{position:"absolute", inset:0, background:"rgba(27, 37, 48, 0.45)", zIndex:5}}/>
          <div className="anim-drawer-in"
            style={{position:"absolute", inset:0, zIndex:6, background:"var(--parchment)"}}>
            <PublicMobileMenuOpen onClose={()=>setMenuOpen(false)}/>
          </div>
        </>
      )}
    </div>
  );
}

// =========================
// PUBLIC CALENDAR — DESKTOP
// =========================
function PublicCalendarDesktop({ onNav }) {
  const [view, setView] = useState("month");
  return (
    <div style={{background:"var(--parchment)", minHeight:"100%"}}>
      <PublicTopNav active="calendar" onNav={onNav}/>

      <section style={{padding:"56px 48px 40px"}}>
        <div style={{maxWidth:1280, margin:"0 auto"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end"}}>
            <div>
              <Eyebrow n={1}>Vue d'ensemble</Eyebrow>
              <h1 style={{fontFamily:"var(--font-display)", fontWeight:400, fontSize:72, letterSpacing:"-0.02em", lineHeight:1, marginTop:14, color:"var(--ink)"}}>
                Mai <span style={{color:"var(--ink-3)", fontWeight:300}}>MMXXVI</span>
              </h1>
              <p style={{marginTop:14, color:"var(--ink-3)", fontSize:14}}>Sept jours du sabbat. La semaine commence dimanche, comme le veut la tradition adventiste.</p>
            </div>
            <div style={{display:"flex", gap:6, alignItems:"center"}}>
              {["day","week","month","year"].map(v => (
                <button key={v} onClick={()=>setView(v)} style={{
                  fontFamily:"var(--font-mono)", fontSize:11, letterSpacing:"0.14em", textTransform:"uppercase",
                  background: view===v ? "var(--ink)" : "transparent",
                  color: view===v ? "var(--parchment)" : "var(--ink-3)",
                  border:"1px solid " + (view===v ? "var(--ink)" : "var(--hairline-2)"),
                  borderRadius:2, padding:"8px 14px", cursor:"pointer",
                }}>{ {day:"Jour", week:"Semaine", month:"Mois", year:"Année"}[v] }</button>
              ))}
            </div>
          </div>

          <hr className="rule rule-thick" style={{margin:"36px 0 0"}}/>
          <CalendarMonthGrid/>
        </div>
      </section>

      <PublicFooter/>
    </div>
  );
}

function CalendarMonthGrid() {
  // sample events
  const events = {
    "1":  [{title:"Réunion préparation",  dept:"PASTORAL"}],
    "2":  [{title:"Culte du sabbat",      dept:"PASTORAL", time:"10h00"}, {title:"École cadets", dept:"JA"}],
    "5":  [{title:"Réunion de prière",    dept:"PASTORAL", time:"19h30"}],
    "7":  [{title:"Chorale · répétition", dept:"MUSIC"}],
    "9":  [{title:"Culte du sabbat",      dept:"PASTORAL"}],
    "12": [{title:"Comité MIFEM",         dept:"MIFEM"}],
    "16": [{title:"Culte de la jeunesse", dept:"JA"}],
    "19": [{title:"Réunion de prière",    dept:"PASTORAL"}],
    "23": [{title:"Sainte-Cène",          dept:"PASTORAL", time:"10h00", featured:true}],
    "24": [{title:"École cadets",         dept:"JA"}],
    "26": [{title:"Réunion de prière",    dept:"PASTORAL"}],
    "28": [{title:"Chorale · répétition", dept:"MUSIC"}],
    "30": [{title:"Culte de la jeunesse", dept:"JA"}],
  };

  // May 2026 starts on a Friday (so dim col 5 in 0-index)
  const days = [];
  // empty cells from prev month: Sun 26 - Thu 30 of April
  [26,27,28,29,30].forEach(d => days.push({ day: d, prev:true }));
  for (let d = 1; d <= 31; d++) days.push({ day:d });
  // trailing cells
  [1,2,3,4,5,6].forEach(d => days.push({ day:d, next:true }));

  const weekdays = ["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

  return (
    <div style={{marginTop:0, border:"1px solid var(--hairline)", borderTop:0}}>
      {/* weekday row */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)", borderBottom:"1px solid var(--hairline)"}}>
        {weekdays.map((w, i) => (
          <div key={w} style={{
            padding:"14px 14px",
            fontFamily:"var(--font-mono)", fontSize:11, letterSpacing:"0.16em", textTransform:"uppercase",
            color: i===0 ? "var(--gilt-2)" : "var(--ink-3)",
            borderLeft: i>0 ? "1px solid var(--hairline)" : 0,
          }}>{w}{i===0 || i===6 ? "." : "."}</div>
        ))}
      </div>
      {/* grid */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)"}}>
        {days.map((cell, i) => {
          const row = Math.floor(i / 7);
          const col = i % 7;
          const isLastRow = row === Math.floor((days.length - 1) / 7);
          const dim = cell.prev || cell.next;
          const isSabbath = col === 6; // Saturday
          const evList = !dim ? events[String(cell.day)] || [] : [];
          const isToday = !dim && cell.day === 12;
          const isHighlight = !dim && cell.day === 23;
          return (
            <div key={i} style={{
              minHeight: 132,
              padding:"12px 12px 10px",
              borderLeft: col>0 ? "1px solid var(--hairline)" : 0,
              borderBottom: !isLastRow ? "1px solid var(--hairline)" : 0,
              background: isSabbath ? "var(--parchment-2)" : isHighlight ? "var(--gilt-wash)" : "transparent",
              opacity: dim ? 0.35 : 1,
              position:"relative",
            }}>
              <div style={{display:"flex", alignItems:"baseline", justifyContent:"space-between"}}>
                <span className="numerator" style={{fontSize: isToday ? 24 : 20, color:"var(--ink)", fontWeight: isToday ? 500 : 300}}>{cell.day}</span>
                {isToday && <span className="eyebrow" style={{color:"var(--gilt-2)"}}>Aujourd'hui</span>}
                {isHighlight && <span className="eyebrow" style={{color:"var(--gilt-2)"}}>✣ Sainte-cène</span>}
              </div>
              <div style={{marginTop:8, display:"flex", flexDirection:"column", gap:4}}>
                {evList.map((ev, k) => (
                  <div key={k} style={{display:"flex", gap:6, alignItems:"center", fontSize:11, lineHeight:1.3}}>
                    <span style={{width:4, height:4, borderRadius:"50%", background: DEPT_COLORS[ev.dept], flexShrink:0}}/>
                    <span style={{
                      fontFamily:"var(--font-sans)", fontWeight: ev.featured ? 600 : 400,
                      color: ev.featured ? "var(--ink)" : "var(--ink-2)",
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                    }}>{ev.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =========================
// PUBLIC CALENDAR — MOBILE
// =========================
function PublicCalendarMobile({ onNav }) {
  const days = [];
  for (let d = 17; d <= 23; d++) days.push(d);
  const dayEvents = {
    19: [{title:"Réunion de prière", time:"19h30", dept:"PASTORAL"}],
    21: [{title:"Chorale", time:"19h00", dept:"MUSIC"}],
    23: [{title:"Sainte-Cène", time:"10h00", dept:"PASTORAL", featured:true}, {title:"École du sabbat", time:"9h45", dept:"PASTORAL"}],
  };

  return (
    <div style={{background:"var(--parchment)", paddingBottom:40}}>
      <PublicMobileNav/>

      <section style={{padding:"24px 20px 16px"}}>
        <Eyebrow n={1}>Cette semaine</Eyebrow>
        <h1 style={{fontFamily:"var(--font-display)", fontWeight:400, fontSize:48, letterSpacing:"-0.02em", lineHeight:1, marginTop:14, color:"var(--ink)"}}>
          Mai <span style={{color:"var(--ink-3)", fontWeight:300}}>MMXXVI</span>
        </h1>
      </section>

      {/* week strip */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(7, 1fr)", borderTop:"1px solid var(--hairline)", borderBottom:"1px solid var(--hairline)"}}>
        {["D","L","M","M","J","V","S"].map((w, i) => (
          <div key={i} style={{
            padding:"10px 0", textAlign:"center",
            borderLeft: i>0 ? "1px solid var(--hairline)" : 0,
            background: days[i] === 23 ? "var(--gilt-wash)" : "transparent",
          }}>
            <div className="eyebrow" style={{fontSize:9, color: i===0 ? "var(--gilt-2)" : "var(--ink-3)"}}>{w}</div>
            <div className="numerator" style={{fontSize:18, color:"var(--ink)", marginTop:4, fontWeight: days[i]===23 ? 500 : 300}}>{days[i]}</div>
          </div>
        ))}
      </div>

      <section style={{padding:"24px 20px"}}>
        {days.map(d => {
          const events = dayEvents[d] || [];
          return (
            <div key={d} style={{
              display:"grid", gridTemplateColumns:"56px 1fr",
              gap:14, padding:"16px 0",
              borderBottom:"1px solid var(--hairline)",
              opacity: events.length === 0 ? 0.55 : 1,
            }}>
              <div>
                <div className="numerator" style={{fontSize:28, color:"var(--ink)", fontWeight: d===23 ? 500 : 300}}>{d}</div>
                <div className="eyebrow" style={{fontSize:9, marginTop:2}}>{["DIM","LUN","MAR","MER","JEU","VEN","SAM"][(d-17) % 7]}</div>
              </div>
              <div>
                {events.length === 0 ? (
                  <div className="eyebrow" style={{color:"var(--ink-3)"}}>Aucune activité</div>
                ) : events.map((ev, i) => (
                  <div key={i} style={{marginTop: i>0 ? 8 : 0}}>
                    <div style={{display:"flex", alignItems:"center", gap:8}}>
                      <DeptSwatch color={DEPT_COLORS[ev.dept]}/>
                      <span className="eyebrow">{ev.time} · {ev.dept}</span>
                    </div>
                    <div style={{fontFamily:"var(--font-display)", fontSize: ev.featured ? 22 : 18, color:"var(--ink)", marginTop:3, fontWeight: ev.featured ? 500 : 400}}>{ev.title}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <PublicFooter compact/>
    </div>
  );
}

Object.assign(window, {
  PublicHomeDesktop, PublicHomeMobile,
  PublicCalendarDesktop, PublicCalendarMobile,
  PublicMobileMenuOpen,
});
