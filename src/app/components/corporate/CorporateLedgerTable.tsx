'use client';

import type { LedgerItem, LedgerStatus } from '../../../lib/supabase/corporate-ledger';

function statusBadge(status: LedgerStatus) {
  if (status === 'pending') {
    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
        ⏳ Pending AI Match
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="inline-flex rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        ✅ Completed
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-green-200 bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
      ✅ Delivered
    </span>
  );
}

type CorporateLedgerTableProps = {
  items: LedgerItem[];
  ledgerFilter: 'all' | LedgerStatus;
  onLedgerFilterChange: (value: 'all' | LedgerStatus) => void;
  /** Dashboard preview: first N rows after filter. Omit for full history. */
  maxRows?: number;
  onRowAction: (item: LedgerItem) => void;
  /** Optional line under the filter row (e.g. full-history page). */
  subtitle?: string;
};

export function CorporateLedgerTable({
  items,
  ledgerFilter,
  onLedgerFilterChange,
  maxRows,
  onRowAction,
  subtitle,
}: CorporateLedgerTableProps) {
  const filtered = items.filter((item) => (ledgerFilter === 'all' ? true : item.status === ledgerFilter));
  const visible = typeof maxRows === 'number' ? filtered.slice(0, maxRows) : filtered;

  return (
    <>
      <div
        className={`mb-4 flex flex-wrap items-center gap-2 ${subtitle ? 'justify-between' : 'justify-end'}`}
      >
        {subtitle ? <p className="text-sm text-gray-600">{subtitle}</p> : null}
        <label className="text-sm text-gray-600">
          <span className="mr-2">Filter:</span>
          <select
            value={ledgerFilter}
            onChange={(e) => onLedgerFilterChange(e.target.value as 'all' | LedgerStatus)}
            className="rounded-lg border border-[#e5e5e5] px-2.5 py-1.5 text-sm"
          >
            <option value="all">All Activity</option>
            <option value="pending">Pending AI Match</option>
            <option value="completed">Completed</option>
            <option value="delivered">Delivered</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="bg-[#edf2f4]/70 text-left text-gray-600">
              <th className="px-3 py-2.5 font-semibold">Date</th>
              <th className="px-3 py-2.5 font-semibold">Activity Type</th>
              <th className="px-3 py-2.5 font-semibold">Amount / Qty</th>
              <th className="px-3 py-2.5 font-semibold">ESG Focus</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  No ledger entries match this filter.
                </td>
              </tr>
            ) : (
              visible.map((item) => (
                <tr key={item.id} className="border-b border-[#edf2f4] last:border-b-0">
                  <td className="px-3 py-3 text-gray-700">{item.dateLabel}</td>
                  <td className="px-3 py-3 font-medium text-[#000000]">{item.activityType}</td>
                  <td className="px-3 py-3 text-gray-700">{item.amountOrQty}</td>
                  <td className="px-3 py-3">
                    <span className="inline-block rounded-lg border border-[#e5e5e5] bg-[#edf2f4] px-2 py-0.5 text-xs">
                      {item.esgFocus}
                    </span>
                  </td>
                  <td className="px-3 py-3">{statusBadge(item.status)}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onRowAction(item)}
                      className="inline-flex items-center rounded-lg border border-[#e5e5e5] px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-[#edf2f4]"
                    >
                      {item.status === 'pending' ? 'View Details' : 'View Receipt'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
