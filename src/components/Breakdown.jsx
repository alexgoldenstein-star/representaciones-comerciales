import { IVA, fmt } from '../lib/format';

// Muestra el cálculo de un pedido: lista → bonificaciones en cascada → neto → IVA → total.
export default function Breakdown({ subtotal, steps = [], effective, net, showIva = true }) {
  let running = subtotal;
  return (
    <div className="tot">
      <span className="muted">Subtotal de lista</span><span>{fmt(subtotal)}</span>
      {steps.map((s, i) => {
        const before = running; running = running * (1 - s.pct / 100);
        const diff = before - running;
        return [
          <span key={'l' + i} className="muted">{s.label} {s.pct > 0 ? s.pct + '%' : '(' + Math.abs(s.pct) + '% recargo)'}</span>,
          <span key={'v' + i}>{diff >= 0 ? '− ' : '+ '}{fmt(Math.abs(diff))}</span>,
        ];
      })}
      {steps.length > 1 && <><span className="muted">Bonificación total equivalente</span><span>{Number(effective).toLocaleString('es-AR', { maximumFractionDigits: 2 })}%</span></>}
      <span className="muted">Neto</span><span>{fmt(net)}</span>
      {showIva && <><span className="muted">IVA 21%</span><span>{fmt(net * IVA)}</span>
        <span className="big">Total</span><span className="big">{fmt(net * (1 + IVA))}</span></>}
    </div>
  );
}
