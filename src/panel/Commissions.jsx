import { useState } from 'react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { usePanel } from './Panel';
import { BrandMark, Empty, Field, useToast } from '../components/ui';
import { MESES, STAGES, commOf, fdate, fmt, net, stageOf, today } from '../lib/format';

export default function Commissions() {
  const { vid, orders, brands } = usePanel();
  const toast = useToast();
  const year = today().slice(0, 4);
  const [period, setPeriod] = useState(year);
  const periods = [year];
  for (let i = 0; i < 12; i++) { const d = new Date(today().slice(0, 7) + '-15T12:00:00'); d.setMonth(d.getMonth() - i); periods.push(d.toISOString().slice(0, 7)); }
  const label = p => p.length === 4 ? 'Todo ' + p : MESES[Number(p.slice(5)) - 1] + ' ' + p.slice(0, 4);
  const os = orders.filter(o => (o.date || '').startsWith(period));
  const tot = Object.fromEntries(STAGES.map(s => [s.k, 0]));
  os.forEach(o => { tot[stageOf(o)] += commOf(o); });
  const rows = brands.map(b => {
    const bo = os.filter(o => o.brandId === b.id);
    const st = Object.fromEntries(STAGES.map(s => [s.k, 0])); bo.forEach(o => { st[stageOf(o)] += commOf(o); });
    return { b, sold: bo.reduce((a, o) => a + net(o), 0), st, total: Object.values(st).reduce((a, x) => a + x, 0) };
  }).filter(r => r.sold > 0).sort((a, b) => b.total - a.total);
  const toCollect = os.filter(o => o.status === 'cobrado' && !o.commissionPaid);
  const markPaid = async o => { await updateDoc(doc(db, 'vendors', vid, 'orders', o.id), { commissionPaid: true }); toast('Comisión marcada como cobrada'); };
  const markBrand = async bId => {
    const b = writeBatch(db); toCollect.filter(o => o.brandId === bId).forEach(o => b.update(doc(db, 'vendors', vid, 'orders', o.id), { commissionPaid: true }));
    await b.commit(); toast('Listo, marcamos todas las de esa marca');
  };
  const brandsToCollect = [...new Set(toCollect.map(o => o.brandId))];

  return (
    <>
      <div className="head">
        <div className="grow"><h1>Comisiones</h1><p>Cuánto ganaste con cada marca, según en qué etapa está cada pedido.</p></div>
        <Field label="Período"><select id="cm-per" className="input" style={{ width: 'auto', textTransform: 'capitalize' }} value={period} onChange={e => setPeriod(e.target.value)}>{periods.map(p => <option key={p} value={p}>{label(p)}</option>)}</select></Field>
      </div>
      <div className="stages">
        {STAGES.map(s => <div key={s.k} className="card stage" style={{ '--c': s.c }}><span className="label">{s.l}</span><span className="v">{fmt(tot[s.k])}</span><span className="muted small">{s.d}</span></div>)}
      </div>

      <div className="card">
        <div className="pad" style={{ paddingBottom: 8 }}><h2>A cobrarle a las empresas</h2><p className="muted">Estas empresas ya cobraron el pedido. Cuando te paguen la comisión, marcala.</p></div>
        {toCollect.length === 0 ? <Empty title="No tenés comisiones pendientes en este período" /> : (
          <>
            {brandsToCollect.length > 0 && <div className="pad row" style={{ paddingTop: 0 }}>{brandsToCollect.map(bId => {
              const b = brands.find(x => x.id === bId); const sum = toCollect.filter(o => o.brandId === bId).reduce((a, o) => a + commOf(o), 0);
              return <button key={bId} className="btn sm" onClick={() => markBrand(bId)}>{b?.name}: me pagaron todo ({fmt(sum)})</button>;
            })}</div>}
            <div className="list">{toCollect.map(o => (
              <div key={o.id} className="item">
                <BrandMark b={brands.find(x => x.id === o.brandId) || { name: o.brandName }} size="s" />
                <div className="grow"><div className="t">{o.clientName}</div><div className="s">{o.brandName} · {o.number} · {fdate(o.date)}</div></div>
                <span className="amount">{fmt(commOf(o))}</span>
                <button className="btn ok sm" onClick={() => markPaid(o)}>Ya me pagaron</button>
              </div>
            ))}</div>
          </>
        )}
      </div>

      <div className="card">
        <div className="pad" style={{ paddingBottom: 8 }}><h2>Por marca</h2></div>
        {rows.length === 0 ? <Empty title="Sin ventas en este período" /> : (
          <div className="scroll"><table className="lines">
            <thead><tr><th>Marca</th><th className="r">Vendido</th>{STAGES.map(s => <th key={s.k} className="r">{s.l}</th>)}<th className="r">Total</th></tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.b.id}>
                  <td><div className="row" style={{ flexWrap: 'nowrap' }}><BrandMark b={r.b} size="s" /><div><b>{r.b.name}</b><div className="muted small">{r.b.commission}%</div></div></div></td>
                  <td className="r num">{fmt(r.sold)}</td>
                  {STAGES.map(s => <td key={s.k} className="r num" style={{ color: r.st[s.k] ? 'var(--ink)' : 'var(--muted)' }}>{fmt(r.st[s.k])}</td>)}
                  <td className="r num"><b>{fmt(r.total)}</b></td>
                </tr>
              ))}
              <tr><td><b>Total</b></td><td className="r num"><b>{fmt(rows.reduce((a, r) => a + r.sold, 0))}</b></td>{STAGES.map(s => <td key={s.k} className="r num"><b>{fmt(tot[s.k])}</b></td>)}<td className="r num"><b>{fmt(rows.reduce((a, r) => a + r.total, 0))}</b></td></tr>
            </tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
