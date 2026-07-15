import { useState, useMemo, useEffect } from "react";
import { Plus, Minus, Trash2, Receipt, Coffee, IceCreamCone, Croissant, History, ArrowLeft } from "lucide-react";

const CATEGORIES = [
  {
    id: "coffee",
    label: "ກາເຟ",
    icon: Coffee,
    items: [
      { id: "esp", name: "ເອສເປຣັດໂຊ", price: 15000 },
      { id: "ame", name: "ອາເມຣິກາໂນ", price: 18000 },
      { id: "lat", name: "ລາເຕ້", price: 22000 },
      { id: "cap", name: "ຄາປູຊິໂນ", price: 22000 },
      { id: "moc", name: "ໂມກາ", price: 25000 },
    ],
  },
  {
    id: "cold",
    label: "ເຄື່ອງດື່ມເຢັນ",
    icon: IceCreamCone,
    items: [
      { id: "ice", name: "ກາເຟເຢັນ", price: 20000 },
      { id: "tha", name: "ຊາໄທ", price: 18000 },
      { id: "lem", name: "ນ້ຳໝາກນາວ", price: 15000 },
    ],
  },
  {
    id: "bakery",
    label: "ເບເກີຣີ",
    icon: Croissant,
    items: [
      { id: "cro", name: "ຄຣົວຊອງ", price: 15000 },
      { id: "cak", name: "ເຄັກຊັອກໂກແລັດ", price: 20000 },
      { id: "san", name: "ແຊນວິດ", price: 25000 },
    ],
  },
];

const HISTORY_KEY = "cafe-pos-sales-history";

function formatKip(n) {
  return n.toLocaleString("en-US") + " ₭";
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("lo-LA", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("lo-LA", { hour: "2-digit", minute: "2-digit" });
}

function newOrderNo() {
  return Math.floor(1000 + Math.random() * 9000);
}

export default function CafePOS() {
  const [view, setView] = useState("pos"); // "pos" | "history"
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].id);
  const [cart, setCart] = useState([]);
  const [paidInput, setPaidInput] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderNo, setOrderNo] = useState(() => newOrderNo());

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  // Load sales history once on mount (from this browser's local storage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      setHistory(raw ? JSON.parse(raw) : []);
    } catch (e) {
      // Corrupted or missing data is fine on first run
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const category = CATEGORIES.find((c) => c.id === activeCat);

  const addItem = (item) => {
    setShowReceipt(false);
    setCart((prev) => {
      const found = prev.find((p) => p.id === item.id);
      if (found) {
        return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setShowReceipt(false);
    setCart((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, qty: p.qty + delta } : p))
        .filter((p) => p.qty > 0)
    );
  };

  const removeItem = (id) => {
    setShowReceipt(false);
    setCart((prev) => prev.filter((p) => p.id !== id));
  };

  const total = useMemo(() => cart.reduce((sum, p) => sum + p.price * p.qty, 0), [cart]);
  const paid = Number(paidInput) || 0;
  const change = paid - total;

  const canCheckout = cart.length > 0 && paid >= total;

  const completeSale = () => {
    setShowReceipt(true);

    const sale = {
      orderNo,
      date: new Date().toISOString(),
      items: cart.map((p) => ({ name: p.name, price: p.price, qty: p.qty })),
      total,
      paid,
      change,
    };

    const updatedHistory = [sale, ...history];
    setHistory(updatedHistory);

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      setHistoryError(false);
    } catch (e) {
      setHistoryError(true);
    }

    setTimeout(() => {
      setCart([]);
      setPaidInput("");
      setOrderNo(newOrderNo());
    }, 1400);
  };

  const todayTotal = useMemo(() => {
    const todayStr = new Date().toDateString();
    return history
      .filter((s) => new Date(s.date).toDateString() === todayStr)
      .reduce((sum, s) => sum + s.total, 0);
  }, [history]);

  return (
    <div
      style={{
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        background: "#1B120D",
        minHeight: "100%",
        color: "#F3E9DA",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 24px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            ຮ້ານກາເຟ ບ້ານສວນ
          </span>
          <span style={{ color: "#C08D4A", fontSize: 13 }}>
            {view === "pos" ? "ລະບົບຂາຍໜ້າຮ້ານ" : "ປະຫວັດການຂາຍ"}
          </span>
        </div>

        <button
          onClick={() => setView(view === "pos" ? "history" : "pos")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 14px",
            borderRadius: 8,
            border: "1px solid #3A281C",
            background: "transparent",
            color: "#F3E9DA",
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          {view === "pos" ? (
            <>
              <History size={15} />
              ປະຫວັດການຂາຍ
            </>
          ) : (
            <>
              <ArrowLeft size={15} />
              ກັບໄປໜ້າຂາຍ
            </>
          )}
        </button>
      </div>

      {view === "pos" ? (
        <div
          style={{
            display: "flex",
            gap: 16,
            padding: "0 16px 16px",
            flex: 1,
            minHeight: 560,
          }}
        >
          {/* Menu side */}
          <div style={{ flex: 1.4, display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Category tabs */}
            <div style={{ display: "flex", gap: 8 }}>
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const active = c.id === activeCat;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCat(c.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: active ? "1px solid #C08D4A" : "1px solid #3A281C",
                      background: active ? "#C08D4A" : "transparent",
                      color: active ? "#1B120D" : "#F3E9DA",
                      fontWeight: active ? 700 : 500,
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Icon size={15} />
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Item grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 10,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {category.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  style={{
                    textAlign: "left",
                    background: "#2A1D14",
                    border: "1px solid #3A281C",
                    borderRadius: 10,
                    padding: "14px 14px 12px",
                    cursor: "pointer",
                    color: "#F3E9DA",
                    transition: "border-color 0.15s ease, transform 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#C08D4A")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#3A281C")}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{item.name}</div>
                  <div style={{ fontSize: 13, color: "#C08D4A", fontFamily: "ui-monospace, monospace" }}>
                    {formatKip(item.price)}
                  </div>
                </button>
              ))}
            </div>

            {/* Today's total strip */}
            <div
              style={{
                marginTop: "auto",
                fontSize: 12,
                color: "#9C8B77",
                display: "flex",
                justifyContent: "space-between",
                borderTop: "1px solid #3A281C",
                paddingTop: 10,
              }}
            >
              <span>ຍອດຂາຍມື້ນີ້</span>
              <span style={{ color: "#C08D4A", fontWeight: 700 }}>{formatKip(todayTotal)}</span>
            </div>
          </div>

          {/* Receipt / cart side */}
          <div
            style={{
              flex: 1,
              minWidth: 260,
              maxWidth: 300,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                background: "#FBF7EF",
                color: "#2A1D14",
                borderRadius: "4px 4px 0 0",
                padding: "18px 16px 10px",
                fontFamily: "ui-monospace, 'SF Mono', monospace",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>ໃບບິນ</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>ອໍເດີ #{orderNo}</div>
              </div>
              <div style={{ borderTop: "1px dashed #B0A38F", margin: "6px 0 10px" }} />

              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                {cart.length === 0 && (
                  <div style={{ fontSize: 12, opacity: 0.5, textAlign: "center", marginTop: 20 }}>
                    ຍັງບໍ່ມີລາຍການ — ກົດເມນູເພື່ອເພີ່ມ
                  </div>
                )}
                {cart.map((p) => (
                  <div key={p.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span>{p.name}</span>
                      <span>{formatKip(p.price * p.qty)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <button onClick={() => changeQty(p.id, -1)} style={iconBtnStyle}>
                        <Minus size={11} />
                      </button>
                      <span style={{ fontSize: 11, minWidth: 14, textAlign: "center" }}>{p.qty}</span>
                      <button onClick={() => changeQty(p.id, 1)} style={iconBtnStyle}>
                        <Plus size={11} />
                      </button>
                      <button
                        onClick={() => removeItem(p.id)}
                        style={{ ...iconBtnStyle, marginLeft: "auto", color: "#A24B3B" }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: "1px dashed #B0A38F", margin: "10px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700 }}>
                <span>ລວມທັງໝົດ</span>
                <span>{formatKip(total)}</span>
              </div>

              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 10, opacity: 0.6 }}>ຮັບເງິນມາ</label>
                <input
                  type="number"
                  value={paidInput}
                  onChange={(e) => {
                    setShowReceipt(false);
                    setPaidInput(e.target.value);
                  }}
                  placeholder="0"
                  style={{
                    width: "100%",
                    marginTop: 3,
                    padding: "6px 8px",
                    fontFamily: "inherit",
                    fontSize: 13,
                    border: "1px solid #B0A38F",
                    borderRadius: 4,
                    background: "#fff",
                    color: "#2A1D14",
                  }}
                />
              </div>

              {paidInput !== "" && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    marginTop: 6,
                    color: change < 0 ? "#A24B3B" : "#4F6B4C",
                    fontWeight: 700,
                  }}
                >
                  <span>{change < 0 ? "ຍັງຂາດ" : "ເງິນທອນ"}</span>
                  <span>{formatKip(Math.abs(change))}</span>
                </div>
              )}

              {showReceipt && (
                <div style={{ marginTop: 10, fontSize: 10, textAlign: "center", opacity: 0.6 }}>
                  {historyError
                    ? "⚠ ຂາຍສຳເລັດ (ບໍ່ໄດ້ບັນທຶກປະຫວັດ)"
                    : "✓ ຂາຍສຳເລັດ — ບັນທຶກແລ້ວ"}
                </div>
              )}
            </div>

            {/* Perforated tear edge */}
            <div
              style={{
                height: 14,
                background: "#FBF7EF",
                clipPath:
                  "polygon(0% 0%, 4% 100%, 8% 0%, 12% 100%, 16% 0%, 20% 100%, 24% 0%, 28% 100%, 32% 0%, 36% 100%, 40% 0%, 44% 100%, 48% 0%, 52% 100%, 56% 0%, 60% 100%, 64% 0%, 68% 100%, 72% 0%, 76% 100%, 80% 0%, 84% 100%, 88% 0%, 92% 100%, 96% 0%, 100% 100%)",
              }}
            />

            <button
              disabled={!canCheckout}
              onClick={completeSale}
              style={{
                marginTop: 14,
                padding: "12px",
                borderRadius: 8,
                border: "none",
                background: canCheckout ? "#C08D4A" : "#3A281C",
                color: canCheckout ? "#1B120D" : "#7A6A5A",
                fontWeight: 700,
                fontSize: 14,
                cursor: canCheckout ? "pointer" : "not-allowed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Receipt size={16} />
              ອອກໃບບິນ & ຂາຍ
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: "0 24px 24px", flex: 1, overflowY: "auto" }}>
          {historyLoading ? (
            <div style={{ opacity: 0.6, fontSize: 13 }}>ກຳລັງໂຫຼດ...</div>
          ) : history.length === 0 ? (
            <div style={{ opacity: 0.5, fontSize: 13, marginTop: 20 }}>
              ຍັງບໍ່ມີປະຫວັດການຂາຍ
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 16,
                  padding: "12px 16px",
                  background: "#2A1D14",
                  borderRadius: 10,
                  border: "1px solid #3A281C",
                }}
              >
                <span style={{ fontSize: 13, color: "#9C8B77" }}>ຍອດຂາຍລວມ ({history.length} ອໍເດີ)</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#C08D4A" }}>
                  {formatKip(history.reduce((s, h) => s + h.total, 0))}
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((sale, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#2A1D14",
                      border: "1px solid #3A281C",
                      borderRadius: 10,
                      padding: "12px 16px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>ອໍເດີ #{sale.orderNo}</span>
                      <span style={{ fontSize: 12, color: "#9C8B77" }}>{formatDateTime(sale.date)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#C9BEA8", marginBottom: 6 }}>
                      {sale.items.map((it) => `${it.name} x${it.qty}`).join(", ")}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#C08D4A" }}>
                        {formatKip(sale.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const iconBtnStyle = {
  width: 18,
  height: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #C9BEA8",
  borderRadius: 4,
  background: "transparent",
  cursor: "pointer",
  color: "#2A1D14",
};
