// ---------- Calculator Tab ----------
function CalcTab({ clientName, setClientName, pago, setPago, scheduler, setScheduler, attendant, setAttendant, concretada, setConcretada, lines, prices, addLine, removeLine, updateLine, totals, resetCalc, saveQuote, copyMessage, canCopy }){
  const [openPickerId, setOpenPickerId] = useState(null);
  const saleSummary = useMemo(() => {
    const grams = { cadena: 0, micro: 0, italy: 0, gf18k: 0 };
    const regularGroupMap = {
      collar_pulsera_mujer_925: 'cadena',
      collar_pulsera_hombre_925: 'cadena',
      aros_colgantes_925: 'micro',
      anillos_925: 'micro',
      collar_pulsera_micro: 'micro',
      italiana_925: 'italy',
      gf_18k: 'gf18k',
    };
    const loteGroupMap = { cadena: 'cadena', micro: 'micro', italiana: 'italy', gf18k: 'gf18k' };
    let totalCost = 1000;
    const insumos = [];

    for (const line of lines) {
      if (line.category === INSUMO_KEY) {
        const cost = Number(line.insumoCost) || Number(line.insumoPrice) || 0;
        const qty = 1;
        totalCost += cost * qty;
        if (cost > 0 || line.insumoName) {
          insumos.push({
            name: line.insumoName || 'Insumo',
            cost: cost * qty,
          });
        }
        continue;
      }

      if (line.category === LOTE_KEY) {
        const loteCostMap = {
          cadena: 'collar_pulsera_mujer_925',
          micro: 'collar_pulsera_micro',
          italiana: 'italiana_925',
          gf18k: 'gf_18k',
        };
        for (const [typeKey, groupKey] of Object.entries(loteGroupMap)) {
          const g = Number((line.loteGramsMap || {})[typeKey]) || 0;
          grams[groupKey] += g;
          const cat = prices[loteCostMap[typeKey]];
          totalCost += effectiveCost(cat, totals.tier) * g;
        }
        continue;
      }

      const g = Number(line.grams) || 0;
      const groupKey = regularGroupMap[line.category];
      if (groupKey) grams[groupKey] += g;
      totalCost += effectiveCost(prices[line.category], totals.tier) * g;
    }

    return { grams, insumos, totalCost, profit: (Number(totals.total) || 0) - totalCost };
  }, [lines, prices, totals.tier, totals.total]);
  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-head">
          <h2>Detalles de <em>venta</em></h2>
          <span className="eyebrow">N.º {lines.length}</span>
        </div>
        <div className="client">
          <div className="control-labeled">
            <label>A quién le pago</label>
            <div className="control">
              <select value={pago} onChange={e => setPago(e.target.value)}>
                <option value="">—</option>
                {TEAM.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="control-labeled">
            <label>Nombre del cliente (opcional)</label>
            <div className="control">
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Ej. María Fernández"
              />
            </div>
          </div>
          <div className="control-labeled">
            <label>Agendó</label>
            <div className="control">
              <select value={scheduler} onChange={e => setScheduler(e.target.value)}>
                <option value="">—</option>
                {TEAM.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="control-labeled">
            <label>Atendió</label>
            <div className="control">
              <select value={attendant} onChange={e => setAttendant(e.target.value)}>
                <option value="">—</option>
                {TEAM.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="lines">
          {lines.map((line, i) => {
            const isInsumo = line.category === INSUMO_KEY;
            const isLote   = line.category === LOTE_KEY;
            const cat = (!isInsumo && !isLote) ? prices[line.category] : null;
            const tierPrice = cat ? cat.prices[totals.tier] : 0;
            const price = (!isInsumo && !isLote) ? (Number(line.customPrice) || 0) : tierPrice;
            const g = Number(line.grams) || 0;
            const insumoCostVal  = Number(line.insumoCost)  || Number(line.insumoPrice) || 0;
            const insumoValorVal = Number(line.insumoValor) || insumoCostVal;
            const insumoQtyVal   = 1;
            const showHighInsumoQtyWarning = false;
            const lotePriceVal   = Number(line.lotePrice)   || 0;
            const sub = isInsumo ? insumoValorVal : isLote ? lotePriceVal : price * g;
            return (
              <div className={`line${isInsumo ? ' line-insumo' : ''}`} key={line.id}>
                <span className="line-idx">N°{String(i+1).padStart(2,'0')}</span>
                {(isInsumo || isLote) ? (
                  <>
                    <div className="field line-category-field" style={{gridColumn:'1 / -1'}}>
                      <label>Categoría</label>
                      <div className="control">
                        <select value={line.category} onChange={e => updateLine(line.id, { category: e.target.value })}>
                          {CATEGORY_ORDER.map(k => (
                            <option key={k} value={k}>{prices[k].name}</option>
                          ))}
                          <option value={INSUMO_KEY}>Insumos 💎</option>
                          <option value={LOTE_KEY}>Lotes 📦</option>
                        </select>
                      </div>
                    </div>
                    {isInsumo && (
                    <div className="field insumo-name-primary" style={{gridColumn:'1 / -1'}}>
                      <label>Nombre del insumo</label>
                      <div className="control">
                        <input type="text"
                          value={line.insumoName || ''}
                          onChange={e => updateLine(line.id, { insumoName: e.target.value })}
                          placeholder="Ej. Maletero, Caja, etc."
                          style={{paddingRight:0}}
                        />
                        <span className="unit">ðŸ’Ž</span>
                      </div>
                    </div>
                    )}
                    {isInsumo && (
                    <div className="field insumo-cost-field">
                      <label>Costo producto</label>
                      <div className="control">
                        <span className="unit" style={{marginLeft:0,marginRight:6}}>$</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min="0"
                          value={line.insumoCost || ''}
                          onChange={e => updateLine(line.id, { insumoCost: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    )}
                    {isInsumo ? (
                      <>
                        <div className="field insumo-qty-field">
                          <label>Cantidad</label>
                          <div className="control">
                            <input type="number" inputMode="numeric" min="1"
                              value={line.insumoQty || ''}
                              onChange={e => updateLine(line.id, { insumoQty: e.target.value })}
                              placeholder="1"
                            />
                            <span className="unit">un.</span>
                          </div>
                        </div>
                        <button className="remove" onClick={() => removeLine(line.id)} aria-label="Eliminar línea" disabled={lines.length === 1}>
                          <Icon name="x" size={14}/>
                        </button>
                        <div className="field insumo-value-field">
                          <label>Precio de venta</label>
                          <div className="control">
                            <span className="unit" style={{marginLeft:0,marginRight:6}}>$</span>
                            <input type="number" inputMode="numeric" min="0"
                              value={line.insumoValor || ''}
                              onChange={e => updateLine(line.id, { insumoValor: e.target.value })}
                              placeholder="0"
                            />
                          </div>
                        </div>
                        <div className="field insumo-name-old" style={{gridColumn:'1 / -1'}}>
                          <label>Nombre del insumo</label>
                          <div className="control">
                            <input type="text"
                              value={line.insumoName || ''}
                              onChange={e => updateLine(line.id, { insumoName: e.target.value })}
                              placeholder="Ej. Maletero, Caja, etc."
                            />
                            <span className="unit">💎</span>
                          </div>
                        </div>
                        {showHighInsumoQtyWarning && (
                          <div className="insumo-note insumo-note-warning" style={{gridColumn:'1 / -1'}}>
                            Revisa si estas ingresando unidades sueltas. Para paquetes de 50/100 bolsas, normalmente va cantidad 1.
                          </div>
                        )}
                        <div className="insumo-note" style={{gridColumn:'1 / -1'}}>
                          Para bolsas/paquetes: usa cantidad 1, costo total del paquete y valor de venta total.
                        </div>
                      </>
                    ) : (
                      <>
                        <button className="remove" style={{gridColumn:'3'}} onClick={() => removeLine(line.id)} aria-label="Eliminar línea" disabled={lines.length === 1}>
                          <Icon name="x" size={14}/>
                        </button>
                        <div style={{gridColumn:'1 / -1', display:'flex', flexDirection:'column', gap:6}}>
                          <div className="field">
                            <label>Nombre del lote</label>
                            <div className="control">
                              <input type="text"
                                value={line.loteName || ''}
                                onChange={e => updateLine(line.id, { loteName: e.target.value })}
                                placeholder="Ej. Lote 1, Navidad, etc."
                              />
                              <span className="unit">📦</span>
                            </div>
                          </div>
                          {LOTE_TYPES.map(t => (
                            <div key={t.key} style={{display:'grid', gridTemplateColumns:'90px 1fr', gap:6, alignItems:'center'}}>
                              <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 10px',background:'rgba(var(--surface-overlay-rgb),.4)',border:'1px solid var(--line)',borderRadius:8,fontFamily:'var(--mono)',fontSize:12,fontWeight:600,color:'var(--gold-2)',whiteSpace:'nowrap'}}>
                                <span>{t.emoji}</span><span>{t.label}</span>
                              </div>
                              <div className="control" style={{minHeight:40}}>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={(line.loteGramsMap || {})[t.key] || ''}
                                  onChange={e => updateLine(line.id, { loteGramsMap: { ...(line.loteGramsMap||{}), [t.key]: e.target.value.replace(',', '.') } })}
                                  placeholder="0"
                                  style={{fontSize:13}}
                                />
                                <span className="unit">g</span>
                              </div>
                            </div>
                          ))}
                          <div className="field" style={{marginTop:2}}>
                            <label>Precio</label>
                            <div className="control">
                              <span className="unit" style={{marginLeft:0,marginRight:4}}>$</span>
                              <input type="number" inputMode="numeric" min="0"
                                value={line.lotePrice || ''}
                                onChange={e => updateLine(line.id, { lotePrice: e.target.value })}
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="field">
                      <label>Categoría</label>
                      <div className="control">
                        <select value={line.category} onChange={e => updateLine(line.id, { category: e.target.value })}>
                          {CATEGORY_ORDER.map(k => (
                            <option key={k} value={k}>{prices[k].name}</option>
                          ))}
                          <option value={INSUMO_KEY}>Insumos 💎</option>
                          <option value={LOTE_KEY}>Lotes 📦</option>
                        </select>
                      </div>
                    </div>
                    <div className="field">
                      <label>Gramaje</label>
                      <div className="control">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={line.grams}
                          onChange={e => updateLine(line.id, { grams: e.target.value.replace(',', '.') })}
                          placeholder="0"
                        />
                        <span className="unit">g</span>
                      </div>
                    </div>
                    <button className="remove" onClick={() => removeLine(line.id)} aria-label="Eliminar línea" disabled={lines.length === 1}>
                      <Icon name="x" size={14}/>
                    </button>
                  </>
                )}
                {!isInsumo && !isLote && (
                  <div className="field custom-price-field" style={{gridColumn:'1 / -1',marginTop:2}}>
                    <label>Precio a cobrar</label>
                    <div className="control">
                      <span className="unit" style={{marginLeft:0,marginRight:6}}>$</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={line.customPrice || ''}
                        onChange={e => updateLine(line.id, { customPrice: e.target.value })}
                        placeholder="Precio por gramo"
                      />
                      <span className="unit">CLP/g</span>
                    </div>
                  </div>
                )}
                {!isInsumo && !isLote && (
                  <div className="legacy-price-table" style={{gridColumn:'1 / -1',marginTop:2}}>
                    <button
                      onClick={() => setOpenPickerId(openPickerId === line.id ? null : line.id)}
                      style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 12px',background:'var(--surface-2,rgba(255,255,255,.05))',border:'1px solid var(--line)',borderRadius:8,color:'var(--ink)',fontSize:12,fontFamily:'var(--mono)',cursor:'pointer',transition:'border-color .15s'}}
                    >
                      <span style={{color:'var(--ink-mute)'}}>Tabla de precios</span>
                      <span style={{display:'flex',alignItems:'center',gap:6}}>
                        <span style={{color: line.customPrice ? 'var(--gold-2)' : 'var(--ink)', fontWeight:600}}>
                          {line.customPrice ? `$${fmtCLP(Number(line.customPrice))}/g · PERSONALIZADO` : `$${fmtCLP(tierPrice)}/g · Auto T-${TIER_RULES[totals.tier].label}`}
                        </span>
                        <span style={{color:'var(--ink-mute)',fontSize:10,transform: openPickerId===line.id ? 'rotate(180deg)' : 'none',transition:'transform .2s'}}>▼</span>
                      </span>
                    </button>
                    {openPickerId === line.id && (
                      <div className="fade-in" style={{marginTop:4,border:'1px solid var(--line)',borderRadius:8,overflow:'hidden'}}>
                        {cat && cat.prices.map((p, i) => {
                          if (i === 0) return null;
                          const isActive = line.customPrice ? Number(line.customPrice) === p : i === totals.tier;
                          return (
                            <button key={i} onClick={() => {
                              updateLine(line.id, { customPrice: i === totals.tier ? '' : String(p) });
                              setOpenPickerId(null);
                            }} style={{width:'100%',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'9px 14px',background: isActive ? 'rgba(var(--accent-rgb),.15)' : 'transparent',border:'none',borderBottom:'1px solid var(--line)',color: isActive ? 'var(--gold-2)' : 'var(--ink)',cursor:'pointer',fontSize:13,fontFamily:'var(--mono)'}}>
                              <span style={{color:'var(--ink-mute)',fontSize:11}}>T-{TIER_RULES[i].label}</span>
                              <span style={{fontWeight: isActive ? 700 : 400}}>${fmtCLP(p)}<span style={{fontSize:10,color:'var(--ink-mute)'}}>/g</span></span>
                            </button>
                          );
                        })}
                        <div style={{padding:'8px 14px',borderTop:'none',background:'transparent'}}>
                          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom: line.customPrice && !cat.prices.includes(Number(line.customPrice)) ? 6 : 0}}>
                            <span style={{fontSize:11,fontFamily:'var(--mono)',color:'var(--gold-2)',letterSpacing:'.08em',fontWeight:600}}>PERSONALIZADO</span>
                          </div>
                          <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                            <span style={{color:'var(--ink-mute)',fontFamily:'var(--mono)',fontSize:13}}>$</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              value={line.customPrice && !cat.prices.map(String).includes(String(line.customPrice)) ? line.customPrice : ''}
                              onChange={e => updateLine(line.id, { customPrice: e.target.value })}
                              placeholder="Ingresar precio/g"
                              style={{flex:1,background:'var(--surface-2,rgba(255,255,255,.06))',border:'1px solid var(--line)',borderRadius:6,padding:'6px 10px',color:'var(--ink)',fontFamily:'var(--mono)',fontSize:13}}
                            />
                            <span style={{color:'var(--ink-mute)',fontSize:11,fontFamily:'var(--mono)'}}>CLP/g</span>
                            {line.customPrice && (
                              <button onClick={() => { updateLine(line.id, { customPrice: '' }); setOpenPickerId(null); }}
                                style={{padding:'4px 8px',background:'transparent',border:'1px solid var(--line)',borderRadius:6,color:'var(--ink-mute)',fontSize:11,cursor:'pointer'}}>Auto</button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="line-meta">
                  {isInsumo ? (
                    <>
                      <span className="price-tag insumo-price-tag-clean">
                        {insumoQtyVal === 1 ? (
                          <>Insumo &middot; ${fmtCLP(insumoValorVal)}</>
                        ) : (
                          <>Insumo &middot; {insumoQtyVal} un. &times; ${fmtCLP(insumoValorVal)}</>
                        )}
                      </span>
                      <span className="price-tag insumo-price-tag">
                        {insumoQtyVal === 1
                          ? `Insumo Â· $${fmtCLP(insumoValorVal)}`
                          : `Insumo Â· $${fmtCLP(insumoValorVal)}`}
                      </span>
                      <span className="price-tag">Insumo · {insumoQtyVal} un. × ${fmtCLP(insumoValorVal)}</span>
                      <span className="subtotal">${fmtCLP(sub)}</span>
                    </>
                  ) : isLote ? (
                    <>
                      <span className="price-tag">Lote 📦{line.loteName ? ` · ${line.loteName}` : ''}{Object.values(line.loteGramsMap||{}).reduce((s,v)=>s+(Number(v)||0),0) ? ` · ${Object.values(line.loteGramsMap||{}).reduce((s,v)=>s+(Number(v)||0),0)}g` : ''} · precio fijo</span>
                      <span className="subtotal">${fmtCLP(sub)}</span>
                    </>
                  ) : (
                    <>
                      <span className="price-tag">
                        {`$${fmtCLP(price)}/g · precio a cobrar`}
                      </span>
                      <span className="subtotal">${fmtCLP(sub)}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{padding:'0 16px 16px'}}>
          <button className="add-line" onClick={addLine}>
            <span className="plus">+</span> Añadir línea
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Resumen</h2>
          <span className="eyebrow">Cálculo automático</span>
        </div>
        <div className="summary">
          <div className="tier">
            <div className="tier-badge">{TIER_RULES[totals.tier].label}</div>
            <div className="tier-body">
              <div className="eyebrow">Tramo aplicado</div>
              <div className="why"><strong>{TIER_RULES[totals.tier].desc}.</strong> {totals.reason}.</div>
              {isKileroTier(totals.tier) && (
                <div style={{display:'inline-flex',alignItems:'center',gap:4,marginTop:6,background:'rgba(var(--accent-rgb),.15)',border:'1px solid rgba(var(--accent-rgb),.4)',borderRadius:6,padding:'3px 8px',fontSize:11,fontFamily:'var(--mono)',color:'var(--gold-2)',letterSpacing:'.1em'}}>
                  ◆ KILERO ACTIVO
                </div>
              )}
            </div>
          </div>
          <div className="totals">
            <div className="row">
              <span className="k">Peso total</span>
              <span className="v">{fmtCLP(totals.totalWeight)} g</span>
            </div>
            <div className="row">
              <span className="k">Líneas</span>
              <span className="v">{lines.filter(l => Number(l.grams) > 0).length} de {lines.length}</span>
            </div>
            <div className="row grand">
              <span className="k">Total</span>
              <span className="v"><span className="currency">CLP</span>${fmtCLP(totals.total)}</span>
            </div>
            <div className="summary-block">
              <h3>GRAMOS VENDIDOS</h3>
              <div className="row">
                <span className="k">Cadena</span>
                <span className="v">{fmtCLP(saleSummary.grams.cadena)} g</span>
              </div>
              <div className="row">
                <span className="k">Micro</span>
                <span className="v">{fmtCLP(saleSummary.grams.micro)} g</span>
              </div>
              <div className="row">
                <span className="k">Italy</span>
                <span className="v">{fmtCLP(saleSummary.grams.italy)} g</span>
              </div>
              <div className="row">
                <span className="k">GF 18 K</span>
                <span className="v">{fmtCLP(saleSummary.grams.gf18k)} g</span>
              </div>
            </div>
            <div className="summary-block">
              <h3>INSUMOS VENDIDOS</h3>
              {saleSummary.insumos.length ? saleSummary.insumos.map((insumo, idx) => (
                <div className="row" key={`${insumo.name}-${idx}`}>
                  <span className="k">{insumo.name}</span>
                  <span className="v">(${fmtCLP(insumo.cost)})</span>
                </div>
              )) : (
                <div className="row muted">
                  <span className="k">Sin insumos</span>
                  <span className="v">($0)</span>
                </div>
              )}
            </div>
            <div className="summary-block sale-detail">
              <h3>DETALLES VENTA</h3>
              <div className="row">
                <span className="k">+ Venta Total</span>
                <span className="v">${fmtCLP(totals.total)}</span>
              </div>
              <div className="row">
                <span className="k">- Costo Total</span>
                <span className="v">${fmtCLP(saleSummary.totalCost)}</span>
              </div>
              <div className="row grand">
                <span className="k">Utilidad Total</span>
                <span className="v"><span className="currency">CLP</span>${fmtCLP(saleSummary.profit)}</span>
              </div>
            </div>
          </div>
          <div className="actions">
            <button className="btn ghost" onClick={resetCalc}>Limpiar</button>
            <button className="btn primary" onClick={saveQuote}>Guardar cotización</button>
            <button className="btn accent" onClick={copyMessage} disabled={!canCopy} style={{flexBasis:'100%'}}>
              <span style={{fontSize:'18px'}}>📋</span> Copiar mensaje
            </button>
          </div>
        </div>
      </div>

      <div className="flourish" style={{margin:'26px 0 0'}}>
        <span>Aravena · Orfebrería</span>
      </div>
    </div>
  );
}
