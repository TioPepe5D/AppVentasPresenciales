// ---------- Reports Tab ----------
// ── helpers de período ──
const dayKey  = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const weekKey = (ts) => {
  const d = new Date(ts);
  const day = d.getDay() || 7;
  const mon = new Date(d); mon.setDate(d.getDate() - day + 1);
  return `${mon.getFullYear()}-W${String(getISOWeek(mon)).padStart(2,'0')}`;
};
const getISOWeek = (d) => {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const startOfWeek1 = new Date(jan4); startOfWeek1.setDate(jan4.getDate() - (jan4.getDay()||7) + 1);
  return Math.ceil(((d - startOfWeek1) / 86400000 + 1) / 7);
};
const yearKey = (ts) => String(new Date(ts).getFullYear());

const dayLabel  = (k) => { const [y,m,d] = k.split('-'); return new Date(+y,+m-1,+d).toLocaleDateString('es-CL',{weekday:'short',day:'2-digit',month:'short',year:'numeric'}); };
const weekLabel = (k) => {
  const [yearStr, wStr] = k.split('-W');
  const year = +yearStr, week = +wStr;
  const jan4 = new Date(year, 0, 4);
  const startW1 = new Date(jan4); startW1.setDate(jan4.getDate() - (jan4.getDay()||7) + 1);
  const mon = new Date(startW1); mon.setDate(startW1.getDate() + (week-1)*7);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('es-CL',{day:'2-digit',month:'short'});
  return `${fmt(mon)} – ${fmt(sun)}`;
};
const yearLabel = (k) => k;

function ReportsTab({ history, prices, onToggleConcretada }){
  const [period, setPeriod] = useState('monthly');

  const allDays = useMemo(() => {
    const set = new Set(history.map(q => dayKey(q.at)));
    set.add(dayKey(Date.now()));
    return Array.from(set).sort().reverse();
  }, [history]);

  const allWeeks = useMemo(() => {
    const set = new Set(history.map(q => weekKey(q.at)));
    set.add(weekKey(Date.now()));
    return Array.from(set).sort().reverse();
  }, [history]);

  const allMonths = useMemo(() => {
    const set = new Set(history.map(q => monthKey(q.at)));
    set.add(monthKey(Date.now()));
    return Array.from(set).sort().reverse();
  }, [history]);

  const allYears = useMemo(() => {
    const set = new Set(history.map(q => yearKey(q.at)));
    set.add(yearKey(Date.now()));
    return Array.from(set).sort().reverse();
  }, [history]);

  const [selDay,   setSelDay]   = useState(() => dayKey(Date.now()));
  const [selWeek,  setSelWeek]  = useState(() => weekKey(Date.now()));
  const [selMonth, setSelMonth] = useState(() => monthKey(Date.now()));
  const [selYear,  setSelYear]  = useState(() => yearKey(Date.now()));

  const { activeKey, activeLabel, activeList, setActive, keyFn, periodName } = useMemo(() => {
    if (period === 'daily')  return { activeKey: selDay,   activeLabel: dayLabel(selDay),    activeList: allDays,   setActive: setSelDay,   keyFn: dayKey,   periodName: 'Diario'  };
    if (period === 'weekly') return { activeKey: selWeek,  activeLabel: weekLabel(selWeek),  activeList: allWeeks,  setActive: setSelWeek,  keyFn: weekKey,  periodName: 'Semanal' };
    if (period === 'yearly') return { activeKey: selYear,  activeLabel: yearLabel(selYear),  activeList: allYears,  setActive: setSelYear,  keyFn: yearKey,  periodName: 'Anual'   };
    return                          { activeKey: selMonth, activeLabel: monthLabel(selMonth), activeList: allMonths, setActive: setSelMonth, keyFn: monthKey, periodName: 'Mensual' };
  }, [period, selDay, selWeek, selMonth, selYear, allDays, allWeeks, allMonths, allYears]);

  const periodQuotes = useMemo(
    () => history.filter(q => keyFn(q.at) === activeKey && q.concretada),
    [history, keyFn, activeKey]
  );

  const summary = useMemo(() => {
    const byPerson = {};
    let totalVentas = 0, totalCostos = 0, totalGanancia = 0;
    const LOTE_CAT_MAP_REPORT = { cadena:'collar_pulsera_mujer_925', micro:'collar_pulsera_micro', italiana:'italiana_925', gf18k:'gf_18k' };
    const gramsByGroup = { cadena:0, micro:0, italiana:0, gf18k:0 };
    const catToGroup = {
      collar_pulsera_mujer_925:'cadena', collar_pulsera_hombre_925:'cadena',
      collar_pulsera_micro:'micro', aros_colgantes_925:'micro', anillos_925:'micro',
      italiana_925:'italiana', gf_18k:'gf18k',
    };
    const inc = (n,k,v) => { byPerson[n]=byPerson[n]||{agendado:0,atendido:0,empresa:0}; byPerson[n][k]+=v; };
    for (const q of periodQuotes) {
      const total = Number(q.total)||0;
      const { totalCost, profit } = quoteCostAndProfit(q, prices);
      const base = Math.max(0,profit);
      totalVentas+=total; totalCostos+=totalCost; totalGanancia+=profit;
      const sched=(q.scheduler||'').trim()||EMPRESA, att=(q.attendant||'').trim()||EMPRESA;
      inc(sched,'agendado',base*PCT_SCHEDULER); inc(att,'atendido',base*PCT_ATTENDANT); inc(EMPRESA,'empresa',base*PCT_EMPRESA);
      for (const l of (q.lines||[])) {
        if (l.category===LOTE_KEY) { const gm=l.loteGramsMap||{}; for (const [tk] of Object.entries(LOTE_CAT_MAP_REPORT)) gramsByGroup[tk]=(gramsByGroup[tk]||0)+(Number(gm[tk])||0); }
        else if (catToGroup[l.category]) gramsByGroup[catToGroup[l.category]]+=Number(l.grams)||0;
      }
    }
    const pagosByPerson={};
    for (const q of periodQuotes) { const who=(q.pago||'').trim(); if(who) pagosByPerson[who]=(pagosByPerson[who]||0)+(Number(q.total)||0); }
    const rows=Object.entries(byPerson).map(([name,v])=>({name,...v,comision:v.agendado+v.atendido+v.empresa,pagado:pagosByPerson[name]||0})).sort((a,b)=>b.comision-a.comision);
    for (const [name,pagado] of Object.entries(pagosByPerson)) if(!rows.find(r=>r.name===name)) rows.push({name,agendado:0,atendido:0,empresa:0,comision:0,pagado});
    const totalComisionEquipo=rows.reduce((s,r)=>s+r.agendado+r.atendido,0);
    const totalEmpresa=rows.reduce((s,r)=>s+r.empresa,0);
    const totalPagos=Object.values(pagosByPerson).reduce((s,v)=>s+v,0);
    return {rows,totalVentas,totalCostos,totalGanancia,totalComisionEquipo,totalEmpresa,gramsByGroup,pagosByPerson,totalPagos};
  }, [periodQuotes, prices]);

  const exportCSVLegacy = () => {
    const header=["Fecha","Cliente","Agendó","Atendió","Tramo","Gramos Total","G. Cadena","G. Micro","G. Italiana","G. GF 18K","Venta","Costo","Ganancia","Comisión Agendó (35%)","Comisión Atendió (35%)","Comisión Empresa (30%)"];
    const catToGroup={collar_pulsera_mujer_925:'cadena',collar_pulsera_hombre_925:'cadena',collar_pulsera_micro:'micro',aros_colgantes_925:'micro',anillos_925:'micro',italiana_925:'italiana',gf_18k:'gf18k'};
    const rows=periodQuotes.map(q=>{
      const total=Number(q.total)||0; const {totalCost,profit}=quoteCostAndProfit(q,prices); const base=Math.max(0,profit);
      const d=new Date(q.at); const fecha=d.toLocaleDateString('es-CL')+' '+d.toLocaleTimeString('es-CL',{hour:'2-digit',minute:'2-digit'});
      const gramsByGroup={cadena:0,micro:0,italiana:0,gf18k:0};
      for(const l of(q.lines||[])){if(l.category===LOTE_KEY){const gm=l.loteGramsMap||{};for(const k of['cadena','micro','italiana','gf18k'])gramsByGroup[k]+=Number(gm[k])||0;}else if(catToGroup[l.category])gramsByGroup[catToGroup[l.category]]+=Number(l.grams)||0;}
      const r1=(x)=>(Math.round((x||0)*10)/10).toLocaleString('es-CL',{maximumFractionDigits:1});
      return [fecha,q.client||'',q.scheduler||EMPRESA,q.attendant||EMPRESA,TIER_RULES[q.tier]?TIER_RULES[q.tier].label:'',r1(q.totalWeight),r1(gramsByGroup.cadena),r1(gramsByGroup.micro),r1(gramsByGroup.italiana),r1(gramsByGroup.gf18k),total,Math.round(totalCost),Math.round(profit),Math.round(base*PCT_SCHEDULER),Math.round(base*PCT_ATTENDANT),Math.round(base*PCT_EMPRESA)];
    });
    const esc=(v)=>{const s=String(v??'');return/[",;\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};
    const csv=[header,...rows].map(r=>r.map(esc).join(';')).join('\r\n');
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=`ventas_${period}_${activeKey}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const header = ["Fecha","Cliente","Pago:","Atendi\u00f3:","Agendo:","Cadena:","Micro:","Italy:","GF 18K:","Insumos: (Costo Total)","Total Venta:"];
    const catToGroup = {
      collar_pulsera_mujer_925: 'cadena',
      collar_pulsera_hombre_925: 'cadena',
      collar_pulsera_micro: 'micro',
      aros_colgantes_925: 'micro',
      anillos_925: 'micro',
      italiana_925: 'italiana',
      gf_18k: 'gf18k',
    };
    const rows = periodQuotes.map(q => {
      const d = new Date(q.at);
      const fecha = d.toLocaleDateString('es-CL') + ' ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      const gramsByGroup = { cadena: 0, micro: 0, italiana: 0, gf18k: 0 };
      let insumosCost = 0;

      for (const l of (q.lines || [])) {
        if (l.category === LOTE_KEY) {
          const gm = l.loteGramsMap || {};
          for (const k of ['cadena','micro','italiana','gf18k']) gramsByGroup[k] += Number(gm[k]) || 0;
        } else if (l.category === INSUMO_KEY) {
          const cost = Number(l.insumoCost) || Number(l.insumoPrice) || 0;
          const qty = Number(l.insumoQty) || 1;
          insumosCost += cost * qty;
        } else if (catToGroup[l.category]) {
          gramsByGroup[catToGroup[l.category]] += Number(l.grams) || 0;
        }
      }

      const r1 = (x) => (Math.round((x || 0) * 10) / 10).toLocaleString('es-CL', { maximumFractionDigits: 1 });
      return [fecha, q.client || '', q.pago || '', q.attendant || EMPRESA, q.scheduler || EMPRESA, r1(gramsByGroup.cadena), r1(gramsByGroup.micro), r1(gramsByGroup.italiana), r1(gramsByGroup.gf18k), Math.round(insumosCost), Math.round(Number(q.total) || 0)];
    });
    const esc = (v) => { const s = String(v ?? ''); return /[",;\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
    const csv = [header, ...rows].map(r => r.map(esc).join(';')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `ventas_${period}_${activeKey}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const selectorLabel = {daily:'Día',weekly:'Semana',monthly:'Mes',yearly:'Año'}[period];

  return (
    <div className="fade-in">
      <div className="card">
        <div className="card-head">
          <h2>Reporte <em>{periodName.toLowerCase()}</em></h2>
          <span className="eyebrow">{activeLabel}</span>
        </div>
        <div style={{padding:'10px 14px 0',display:'flex',gap:6,flexWrap:'wrap'}}>
          {[['daily','Diario 📅'],['weekly','Semanal 📆'],['monthly','Mensual 🗓️'],['yearly','Anual 📊']].map(([k,lbl])=>(
            <button key={k} className={`chart-period-btn${period===k?' active':''}`} onClick={()=>setPeriod(k)} style={{fontSize:11,padding:'5px 12px'}}>{lbl}</button>
          ))}
        </div>
        <div style={{padding:'12px 14px',display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>
          <div className="control-labeled" style={{flex:'1 1 180px'}}>
            <label>{selectorLabel}</label>
            <div className="control">
              <select value={activeKey} onChange={e=>setActive(e.target.value)}>
                {activeList.map(k=>(
                  <option key={k} value={k}>
                    {period==='daily'?dayLabel(k):period==='weekly'?weekLabel(k):period==='yearly'?yearLabel(k):monthLabel(k)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button className="btn accent" onClick={exportCSV} disabled={periodQuotes.length===0}>
            <Icon name="share" size={14}/> Exportar CSV
          </button>
        </div>
        <div className="report-summary">
          <div className="rs-card"><div className="rs-label">Ventas</div><div className="rs-value">${fmtCLP(summary.totalVentas)}</div><div className="rs-sub">{periodQuotes.length} concretada{periodQuotes.length===1?'':'s'}</div></div>
          <div className="rs-card"><div className="rs-label">Costos</div><div className="rs-value">${fmtCLP(summary.totalCostos)}</div><div className="rs-sub">Mercadería</div></div>
          <div className="rs-card"><div className="rs-label">Ganancia</div><div className="rs-value">${fmtCLP(summary.totalGanancia)}</div><div className="rs-sub">Venta − costo</div></div>
          <div className="rs-card"><div className="rs-label">Comisiones equipo</div><div className="rs-value">${fmtCLP(summary.totalComisionEquipo)}</div><div className="rs-sub">70% de ganancia</div></div>
          <div className="rs-card"><div className="rs-label">Empresa</div><div className="rs-value">${fmtCLP(summary.totalEmpresa)}</div><div className="rs-sub">30% de ganancia</div></div>
          <div className="rs-card" style={{gridColumn:'span 2'}}>
            <div className="rs-label">Gramos vendidos</div>
            <div style={{marginTop:6,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'3px 12px'}}>
              {[['cadena','Cadena 🔗'],['micro','Micro 💎'],['italiana','Italy 🇮🇹'],['gf18k','GF 18K ☀️']].map(([k,label])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',fontSize:12,fontFamily:'var(--mono)',fontWeight:500}}>
                  <span style={{color:'var(--ink-mute)'}}>{label}</span>
                  <span style={{color:summary.gramsByGroup[k]>0?'var(--gold-2)':'var(--ink-mute)',fontWeight:600}}>
                    {summary.gramsByGroup[k]>0?`${fmtCLP(summary.gramsByGroup[k])}g`:'—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {summary.rows.length>0&&(
        <div className="card">
          <div className="card-head"><h2>Por <em>persona</em></h2></div>
          <div style={{display:'none',padding:'10px 14px 2px'}}>
            <div className="eyebrow" style={{marginBottom:8,letterSpacing:'.18em'}}>💰 Pagos recibidos</div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {TEAM.map(name=>{const p=summary.pagosByPerson[name]||0;if(!p)return null;return(<div key={name} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'5px 0',borderBottom:'1px dashed var(--line)',fontFamily:'var(--mono)',fontSize:13}}><span style={{color:'var(--ink-dim)',fontWeight:600}}>{name}</span><span style={{color:'var(--ink)',fontWeight:700}}>${fmtCLP(p)}</span></div>);})}
              {TEAM.every(n=>!summary.pagosByPerson[n])&&<div style={{color:'var(--ink-mute)',fontSize:12,fontStyle:'italic',padding:'4px 0'}}>Sin pagos registrados este período</div>}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'6px 0 2px',fontFamily:'var(--mono)',fontSize:12}}>
                <span style={{color:'var(--ink-mute)',letterSpacing:'.1em',textTransform:'uppercase'}}>Total</span>
                <span style={{color:'var(--gold-2)',fontWeight:700}}>${fmtCLP(summary.totalPagos)}</span>
              </div>
            </div>
          </div>
          <div style={{padding:'10px 14px 2px',borderTop:'1px solid var(--line)',marginTop:8}}>
            <div className="eyebrow" style={{marginBottom:8,letterSpacing:'.18em'}}>📊 Comisiones ganadas</div>
            <div className="report-people" style={{padding:0}}>
              {summary.rows.map(r=>(<div key={r.name} className="rp-row"><div className="rp-name">{r.name}{r.name===EMPRESA&&<span className="rp-tag"> · empresa</span>}</div><div className="rp-breakdown"><span>Agendó: <b>${fmtCLP(r.agendado)}</b></span><span>Atendió: <b>${fmtCLP(r.atendido)}</b></span>{r.empresa>0&&<span>Empresa: <b>${fmtCLP(r.empresa)}</b></span>}</div><div className="rp-total">${fmtCLP(r.comision)}</div></div>))}
            </div>
          </div>
          <div style={{padding:'10px 14px 14px',borderTop:'1px solid var(--line)',marginTop:8}}>
            <div className="eyebrow" style={{marginBottom:8,letterSpacing:'.18em'}}>⚖️ Paga (−) / Recibe (+)</div>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {(()=>{
                const names=[...new Set([...TEAM,...Object.keys(summary.pagosByPerson)])];
                return names.map(name=>{const row=summary.rows.find(r=>r.name===name);const comision=row?row.comision:0;const pagado=summary.pagosByPerson[name]||0;return{name,neto:comision-pagado};}).filter(x=>x.neto!==0||summary.pagosByPerson[x.name]||summary.rows.find(r=>r.name===x.name)).sort((a,b)=>b.neto-a.neto).map(({name,neto})=>(<div key={name} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'5px 0',borderBottom:'1px dashed var(--line)',fontFamily:'var(--mono)',fontSize:13}}><span style={{color:'var(--ink-dim)',fontWeight:600}}>{name}</span><span style={{fontWeight:700,color:neto>0?'#4ade80':neto<0?'var(--danger)':'var(--ink-mute)'}}>{neto>0?'+':''}{neto!==0?`$${fmtCLP(neto)}`:'$0'}</span></div>));
              })()}
            </div>
          </div>
        </div>
      )}

      {false&&periodQuotes.length>0&&(
        <div className="card">
          <div className="card-head"><h2>Resumen <em>financiero</em></h2></div>
          <div style={{padding:'14px 14px 16px',display:'flex',flexDirection:'column',gap:8}}>
            {[['Venta total',summary.totalVentas,'var(--gold-2)'],['Costo total',summary.totalCostos,'var(--ink-dim)'],['Ganancia',summary.totalGanancia,summary.totalGanancia>=0?'#4ade80':'var(--danger)'],['Comisiones equipo',summary.totalComisionEquipo,'var(--ink)'],['Empresa (30%)',summary.totalEmpresa,'var(--ink)']].map(([label,val,color])=>(
              <div key={label} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'6px 0',borderBottom:'1px solid var(--line)',fontFamily:'var(--mono)'}}>
                <span style={{fontSize:11,letterSpacing:'.14em',color:'var(--ink-mute)',textTransform:'uppercase'}}>{label}</span>
                <span style={{fontSize:15,fontWeight:700,color}}>${fmtCLP(val)}</span>
              </div>
            ))}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'8px 0 0',fontFamily:'var(--mono)'}}>
              <span style={{fontSize:11,letterSpacing:'.14em',color:'var(--ink-mute)',textTransform:'uppercase'}}>Pagos totales registrados</span>
              <span style={{fontSize:15,fontWeight:700,color:Math.abs(summary.totalPagos-summary.totalVentas)<1?'#4ade80':'var(--danger)'}}>
                ${fmtCLP(summary.totalPagos)}
                {Math.abs(summary.totalPagos-summary.totalVentas)>1?<span style={{fontSize:10,color:'var(--danger)',marginLeft:6}}>⚠ faltan ${fmtCLP(summary.totalVentas-summary.totalPagos)}</span>:<span style={{fontSize:10,color:'#4ade80',marginLeft:6}}>✓ cuadra</span>}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-head"><h2>Ventas del <em>{periodName.toLowerCase()}</em></h2><span className="eyebrow">{periodQuotes.length}</span></div>
        {periodQuotes.length===0?(
          <div className="empty"><div className="diamond"/><p>No hay ventas concretadas en este período</p><div className="hint">Marca las cotizaciones como "Venta concretada" para incluirlas</div></div>
        ):(
          <SalesList quotes={periodQuotes} prices={prices}/>
        )}
      </div>
    </div>
  );
}
