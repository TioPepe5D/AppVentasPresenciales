// ---------- Charts Tab ----------
function ChartsTab({ history, prices }) {
  const [period, setPeriod] = useState(6); // last N months

  // ── helpers ──
  const getCssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // ── datos: ventas por mes ──
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }) });
    }
    const sales = {};
    const counts = {};
    for (const q of history) {
      if (!q.concretada) continue;
      const mk = monthKey(q.at);
      sales[mk] = (sales[mk] || 0) + (Number(q.total) || 0);
      counts[mk] = (counts[mk] || 0) + 1;
    }
    return months.map(m => ({ ...m, total: sales[m.key] || 0, count: counts[m.key] || 0 }));
  }, [history, period]);

  // ── datos: por persona ──
  const personData = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - period + 1, 1).getTime();
    const totals = {};
    for (const q of history) {
      if (!q.concretada || q.at < cutoff) continue;
      const { profit } = quoteCostAndProfit(q, prices);
      const base = Math.max(0, profit);
      const sched = (q.scheduler || '').trim() || EMPRESA;
      const att   = (q.attendant  || '').trim() || EMPRESA;
      totals[sched] = (totals[sched] || 0) + base * PCT_SCHEDULER;
      totals[att]   = (totals[att]   || 0) + base * PCT_ATTENDANT;
    }
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .filter(x => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [history, prices, period]);

  // ── datos: gramos por categoría ──
  const gramsData = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - period + 1, 1).getTime();
    const grams = {};
    for (const q of history) {
      if (!q.concretada || q.at < cutoff) continue;
      for (const l of (q.lines || [])) {
        if (l.category === INSUMO_KEY) continue;
        if (l.category === LOTE_KEY) {
          const gm = l.loteGramsMap || {};
          for (const [typeKey, catKey] of Object.entries(LOTE_CAT_MAP)) {
            const g = Number(gm[typeKey]) || 0;
            if (g > 0) grams[catKey] = (grams[catKey] || 0) + g;
          }
        } else {
          const g = Number(l.grams) || 0;
          if (g > 0) grams[l.category] = (grams[l.category] || 0) + g;
        }
      }
    }
    return Object.entries(grams)
      .map(([key, g]) => ({ key, name: prices[key]?.name || key, grams: Math.round(g * 10) / 10 }))
      .filter(x => x.grams > 0)
      .sort((a, b) => b.grams - a.grams);
  }, [history, prices, period]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - period + 1, 1).getTime();
    let ventas = 0, count = 0, ganancia = 0;
    for (const q of history) {
      if (!q.concretada || q.at < cutoff) continue;
      ventas += Number(q.total) || 0;
      const { profit } = quoteCostAndProfit(q, prices);
      ganancia += profit;
      count++;
    }
    return { ventas, count, ganancia, ticket: count ? Math.round(ventas / count) : 0 };
  }, [history, prices, period]);

  // ── Bar Chart (ventas mensuales) ──
  const barRef = useRef(null);
  useEffect(() => {
    const canvas = barRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = 200;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const gold    = getCssVar('--gold');
    const gold2   = getCssVar('--gold-2');
    const line    = getCssVar('--line');
    const inkMute = getCssVar('--ink-mute');
    const inkDim  = getCssVar('--ink-dim');

    ctx.clearRect(0, 0, W, H);
    const maxVal = Math.max(...monthlyData.map(m => m.total), 1);
    const pad = { top: 20, right: 10, bottom: 38, left: 10 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const n = monthlyData.length;
    const barW = Math.max(4, (chartW / n) * 0.55);
    const gap   = chartW / n;

    // Grid lines
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    [0, 0.25, 0.5, 0.75, 1].forEach(t => {
      const y = pad.top + chartH * (1 - t);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    });

    monthlyData.forEach((m, i) => {
      const x = pad.left + gap * i + gap / 2;
      const barH = m.total ? Math.max(4, (m.total / maxVal) * chartH) : 0;
      const y = pad.top + chartH - barH;

      if (barH > 0) {
        const grad = ctx.createLinearGradient(0, y, 0, pad.top + chartH);
        grad.addColorStop(0, gold2);
        grad.addColorStop(1, gold);
        ctx.fillStyle = grad;
        ctx.beginPath();
        const r = Math.min(5, barW / 2);
        ctx.moveTo(x - barW/2 + r, y);
        ctx.lineTo(x + barW/2 - r, y);
        ctx.quadraticCurveTo(x + barW/2, y, x + barW/2, y + r);
        ctx.lineTo(x + barW/2, pad.top + chartH);
        ctx.lineTo(x - barW/2, pad.top + chartH);
        ctx.lineTo(x - barW/2, y + r);
        ctx.quadraticCurveTo(x - barW/2, y, x - barW/2 + r, y);
        ctx.closePath();
        ctx.fill();
      }

      ctx.fillStyle = inkMute;
      ctx.font = `500 9px 'Montserrat', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(m.label.toUpperCase(), x, H - 6);

      if (m.total > 0) {
        ctx.fillStyle = inkDim;
        ctx.font = `600 9px 'Montserrat', sans-serif`;
        const label = m.total >= 1000000 ? `$${(m.total/1000000).toFixed(1)}M` : m.total >= 1000 ? `$${Math.round(m.total/1000)}K` : `$${m.total}`;
        ctx.fillText(label, x, y - 5);
      }
    });
  }, [monthlyData]);

  // ── Donut Chart (por persona) ──
  const donutRef = useRef(null);
  useEffect(() => {
    const canvas = donutRef.current;
    if (!canvas || personData.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const SIZE = Math.min(canvas.offsetWidth, 220);
    canvas.width  = SIZE * dpr;
    canvas.height = SIZE * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, SIZE, SIZE);

    const total = personData.reduce((s, d) => s + d.value, 0);
    const cx = SIZE / 2, cy = SIZE / 2;
    const outer = SIZE * 0.42, inner = SIZE * 0.26;
    const PALETTE = [
      getCssVar('--gold-2'), getCssVar('--gold'),
      '#6ee7b7', '#f4a380', '#fb923c', '#f472b6', '#22d3ee', '#818cf8'
    ];

    let startAngle = -Math.PI / 2;
    personData.forEach((d, i) => {
      const slice = (d.value / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, outer, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = PALETTE[i % PALETTE.length];
      ctx.fill();
      startAngle += slice;
    });

    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = getCssVar('--panel');
    ctx.fill();

    ctx.fillStyle = getCssVar('--ink-dim');
    ctx.font = `700 ${Math.round(SIZE * 0.065)}px 'Montserrat', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = total >= 1000000 ? `$${(total/1000000).toFixed(1)}M` : `$${Math.round(total/1000)}K`;
    ctx.fillText(label, cx, cy);
  }, [personData]);

  // ── Horizontal Bar Chart (gramos por cat) ──
  const hbarRef = useRef(null);
  useEffect(() => {
    const canvas = hbarRef.current;
    if (!canvas || gramsData.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const ROW_H = 36, PAD_V = 12, PAD_H = 14;
    const H = gramsData.length * ROW_H + PAD_V * 2;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const maxG = Math.max(...gramsData.map(d => d.grams), 1);
    const labelW = Math.min(W * 0.38, 140);
    const barArea = W - labelW - PAD_H * 2 - 50;
    const gold2   = getCssVar('--gold-2');
    const gold    = getCssVar('--gold');
    const inkDim  = getCssVar('--ink-dim');
    const inkMute = getCssVar('--ink-mute');
    const line    = getCssVar('--line');

    gramsData.forEach((d, i) => {
      const y = PAD_V + i * ROW_H;
      const barH = ROW_H * 0.45;
      const barY = y + (ROW_H - barH) / 2;
      const barW = Math.max(4, (d.grams / maxG) * barArea);

      ctx.fillStyle = inkDim;
      ctx.font = `500 10px 'Montserrat', sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const name = d.name.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27FF}]/gu, '').trim();
      ctx.fillText(name, PAD_H + labelW, y + ROW_H / 2);

      ctx.fillStyle = line;
      ctx.beginPath();
      const r2 = barH / 2;
      ctx.roundRect(PAD_H + labelW + 8, barY, barArea, barH, r2);
      ctx.fill();

      const grad = ctx.createLinearGradient(PAD_H + labelW + 8, 0, PAD_H + labelW + 8 + barW, 0);
      grad.addColorStop(0, gold2);
      grad.addColorStop(1, gold);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(PAD_H + labelW + 8, barY, barW, barH, r2);
      ctx.fill();

      ctx.fillStyle = inkMute;
      ctx.font = `600 9px 'Montserrat', sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`${d.grams}g`, PAD_H + labelW + 8 + barArea + 6, y + ROW_H / 2);
    });
  }, [gramsData]);

  const totalVentas = kpis.ventas;
  const hasData = history.some(q => q.concretada);

  return (
    <div className="fade-in">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
        <div style={{fontFamily:'var(--mono)',fontSize:10,letterSpacing:'.18em',color:'var(--ink-mute)',textTransform:'uppercase'}}>Período</div>
        <div className="chart-period-sel">
          {[3,6,12].map(n => (
            <button key={n} className={`chart-period-btn${period===n?' active':''}`} onClick={()=>setPeriod(n)}>
              {n}M
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <div className="card">
          <div className="chart-empty">
            <div style={{fontSize:36,marginBottom:12}}>📊</div>
            <p style={{margin:0,color:'var(--ink-dim)',fontWeight:600}}>Sin datos todavía</p>
            <p style={{margin:'6px 0 0',fontSize:12,color:'var(--ink-mute)'}}>Confirma ventas desde Historial para ver tus gráficos</p>
          </div>
        </div>
      ) : (
        <div className="charts-grid">
          <div className="chart-kpi-row">
            <div className="chart-kpi">
              <div className="chart-kpi-label">Ventas</div>
              <div className="chart-kpi-value" style={{fontSize:14}}>${totalVentas>=1000000?(totalVentas/1000000).toFixed(1)+'M':totalVentas>=1000?Math.round(totalVentas/1000)+'K':fmtCLP(totalVentas)}</div>
              <div className="chart-kpi-sub">{kpis.count} venta{kpis.count!==1?'s':''}</div>
            </div>
            <div className="chart-kpi">
              <div className="chart-kpi-label">Ganancia</div>
              <div className="chart-kpi-value" style={{fontSize:14,color:kpis.ganancia>=0?'var(--gold-2)':'var(--danger)'}}>${kpis.ganancia>=1000000?(kpis.ganancia/1000000).toFixed(1)+'M':kpis.ganancia>=1000?Math.round(kpis.ganancia/1000)+'K':fmtCLP(Math.abs(kpis.ganancia))}</div>
              <div className="chart-kpi-sub">Neta</div>
            </div>
            <div className="chart-kpi">
              <div className="chart-kpi-label">Ticket</div>
              <div className="chart-kpi-value" style={{fontSize:14}}>${kpis.ticket>=1000?Math.round(kpis.ticket/1000)+'K':fmtCLP(kpis.ticket)}</div>
              <div className="chart-kpi-sub">Promedio</div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-head">
              <h3>Ventas <em>mensuales</em></h3>
              <span className="eyebrow">CLP</span>
            </div>
            <div className="chart-body">
              <div className="chart-canvas-wrap">
                <canvas ref={barRef} style={{height:200}}/>
              </div>
            </div>
          </div>

          {personData.length > 0 && (
            <div className="chart-card">
              <div className="chart-head">
                <h3>Comisiones <em>por persona</em></h3>
                <span className="eyebrow">Equipo</span>
              </div>
              <div className="chart-body" style={{display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{flexShrink:0}}>
                  <div className="chart-canvas-wrap" style={{width:180,maxWidth:'100%'}}>
                    <canvas ref={donutRef} style={{width:180,height:180}}/>
                  </div>
                </div>
                <div className="chart-legend" style={{flex:1,minWidth:120,flexDirection:'column',gap:8}}>
                  {personData.map((d,i) => {
                    const PALETTE = ['var(--gold-2)','var(--gold)','#6ee7b7','#f4a380','#fb923c','#f472b6','#22d3ee','#818cf8'];
                    const total = personData.reduce((s,x)=>s+x.value,0);
                    const pct = total ? Math.round(d.value/total*100) : 0;
                    return (
                      <div key={d.name} className="chart-legend-item">
                        <span className="chart-legend-dot" style={{background:PALETTE[i%PALETTE.length]}}/>
                        <span style={{flex:1}}>{d.name}</span>
                        <span style={{color:'var(--gold-2)',fontWeight:700}}>{pct}%</span>
                        <span style={{color:'var(--ink-mute)',marginLeft:6}}>${d.value>=1000?Math.round(d.value/1000)+'K':fmtCLP(d.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {gramsData.length > 0 && (
            <div className="chart-card">
              <div className="chart-head">
                <h3>Gramos <em>por categoría</em></h3>
                <span className="eyebrow">g vendidos</span>
              </div>
              <div className="chart-body">
                <div className="chart-canvas-wrap">
                  <canvas ref={hbarRef}/>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
