'use client';

import { useMemo, useState } from 'react';
import {
  Download,
  FileText,
  BarChart3,
  PieChart,
  CalendarRange,
} from 'lucide-react';

interface ReportArchiveItem {
  id: string;
  name: string;
  period: string;
  sdgFocus: string;
}

const ARCHIVE: ReportArchiveItem[] = [
  {
    id: 'q1-2026-impact',
    name: 'Q1 2026 ESG Impact Summary',
    period: 'Jan-Mar 2026',
    sdgFocus: 'SDG 4, 12',
  },
  {
    id: 'annual-2025',
    name: '2025 Annual Sustainability Report',
    period: '2025',
    sdgFocus: 'SDG 1, 2, 4',
  },
];

const MONTHLY_DELIVERIES = [
  { month: 'Jan', count: 32 },
  { month: 'Feb', count: 47 },
  { month: 'Mar', count: 63 },
  { month: 'Apr', count: 54 },
  { month: 'May', count: 71 },
];

export default function CorporateReportsPage() {
  const [quarter, setQuarter] = useState('q1_2026');
  const [impactArea, setImpactArea] = useState('all');
  const maxDeliveries = useMemo(() => Math.max(...MONTHLY_DELIVERIES.map((x) => x.count)), []);

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const content = [
      `Corporate ESG Export (${quarter})`,
      `Impact Area: ${impactArea}`,
      '',
      'Items Diverted by Category:',
      '- 60% Electronics',
      '- 30% Furniture',
      '- 10% Office Supplies',
      '',
      'Deliveries Sponsored per Month:',
      ...MONTHLY_DELIVERIES.map((m) => `- ${m.month}: ${m.count}`),
    ].join('\n');
    downloadFile(`esg-report-${quarter}.pdf`, content, 'application/pdf');
  };

  const exportCsv = () => {
    const header = 'month,deliveries\n';
    const rows = MONTHLY_DELIVERIES.map((m) => `${m.month},${m.count}`).join('\n');
    downloadFile(`deliveries-${quarter}.csv`, header + rows, 'text/csv;charset=utf-8');
  };

  const downloadArchivePdf = (name: string, period: string, sdg: string) => {
    const content = [`${name}`, `Period: ${period}`, `Primary SDG Focus: ${sdg}`].join('\n');
    downloadFile(`${name.toLowerCase().replace(/\s+/g, '-')}.pdf`, content, 'application/pdf');
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <section className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-[#000000] inline-flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#da1a32]" />
            Custom Report Builder & Visualizer
          </h1>
          <div className="flex flex-wrap gap-2">
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="rounded-xl border-2 border-[#e5e5e5] px-3 py-2 text-sm"
            >
              <option value="q1_2026">Select Quarter: Q1 2026</option>
              <option value="q4_2025">Select Quarter: Q4 2025</option>
              <option value="q3_2025">Select Quarter: Q3 2025</option>
            </select>
            <select
              value={impactArea}
              onChange={(e) => setImpactArea(e.target.value)}
              className="rounded-xl border-2 border-[#e5e5e5] px-3 py-2 text-sm"
            >
              <option value="all">Select Impact Area: All</option>
              <option value="environmental">Select Impact Area: Environmental</option>
              <option value="social">Select Impact Area: Social</option>
              <option value="governance">Select Impact Area: Governance</option>
            </select>
            <button
              onClick={exportPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e5e5e5] text-sm hover:bg-[#edf2f4]"
            >
              <Download className="w-4 h-4 text-[#da1a32]" /> Export PDF
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#e5e5e5] text-sm hover:bg-[#edf2f4]"
            >
              <Download className="w-4 h-4 text-[#da1a32]" /> Export CSV
            </button>
          </div>
        </div>

        <div className="mt-5 grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#e5e5e5] p-4">
            <h2 className="text-sm font-semibold text-[#000000] inline-flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-[#da1a32]" />
              Items Diverted by Category
            </h2>
            <div className="mt-4 flex items-center gap-4">
              <div
                className="w-40 h-40 rounded-full"
                style={{
                  background:
                    'conic-gradient(#da1a32 0deg 216deg, #f59e0b 216deg 324deg, #3b82f6 324deg 360deg)',
                }}
              />
              <div className="space-y-2 text-sm text-gray-700">
                <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-[#da1a32] mr-2" />60% Electronics</p>
                <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-2" />30% Furniture</p>
                <p><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 mr-2" />10% Office Supplies</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#e5e5e5] p-4">
            <h2 className="text-sm font-semibold text-[#000000] inline-flex items-center gap-1.5">
              <CalendarRange className="w-4 h-4 text-[#da1a32]" />
              Logistics Deliveries Sponsored per Month
            </h2>
            <div className="mt-4 space-y-3">
              {MONTHLY_DELIVERIES.map((row) => (
                <div key={row.month}>
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>{row.month}</span>
                    <span>{row.count} deliveries</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#edf2f4]">
                    <div
                      className="h-2.5 rounded-full bg-[#da1a32]"
                      style={{ width: `${(row.count / maxDeliveries) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500">
                Showing sponsorship activity for {quarter === 'q1_2026' ? 'Q1 2026' : quarter} | Impact area: {impactArea}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl border-2 border-[#e5e5e5] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-[#da1a32]" />
          <h2 className="text-lg font-bold text-[#000000]">Generated ESG Archive</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-[#e5e5e5]">
                <th className="py-2 font-semibold">Report Name</th>
                <th className="py-2 font-semibold">Period</th>
                <th className="py-2 font-semibold">Primary SDG Focus</th>
                <th className="py-2 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {ARCHIVE.map((row) => (
                <tr key={row.id} className="border-b border-[#edf2f4] last:border-b-0">
                  <td className="py-3 text-[#000000] font-medium">{row.name}</td>
                  <td className="py-3 text-gray-600">{row.period}</td>
                  <td className="py-3">
                    <span className="inline-block px-2 py-1 rounded-lg text-xs bg-[#edf2f4] border border-[#e5e5e5] text-[#000000]">
                      {row.sdgFocus}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => downloadArchivePdf(row.name, row.period, row.sdgFocus)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e5e5e5] hover:bg-[#edf2f4] transition-all text-xs"
                    >
                      <Download className="w-3.5 h-3.5 text-[#da1a32]" />
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
