import { useEffect, useMemo, useRef } from "react";
import JsBarcode from "jsbarcode";

function formatPrice(price) {
  const amount = Number(price || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function BarcodeSticker({ productName, barcode, price, copies = 1 }) {
  const safeCopies = Math.max(1, Number(copies) || 1);
  const normalizedBarcode = String(barcode ?? "").trim();
  const refs = useRef([]);

  const labels = useMemo(
    () => Array.from({ length: safeCopies }, (_, index) => `${normalizedBarcode}-${index}`),
    [normalizedBarcode, safeCopies],
  );

  useEffect(() => {
    refs.current = refs.current.slice(0, safeCopies);

    refs.current.forEach((svg) => {
      if (!svg || !normalizedBarcode) return;

      try {
        JsBarcode(svg, normalizedBarcode, {
          format: "CODE128",
          displayValue: false,
          margin: 0,
          width: 1.35,
          height: 32,
        });
      } catch {
        svg.innerHTML = "";
      }
    });
  }, [normalizedBarcode, safeCopies]);

  return (
    <>
      {labels.map((key, index) => (
        <div key={key} className="barcode-label">
          <div className="barcode-name" title={productName || "-"}>
            {productName || "-"}
          </div>

          <div className="barcode-svg-wrap">
            <svg
              ref={(element) => {
                refs.current[index] = element;
              }}
              className="barcode-svg"
              aria-label={`Barcode for ${productName || "product"}`}
            />
          </div>

          <div className="barcode-value">{normalizedBarcode || "NO BARCODE"}</div>
          <div className="barcode-price">{formatPrice(price)}</div>
        </div>
      ))}
    </>
  );
}
