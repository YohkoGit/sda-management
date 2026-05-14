// ============================================================
// SDAC — Design System tab
// ============================================================

function DesignSystem() {
  return (
    <div style={{maxWidth:1200, margin:"0 auto", color:"#E8DFC9"}}>
      <div style={{marginBottom:48}}>
        <div className="eyebrow" style={{color:"#8E8267"}}>00 · Direction</div>
        <h1 style={{fontFamily:"var(--font-display)", fontWeight:400, fontSize:64, color:"#F0E6CC", letterSpacing:"-0.02em", lineHeight:1, marginTop:14}}>
          Reverent &amp; timeless<span style={{color:"var(--gilt)"}}>.</span>
        </h1>
        <p style={{maxWidth:"60ch", color:"#A89878", marginTop:16, fontSize:15, lineHeight:1.6}}>
          A church bulletin made digital. Type does the work; rules replace boxes; gilt is used the way good printers use spot colour — once or twice per page. The authenticated layer drops the operational vocabulary and adopts the same dignified register, just denser.
        </p>
      </div>

      {/* ==== Section: Colour ==== */}
      <DSSection n="01" eyebrow="Foundation" title="Colour">
        <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:24}}>
          <Swatch name="Parchment"   hex="#FAF8F2" role="Background" light />
          <Swatch name="Parchment 2" hex="#F4EFE2" role="Cards & wash" light />
          <Swatch name="Hairline"    hex="#E2D9C2" role="Rules & borders" light />
          <Swatch name="Ink"         hex="#1B2530" role="Type, structure" />
          <Swatch name="Ink 2"       hex="#2F3D4A" role="Secondary type" />
          <Swatch name="Ink 3"       hex="#5A6976" role="Captions" />
          <Swatch name="Gilt"        hex="#B89146" role="Accent · sparing" />
          <Swatch name="Gilt soft"   hex="#E8D9B0" role="Backgrounds, tags" light />
        </div>
        <div style={{marginTop:32}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:14}}>
            <div className="eyebrow" style={{color:"#8E8267"}}>Department palette · 24 tokens</div>
            <div className="eyebrow" style={{color:"#8E8267"}}>All at L 0.45 C 0.07 · varying hue only</div>
          </div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(12, 1fr)", gap:10}}>
            {Array.from({length:24}, (_, i) => i + 1).map(n => {
              const token = "--dept-" + String(n).padStart(2, "0");
              return (
                <div key={n} style={{display:"flex", flexDirection:"column", alignItems:"center", gap:8}}>
                  <span style={{width:40, height:40, borderRadius:"50%", background:`var(${token})`}}/>
                  <span style={{fontFamily:"var(--font-mono)", fontSize:9, color:"#8E8267", letterSpacing:"0.06em"}}>{String(n).padStart(2, "0")}</span>
                </div>
              );
            })}
          </div>

          <div style={{marginTop:36, padding:"28px 32px", background:"var(--parchment)", borderRadius:8, color:"var(--ink)"}}>
            <div className="eyebrow">Admin · choisir une couleur</div>
            <p style={{fontSize:13, color:"var(--ink-3)", marginTop:6, maxWidth:"56ch", lineHeight:1.55}}>
              La couleur est l'identificateur secondaire — l'abréviation (DIACONNAT, MIFEM…) fait le travail principal. Le système suggère la prochaine couleur libre par défaut.
            </p>
            <div style={{marginTop:18, display:"grid", gridTemplateColumns:"repeat(12, 1fr)", gap:8}}>
              {Array.from({length:24}, (_, i) => i + 1).map(n => {
                const used = [4, 8, 13, 17, 20].includes(n);
                const selected = n === 7;
                return (
                  <button key={n} style={{
                    width:36, height:36, borderRadius:"50%", padding:0,
                    background:`var(--dept-${String(n).padStart(2,"0")})`,
                    border: selected ? "2px solid var(--ink)" : used ? "1px solid var(--hairline-2)" : "1px solid transparent",
                    boxShadow: selected ? "0 0 0 3px var(--parchment), 0 0 0 4px var(--gilt)" : "none",
                    opacity: used && !selected ? 0.35 : 1,
                    cursor:"pointer", position:"relative",
                  }} title={used ? `Utilisée par un département` : `Disponible`}>
                    {selected && <span style={{color:"var(--parchment)", fontFamily:"var(--font-mono)", fontSize:14}}>✓</span>}
                  </button>
                );
              })}
            </div>
            <div style={{marginTop:14, display:"flex", justifyContent:"space-between", fontFamily:"var(--font-mono)", fontSize:10, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--ink-3)"}}>
              <span>● Sélectionnée · token 07</span>
              <span>○ Déjà utilisée · 5 départements · réutilisable</span>
            </div>
          </div>
        </div>
      </DSSection>

      {/* ==== Section: Type ==== */}
      <DSSection n="02" eyebrow="Foundation" title="Typography">
        <div style={{background:"var(--parchment)", color:"var(--ink)", padding:48, borderRadius:8}}>
          <div className="eyebrow" style={{color:"var(--gilt-2)"}}>Display · Spectral</div>
          <h2 style={{fontFamily:"var(--font-display)", fontWeight:400, fontSize:84, lineHeight:1, letterSpacing:"-0.025em", marginTop:14}}>
            Pasteur Vicuna prêche<br/>
            <em style={{fontWeight:400, color:"var(--ink-2)"}}>ce Sabbat à dix heures.</em>
          </h2>
          <hr className="rule" style={{margin:"32px 0"}}/>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:48}}>
            <div>
              <div className="eyebrow">Body · IBM Plex Sans</div>
              <p style={{fontSize:15, lineHeight:1.65, color:"var(--ink-2)", marginTop:12, maxWidth:"42ch"}}>
                Bienvenue dans la famille spirituelle de Saint-Hubert. Joignez-vous à nous chaque sabbat pour adorer ensemble — au sanctuaire ou en ligne. Les portes ouvrent à 9 h 30; l'école du sabbat commence à 9 h 45.
              </p>
              <p style={{fontSize:13, lineHeight:1.6, color:"var(--ink-3)", marginTop:14, maxWidth:"42ch"}}>
                Smaller type is set in the same family at 13 px with a slightly looser leading. Long-form copy carries the warmth of the church bulletin.
              </p>
            </div>
            <div>
              <div className="eyebrow">Mono · IBM Plex Mono</div>
              <div style={{fontFamily:"var(--font-mono)", fontSize:11, letterSpacing:"0.18em", textTransform:"uppercase", marginTop:14, lineHeight:2.1, color:"var(--ink-3)"}}>
                Samedi · 23 mai 2026<br/>
                10 h 00 – 11 h 30<br/>
                Sanctuaire principal<br/>
                Prédicateur · L. Vicuna
              </div>
            </div>
          </div>
          <hr className="rule" style={{margin:"32px 0"}}/>
          <div className="eyebrow" style={{color:"var(--ink-3)"}}>Scale</div>
          <div style={{marginTop:14, display:"flex", flexDirection:"column", gap:8}}>
            {[
              {l:"Display XL", s:84,  family:"display", weight:400, sample:"Aa"},
              {l:"Display L",  s:56,  family:"display", weight:400, sample:"Aa"},
              {l:"Display M",  s:38,  family:"display", weight:400, sample:"Aa"},
              {l:"Display S",  s:26,  family:"display", weight:500, sample:"Aa"},
              {l:"Body L",     s:17,  family:"sans",    weight:400, sample:"Le corps"},
              {l:"Body",       s:14,  family:"sans",    weight:400, sample:"Le corps"},
              {l:"Body S",     s:13,  family:"sans",    weight:400, sample:"Le corps"},
              {l:"Mono · meta",s:11,  family:"mono",    weight:500, sample:"10 H 00"},
            ].map(row => (
              <div key={row.l} style={{display:"grid", gridTemplateColumns:"160px 1fr 80px", gap:24, alignItems:"baseline", paddingBottom:8, borderBottom:"1px solid var(--hairline)"}}>
                <div style={{fontFamily:"var(--font-mono)", fontSize:10, color:"var(--ink-3)", letterSpacing:"0.12em", textTransform:"uppercase"}}>{row.l}</div>
                <div style={{fontFamily: row.family === "display" ? "var(--font-display)" : row.family === "mono" ? "var(--font-mono)" : "var(--font-sans)", fontSize:row.s, fontWeight:row.weight, letterSpacing: row.family==="mono" ? "0.18em" : "-0.01em", textTransform: row.family==="mono" ? "uppercase" : "none"}}>
                  {row.sample}
                </div>
                <div style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--ink-3)"}}>{row.s} px</div>
              </div>
            ))}
          </div>
        </div>
      </DSSection>

      {/* ==== Section: Composition ==== */}
      <DSSection n="03" eyebrow="System" title="Composition principles">
        <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:24}}>
          <Principle n="i" title="Rules over boxes">
            <div style={{background:"var(--parchment)", padding:24, borderRadius:6}}>
              <div className="eyebrow">23 mai · samedi</div>
              <div style={{fontFamily:"var(--font-display)", fontSize:22, color:"var(--ink)", marginTop:8}}>Pasteur Vicuna</div>
              <hr className="rule" style={{margin:"14px 0"}}/>
              <div className="eyebrow">24 mai · dimanche</div>
              <div style={{fontFamily:"var(--font-display)", fontSize:22, color:"var(--ink)", marginTop:8}}>École du sabbat</div>
            </div>
          </Principle>
          <Principle n="ii" title="Numerated rhythm">
            <div style={{background:"var(--parchment)", padding:24, borderRadius:6, color:"var(--ink)"}}>
              <div style={{display:"flex", gap:16, alignItems:"baseline"}}>
                <span style={{fontFamily:"var(--font-mono)", color:"var(--gilt-2)", fontSize:12, letterSpacing:"0.12em"}}>I.</span>
                <span style={{fontFamily:"var(--font-display)", fontSize:18}}>Ouverture</span>
              </div>
              <div style={{display:"flex", gap:16, alignItems:"baseline", marginTop:10}}>
                <span style={{fontFamily:"var(--font-mono)", color:"var(--gilt-2)", fontSize:12, letterSpacing:"0.12em"}}>II.</span>
                <span style={{fontFamily:"var(--font-display)", fontSize:18}}>Cantique communautaire</span>
              </div>
              <div style={{display:"flex", gap:16, alignItems:"baseline", marginTop:10}}>
                <span style={{fontFamily:"var(--font-mono)", color:"var(--gilt-2)", fontSize:12, letterSpacing:"0.12em"}}>III.</span>
                <span style={{fontFamily:"var(--font-display)", fontSize:18}}>Sermon</span>
              </div>
            </div>
          </Principle>
          <Principle n="iii" title="Gilt is the spot colour">
            <div style={{background:"var(--parchment)", padding:24, borderRadius:6, color:"var(--ink)"}}>
              <div className="eyebrow eyebrow-gilt">Ce Sabbat</div>
              <div style={{fontFamily:"var(--font-display)", fontSize:30, marginTop:10, lineHeight:1.1}}>
                Sainte-Cène<br/><em style={{color:"var(--ink-3)"}}>communion</em>
              </div>
              <hr className="rule" style={{margin:"14px 0"}}/>
              <div style={{display:"flex", justifyContent:"space-between"}}>
                <span className="eyebrow">10 h 00</span>
                <span className="eyebrow eyebrow-gilt">Sanctuaire</span>
              </div>
            </div>
          </Principle>
        </div>
      </DSSection>

      {/* ==== Section: Components ==== */}
      <DSSection n="04" eyebrow="System" title="Core elements">
        <div style={{background:"var(--parchment)", padding:48, borderRadius:8, color:"var(--ink)"}}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:48}}>
            <div>
              <div className="eyebrow" style={{marginBottom:14}}>Buttons</div>
              <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
                <Btn kind="primary">Se connecter</Btn>
                <Btn kind="ghost">Calendrier</Btn>
                <Btn kind="gilt">Voir le programme</Btn>
              </div>
              <div className="eyebrow" style={{marginTop:32, marginBottom:14}}>Eyebrows · numerated</div>
              <Eyebrow n={1}>Ce sabbat</Eyebrow>
              <div style={{marginTop:10}}><Eyebrow tone="gilt" n={2}>Sainte-cène</Eyebrow></div>
              <div className="eyebrow" style={{marginTop:32, marginBottom:14}}>Live indicator</div>
              <Live label="En direct · 142 spectateurs"/>
            </div>
            <div>
              <div className="eyebrow" style={{marginBottom:14}}>Tags</div>
              <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                <Tag>Diaconnat</Tag>
                <Tag tone="gilt">Sainte-cène</Tag>
                <Tag>MIFEM</Tag>
              </div>
              <div className="eyebrow" style={{marginTop:32, marginBottom:14}}>Avatars · with name</div>
              <div style={{display:"flex", gap:12, alignItems:"center"}}>
                <Avatar initials="LV" size="lg" tint="var(--moss)"/>
                <div>
                  <div style={{fontFamily:"var(--font-display)", fontSize:18}}>Pasteur Vicuna</div>
                  <div className="eyebrow">Pastoral · prédicateur</div>
                </div>
              </div>
              <div className="eyebrow" style={{marginTop:32, marginBottom:14}}>Department row</div>
              <div style={{display:"flex", alignItems:"center", gap:14, paddingTop:10, paddingBottom:10, borderTop:"1px solid var(--hairline)", borderBottom:"1px solid var(--hairline)"}}>
                <span style={{fontFamily:"var(--font-mono)", color:"var(--ink-3)", fontSize:11}}>04</span>
                <DeptSwatch color={DEPT_COLORS.JA}/>
                <span style={{fontFamily:"var(--font-display)", fontSize:18, flex:1}}>Jeunesse Adventiste</span>
                <Tag>JA</Tag>
                <span className="eyebrow">9 actifs</span>
              </div>
            </div>
          </div>
        </div>
      </DSSection>

      {/* ==== Section: Motion ==== */}
      <DSSection n="05" eyebrow="System" title="Motion">
        <div style={{background:"var(--parchment)", padding:48, borderRadius:8, color:"var(--ink)"}}>
          <p style={{fontSize:15, lineHeight:1.6, color:"var(--ink-2)", maxWidth:"56ch"}}>
            Reverent never bounces. The motion language is measured slow-out easing, modest durations, opacity + transform — never jarring layout shifts. Drawers and popovers feel like a page turning in a hymnal, not an app reacting.
          </p>

          <hr className="rule" style={{margin:"32px 0 24px"}}/>

          <div className="eyebrow" style={{marginBottom:14}}>Tokens</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:24}}>
            <div>
              <table style={{width:"100%", fontFamily:"var(--font-mono)", fontSize:12, color:"var(--ink-2)"}}>
                <tbody>
                  {[
                    ["--dur-instant", "80ms",  "Button color shift"],
                    ["--dur-fast",    "150ms", "Hover, focus, popover"],
                    ["--dur",         "240ms", "Drawer, toast, dialog"],
                    ["--dur-slow",    "360ms", "Page entry, hero rise"],
                  ].map(([k, v, use]) => (
                    <tr key={k}>
                      <td style={{padding:"8px 0", borderBottom:"1px solid var(--hairline)", color:"var(--gilt-2)"}}>{k}</td>
                      <td style={{padding:"8px 0", borderBottom:"1px solid var(--hairline)", textAlign:"right"}}>{v}</td>
                      <td style={{padding:"8px 0 8px 16px", borderBottom:"1px solid var(--hairline)", color:"var(--ink-3)", fontSize:11}}>{use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <table style={{width:"100%", fontFamily:"var(--font-mono)", fontSize:12, color:"var(--ink-2)"}}>
                <tbody>
                  {[
                    ["--ease",     "cubic-bezier(0.4, 0.2, 0.2, 1)", "General"],
                    ["--ease-out", "cubic-bezier(0, 0, 0.2, 1)",     "Entries · slow-out"],
                    ["--ease-in",  "cubic-bezier(0.4, 0, 1, 1)",     "Exits"],
                  ].map(([k, v, use]) => (
                    <tr key={k}>
                      <td style={{padding:"8px 0", borderBottom:"1px solid var(--hairline)", color:"var(--gilt-2)", whiteSpace:"nowrap"}}>{k}</td>
                      <td style={{padding:"8px 0 8px 16px", borderBottom:"1px solid var(--hairline)", color:"var(--ink-3)", fontSize:10, textAlign:"right"}}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{marginTop:14, fontSize:12, color:"var(--ink-3)", lineHeight:1.5}}>
                Always favour <code style={{fontFamily:"var(--font-mono)", color:"var(--ink)"}}>--ease-out</code> for entries; the user feels the element settling into place.
              </div>
            </div>
          </div>

          <hr className="rule" style={{margin:"40px 0 28px"}}/>

          <div className="eyebrow" style={{marginBottom:24}}>Animations</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:32}}>
            <MotionDemo title="Drawer · slide" desc="Mobile menu opens. 240ms slow-out from left." cls="anim-drawer-in"/>
            <MotionDemo title="Popover · lift" desc="Date picker, contact picker. 150ms with subtle scale." cls="anim-popover-in"/>
            <MotionDemo title="Toast · rise" desc="« Publié » confirmation. 240ms slide-up." cls="anim-toast-in"/>
            <MotionDemo title="Content rise" desc="Hero on first paint. 360ms fade-up. Use sparingly." cls="anim-rise"/>
          </div>

          <hr className="rule" style={{margin:"40px 0 24px"}}/>

          <div className="eyebrow" style={{marginBottom:14}}>Principles</div>
          <div style={{display:"grid", gridTemplateColumns:"repeat(2, 1fr)", gap:32}}>
            <Principle n="i" title="Never bounce">
              <p style={{fontSize:13, color:"var(--ink-2)", lineHeight:1.6}}>No spring physics, no overshoot. The hymnal page does not bounce when it turns. Reverence comes from measure.</p>
            </Principle>
            <Principle n="ii" title="Transform, not layout">
              <p style={{fontSize:13, color:"var(--ink-2)", lineHeight:1.6}}>Animate opacity and transform only. Never animate <code>width</code>, <code>height</code>, or <code>top/left</code> — they trigger layout and feel cheap.</p>
            </Principle>
            <Principle n="iii" title="Respect the user">
              <p style={{fontSize:13, color:"var(--ink-2)", lineHeight:1.6}}>Every animation honours <code>prefers-reduced-motion</code>. The CSS already collapses durations to 0.01ms — no per-component code needed.</p>
            </Principle>
            <Principle n="iv" title="One thing at a time">
              <p style={{fontSize:13, color:"var(--ink-2)", lineHeight:1.6}}>Never stagger more than two elements. Never animate a list of cards in. The page already feels alive through typography — don't overdecorate with motion.</p>
            </Principle>
          </div>
        </div>
      </DSSection>
      <DSSection n="06" eyebrow="System" title="Fields & pickers">
        <div style={{background:"var(--parchment)", padding:48, borderRadius:8, color:"var(--ink)"}}>
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:48}}>
            <div style={{display:"flex", flexDirection:"column", gap:24}}>
              <div className="eyebrow">Text · with leading</div>
              <Field label="Référence interne">
                <TextField defaultValue="Culte du sabbat" leading="ACT-0042"/>
              </Field>
              <Field label="Titre" hint="Le titre apparaît tel quel sur la page publique.">
                <TextField defaultValue="Sainte-Cène · communion mensuelle" display/>
              </Field>

              <div className="eyebrow" style={{marginTop:12}}>Date · ouvert</div>
              <DateField label="Date" value="Samedi 23 mai 2026" open/>
            </div>

            <div style={{display:"flex", flexDirection:"column", gap:24}}>
              <div className="eyebrow">Heure · ouvert</div>
              <TimeField label="Début" value="10 h 00" open/>

              <div className="eyebrow" style={{marginTop:12}}>Département · sélecteur</div>
              <DeptField label="Département" value="Pastoral" swatch={DEPT_COLORS.PASTORAL}/>

              <div className="eyebrow" style={{marginTop:12}}>Pill · choix unique</div>
              <TagPicker label="Caractère"
                value="Sainte-cène"
                options={["Standard","Sainte-cène","Baptême","Spécial"]}/>
            </div>
          </div>

          <hr className="rule" style={{margin:"40px 0 24px"}}/>
          <div className="eyebrow">Annuaire · sélecteur par département</div>
          <p style={{fontSize:13, color:"var(--ink-3)", marginTop:6, maxWidth:"50ch"}}>Groupé par département. Sept noms les plus probables en premier; recherche frappe-à-trouver pour les autres.</p>
          <div style={{marginTop:18, maxWidth:520}}>
            <ContactPickerField
              chips={[
                { name:"L. Vicuna",   initials:"LV", tint:"var(--moss)" },
                { name:"Marie C.",    initials:"MC", tint:"var(--moss)" },
              ]}
              open
              suggestionGroups={[
                { dept:"Pastoral", color: DEPT_COLORS.PASTORAL, people:[
                  { name:"L. Vicuna",   initials:"LV", role:"Pasteur principal", selected:true },
                ]},
                { dept:"Diaconat", color: DEPT_COLORS.DIACONNAT, people:[
                  { name:"Marie Claire", initials:"MC", role:"Diaconesse", selected:true },
                  { name:"Pauline J.",   initials:"PJ", role:"Diaconesse" },
                  { name:"Anne B.",      initials:"AB", role:"Diaconesse" },
                ]},
                { dept:"MIFEM", color: DEPT_COLORS.MIFEM, people:[
                  { name:"Soeur Ketsia", initials:"KS", role:"Directrice" },
                ]},
              ]}
            />
          </div>
        </div>
      </DSSection>
    </div>
  );
}

function DSSection({ n, eyebrow, title, children }) {
  return (
    <section style={{marginBottom:72}}>
      <div style={{display:"flex", alignItems:"flex-end", justifyContent:"space-between", marginBottom:28, paddingBottom:18, borderBottom:"1px solid #3A332A"}}>
        <div>
          <Eyebrow n={n}>{eyebrow}</Eyebrow>
          <h2 style={{fontFamily:"var(--font-display)", fontWeight:400, fontSize:42, color:"#F0E6CC", letterSpacing:"-0.015em", marginTop:10, lineHeight:1}}>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function Swatch({ name, hex, role, light }) {
  return (
    <div>
      <div style={{
        background:hex, height:96, borderRadius:6,
        border: light ? "1px solid #3A332A" : "1px solid rgba(255,255,255,0.04)",
      }}/>
      <div style={{marginTop:10}}>
        <div style={{fontFamily:"var(--font-display)", fontSize:15, color:"#E8DFC9"}}>{name}</div>
        <div style={{display:"flex", justifyContent:"space-between", marginTop:4}}>
          <span style={{fontFamily:"var(--font-mono)", fontSize:10, color:"#8E8267", letterSpacing:"0.06em"}}>{hex}</span>
          <span style={{fontFamily:"var(--font-mono)", fontSize:10, color:"#8E8267", letterSpacing:"0.06em"}}>{role}</span>
        </div>
      </div>
    </div>
  );
}

function MotionDemo({ title, desc, cls }) {
  const [key, setKey] = useState(0);
  return (
    <div>
      <div className="eyebrow" style={{color:"var(--ink)", marginBottom:10}}>{title}</div>
      <div
        onClick={()=>setKey(k=>k+1)}
        style={{
          height:120, background:"var(--parchment-2)", border:"1px solid var(--hairline)",
          borderRadius:6, cursor:"pointer", overflow:"hidden", position:"relative",
        }}>
        <div key={key} className={cls} style={{
          position:"absolute", inset:14, background:"var(--ink)", color:"var(--parchment)",
          borderRadius:4, padding:14,
          display:"flex", alignItems:"center", gap:10,
        }}>
          <div className="numerator" style={{fontSize:28, color:"var(--parchment)", fontWeight:400}}>23</div>
          <div>
            <div style={{fontFamily:"var(--font-display)", fontSize:14}}>Sainte-Cène</div>
            <div className="eyebrow" style={{color:"rgba(240,230,204,.6)"}}>10 h · sanctuaire</div>
          </div>
        </div>
        <div style={{position:"absolute", bottom:8, right:10, fontFamily:"var(--font-mono)", fontSize:9, color:"var(--ink-3)", letterSpacing:"0.14em"}}>↻ Cliquez pour relancer</div>
      </div>
      <p style={{fontSize:12, color:"var(--ink-3)", marginTop:10, lineHeight:1.5}}>{desc}</p>
    </div>
  );
}

function Principle({ n, title, children }) {
  return (
    <div>
      <div style={{display:"flex", alignItems:"baseline", gap:10}}>
        <span style={{fontFamily:"var(--font-mono)", fontSize:11, color:"var(--gilt)", letterSpacing:"0.12em"}}>{n}.</span>
        <span style={{fontFamily:"var(--font-display)", fontSize:18, color:"#E8DFC9"}}>{title}</span>
      </div>
      <div style={{marginTop:14}}>{children}</div>
    </div>
  );
}

Object.assign(window, { DesignSystem });
