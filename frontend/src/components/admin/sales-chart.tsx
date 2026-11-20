import { formatMoney } from "@/lib/format/money";
import type { SalesPoint } from "@/lib/admin/types";

/**
 * FR-ADMIN-1: 30-day sales chart. Plain divs keep it dependency-free and the
 * full series is repeated in a screen-reader table (FR-UI-5).
 */
export function SalesChart({ series }: { series: SalesPoint[] }) {
  const max = Math.max(1, ...series.map((point) => point.revenue));
  const total = series.reduce((sum, point) => sum + point.revenue, 0);
  const orders = series.reduce((sum, point) => sum + point.orders, 0);
  const first = series[0]?.date;
  const last = series[series.length - 1]?.date;

  return (
    <div>
      <div
        aria-label={`Revenue for the last 30 days: ${formatMoney(total)} across ${orders} paid orders.`}
        className="flex h-40 items-end gap-[3px]"
        role="img"
      >
        {series.map((point) => {
          const height =
            point.revenue > 0 ? Math.max(4, Math.round((point.revenue / max) * 100)) : 1;

          return (
            <div className="group relative flex-1" key={point.date}>
              <div
                className="w-full rounded-t bg-shop-ink/70 transition group-hover:bg-shop-ink dark:bg-foreground/70"
                style={{ height: `${height}%` }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md bg-shop-ink px-2 py-1 text-[10px] whitespace-nowrap text-background group-hover:block">
                {point.date} · {formatMoney(point.revenue)} · {point.orders} order
                {point.orders === 1 ? "" : "s"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-shop-muted">
        <span>{first ?? ""}</span>
        <span>{last ?? ""}</span>
      </div>

      <table className="sr-only">
        <caption>Revenue for the last 30 days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Orders</th>
            <th scope="col">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {series.map((point) => (
            <tr key={point.date}>
              <th scope="row">{point.date}</th>
              <td>{point.orders}</td>
              <td>{formatMoney(point.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
