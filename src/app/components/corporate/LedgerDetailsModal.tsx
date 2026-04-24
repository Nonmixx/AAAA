'use client';

import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  assetConditionLabel,
  ledgerStatusLabel,
  type LedgerItem,
} from '../../../lib/supabase/corporate-ledger';

type LedgerDetailsModalProps = {
  detailItem: LedgerItem | null;
  onClose: () => void;
};

export function LedgerDetailsModal({ detailItem, onClose }: LedgerDetailsModalProps) {
  if (!detailItem || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-[#e5e5e5] bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ledger-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 id="ledger-detail-title" className="text-lg font-bold text-[#000000]">
              Submission details
            </h3>
            <p className="mt-1 text-xs text-gray-500">{detailItem.activityType}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-[#edf2f4]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {detailItem.bulkDetails ? (
          <dl className="space-y-3 text-sm">
            {(
              [
                ['Date submitted', detailItem.dateLabel],
                ['Status', ledgerStatusLabel(detailItem.status)],
                ['Asset category', detailItem.bulkDetails.assetCategory],
                ['Item description', detailItem.bulkDetails.itemDescription],
                ['Total units', detailItem.bulkDetails.totalUnits],
                ['Est. weight (kg)', detailItem.bulkDetails.estimatedWeightKg],
                ['Condition', assetConditionLabel(detailItem.bulkDetails.assetCondition)],
                ['Pickup location', detailItem.bulkDetails.pickupLocation],
                ['Available pickup date', detailItem.bulkDetails.availablePickupDate],
                ['Contact name', detailItem.bulkDetails.contactName],
                ['Contact phone', detailItem.bulkDetails.contactPhone],
                ['Primary impact goal', detailItem.bulkDetails.primaryImpactGoal],
                ['Photos selected (count)', String(detailItem.bulkDetails.photoFileCount)],
              ] as const
            ).map(([label, val]) =>
              val !== undefined && val !== '' ? (
                <div key={label} className="border-b border-[#edf2f4] pb-2 last:border-0">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-[#000000]">{val}</dd>
                </div>
              ) : null,
            )}
            {Array.isArray(detailItem.bulkDetails.photoUrls) && detailItem.bulkDetails.photoUrls.length > 0 ? (
              <div className="border-b border-[#edf2f4] pb-2 last:border-0">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Uploaded photos</dt>
                <dd className="mt-2">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {detailItem.bulkDetails.photoUrls.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block aspect-square overflow-hidden rounded-lg border border-[#e5e5e5] bg-[#edf2f4]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- remote Supabase public URLs */}
                        <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </a>
                    ))}
                  </div>
                </dd>
              </div>
            ) : detailItem.bulkDetails.photoFileCount > 0 ? (
              <p className="text-xs text-gray-500">
                This submission recorded {detailItem.bulkDetails.photoFileCount} photo(s), but no image URLs were stored
                (submitted before uploads were enabled, or upload failed). Configure the storage bucket and submit again
                to attach images.
              </p>
            ) : null}
          </dl>
        ) : (
          <div className="space-y-2 text-sm text-gray-600">
            <p>This line has no stored submission form snapshot (e.g. legacy or non-bulk entry).</p>
            {detailItem.notes ? (
              <p className="rounded-lg border border-[#e5e5e5] bg-[#edf2f4]/50 p-3 whitespace-pre-wrap">
                {detailItem.notes}
              </p>
            ) : null}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#000000] px-3.5 py-2 text-sm font-medium text-white hover:bg-[#1f1f1f]"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
