// ============================================================
// SDAC — Main app — rail navigation + screens
// ============================================================

const SCREENS = [
  { section: "Direction", id: "system",   label: "Design system" },

  { section: "Public",    id: "home",     label: "Accueil",    dual: true },
  { section: "Public",    id: "calendar", label: "Calendrier", dual: true },
  { section: "Public",    id: "menu",     label: "Menu · mobile" },

  { section: "Auth",      id: "signin",   label: "Connexion",  dual: true },
  { section: "Auth",      id: "dashboard",label: "Tableau de bord · membre", dual: true },
  { section: "Auth",      id: "auth-menu",label: "Menu · mobile" },
  { section: "Auth",      id: "department", label: "Département · admin" },
  { section: "Auth",      id: "activity",  label: "Créer une activité · admin" },
];

function App() {
  const [active, setActive] = useState("system");

  const goto = (id) => setActive(id);

  // Group rail items
  const sections = ["Direction", "Public", "Auth"];

  return (
    <div className="workspace">
      <aside className="rail">
        <div className="rail-brand">
          <div className="word">SDAC · Saint-Hubert</div>
          <div className="sub">Redesign · v01</div>
        </div>

        {sections.map(sec => (
          <div key={sec}>
            <div className="rail-section">{sec}</div>
            {SCREENS.filter(s => s.section === sec).map(s => (
              <div key={s.id}
                className={"rail-item" + (active === s.id ? " active" : "")}
                onClick={() => setActive(s.id)}>
                <span className="dot"/>
                <span style={{flex:1}}>{s.label}</span>
                {s.dual && <span style={{fontFamily:"var(--font-mono)", fontSize:9, color:"#5A5240", letterSpacing:"0.12em"}}>D · M</span>}
              </div>
            ))}
          </div>
        ))}

        <div style={{flex:1}}/>

        <div style={{padding:"16px 24px", borderTop:"1px solid #3A332A", fontFamily:"var(--font-mono)", fontSize:10, color:"#5A5240", letterSpacing:"0.14em", textTransform:"uppercase", lineHeight:1.7}}>
          Reverent &amp; timeless<br/>
          Parchment · Ink · Gilt
        </div>
      </aside>

      <main className="stage">
        <ScreenStage active={active} goto={goto}/>
      </main>
    </div>
  );
}

function ScreenStage({ active, goto }) {
  const screen = SCREENS.find(s => s.id === active);

  // Design system tab is full-width, its own container
  if (active === "system") {
    return <DesignSystem/>;
  }

  // Sign-in is shown twice, no PublicTopNav contained
  if (active === "signin") {
    return (
      <>
        <Header title="Connexion" sub="Authentification · Google OAuth + courriel-mot de passe"/>
        <div className="dual">
          <div className="dual-col desktop">
            <div className="frame-label">Desktop · 1280 × 880</div>
            <DesktopChrome url="saint-hubert.qc/connexion">
              <SignInScreen/>
            </DesktopChrome>
          </div>
          <div className="dual-col mobile">
            <div className="frame-label">Mobile · 390 × 780</div>
            <PhoneChrome>
              <SignInScreen mobile/>
            </PhoneChrome>
          </div>
        </div>
      </>
    );
  }

  // Home
  if (active === "home") {
    return (
      <>
        <Header title="Accueil — dashboard public" sub="L'écran que voit la congrégation. La plus grande surface d'attention de l'app."/>
        <div className="dual">
          <div className="dual-col desktop">
            <div className="frame-label">Desktop · 1280 × 880</div>
            <DesktopChrome url="saint-hubert.qc/">
              <PublicHomeDesktop onNav={goto}/>
            </DesktopChrome>
          </div>
          <div className="dual-col mobile">
            <div className="frame-label">Mobile · 390 × 780</div>
            <PhoneChrome>
              <PublicHomeMobile onNav={goto}/>
            </PhoneChrome>
          </div>
        </div>
      </>
    );
  }

  // Calendar
  if (active === "calendar") {
    return (
      <>
        <Header title="Calendrier public" sub="Sunday-first, comme le veut la tradition adventiste. La sainte-cène est mise en évidence dans le wash gilt."/>
        <div className="dual">
          <div className="dual-col desktop">
            <div className="frame-label">Desktop · 1280 × 880</div>
            <DesktopChrome url="saint-hubert.qc/calendrier">
              <PublicCalendarDesktop onNav={goto}/>
            </DesktopChrome>
          </div>
          <div className="dual-col mobile">
            <div className="frame-label">Mobile · 390 × 780</div>
            <PhoneChrome>
              <PublicCalendarMobile onNav={goto}/>
            </PhoneChrome>
          </div>
        </div>
      </>
    );
  }

  // Auth dashboard
  if (active === "dashboard") {
    return (
      <>
        <Header title="Tableau de bord · membre (Marie Claire · Diaconnat)" sub="Vue post-connexion. La vocabulaire opérationnelle (« Centre de commande », « Registre personnel ») est remplacée par un langage humain."/>
        <div className="dual">
          <div className="dual-col desktop">
            <div className="frame-label">Desktop · 1280 × 880</div>
            <DesktopChrome url="saint-hubert.qc/tableau">
              <AuthDashboardDesktop onNav={goto}/>
            </DesktopChrome>
          </div>
          <div className="dual-col mobile">
            <div className="frame-label">Mobile · 390 × 780</div>
            <PhoneChrome>
              <AuthDashboardMobile/>
            </PhoneChrome>
          </div>
        </div>
      </>
    );
  }

  if (active === "menu") {
    return (
      <>
        <Header title="Menu mobile · public" sub="L'état ouvert du tiroir mobile pour les visiteurs anonymes. Burger à gauche, fermeture en X au même endroit."/>
        <div className="dual">
          <div className="dual-col mobile">
            <div className="frame-label">Fermé · burger gauche</div>
            <PhoneChrome>
              <PublicHomeMobile onNav={goto}/>
            </PhoneChrome>
          </div>
          <div className="dual-col mobile">
            <div className="frame-label">Ouvert · tiroir</div>
            <PhoneChrome>
              <PublicMobileMenuOpen onClose={()=>{}}/>
            </PhoneChrome>
          </div>
        </div>
      </>
    );
  }

  if (active === "auth-menu") {
    return (
      <>
        <Header title="Menu mobile · connecté (Marie Claire)" sub="Le tiroir pour les utilisateurs authentifiés. Identité utilisateur en haut, navigation typographique, administration en gilt pour les admins."/>
        <div className="dual">
          <div className="dual-col mobile">
            <div className="frame-label">Fermé · burger gauche</div>
            <PhoneChrome>
              <AuthDashboardMobile/>
            </PhoneChrome>
          </div>
          <div className="dual-col mobile">
            <div className="frame-label">Ouvert · viewer</div>
            <PhoneChrome>
              <AuthMobileMenuOpen user={VIEWER_USER} active="dashboard" onClose={()=>{}}/>
            </PhoneChrome>
          </div>
          <div className="dual-col mobile">
            <div className="frame-label">Ouvert · admin</div>
            <PhoneChrome>
              <AuthMobileMenuOpen user={ADMIN_USER} active="admin-activities" onClose={()=>{}}/>
            </PhoneChrome>
          </div>
        </div>
      </>
    );
  }

  if (active === "department") {
    return (
      <>
        <Header title="Département · admin (Soeur Ketsia · MIFEM)" sub="Vue scopée à un département pour son admin. Statistiques en chiffres romains, statut des rôles en gilt/ambre."/>
        <div className="dual">
          <div className="dual-col desktop" style={{minWidth:0, width:"100%"}}>
            <div className="frame-label">Desktop · 1280 × 880</div>
            <DesktopChrome url="saint-hubert.qc/admin/departements/mifem">
              <DepartmentDetail onNav={goto}/>
            </DesktopChrome>
          </div>
        </div>
      </>
    );
  }

  if (active === "activity") {
    return (
      <>
        <Header title="Créer une activité · admin" sub="Le flux critique. Le modèle (« Culte du sabbat ») fait 80% du travail; l'admin confirme et ajuste."/>
        <div className="dual">
          <div className="dual-col desktop" style={{minWidth:0, width:"100%"}}>
            <div className="frame-label">Desktop · 1280 × 880</div>
            <DesktopChrome url="saint-hubert.qc/admin/activites/nouvelle">
              <ActivityCreate onNav={goto}/>
            </DesktopChrome>
          </div>
        </div>
      </>
    );
  }

  return <div style={{color:"#8E8267"}}>Not found.</div>;
}

function Header({ title, sub }) {
  return (
    <div style={{maxWidth:1400, margin:"0 auto 40px"}}>
      <div className="stage-title">{title}</div>
      <div className="stage-sub">{sub}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
