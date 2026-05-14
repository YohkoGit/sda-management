// ============================================================
// SDAC — Authenticated screens
// ============================================================

// ===== Sign-in (desktop + mobile share core) =====
function SignInScreen({ mobile }) {
  return (
    <div style={{display:"flex", height:"100%", background:"var(--parchment)"}}>
      {/* Left half — image / brand */}
      {!mobile && (
        <div style={{flex:"1 1 50%", position:"relative", background:"var(--ink)", color:"var(--parchment)", overflow:"hidden"}}>
          <ImageSlot id="signin-cover" placeholder="Sanctuaire photographie" style={{position:"absolute", inset:0, width:"100%", height:"100%", opacity:0.55}}/>
          <div style={{position:"relative", padding:"48px 56px", height:"100%", display:"flex", flexDirection:"column", justifyContent:"space-between"}}>
            <Wordmark tone="parchment" size="md"/>
            <div>
              <Eyebrow tone="parch">L'app du sabbat</Eyebrow>
              <h2 style={{fontFamily:"var(--font-display)", fontWeight:400, fontSize:56, color:"#F0E6CC", letterSpacing:"-0.02em", lineHeight:1.05, marginTop:18}}>
                Pour <em>celles et ceux</em> qui font vivre la communauté chaque semaine.
              </h2>
            </div>
            <div className="eyebrow" style={{color:"rgba(240,230,204,.5)"}}>Église Adventiste · Saint-Hubert</div>
          </div>
        </div>
      )}

      {/* Right half — form */}
      <div style={{flex: mobile ? "1 1 100%" : "1 1 44%", padding: mobile ? "32px 24px" : "64px 80px", display:"flex", flexDirection:"column", justifyContent:"center"}}>
        {mobile && <div style={{marginBottom:32}}><Wordmark size="sm"/></div>}
        <Eyebrow n={1}>Connexion</Eyebrow>
        <h1 style={{fontFamily:"var(--font-display)", fontWeight:400, fontSize: mobile ? 40 : 52, letterSpacing:"-0.02em", lineHeight:1.05, marginTop:16, color:"var(--ink)"}}>
          Bienvenue<br/><em style={{color:"var(--ink-2)"}}>à la maison.</em>
        </h1>
        <p style={{marginTop:16, color:"var(--ink-3)", fontSize:14, maxWidth:"36ch"}}>
          Pour les officiers, le comité et les administrateurs. Si vous n'avez pas de compte, contactez Soeur Ketsia ou Pasteur Vicuna.
        </p>

        <div style={{marginTop:36, display:"flex", flexDirection:"column", gap:18, maxWidth:380}}>
          <button style={{
            display:"flex", alignItems:"center", gap:12, justifyContent:"center",
            padding:"13px 18px", border:"1px solid var(--hairline-2)", borderRadius:4,
            background:"var(--parchment)", cursor:"pointer",
            fontFamily:"var(--font-sans)", fontSize:14, fontWeight:500, color:"var(--ink)",
          }}>
            <svg width="16" height="16" viewBox="0 0 18 18"><path d="M9 7.5v3h4.27c-.18.96-1.32 2.82-4.27 2.82a4.82 4.82 0 0 1 0-9.64c1.5 0 2.51.64 3.09 1.19l2.1-2.02C12.83 1.69 11.07 1 9 1a8 8 0 1 0 0 16c4.62 0 7.68-3.24 7.68-7.8 0-.52-.06-.91-.13-1.3H9z" fill="#1B2530"/></svg>
            Continuer avec Google
          </button>

          <div style={{display:"flex", alignItems:"center", gap:14, color:"var(--ink-3)"}}>
            <hr className="rule" style={{flex:1}}/>
            <span className="eyebrow">ou</span>
            <hr className="rule" style={{flex:1}}/>
          </div>

          <div className="field">
            <label>Adresse courriel</label>
            <div className="field-shell">
              <svg width="14" height="10" viewBox="0 0 14 10" style={{color:"var(--ink-3)"}}><rect x="0.5" y="0.5" width="13" height="9" stroke="currentColor" fill="none"/><path d="M0.5 0.5 L7 6 L13.5 0.5" stroke="currentColor" fill="none"/></svg>
              <input type="email" placeholder="marie.claire@saint-hubert.qc"/>
            </div>
          </div>
          <div className="field">
            <label>Mot de passe</label>
            <div className="field-shell">
              <svg width="12" height="14" viewBox="0 0 12 14" style={{color:"var(--ink-3)"}}><rect x="1.5" y="6" width="9" height="7" stroke="currentColor" fill="none"/><path d="M3.5 6 V4 a2.5 2.5 0 0 1 5 0 V6" stroke="currentColor" fill="none"/></svg>
              <input type="password" placeholder="••••••••"/>
              <span className="trailing" style={{cursor:"pointer"}}>Afficher</span>
            </div>
          </div>
          <div style={{display:"flex", gap:14, alignItems:"center", marginTop:8}}>
            <Btn kind="primary">Se connecter →</Btn>
            <a href="#" style={{fontSize:12, color:"var(--ink-3)"}}>Mot de passe oublié?</a>
          </div>
        </div>

        <div style={{marginTop:48, fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-3)", letterSpacing:"0.14em", textTransform:"uppercase"}}>
          ✣ &nbsp; Soli Deo gloria
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AUTH SHELL — sidebar nav + main content
// ============================================================
const AUTH_NAV = {
  member: [
    { id:"dashboard", label:"Tableau de bord", icon:"⊞" },
    { id:"calendar",  label:"Calendrier",      icon:"▤" },
    { id:"depts",     label:"Départements",    icon:"⌹" },
    { id:"members",   label:"Annuaire",        icon:"⌸" },
  ],
  admin: [
    { id:"admin-activities",  label:"Activités",     icon:"⌖" },
    { id:"admin-departments", label:"Départements",  icon:"⌹" },
    { id:"admin-templates",   label:"Modèles",       icon:"❖" },
    { id:"admin-users",       label:"Utilisateurs",  icon:"⌸" },
  ],
};

// =========================
// Authenticated mobile menu drawer (open state)
// =========================
function AuthMobileMenuOpen({ user, active, onClose }) {
  const memberItems = AUTH_NAV.member;
  const adminItems = user.role === "ADMIN" ? AUTH_NAV.admin : [];
  return (
    <div style={{background:"var(--parchment)", minHeight:"100%"}}>
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
      </header>

      <div style={{padding:"22px 24px", borderBottom:"1px solid var(--hairline)", display:"flex", alignItems:"center", gap:12}}>
        <Avatar initials={user.initials} tint={user.tint}/>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontFamily:"var(--font-display)", fontSize:18, color:"var(--ink)"}}>{user.name}</div>
          <div className="eyebrow">{user.role.toLowerCase()} · {user.dept}</div>
        </div>
      </div>

      <nav style={{padding:"24px 24px 16px"}}>
        <div className="eyebrow" style={{marginBottom:18}}>Naviguer</div>
        {memberItems.map((it, i) => (
          <a key={it.id} href="#" style={{
            display:"flex", alignItems:"baseline", gap:16,
            padding:"16px 0",
            borderTop: i === 0 ? "1px solid var(--hairline)" : 0,
            borderBottom:"1px solid var(--hairline)",
            textDecoration:"none",
          }}>
            <span style={{fontFamily:"var(--font-mono)", fontSize:14, color: active===it.id ? "var(--gilt)" : "var(--ink-3)"}}>{it.icon}</span>
            <span style={{
              flex:1,
              fontFamily:"var(--font-display)", fontSize:22,
              color: active===it.id ? "var(--ink)" : "var(--ink-2)",
              fontWeight: active===it.id ? 500 : 400,
              fontStyle: active===it.id ? "italic" : "normal",
            }}>{it.label}</span>
            {active===it.id && <span style={{color:"var(--gilt)"}}>·</span>}
          </a>
        ))}

        {adminItems.length > 0 && (
          <>
            <div className="eyebrow eyebrow-gilt" style={{marginTop:24, marginBottom:14}}>Administration</div>
            {adminItems.map((it, i) => (
              <a key={it.id} href="#" style={{
                display:"flex", alignItems:"baseline", gap:16,
                padding:"14px 0",
                borderTop: i === 0 ? "1px solid var(--hairline)" : 0,
                borderBottom:"1px solid var(--hairline)",
                textDecoration:"none",
              }}>
                <span style={{fontFamily:"var(--font-mono)", fontSize:14, color:"var(--ink-3)"}}>{it.icon}</span>
                <span style={{flex:1, fontFamily:"var(--font-display)", fontSize:19, color:"var(--ink-2)"}}>{it.label}</span>
              </a>
            ))}
          </>
        )}
      </nav>

      <div style={{padding:"16px 24px", borderTop:"1px solid var(--hairline)", marginTop:"auto", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <span className="eyebrow">FR · EN</span>
        <a href="#" className="eyebrow" style={{color:"var(--ink-3)"}}>Se déconnecter →</a>
      </div>
    </div>
  );
}

function AuthShell({ user, active, onNav, children, mobile }) {
  if (mobile) {
    const [menuOpen, setMenuOpen] = useState(false);
    return (
      <div style={{position:"relative", height:"100%", overflow:"hidden"}}>
        <div style={{background:"var(--parchment-2)", minHeight:"100%", height:"100%", overflowY:"auto"}}>
          <header style={{
            display:"flex", alignItems:"center", gap:14,
            padding:"14px 20px", background:"var(--parchment)",
            borderBottom:"1px solid var(--hairline)",
          }}>
            <button onClick={()=>setMenuOpen(true)} style={{background:"none", border:0, padding:0, color:"var(--ink)", cursor:"pointer", display:"inline-flex"}}>
              <svg width="20" height="14" viewBox="0 0 20 14"><line x1="0" y1="1" x2="20" y2="1" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="13" x2="20" y2="13" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
            <Wordmark size="sm"/>
            <span style={{flex:1}}/>
            <Avatar initials={user.initials} size="sm" tint={user.tint}/>
          </header>
          <div>{children}</div>
        </div>

        {menuOpen && (
          <>
            <div onClick={()=>setMenuOpen(false)} className="anim-fade-in"
              style={{position:"absolute", inset:0, background:"rgba(27, 37, 48, 0.45)", zIndex:5}}/>
            <div className="anim-drawer-in"
              style={{position:"absolute", inset:0, zIndex:6, background:"var(--parchment)"}}>
              <AuthMobileMenuOpen user={user} active={active} onClose={()=>setMenuOpen(false)}/>
            </div>
          </>
        )}
      </div>
    );
  }

  const sections = user.role === "ADMIN" ? [...AUTH_NAV.member, ...AUTH_NAV.admin] : AUTH_NAV.member;
  return (
    <div style={{display:"flex", height:"100%", background:"var(--parchment-2)"}}>
      <aside style={{
        width:260, background:"var(--parchment)",
        borderRight:"1px solid var(--hairline)",
        padding:"28px 0", display:"flex", flexDirection:"column",
        flexShrink:0,
      }}>
        <div style={{padding:"0 24px 22px", borderBottom:"1px solid var(--hairline)"}}>
          <Wordmark size="sm"/>
        </div>

        <div style={{padding:"22px 24px 14px", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid var(--hairline)"}}>
          <Avatar initials={user.initials} tint={user.tint}/>
          <div style={{minWidth:0}}>
            <div style={{fontFamily:"var(--font-display)", fontSize:16, color:"var(--ink)"}}>{user.name}</div>
            <div className="eyebrow">{user.role.toLowerCase()} · {user.dept}</div>
          </div>
        </div>

        <div style={{padding:"18px 16px", display:"flex", flexDirection:"column", gap:2, flex:1}}>
          <div className="eyebrow" style={{padding:"6px 12px 10px"}}>Naviguer</div>
          {AUTH_NAV.member.map(it => <NavItem key={it.id} item={it} active={active===it.id} onClick={()=>onNav&&onNav(it.id)}/>)}

          {user.role === "ADMIN" && (
            <>
              <div className="eyebrow" style={{padding:"22px 12px 10px", color:"var(--gilt-2)"}}>Administration</div>
              {AUTH_NAV.admin.map(it => <NavItem key={it.id} item={it} active={active===it.id} onClick={()=>onNav&&onNav(it.id)}/>)}
            </>
          )}
        </div>

        <div style={{padding:"16px 24px", borderTop:"1px solid var(--hairline)", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <span className="eyebrow">FR · EN</span>
          <a href="#" className="eyebrow" style={{color:"var(--ink-3)"}}>Se déconnecter →</a>
        </div>
      </aside>

      <main style={{flex:1, overflowY:"auto"}}>{children}</main>
    </div>
  );
}

function NavItem({ item, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:14,
      padding:"9px 12px",
      background: active ? "var(--parchment-2)" : "transparent",
      border:0, borderLeft: "2px solid " + (active ? "var(--gilt)" : "transparent"),
      cursor:"pointer", textAlign:"left",
      fontFamily:"var(--font-sans)", fontSize:13.5,
      color: active ? "var(--ink)" : "var(--ink-2)",
      fontWeight: active ? 500 : 400,
    }}>
      <span style={{fontFamily:"var(--font-mono)", fontSize:14, color: active ? "var(--gilt)" : "var(--ink-3)"}}>{item.icon}</span>
      <span>{item.label}</span>
    </button>
  );
}

// ============================================================
// AUTH DASHBOARD — VIEWER (Marie)
// ============================================================
const VIEWER_USER = { name:"Marie Claire", initials:"MC", role:"VIEWER", dept:"Diaconnat", tint:"var(--moss)" };
const ADMIN_USER  = { name:"Soeur Ketsia", initials:"KS", role:"ADMIN",  dept:"MIFEM",     tint:"var(--umber)" };

const MY_ASSIGNMENTS = [
  { date:"23 mai", weekday:"Samedi", activity:"Sainte-Cène · Culte", role:"Diaconesse · service", time:"10 h 00", with:["Frère Jean","Soeur Pauline","Soeur Anne"], dept:"DIACONNAT" },
  { date:"30 mai", weekday:"Samedi", activity:"Culte de la jeunesse", role:"Diaconesse · accueil", time:"17 h 00", with:["Frère Marc","Soeur Lydia"], dept:"DIACONNAT" },
];

function AuthDashboardDesktop({ onNav }) {
  return (
    <AuthShell user={VIEWER_USER} active="dashboard" onNav={onNav}>
      <div style={{padding:"48px 64px"}}>
        {/* Top — greeting */}
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", paddingBottom:24, borderBottom:"1px solid var(--hairline)"}}>
          <div>
            <Eyebrow>Mercredi 13 mai · 2026</Eyebrow>
            <h1 style={{fontFamily:"var(--font-display)", fontWeight:400, fontSize:64, lineHeight:1, letterSpacing:"-0.02em", marginTop:14, color:"var(--ink)"}}>
              Bonjour, <em>Marie.</em>
            </h1>
            <p style={{marginTop:14, color:"var(--ink-3)", fontSize:14, maxWidth:"52ch"}}>
              Vous avez <strong style={{color:"var(--ink)"}}>deux affectations</strong> à venir. La prochaine est ce sabbat, dans trois jours.
            </p>
          </div>
          <div style={{textAlign:"right"}}>
            <div className="eyebrow eyebrow-gilt">Prochaine affectation</div>
            <div style={{fontFamily:"var(--font-display)", fontSize:36, color:"var(--ink)", marginTop:6, letterSpacing:"-0.01em"}}>dans 3 jours</div>
            <div style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-3)", letterSpacing:"0.12em", textTransform:"uppercase", marginTop:6}}>Sam. 23 mai · 10 h 00</div>
          </div>
        </div>

        {/* My next assignment — feature card */}
        <div style={{marginTop:48, display:"grid", gridTemplateColumns:"1.4fr 1fr", gap:48}}>
          <div>
            <Eyebrow n={1}>Mes affectations</Eyebrow>
            <div style={{marginTop:24}}>
              {MY_ASSIGNMENTS.map((a, i) => (
                <AssignmentRow key={i} a={a} featured={i===0}/>
              ))}
            </div>
          </div>

          <div>
            <Eyebrow n={2}>Cette semaine</Eyebrow>
            <div style={{marginTop:24, padding:"24px 24px 22px", background:"var(--parchment)", border:"1px solid var(--hairline)", borderRadius:6}}>
              <div className="eyebrow eyebrow-gilt">Ce sabbat</div>
              <div style={{fontFamily:"var(--font-display)", fontSize:32, color:"var(--ink)", marginTop:8, lineHeight:1.05}}>Sainte-Cène</div>
              <div style={{fontSize:13, color:"var(--ink-3)", marginTop:6}}>Prédicateur · Pasteur L. Vicuna</div>
              <hr className="rule" style={{margin:"18px 0"}}/>
              <div style={{display:"flex", justifyContent:"space-between"}}>
                <span className="eyebrow">10 h 00</span>
                <span className="eyebrow">Sanctuaire</span>
              </div>
            </div>

            <div style={{marginTop:32}}>
              <Eyebrow n={3}>Activité récente</Eyebrow>
              <div style={{marginTop:18}}>
                {[
                  {who:"Soeur Ketsia", what:"a modifié le rôle Sainte-Cène", when:"il y a 2 h", dept:"MIFEM"},
                  {who:"Pasteur Vicuna", what:"a publié le programme du sabbat", when:"il y a 6 h", dept:"PASTORAL"},
                  {who:"Frère Marc", what:"a accepté l'affectation Diaconat", when:"hier", dept:"DIACONNAT"},
                ].map((a, i) => (
                  <div key={i} style={{padding:"14px 0", borderTop:"1px solid var(--hairline)"}}>
                    <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
                      <span style={{fontFamily:"var(--font-display)", fontSize:15, color:"var(--ink)"}}>{a.who}</span>
                      <span className="eyebrow">{a.when}</span>
                    </div>
                    <div style={{fontSize:13, color:"var(--ink-3)", marginTop:2}}>{a.what}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

function AssignmentRow({ a, featured }) {
  return (
    <div style={{
      padding:"24px 0",
      borderTop:"1px solid var(--hairline)",
      borderBottom: featured ? 0 : "1px solid var(--hairline)",
      position:"relative",
    }}>
      {featured && <div style={{position:"absolute", top:-1, left:0, right:0, height:1, background:"var(--gilt)"}}/>}
      <div style={{display:"grid", gridTemplateColumns: featured ? "80px 1fr auto" : "80px 1fr auto", gap:24, alignItems:"start"}}>
        <div>
          <div className="numerator" style={{fontSize: featured ? 56 : 36, color:"var(--ink)", fontWeight: featured ? 400 : 300}}>{a.date.split(" ")[0]}</div>
          <div className="eyebrow" style={{marginTop:4}}>{a.weekday}</div>
        </div>
        <div>
          {featured && <Eyebrow tone="gilt">À venir · dans 3 jours</Eyebrow>}
          <div style={{fontFamily:"var(--font-display)", fontSize: featured ? 32 : 22, color:"var(--ink)", marginTop: featured ? 10 : 0, lineHeight:1.1}}>
            {a.activity}
          </div>
          <div style={{display:"flex", alignItems:"center", gap:10, marginTop:8}}>
            <DeptSwatch color={DEPT_COLORS[a.dept]}/>
            <span className="eyebrow">{a.role}</span>
          </div>
          <hr className="rule" style={{margin:"16px 0"}}/>
          <div className="eyebrow" style={{color:"var(--ink-3)"}}>Avec vous</div>
          <div style={{display:"flex", gap:-8, marginTop:10, alignItems:"center"}}>
            <div style={{display:"flex"}}>
              {a.with.map((w, i) => (
                <span key={w} style={{marginLeft: i===0 ? 0 : -10}}><Avatar initials={w.split(" ").map(x=>x[0]).join("").slice(0,2)} tint="var(--parchment-3)" size="sm"/></span>
              ))}
            </div>
            <span style={{fontSize:13, color:"var(--ink-2)", marginLeft:14}}>{a.with.join(" · ")}</span>
          </div>
        </div>
        <div style={{textAlign:"right"}}>
          <span className="eyebrow">{a.time}</span>
          {featured && <div style={{marginTop:14}}><Btn kind="ghost" size="sm">Voir le détail →</Btn></div>}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AUTH DASHBOARD — MOBILE
// ============================================================
function AuthDashboardMobile() {
  return (
    <AuthShell user={VIEWER_USER} active="dashboard" mobile>
      <section style={{padding:"24px 20px 14px"}}>
        <Eyebrow>Mercredi 13 mai</Eyebrow>
        <h1 style={{fontFamily:"var(--font-display)", fontWeight:400, fontSize:44, letterSpacing:"-0.02em", lineHeight:1, marginTop:12, color:"var(--ink)"}}>
          Bonjour, <em>Marie.</em>
        </h1>
        <p style={{marginTop:12, color:"var(--ink-3)", fontSize:13.5, lineHeight:1.55}}>
          Deux affectations à venir. La prochaine est <strong style={{color:"var(--ink)"}}>dans 3 jours</strong>.
        </p>
      </section>

      <section style={{padding:"24px 20px", background:"var(--parchment)", borderTop:"1px solid var(--hairline)", borderBottom:"1px solid var(--hairline)"}}>
        <Eyebrow tone="gilt" n={1}>Prochaine</Eyebrow>
        <div style={{display:"flex", alignItems:"baseline", gap:16, marginTop:12}}>
          <div className="numerator" style={{fontSize:64, color:"var(--ink)", fontWeight:400, lineHeight:0.9}}>23</div>
          <div>
            <div style={{fontFamily:"var(--font-display)", fontStyle:"italic", fontSize:18, color:"var(--ink-2)"}}>samedi</div>
            <div className="eyebrow">mai · MMXXVI</div>
          </div>
        </div>
        <hr className="rule" style={{margin:"18px 0 14px"}}/>
        <div style={{fontFamily:"var(--font-display)", fontSize:26, color:"var(--ink)", lineHeight:1.1}}>Sainte-Cène · Culte</div>
        <div style={{display:"flex", alignItems:"center", gap:10, marginTop:10}}>
          <DeptSwatch color={DEPT_COLORS.DIACONNAT}/>
          <span className="eyebrow">Diaconesse · service</span>
        </div>
        <hr className="rule" style={{margin:"16px 0"}}/>
        <div className="eyebrow" style={{color:"var(--ink-3)"}}>Avec vous</div>
        <div style={{display:"flex", flexDirection:"column", gap:8, marginTop:10}}>
          {["Frère Jean","Soeur Pauline","Soeur Anne"].map(w => (
            <div key={w} style={{display:"flex", alignItems:"center", gap:10}}>
              <Avatar initials={w.split(" ").map(x=>x[0]).join("").slice(0,2)} tint="var(--parchment-3)" size="sm"/>
              <span style={{fontSize:14, color:"var(--ink)"}}>{w}</span>
            </div>
          ))}
        </div>
        <div style={{marginTop:18}}><Btn kind="primary" size="sm">Voir le détail →</Btn></div>
      </section>

      <section style={{padding:"24px 20px"}}>
        <Eyebrow n={2}>À venir</Eyebrow>
        <div style={{marginTop:14}}>
          {MY_ASSIGNMENTS.slice(1).map((a, i) => (
            <div key={i} style={{display:"grid", gridTemplateColumns:"56px 1fr", gap:14, padding:"16px 0", borderBottom:"1px solid var(--hairline)"}}>
              <div>
                <div className="numerator" style={{fontSize:30, color:"var(--ink)"}}>{a.date.split(" ")[0]}</div>
                <div className="eyebrow" style={{fontSize:9}}>{a.weekday}</div>
              </div>
              <div>
                <div className="eyebrow" style={{color:"var(--ink-3)"}}>{a.time} · {a.role}</div>
                <div style={{fontFamily:"var(--font-display)", fontSize:19, color:"var(--ink)", marginTop:4}}>{a.activity}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AuthShell>
  );
}

// ============================================================
// DEPARTMENT DETAIL — ADMIN (Soeur Ketsia / MIFEM)
// ============================================================
function DepartmentDetail({ onNav }) {
  const upcomingMifem = [
    { day:24, month:"MAI", weekday:"Dim.", title:"Petit-déjeuner MIFEM",      time:"9 h 30",  staffed:"5/5", status:"ok"  },
    { day:31, month:"MAI", weekday:"Sam.", title:"Comité MIFEM · planification", time:"18 h",  staffed:"4/4", status:"ok"  },
    { day:6,  month:"JUN", weekday:"Sam.", title:"Journée des mères",          time:"10 h",  staffed:"6/8", status:"gap" },
    { day:13, month:"JUN", weekday:"Sam.", title:"Atelier prière intercession", time:"15 h", staffed:"3/4", status:"gap" },
    { day:20, month:"JUN", weekday:"Sam.", title:"Sortie · Mont Saint-Hilaire", time:"9 h",  staffed:"2/6", status:"warn"},
  ];

  return (
    <AuthShell user={ADMIN_USER} active="admin-departments" onNav={onNav}>
      <div style={{padding:"40px 56px"}}>
        {/* Breadcrumb */}
        <div style={{display:"flex", alignItems:"center", gap:8, fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-3)", letterSpacing:"0.12em", textTransform:"uppercase"}}>
          <a href="#" style={{color:"inherit"}}>Départements</a>
          <span>/</span>
          <span style={{color:"var(--ink)"}}>MIFEM</span>
        </div>

        {/* Header */}
        <div style={{marginTop:18, display:"flex", alignItems:"flex-end", justifyContent:"space-between", paddingBottom:28, borderBottom:"1px solid var(--hairline)"}}>
          <div>
            <div style={{display:"flex", alignItems:"center", gap:14}}>
              <DeptSwatch color={DEPT_COLORS.MIFEM}/>
              <Eyebrow>Ministère 04</Eyebrow>
            </div>
            <h1 style={{fontFamily:"var(--font-display)", fontWeight:400, fontSize:72, lineHeight:1, letterSpacing:"-0.02em", marginTop:14, color:"var(--ink)"}}>
              Ministère <em>des femmes</em>
            </h1>
            <p style={{marginTop:14, color:"var(--ink-3)", fontSize:14, maxWidth:"54ch"}}>
              MIFEM · 7 membres actifs · trois sous-ministères. Coordonné par Soeur Ketsia depuis janvier 2024.
            </p>
          </div>
          <div style={{display:"flex", gap:10}}>
            <Btn kind="ghost" size="sm">Modifier</Btn>
            <Btn kind="primary" size="sm">+ Nouvelle activité</Btn>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:0, marginTop:36}}>
          <Stat label="Activités · juin" value="5" first/>
          <Stat label="Rôles à pourvoir" value="6" tone="warn"/>
          <Stat label="Membres actifs" value="7"/>
          <Stat label="Sous-ministères" value="3" last/>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"2fr 1fr", gap:56, marginTop:56}}>
          {/* Upcoming */}
          <div>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:24}}>
              <div>
                <Eyebrow n={1}>Activités à venir</Eyebrow>
                <div style={{fontFamily:"var(--font-display)", fontSize:30, marginTop:10, color:"var(--ink)"}}>Les cinq prochaines</div>
              </div>
              <div style={{display:"flex", gap:6}}>
                <span className="tag">Tout</span>
                <span className="tag tag-gilt">À pourvoir</span>
                <span className="tag">Brouillons</span>
              </div>
            </div>
            <div>
              {upcomingMifem.map((u, i) => (
                <DeptUpcomingRow key={i} u={u} idx={i+1}/>
              ))}
            </div>
          </div>

          {/* Sub-ministries + members */}
          <div>
            <Eyebrow n={2}>Sous-ministères</Eyebrow>
            <div style={{marginTop:20}}>
              {[
                {name:"Prière intercession", lead:"Soeur Anne",   count:4},
                {name:"Accueil sabbat",      lead:"Soeur Pauline", count:3},
                {name:"Journée des mères",   lead:"Soeur Lydia",   count:5},
              ].map(s => (
                <div key={s.name} style={{padding:"16px 0", borderTop:"1px solid var(--hairline)"}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
                    <span style={{fontFamily:"var(--font-display)", fontSize:18, color:"var(--ink)"}}>{s.name}</span>
                    <span className="eyebrow">{s.count} membres</span>
                  </div>
                  <div className="eyebrow" style={{color:"var(--ink-3)", marginTop:4}}>Resp. · {s.lead}</div>
                </div>
              ))}
            </div>

            <div style={{marginTop:36}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end"}}>
                <Eyebrow n={3}>Membres</Eyebrow>
                <a href="#" className="eyebrow" style={{color:"var(--gilt-2)"}}>Annuaire complet →</a>
              </div>
              <div style={{marginTop:18, display:"flex", flexDirection:"column", gap:10}}>
                {[
                  {n:"Ketsia Saint-Pierre", r:"Directrice", initials:"KS"},
                  {n:"Anne Boucher", r:"Prière intercession", initials:"AB"},
                  {n:"Pauline Joseph", r:"Accueil sabbat", initials:"PJ"},
                  {n:"Lydia Mercier", r:"Journée des mères", initials:"LM"},
                ].map(m => (
                  <div key={m.n} style={{display:"flex", alignItems:"center", gap:12}}>
                    <Avatar initials={m.initials} size="sm" tint="var(--umber)"/>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontFamily:"var(--font-display)", fontSize:15, color:"var(--ink)"}}>{m.n}</div>
                      <div className="eyebrow" style={{color:"var(--ink-3)"}}>{m.r}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

function Stat({ label, value, tone, first, last }) {
  return (
    <div style={{
      borderRight: last ? 0 : "1px solid var(--hairline)",
      paddingLeft: first ? 0 : 28,
      paddingRight: last ? 0 : 28,
    }}>
      <div className="eyebrow" style={{color: tone === "warn" ? "var(--gaps)" : "var(--ink-3)"}}>{label}</div>
      <div className="numerator" style={{fontSize:56, color: tone === "warn" ? "var(--gaps)" : "var(--ink)", marginTop:8, fontWeight:400}}>{value}</div>
    </div>
  );
}

function DeptUpcomingRow({ u, idx }) {
  const statusColor = u.status === "warn" ? "var(--gaps)" : u.status === "gap" ? "var(--gilt-2)" : "var(--staffed)";
  return (
    <div style={{
      display:"grid", gridTemplateColumns:"40px 64px 1fr 130px 110px 24px",
      gap:16, alignItems:"center",
      padding:"18px 0",
      borderTop:"1px solid var(--hairline)",
    }}>
      <span style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-3)"}}>{String(idx).padStart(2,"0")}</span>
      <div>
        <div className="numerator" style={{fontSize:30, color:"var(--ink)", fontWeight:300}}>{u.day}</div>
        <div className="eyebrow" style={{fontSize:9}}>{u.month}</div>
      </div>
      <div>
        <div className="eyebrow" style={{color:"var(--ink-3)"}}>{u.weekday} · {u.time}</div>
        <div style={{fontFamily:"var(--font-display)", fontSize:19, color:"var(--ink)", marginTop:3}}>{u.title}</div>
      </div>
      <div style={{display:"flex", alignItems:"center", gap:8}}>
        <span style={{width:8, height:8, borderRadius:"50%", background: statusColor}}/>
        <span className="eyebrow" style={{color: statusColor}}>{u.staffed} rôles</span>
      </div>
      <span className="eyebrow" style={{color:"var(--ink-3)", textAlign:"right"}}>{u.status === "ok" ? "Complet" : u.status === "gap" ? "À pourvoir" : "Urgent"}</span>
      <span style={{color:"var(--ink-3)", textAlign:"right"}}>→</span>
    </div>
  );
}

// ============================================================
// ACTIVITY CREATE — Admin flow (desktop)
// ============================================================
function ActivityCreate({ onNav }) {
  return (
    <AuthShell user={ADMIN_USER} active="admin-activities" onNav={onNav}>
      <div style={{padding:"40px 56px", maxWidth:1100}}>
        <div style={{display:"flex", alignItems:"center", gap:8, fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-3)", letterSpacing:"0.12em", textTransform:"uppercase"}}>
          <a href="#" style={{color:"inherit"}}>Activités</a>
          <span>/</span>
          <span style={{color:"var(--ink)"}}>Nouvelle</span>
        </div>

        <div style={{marginTop:18, paddingBottom:24, borderBottom:"1px solid var(--hairline)"}}>
          <Eyebrow tone="gilt" n={1}>Étape 02 sur 04</Eyebrow>
          <h1 style={{fontFamily:"var(--font-display)", fontWeight:400, fontSize:64, lineHeight:1, letterSpacing:"-0.02em", marginTop:14, color:"var(--ink)"}}>
            Nouvelle <em>activité</em>
          </h1>
          <p style={{marginTop:14, color:"var(--ink-3)", fontSize:14}}>
            Le modèle <strong style={{color:"var(--ink)"}}>Culte du sabbat</strong> est appliqué. Ajustez les détails, attribuez les rôles, publiez.
          </p>

          {/* Stepper */}
          <div style={{display:"flex", gap:0, marginTop:28}}>
            {["Modèle","Détails","Rôles","Révision"].map((s, i) => {
              const active = i === 1;
              const done = i === 0;
              return (
                <div key={s} style={{
                  flex:1, display:"flex", alignItems:"center", gap:10,
                  paddingTop:14, borderTop: "1px solid " + (active || done ? "var(--gilt)" : "var(--hairline-2)"),
                }}>
                  <span style={{fontFamily:"var(--font-mono)", fontSize:11, color: done ? "var(--gilt-2)" : active ? "var(--ink)" : "var(--ink-3)", letterSpacing:"0.12em"}}>{String(i+1).padStart(2,"0")}</span>
                  <span style={{fontFamily:"var(--font-display)", fontSize:16, color: active ? "var(--ink)" : done ? "var(--ink-2)" : "var(--ink-3)", fontWeight: active ? 500 : 400}}>{s}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form */}
        <div style={{display:"grid", gridTemplateColumns:"1.5fr 1fr", gap:64, marginTop:40}}>
          <div>
            <Eyebrow>Détails de l'activité</Eyebrow>

            <div style={{marginTop:24, display:"flex", flexDirection:"column", gap:20}}>
              <Field label="Titre">
                <TextField defaultValue="Culte du sabbat · 23 mai" display
                  leading="ACT-0042"/>
              </Field>

              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
                <DateField label="Date" value="Samedi 23 mai 2026" open/>
                <TimeField label="Début" value="10 h 00"/>
              </div>

              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
                <DeptField label="Département pilote" value="Pastoral" swatch={DEPT_COLORS.PASTORAL}/>
                <Field label="Lieu">
                  <TextField defaultValue="Sanctuaire principal"
                    trailing={<svg width="12" height="14" viewBox="0 0 12 14"><path d="M6 1 C3 1 1 3 1 6 c0 4 5 7 5 7 s5 -3 5 -7 c0 -3 -2 -5 -5 -5 z M6 4.5 a1.5 1.5 0 1 0 0 3 a1.5 1.5 0 0 0 0 -3 z" stroke="currentColor" fill="none"/></svg>}/>
                </Field>
              </div>

              <TagPicker label="Caractère spécial"
                value="Sainte-cène"
                options={["Standard","Sainte-cène","Baptême","Spécial · 5e sabbat","Communion familiale"]}/>

              <Field label="Note publique" hint="Visible sur la page d'accueil de la congrégation.">
                <TextAreaField rows={2}
                  defaultValue="Service mensuel de communion. Apportez votre Bible et un cœur ouvert."/>
              </Field>
            </div>

            <hr className="rule" style={{margin:"40px 0 24px"}}/>
            <Eyebrow n={2}>Rôles · 4 rôles · 6 personnes</Eyebrow>
            <div style={{marginTop:18}}>
              {[
                {role:"Prédicateur",  count:"1", assigned:[{n:"L. Vicuna", i:"LV", c:"var(--moss)"}]},
                {role:"Diaconnat",    count:"3", assigned:[
                  {n:"Marie Claire", i:"MC", c:"var(--moss)"},
                  {n:"Pauline J.", i:"PJ", c:"var(--moss)"},
                  {n:"Anne B.", i:"AB", c:"var(--moss)"},
                ]},
                {role:"Chorale · direction", count:"1", assigned:[{n:"Frère David", i:"FD", c:"var(--azure)"}]},
                {role:"Annonces",     count:"1", assigned:[], gap:true, picker:true},
              ].map((r, i) => (
                <div key={i} style={{padding:"18px 0", borderTop:"1px solid var(--hairline)"}}>
                  <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
                    <div>
                      <span style={{fontFamily:"var(--font-display)", fontSize:18, color:"var(--ink)"}}>{r.role}</span>
                      <span style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-3)", marginLeft:10, letterSpacing:"0.1em"}}>· {r.assigned.length}/{r.count}</span>
                    </div>
                    {r.gap && <span className="eyebrow" style={{color:"var(--gaps)"}}>● À pourvoir</span>}
                  </div>
                  {!r.picker && (
                    <div style={{display:"flex", gap:8, marginTop:12, flexWrap:"wrap"}}>
                      {r.assigned.map(a => (
                        <span key={a.n} style={{display:"inline-flex", alignItems:"center", gap:8, padding:"4px 12px 4px 4px", background:"var(--parchment)", border:"1px solid var(--hairline-2)", borderRadius:999}}>
                          <Avatar initials={a.i} size="sm" tint={a.c}/>
                          <span style={{fontSize:13, color:"var(--ink)"}}>{a.n}</span>
                          <span style={{color:"var(--ink-3)", cursor:"pointer", marginLeft:2}}>×</span>
                        </span>
                      ))}
                      <button style={{
                        display:"inline-flex", alignItems:"center", gap:6,
                        padding:"6px 12px", background:"transparent",
                        border:"1px dashed var(--hairline-2)", borderRadius:999,
                        fontFamily:"var(--font-sans)", fontSize:12, color:"var(--ink-3)",
                        cursor:"pointer",
                      }}>+ Attribuer</button>
                    </div>
                  )}
                  {r.picker && (
                    <div style={{marginTop:12}}>
                      <ContactPickerField
                        chips={[]}
                        open
                        suggestionGroups={[
                          { dept:"Pastoral", color: DEPT_COLORS.PASTORAL, people:[
                            { name:"L. Vicuna",   initials:"LV", role:"Pasteur" },
                            { name:"Élisha M.",   initials:"EM", role:"Diacre", selected:true },
                          ]},
                          { dept:"MIFEM", color: DEPT_COLORS.MIFEM, people:[
                            { name:"Soeur Ketsia", initials:"KS", role:"Directrice" },
                            { name:"Lydia M.",     initials:"LM", role:"Membre" },
                          ]},
                          { dept:"JA", color: DEPT_COLORS.JA, people:[
                            { name:"Soeur Naomi",  initials:"SN", role:"Directrice JA" },
                          ]},
                        ]}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right rail — preview */}
          <div>
            <Eyebrow>Aperçu public</Eyebrow>
            <p style={{marginTop:6, fontSize:12, color:"var(--ink-3)"}}>Ce que verra la congrégation après publication.</p>

            <div style={{marginTop:18, background:"var(--parchment)", border:"1px solid var(--hairline)", borderRadius:6, padding:"24px"}}>
              <Eyebrow tone="gilt">Ce Sabbat</Eyebrow>
              <div style={{fontFamily:"var(--font-display)", fontSize:30, color:"var(--ink)", marginTop:10, lineHeight:1.05}}>
                Sainte-Cène
              </div>
              <hr className="rule" style={{margin:"16px 0"}}/>
              <div style={{display:"flex", alignItems:"center", gap:12}}>
                <Avatar initials="LV" size="sm" tint="var(--moss)"/>
                <div>
                  <div style={{fontFamily:"var(--font-display)", fontSize:14, color:"var(--ink)"}}>L. Vicuna</div>
                  <div className="eyebrow">Pastoral</div>
                </div>
              </div>
              <hr className="rule" style={{margin:"16px 0"}}/>
              <div className="eyebrow">23 mai · 10 h 00 – 11 h 30</div>
              <div style={{marginTop:6}}><Tag tone="gilt">Sainte-cène</Tag></div>
            </div>

            <hr className="rule" style={{margin:"32px 0"}}/>
            <Eyebrow>Vérification</Eyebrow>
            <div style={{marginTop:14, display:"flex", flexDirection:"column", gap:10}}>
              {[
                {ok:true,  l:"Modèle appliqué"},
                {ok:true,  l:"Date et horaire définis"},
                {ok:false, l:"Rôle « Annonces » non pourvu"},
                {ok:true,  l:"Note publique rédigée"},
              ].map((c, i) => (
                <div key={i} style={{display:"flex", alignItems:"center", gap:10, fontSize:13, color: c.ok ? "var(--ink-2)" : "var(--gaps)"}}>
                  <span style={{display:"inline-flex", alignItems:"center", justifyContent:"center", width:18, height:18, borderRadius:"50%", border:"1px solid " + (c.ok ? "var(--staffed)" : "var(--gaps)"), color: c.ok ? "var(--staffed)" : "var(--gaps)", fontSize:11}}>{c.ok ? "✓" : "!"}</span>
                  {c.l}
                </div>
              ))}
            </div>

            <hr className="rule" style={{margin:"32px 0 24px"}}/>
            <div style={{display:"flex", gap:12}}>
              <Btn kind="primary">Continuer →</Btn>
              <Btn kind="ghost" size="sm">Sauvegarder</Btn>
            </div>
            <p style={{marginTop:14, fontSize:12, color:"var(--ink-3)"}}>Étape suivante · attribution des rôles restants.</p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

Object.assign(window, {
  SignInScreen,
  AuthDashboardDesktop, AuthDashboardMobile,
  AuthMobileMenuOpen, ADMIN_USER, VIEWER_USER,
  DepartmentDetail, ActivityCreate,
});
