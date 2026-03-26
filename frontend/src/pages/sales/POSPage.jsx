import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/Layout";
import TableCard from "../../components/TableCard";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

function buildPayment(method = "cash", amount = 0) {
  return { payment_method: method, amount, reference_no: "" };
}

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

export default function POSPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();

  const [search, setSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState([]);
  const [payments, setPayments] = useState([buildPayment("cash", 0)]);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  const [message, setMessage] = useState("");
  const [isBarcodeScanning, setIsBarcodeScanning] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const scanInputRef = useRef(null);
  const cameraVideoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraRafRef = useRef(null);
  const detectorRef = useRef(null);
  const scanLockRef = useRef(false);

  const canCreateSale = hasPermission("pos.add");
  const canHoldSale = hasPermission("pos.hold");
  const canResume = hasPermission("pos.resume");

  const { data: productResults = [] } = useQuery({
    queryKey: ["pos-products", search],
    queryFn: () => api.pos.products({ q: search }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "dropdown"],
    queryFn: () => api.customers.list(),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: () => api.sales.list(),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const { data: heldBills = [] } = useQuery({
    queryKey: ["held-bills"],
    queryFn: () => api.heldBills.list(),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  });

  const { data: saleDetails } = useQuery({
    queryKey: ["sale-details", selectedSaleId],
    enabled: Boolean(selectedSaleId),
    queryFn: () => api.sales.getById(selectedSaleId),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (cameraRafRef.current) {
        cancelAnimationFrame(cameraRafRef.current);
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const totals = useMemo(() => {
    const subtotal = round2(cart.reduce((sum, item) => sum + item.quantity * Number(item.unit_price), 0));
    const discount = round2(cart.reduce((sum, item) => sum + Number(item.discount_amount || 0), 0));
    const tax = round2(
      cart.reduce(
        (sum, item) => sum + (item.quantity * Number(item.unit_price) - Number(item.discount_amount || 0)) * (Number(item.gst_percent || 0) / 100),
        0,
      ),
    );

    return {
      subtotal,
      discount,
      tax,
      total: round2(subtotal - discount + tax),
    };
  }, [cart]);

  const createSale = useMutation({
    mutationFn: (payload) => api.sales.create(payload),
    onSuccess: (result) => {
      const createdSaleId = result.sale_id ?? result.data?.id ?? result.id;
      setCart([]);
      setNotes("");
      setPayments([buildPayment("cash", 0)]);
      setSelectedSaleId(createdSaleId ?? null);
      setMessage(`Sale completed successfully${result.invoice_no ? ` (${result.invoice_no})` : ""}`);

      ["sales", "held-bills", "pos-products", "dashboard-summary", "reports-sales-summary", "reports-sales-list"].forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });

      if (createdSaleId) {
        navigate(`/sales/invoice/${createdSaleId}`);
      }
    },
    onError: (error) => {
      setMessage(error?.response?.data?.message || "Failed to complete sale");
    },
  });

  const holdSale = useMutation({
    mutationFn: (payload) => api.heldBills.create(payload),
    onSuccess: () => {
      setCart([]);
      setNotes("");
      setMessage("Bill held successfully");
      queryClient.invalidateQueries({ queryKey: ["held-bills"] });
    },
    onError: (error) => {
      setMessage(error?.response?.data?.message || "Failed to hold bill");
    },
  });

  function addToCart(product) {
    setCart((current) => {
      const existing = current.find((item) => item.product_id === product.id);
      const availableStock = Number(product.current_stock || 0);

      if (existing) {
        if (existing.quantity + 1 > availableStock) {
          setMessage(`Insufficient stock for ${product.name}`);
          return current;
        }
        return current.map((item) => (item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }

      if (availableStock <= 0) {
        setMessage(`Insufficient stock for ${product.name}`);
        return current;
      }

      return [
        ...current,
        {
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          quantity: 1,
          unit_price: Number(product.selling_price),
          gst_percent: Number(product.gst_percent || 0),
          discount_amount: 0,
          current_stock: availableStock,
        },
      ];
    });
  }

  async function handleScanSubmit(manualValue) {
    const scannedValue = String(manualValue ?? search || "").trim();
    if (!scannedValue || isBarcodeScanning) {
      return;
    }

    setIsBarcodeScanning(true);
    setMessage("");

    try {
      const product = await api.products.getByBarcode(scannedValue);
      addToCart(product);
      setSearch("");
      setCameraError("");
    } catch (error) {
      setSearch("");
      if (error?.response?.status === 404) {
        setMessage(`No product found for barcode: ${scannedValue}`);
      } else {
        setMessage(error?.response?.data?.message || "Failed to scan barcode");
      }
    } finally {
      setIsBarcodeScanning(false);
      scanInputRef.current?.focus();
    }
  }

  function handleScanInputKeyDown(event) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    handleScanSubmit();
  }

  function stopCameraScanner() {
    if (cameraRafRef.current) {
      cancelAnimationFrame(cameraRafRef.current);
      cameraRafRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    scanLockRef.current = false;
    setIsCameraOpen(false);
    scanInputRef.current?.focus();
  }

  async function startCameraScanner() {
    try {
      setCameraError("");

      if (!window.BarcodeDetector) {
        setCameraError("Camera barcode scan is not supported on this browser. Use Chrome on Android.");
        return;
      }

      if (!detectorRef.current) {
        detectorRef.current = new window.BarcodeDetector({
          formats: ["code_128", "ean_13", "ean_8", "upc_a", "upc_e"],
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });

      cameraStreamRef.current = stream;
      setIsCameraOpen(true);

      const video = cameraVideoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play();

      const tick = async () => {
        if (!cameraVideoRef.current || scanLockRef.current) {
          return;
        }

        try {
          const codes = await detectorRef.current.detect(cameraVideoRef.current);
          if (codes?.length && codes[0]?.rawValue) {
            const barcodeValue = String(codes[0].rawValue).trim();
            if (barcodeValue) {
              scanLockRef.current = true;
              setSearch(barcodeValue);
              await handleScanSubmit(barcodeValue);
              stopCameraScanner();
              return;
            }
          }
        } catch {
          // Keep scanning loop active.
        }

        cameraRafRef.current = requestAnimationFrame(tick);
      };

      cameraRafRef.current = requestAnimationFrame(tick);
    } catch (error) {
      setCameraError(error?.message || "Unable to open camera scanner.");
      stopCameraScanner();
    }
  }

  function validateCart() {
    if (!cart.length) {
      setMessage("Cart is empty");
      return false;
    }

    const invalidItem = cart.find((item) => item.quantity <= 0 || item.quantity > Number(item.current_stock || 0));
    if (invalidItem) {
      setMessage(`Invalid quantity for ${invalidItem.product_name}`);
      return false;
    }

    return true;
  }

  function submitSale() {
    if (!validateCart()) return;

    const paymentRows = payments
      .map((row) => ({ ...row, amount: Number(row.amount || 0) }))
      .filter((row) => row.amount > 0);

    if (!paymentRows.length) {
      paymentRows.push(buildPayment("cash", totals.total));
    }

    createSale.mutate({
      customer_id: selectedCustomerId ? Number(selectedCustomerId) : null,
      notes,
      items: cart,
      payments: paymentRows,
    });
  }

  function submitHoldBill() {
    if (!validateCart()) return;

    holdSale.mutate({
      customer_id: selectedCustomerId ? Number(selectedCustomerId) : null,
      notes,
      items: cart,
    });
  }

  async function resumeBill(id) {
    try {
      const held = await api.heldBills.resume(id);
      setSelectedCustomerId(held.customer_id || "");
      setNotes(held.notes || "");
      setCart(
        (held.items ?? []).map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          gst_percent: Number(item.gst_percent || 0),
          discount_amount: Number(item.discount_amount || 0),
          batch_id: item.batch_id,
          current_stock: Number(item.current_stock || 999999),
        })),
      );
      setPayments([buildPayment("cash", 0)]);
      setMessage(`Resumed bill ${held.hold_code}`);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to resume bill");
    }
  }

  return (
    <Layout title="Sales / POS">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <div className="space-y-6">
          {message ? <div className="rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</div> : null}

          <div className="card p-4">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px_260px]">
              <div className="flex items-center gap-2">
                <input
                  ref={scanInputRef}
                  className="input"
                  placeholder="Scan barcode or search name / SKU"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={handleScanInputKeyDown}
                  autoFocus
                />
              </div>
              <button
                type="button"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                onClick={startCameraScanner}
              >
                Scan Camera
              </button>
              <select className="input" value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}>
                <option value="">Walk-in customer</option>
                {customers.map((row) => (
                  <option key={row.id} value={row.id}>{row.customer_name} {row.phone ? `(${row.phone})` : ""}</option>
                ))}
              </select>
            </div>
            {cameraError ? <div className="mt-3 text-xs text-rose-600">{cameraError}</div> : null}
          </div>

          <TableCard title="POS Products">
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
              {productResults.map((product) => (
                <button
                  key={product.id}
                  className="rounded-2xl border border-slate-200 p-4 text-left hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!canCreateSale || Number(product.current_stock || 0) <= 0}
                  onClick={() => addToCart(product)}
                >
                  <div className="font-semibold text-slate-900">{product.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{product.sku}{product.barcode ? ` • ${product.barcode}` : ""}</div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span>₹ {product.selling_price}</span>
                    <span className="text-slate-500">Stock {product.current_stock}</span>
                  </div>
                </button>
              ))}
            </div>
          </TableCard>

          <TableCard title="Bill History">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Cashier</th>
                  <th className="px-4 py-3">Payments</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((row) => (
                  <tr key={row.id} className="cursor-pointer border-t border-slate-200 hover:bg-slate-50" onClick={() => setSelectedSaleId(row.id)}>
                    <td className="px-4 py-3">{row.invoice_no}</td>
                    <td className="px-4 py-3">{row.customer_name || "Walk-in"}</td>
                    <td className="px-4 py-3">{row.cashier_name}</td>
                    <td className="px-4 py-3 uppercase">{row.payment_methods || "-"}</td>
                    <td className="px-4 py-3">₹ {row.total_amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </div>

        <div className="space-y-6">
          <div className="card p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Current Cart</h3>
              <button className="text-sm text-slate-500" onClick={() => setCart([])}>Clear</button>
            </div>

            <div className="space-y-3">
              {cart.length ? cart.map((item) => (
                <div key={item.product_id} className="rounded-2xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">{item.product_name}</div>
                      <div className="text-xs text-slate-500">{item.sku}</div>
                    </div>
                    <button className="text-xs text-rose-600" onClick={() => setCart((current) => current.filter((row) => row.product_id !== item.product_id))}>Remove</button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <input className="input" type="number" min="1" max={item.current_stock} value={item.quantity} onChange={(event) => setCart((current) => current.map((row) => (row.product_id === item.product_id ? { ...row, quantity: Number(event.target.value || 1) } : row)))} />
                    <input className="input" type="number" min="0" step="0.01" value={item.discount_amount} onChange={(event) => setCart((current) => current.map((row) => (row.product_id === item.product_id ? { ...row, discount_amount: Number(event.target.value || 0) } : row)))} />
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">₹ {(item.quantity * item.unit_price).toFixed(2)}</div>
                  </div>
                </div>
              )) : <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">Search a product and add it to the cart.</div>}
            </div>

            <textarea className="input mt-4 min-h-24" placeholder="Bill notes / invoice notes" value={notes} onChange={(event) => setNotes(event.target.value)} />

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm"><span>Subtotal</span><span>₹ {totals.subtotal.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-sm"><span>Discount</span><span>₹ {totals.discount.toFixed(2)}</span></div>
              <div className="flex items-center justify-between text-sm"><span>Tax</span><span>₹ {totals.tax.toFixed(2)}</span></div>
              <div className="flex items-center justify-between border-t pt-3 text-base font-semibold"><span>Total</span><span>₹ {totals.total.toFixed(2)}</span></div>
            </div>

            <div className="mt-4 space-y-3">
              {payments.map((payment, index) => (
                <div key={index} className="grid gap-3 sm:grid-cols-3">
                  <select className="input" value={payment.payment_method} onChange={(event) => setPayments((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, payment_method: event.target.value } : row)))}>
                    {["cash", "card", "upi", "wallet", "mixed"].map((method) => <option key={method} value={method}>{method.toUpperCase()}</option>)}
                  </select>
                  <input className="input" type="number" min="0" step="0.01" placeholder="Amount" value={payment.amount} onChange={(event) => setPayments((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, amount: event.target.value } : row)))} />
                  <input className="input" placeholder="Reference" value={payment.reference_no} onChange={(event) => setPayments((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, reference_no: event.target.value } : row)))} />
                </div>
              ))}
              <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 text-sm" onClick={() => setPayments((current) => [...current, buildPayment("upi", 0)])}>Add Payment Row</button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {canHoldSale ? <button className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700" onClick={submitHoldBill} disabled={holdSale.isPending || createSale.isPending}>{holdSale.isPending ? "Holding..." : "Hold Bill"}</button> : <div />}
              {canCreateSale ? <button className="btn-primary" onClick={submitSale} disabled={createSale.isPending || holdSale.isPending}>{createSale.isPending ? "Processing..." : "Complete Sale"}</button> : null}
            </div>
          </div>

          {canResume ? (
            <TableCard title="Held Bills">
              <div className="space-y-3">
                {heldBills.map((bill) => (
                  <div key={bill.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-900">{bill.hold_code}</div>
                        <div className="text-xs text-slate-500">{bill.customer_name || "Walk-in"} • {bill.item_count} items</div>
                      </div>
                      <button className="text-emerald-600" onClick={() => resumeBill(bill.id)}>Resume</button>
                    </div>
                  </div>
                ))}
              </div>
            </TableCard>
          ) : null}

          {saleDetails ? (
            <TableCard title={`Invoice Preview: ${saleDetails.invoice_no}`}>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">Vertex Supermarket GST Invoice</div>
                    <div className="text-slate-500">{saleDetails.customer_name || "Walk-in customer"}</div>
                  </div>
                  <button className="btn-primary" onClick={() => navigate(`/sales/invoice/${saleDetails.id}`)}>Open Invoice</button>
                </div>
                <div className="space-y-2">
                  {(saleDetails.items ?? []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                      <span>{item.product_name} x {item.quantity}</span>
                      <span>₹ {item.line_total}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between font-semibold"><span>Total</span><span>₹ {saleDetails.total_amount}</span></div>
              </div>
            </TableCard>
          ) : null}
        </div>
      </div>

      {isCameraOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Scan Barcode</h3>
              <button
                type="button"
                className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-700"
                onClick={stopCameraScanner}
              >
                Close
              </button>
            </div>
            <video ref={cameraVideoRef} className="h-72 w-full rounded-xl bg-black object-cover" playsInline muted />
            <p className="mt-2 text-xs text-slate-500">Point camera at barcode. It auto-adds on successful scan.</p>
          </div>
        </div>
      ) : null}
    </Layout>
  );
}
