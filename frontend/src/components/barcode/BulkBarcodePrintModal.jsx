import { useEffect, useMemo, useState } from "react";

function toInitialCopies(products) {
  return (products ?? []).reduce((acc, row) => {
    acc[row.id] = 1;
    return acc;
  }, {});
}

export default function BulkBarcodePrintModal({ isOpen, selectedProducts, onClose, onPrint }) {
  const [copiesMap, setCopiesMap] = useState({});

  useEffect(() => {
    if (isOpen) {
      setCopiesMap(toInitialCopies(selectedProducts));
    }
  }, [isOpen, selectedProducts]);

  const validProducts = useMemo(
    () => (selectedProducts ?? []).filter((row) => String(row.barcode ?? "").trim()),
    [selectedProducts],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Bulk Print Barcodes</h3>
            <p className="mt-1 text-sm text-slate-500">
              Set copies per product. Only products with a barcode will be printed.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700">
            Close
          </button>
        </div>

        <div className="mt-4 max-h-80 overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Barcode</th>
                <th className="px-4 py-3">Copies</th>
              </tr>
            </thead>
            <tbody>
              {(selectedProducts ?? []).map((row) => {
                const hasBarcode = String(row.barcode ?? "").trim().length > 0;
                return (
                  <tr key={row.id} className="border-t border-slate-200 align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.name}</div>
                      <div className="text-xs text-slate-500">₹ {row.selling_price}</div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{hasBarcode ? row.barcode : "Missing barcode"}</td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        max="500"
                        disabled={!hasBarcode}
                        value={copiesMap[row.id] ?? 1}
                        onChange={(event) => {
                          const value = Math.max(1, Math.min(500, Number(event.target.value || 1)));
                          setCopiesMap((current) => ({ ...current, [row.id]: value }));
                        }}
                        className="input max-w-24"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">{validProducts.length} of {(selectedProducts ?? []).length} selected products are printable.</p>
          <button
            type="button"
            onClick={() => {
              const items = validProducts.map((row) => ({
                id: row.id,
                productName: row.name,
                barcode: row.barcode,
                price: row.selling_price,
                copies: Math.max(1, Number(copiesMap[row.id] ?? 1)),
              }));
              onPrint(items);
            }}
            disabled={!validProducts.length}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            Print Selected
          </button>
        </div>
      </div>
    </div>
  );
}
