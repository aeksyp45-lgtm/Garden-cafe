import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Receipt,
  Coffee,
  History,
  ArrowLeft,
  Package,
  BarChart3,
  ShoppingCart,
  Save,
  X,
} from "lucide-react";

const MENU_KEY = "cafe-pos-menu";
const HISTORY_KEY = "cafe-pos-sales-history";
const CLOSURES_KEY = "cafe-pos-day-closures";

const DEFAULT_MENU = [
  {
    id: "coffee",
    label: "ກາເຟ",
    items: [
      { id: "esp", name: "ເອສເປຣັດໂຊ", price: 15000, stock: null },
      { id: "ame", name: "ອາເມຣິກາໂນ", price: 18000, stock: null },
      { id: "lat", name: "ລາເຕ້", price: 22000, stock: null },
      { id: "cap", name: "ຄາປູຊິໂນ", price: 22000, stock: null },
      { id: "moc", name: "ໂມກາ", price: 25000, stock: null },
    ],
  },
  {
    id: "cold",
    label: "ເຄື່ອງດື່ມເຢັນ",
    items: [
      { id: "ice", name: "ກາເຟເຢັນ", price: 20000, stock: null },
      { id: "tha", name: "ຊາໄທ", price: 18000, stock: null },
      { id: "lem", name: "ນ້ຳໝາກນາວ", price: 15000, stock: null },
    ],
  },
  {
    id: "bakery",
    label: "ເບເກີຣີ",
    items: [
      { id: "cro", name: "ຄຣົວຊອງ", price: 15000, stock: 10 },
      { id: "cak", name: "ເຄັກຊັອກໂກແລັດ", price: 20000, stock: 8 },
      { id: "san", name: "ແຊນວິດ", price: 25000, stock: 6 },
    ],
  },
];

function formatKip(n) {
  return n.toLocaleString("en-US") + " ₭";
}

function formatDateTime(iso) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("lo-LA", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("lo-LA", { hour: "2-digit", minute: "2-digit" })
  );
}

function newOrderNo() {
  return Math.floor(1000 + Math.random() * 9000);
}

function uid() {
  return Math.random().toString(36).slice(2, 8);
}

function loadKey(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function saveKey(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    return false;
  }
}

export default function CafePOS() {
  const [view, setView] = useState("pos"); // pos | history | manage | summary
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);

  const [menu, setMenu] = useState(DEFAULT_MENU);
  const [activeCat, setActiveCat] = useState(DEFAULT_MENU[0].id);
  const [cart, setCart] = useState([]);
  const [paidInput, setPaidInput] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderNo, setOrderNo] = useState(() => newOrderNo());

  const [history, setHistory] = useState([]);
  const [closures, setClosures] = useState([]);

  useEffect(() => {
    const m = loadKey(MENU_KEY, DEFAULT_MENU);
    const h = loadKey(HISTORY_KEY, []);
    const c = loadKey(CLOSURES_KEY, []);
    setMenu(m);
    setActiveCat(m[0]?.id ?? "");
    setHistory(h);
    setClosures(c);
    setLoading(false);
  }, []);

  const category = menu.find((c) => c.id === activeCat) || menu[0];

  const persistMenu = (nextMenu) => {
    setMenu(nextMenu);
    const ok = saveKey(MENU_KEY, nextMenu);
    setSaveError(!ok);
  };

  const addItem = (item) => {
    if (item.stock !== null && item.stock <= 0) return;
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
      prev.map((p) => (p.id === id ? { ...p, qty: p.qty + delta } : p)).filter((p) => p.qty > 0)
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

    // decrement stock where tracked
    const nextMenu = menu.map((cat) => ({
      ...cat,
      items: cat.items.map((it) => {
        const sold = cart.find((c) => c.id === it.id);
        if (sold && it.stock !== null) {
          return { ...it, stock: Math.max(0, it.stock - sold.qty) };
        }
        return it;
      }),
    }));

    const sale = {
      orderNo,
      date: new Date().toISOString(),
      items: cart.map((p) => ({ name: p.name, price: p.price, qty: p.qty })),
      total,
      paid,
      change,
    };
    const updatedHistory = [sale, ...history];

    setMenu(nextMenu);
    setHistory(updatedHistory);

    const ok1 = saveKey(MENU_KEY, nextMenu);
    const ok2 = saveKey(HISTORY_KEY, updatedHistory);
    setSaveError(!(ok1 && ok2));

    setTimeout(() => {
      setCart([]);
      setPaidInput("");
      setOrderNo(newOrderNo());
    }, 1400);
  };

  // ---- Today's stats ----
  const todaySales = useMemo(() => {
    const todayStr = new Date().toDateString();
    return history.filter((s) => new Date(s.date).toDateString() === todayStr);
  }, [history]);

  const todayTotal = todaySales.reduce((s, sale) => s + sale.total, 0);

  const todayItemsSold = useMemo(() => {
    const map = {};
    todaySales.forEach((sale) => {
      sale.items.forEach((it) => {
        map[it.name] = (map[it.name] || 0) + it.qty;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [todaySales]);

  const closeToday = () => {
    const todayStr = new Date().toDateString();
    const record = {
      dateStr: todayStr,
      date: new Date().toISOString(),
      total: todayTotal,
      orderCount: todaySales.length,
      itemsSold: todayItemsSold,
    };
    const existingIdx = closures.findIndex((c) => c.dateStr === todayStr);
    const next =
      existingIdx >= 0
        ? closures.map((c, i) => (i === existingIdx ? record : c))
        : [record, ...closures];
    setClosures(next);
    const ok = saveKey(CLOSURES_KEY, next);
    setSaveError(!ok);
  };

  // ---- Menu management ----
  const updateItem = (catId, itemId, field, value) => {
    const nextMenu = menu.map((cat) =>
      cat.id !== catId
        ? cat
        : {
            ...cat,
            items: cat.items.map((it) =>
              it.id !== itemId
                ? it
                : {
                    ...it,
                    [field]:
                      field === "name" ? value : value === "" ? (field === "stock" ? null : 0) : Number(value),
                  }
            ),
          }
    );
    persistMenu(nextMenu);
  };

  const deleteItem = (catId, itemId) => {
    const nextMenu = menu.map((cat) =>
      cat.id !== catId ? cat : { ...cat, items: cat.items.filter((it) => it.id !== itemId) }
    );
    persistMenu(nextMenu);
  };

  const addNewItem = (catId, name, price, stock) => {
    if (!name || !price) return;
    const nextMenu = menu.map((cat) =>
      cat.id !== catId
        ? cat
        : {
            ...cat,
            items: [
              ...cat.items,
              { id: uid(), name, price: Number(price), stock: stock === "" ? null : Number(stock) },
            ],
          }
    );
    persistMenu(nextMenu);
  };

  const addNewCategory = (label) => {
    if (!label) return;
    const nextMenu = [...menu, { id: uid(), label, items: [] }];
    persistMenu(nextMenu);
  };

  const deleteCategory = (catId) => {
    const nextMenu = menu.filter((cat) => cat.id !== catId);
    persistMenu(nextMenu);
    if (activeCat === catId && nextMenu.length) setActiveCat(nextMenu[0].id);
  };

  const navBtn = (key, label, Icon) => (
    <button
      onClick={() => setView(key)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 14px",
        borderRadius: 8,
        border: view === key ? "1px solid #C08D4A" : "1px solid #3A281C",
        background: view === key ? "#C08D4A" : "transparent",
        color: view === key ? "#1B120D" : "#F3E9DA",
        fontSize: 13,
        fontWeight: view === key ? 700 : 500,
        cursor: "pointer",
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  if (loading) {
    return (
      <div style={{ background: "#1B120D", color: "#F3E9DA", padding: 40, fontFamily: "Inter, sans-serif" }}>
        ກຳລັງໂຫຼດ...
      </div>
    );
  }

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
      <div style={{ padding: "20px 24px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700 }}>ຮ້ານກາເຟ ບ້ານສວນ</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {navBtn("pos", "ໜ້າຂາຍ", ShoppingCart)}
          {navBtn("summary", "ສະຫຼຸບປະຈຳວັນ", BarChart3)}
          {navBtn("manage", "ຈັດການເມນູ & ສາງ", Package)}
          {navBtn("history", "ປະຫວັດ", History)}
        </div>
      </div>

      {saveError && (
        <div style={{ margin: "0 24px 8px", fontSize: 12, color: "#E0A96D" }}>
          ⚠ ບໍ່ສາມາດບັນທຶກຂໍ້ມູນໄດ້ຕອນນີ້ — ການປ່ຽນແປງອາດຫາຍໄປຖ້າອອກຈາກໜ້ານີ້
        </div>
      )}

      {view === "pos" && (
        <div style={{ display: "flex", gap: 16, padding: "0 16px 16px", flex: 1, minHeight: 560 }}>
          <div style={{ flex: 1.4, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {menu.map((c) => {
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
                    }}
                  >
                    <Coffee size={14} />
                    {c.label}
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: 10,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {(category?.items || []).map((item) => {
                const outOfStock = item.stock !== null && item.stock <= 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => addItem(item)}
                    disabled={outOfStock}
                    style={{
                      textAlign: "left",
                      background: "#2A1D14",
                      border: "1px solid #3A281C",
                      borderRadius: 10,
                      padding: "14px 14px 12px",
                      cursor: outOfStock ? "not-allowed" : "pointer",
                      color: outOfStock ? "#6B5C4C" : "#F3E9DA",
                      opacity: outOfStock ? 0.5 : 1,
                      position: "relative",
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{item.name}</div>
                    <div style={{ fontSize: 13, color: "#C08D4A", fontFamily: "ui-monospace, monospace" }}>
                      {formatKip(item.price)}
                    </div>
                    {item.stock !== null && (
                      <div style={{ fontSize: 10, marginTop: 4, color: outOfStock ? "#A24B3B" : "#9C8B77" }}>
                        {outOfStock ? "ໝົດແລ້ວ" : `ເຫຼືອ ${item.stock}`}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

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

          <div style={{ flex: 1, minWidth: 260, maxWidth: 300, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                background: "#FBF7EF",
                color: "#2A1D14",
                borderRadius: "4px 4px 0 0",
                padding: "18px 16px 10px",
                fontFamily: "ui-monospace, monospace",
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
                      <button onClick={() => removeItem(p.id)} style={{ ...iconBtnStyle, marginLeft: "auto", color: "#A24B3B" }}>
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
                  ✓ ຂາຍສຳເລັດ — ບັນທຶກແລ້ວ
                </div>
              )}
            </div>

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
      )}

      {view === "summary" && (
        <div style={{ padding: "0 24px 24px", flex: 1, overflowY: "auto" }}>
          <div
            style={{
              background: "#2A1D14",
              border: "1px solid #3A281C",
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 13, color: "#9C8B77", marginBottom: 10 }}>
              {new Date().toLocaleDateString("lo-LA", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </div>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: "#9C8B77" }}>ຍອດຂາຍລວມ</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "#C08D4A" }}>{formatKip(todayTotal)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "#9C8B77" }}>ຈຳນວນອໍເດີ</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{todaySales.length}</div>
              </div>
            </div>

            {todayItemsSold.length > 0 && (
              <>
                <div style={{ fontSize: 12, color: "#9C8B77", marginBottom: 6 }}>ສິນຄ້າທີ່ຂາຍໄດ້ມື້ນີ້</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 14 }}>
                  {todayItemsSold.map(([name, qty]) => (
                    <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>{name}</span>
                      <span style={{ color: "#C08D4A" }}>x{qty}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={closeToday}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "#C08D4A",
                color: "#1B120D",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Save size={14} />
              ບັນທຶກ & ປິດຍອດມື້ນີ້
            </button>
          </div>

          {closures.length > 0 && (
            <>
              <div style={{ fontSize: 13, color: "#9C8B77", marginBottom: 8 }}>ປະຫວັດການປິດຍອດ</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {closures.map((c) => (
                  <div
                    key={c.dateStr}
                    style={{ background: "#2A1D14", border: "1px solid #3A281C", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ fontSize: 13 }}>{formatDateTime(c.date)}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#C08D4A" }}>
                      {formatKip(c.total)} · {c.orderCount} ອໍເດີ
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {view === "manage" && (
        <ManageView
          menu={menu}
          updateItem={updateItem}
          deleteItem={deleteItem}
          addNewItem={addNewItem}
          addNewCategory={addNewCategory}
          deleteCategory={deleteCategory}
        />
      )}

      {view === "history" && (
        <div style={{ padding: "0 24px 24px", flex: 1, overflowY: "auto" }}>
          {history.length === 0 ? (
            <div style={{ opacity: 0.5, fontSize: 13, marginTop: 20 }}>ຍັງບໍ່ມີປະຫວັດການຂາຍ</div>
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
                  <div key={idx} style={{ background: "#2A1D14", border: "1px solid #3A281C", borderRadius: 10, padding: "12px 16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>ອໍເດີ #{sale.orderNo}</span>
                      <span style={{ fontSize: 12, color: "#9C8B77" }}>{formatDateTime(sale.date)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#C9BEA8", marginBottom: 6 }}>
                      {sale.items.map((it) => `${it.name} x${it.qty}`).join(", ")}
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#C08D4A" }}>{formatKip(sale.total)}</span>
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

function ManageView({ menu, updateItem, deleteItem, addNewItem, addNewCategory, deleteCategory }) {
  const [newCatName, setNewCatName] = useState("");
  const [newItemForms, setNewItemForms] = useState({});

  const setForm = (catId, field, value) =>
    setNewItemForms((prev) => ({ ...prev, [catId]: { ...prev[catId], [field]: value } }));

  return (
    <div style={{ padding: "0 24px 24px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {menu.map((cat) => {
        const form = newItemForms[cat.id] || { name: "", price: "", stock: "" };
        return (
          <div key={cat.id} style={{ background: "#2A1D14", border: "1px solid #3A281C", borderRadius: 12, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{cat.label}</span>
              <button
                onClick={() => deleteCategory(cat.id)}
                style={{ background: "transparent", border: "none", color: "#A24B3B", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
              >
                <X size={13} /> ລຶບໝວດ
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {cat.items.map((it) => (
                <div key={it.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={it.name}
                    onChange={(e) => updateItem(cat.id, it.id, "name", e.target.value)}
                    style={{ ...inputStyle, flex: 2 }}
                  />
                  <input
                    type="number"
                    value={it.price}
                    onChange={(e) => updateItem(cat.id, it.id, "price", e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="ລາຄາ"
                  />
                  <input
                    type="number"
                    value={it.stock === null ? "" : it.stock}
                    onChange={(e) => updateItem(cat.id, it.id, "stock", e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="ສາງ (ວ່າງ=ບໍ່ຈຳກັດ)"
                  />
                  <button onClick={() => deleteItem(cat.id, it.id)} style={{ ...iconBtnStyleDark, color: "#A24B3B" }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
              <input
                value={form.name}
                onChange={(e) => setForm(cat.id, "name", e.target.value)}
                placeholder="ຊື່ເມນູໃໝ່"
                style={{ ...inputStyle, flex: 2 }}
              />
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm(cat.id, "price", e.target.value)}
                placeholder="ລາຄາ"
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                type="number"
                value={form.stock}
                onChange={(e) => setForm(cat.id, "stock", e.target.value)}
                placeholder="ສາງ"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => {
                  addNewItem(cat.id, form.name, form.price, form.stock);
                  setNewItemForms((prev) => ({ ...prev, [cat.id]: { name: "", price: "", stock: "" } }));
                }}
                style={{ ...iconBtnStyleDark, color: "#4F6B4C" }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="ຊື່ໝວດໝູ່ໃໝ່ (ເຊັ່ນ ນ້ຳໝາກໄມ້)"
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          onClick={() => {
            addNewCategory(newCatName);
            setNewCatName("");
          }}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: "#C08D4A",
            color: "#1B120D",
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          + ເພີ່ມໝວດໝູ່
        </button>
      </div>
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

const iconBtnStyleDark = {
  width: 30,
  height: 30,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #3A281C",
  borderRadius: 6,
  background: "transparent",
  cursor: "pointer",
  flexShrink: 0,
};

const inputStyle = {
  padding: "8px 10px",
  fontSize: 13,
  borderRadius: 6,
  border: "1px solid #3A281C",
  background: "#1B120D",
  color: "#F3E9DA",
  fontFamily: "inherit",
};
