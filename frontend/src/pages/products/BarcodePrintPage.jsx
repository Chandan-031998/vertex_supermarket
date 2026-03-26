import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import BarcodeSticker from "../../components/barcode/BarcodeSticker";
import "../../styles/print.css";

function normalizePrintItems(state) {
  if (!state) return [];
  if (Array.isArray(state.items)) {
    return state.items
      .map((row) => ({
        id: row.id,
        productName: row.productName || row.name || "",
        barcode: String(row.barcode ?? "").trim(),
        price: row.price ?? row.selling_price ?? 0,
        copies: Math.max(1, Number(row.copies || 1)),
      }))
      .filter((row) => row.barcode);
  }

  if (state.product) {
    const product = state.product;
    const barcode = String(product.barcode ?? "").trim();
    if (!barcode) return [];
    return [{
      id: product.id,
      productName: product.productName || product.name || "",
      barcode,
      price: product.price ?? product.selling_price ?? 0,
      copies: Math.max(1, Number(state.copies || 1)),
    }];
  }

  return [];
}

export default function BarcodePrintPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const [isDownloading, setIsDownloading] = useState(false);
  const printTriggeredRef = useRef(false);
  const printAreaRef = useRef(null);

  const printItems = useMemo(() => normalizePrintItems(state), [state]);

  useEffect(() => {
    if (!printItems.length || printTriggeredRef.current) return;

    printTriggeredRef.current = true;
    const timer = setTimeout(() => {
      window.print();
    }, 450);

    return () => clearTimeout(timer);
  }, [printItems]);

  async function handleDownloadPdf() {
    if (!printAreaRef.current || !printItems.length) return;

    setIsDownloading(true);
    try {
      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const renderWidth = pageWidth - margin * 2;
      const renderHeight = (canvas.height * renderWidth) / canvas.width;

      if (renderHeight <= pageHeight - margin * 2) {
        pdf.addImage(imageData, "PNG", margin, margin, renderWidth, renderHeight);
      } else {
        const ratio = (pageHeight - margin * 2) / renderHeight;
        pdf.addImage(imageData, "PNG", margin, margin, renderWidth * ratio, pageHeight - margin * 2);
      }

      pdf.save("barcode-labels.pdf");
    } finally {
      setIsDownloading(false);
    }
  }

  if (!printItems.length) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">No barcode labels found</h1>
          <p className="mt-2 text-sm text-slate-600">Open this page from the products list using Print Barcode or Bulk Print.</p>
          <button type="button" className="btn-primary mt-4" onClick={() => navigate("/products")}>Back to Products</button>
        </div>
      </div>
    );
  }

  return (
    <div className="barcode-print-page min-h-screen bg-slate-100 p-4 sm:p-6">
      <div className="no-print mx-auto mb-4 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Barcode Print Preview</h1>
          <p className="text-xs text-slate-500">{printItems.length} product(s), auto print enabled</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => navigate("/products")}>Back</button>
          <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => window.print()}>Print Again</button>
          <button type="button" className="btn-primary" onClick={handleDownloadPdf} disabled={isDownloading}>
            {isDownloading ? "Preparing PDF..." : "Download PDF"}
          </button>
        </div>
      </div>

      <div ref={printAreaRef} className="barcode-sheet mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-3 sm:p-4">
        {printItems.map((item) => (
          <BarcodeSticker
            key={`${item.id}-${item.barcode}`}
            productName={item.productName}
            barcode={item.barcode}
            price={item.price}
            copies={item.copies}
          />
        ))}
      </div>
    </div>
  );
}
