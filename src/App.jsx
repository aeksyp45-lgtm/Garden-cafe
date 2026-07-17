import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Minus,
  Trash2,
  Receipt,
  Coffee,
  History,
  Package,
  BarChart3,
  ShoppingCart,
  Save,
  X,
  Printer,
  Pencil,
  Check,
  Smartphone,
  QrCode,
} from "lucide-react";
import { supabase } from "./supabaseClient.js";
import { QRCodeSVG } from "qrcode.react";

// (ຂໍ້ມູນທັງໝົດຍ້າຍໄປເກັບໄວ້ໃນ Supabase ແລ້ວ — ບໍ່ໃຊ້ localStorage ອີກຕໍ່ໄປ)

const DEFAULT_MENU = [
  {
    id: "coffee",
    label: "ກາເຟ",
    items: [
      { id: "esp", name: "ເອສເປຣັດໂຊ", price: 15000, stock: null, image: null },
      { id: "ame", name: "ອາເມຣິກາໂນ", price: 18000, stock: null, image: null },
      { id: "lat", name: "ລາເຕ້", price: 22000, stock: null, image: null },
      { id: "cap", name: "ຄາປູຊິໂນ", price: 22000, stock: null, image: null },
      { id: "moc", name: "ໂມກາ", price: 25000, stock: null, image: null },
    ],
  },
  {
    id: "cold",
    label: "ເຄື່ອງດື່ມເຢັນ",
    items: [
      { id: "ice", name: "ກາເຟເຢັນ", price: 20000, stock: null, image: null },
      { id: "tha", name: "ຊາໄທ", price: 18000, stock: null, image: null },
      { id: "lem", name: "ນ້ຳໝາກນາວ", price: 15000, stock: null, image: null },
    ],
  },
  {
    id: "bakery",
    label: "ເບເກີຣີ",
    items: [
      { id: "cro", name: "ຄຣົວຊອງ", price: 15000, stock: 10, image: null },
      { id: "cak", name: "ເຄັກຊັອກໂກແລັດ", price: 20000, stock: 8, image: null },
      { id: "san", name: "ແຊນວິດ", price: 25000, stock: 6, image: null },
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

// ເມນູຖືກເກັບໄວ້ໃນ Supabase (ບໍ່ແມ່ນ localStorage ອີກຕໍ່ໄປ) ເພື່ອໃຫ້ໜ້າສັ່ງອາຫານ
// ຂອງລູກຄ້າ (ຄົນລະອຸປະກອນ) ເຫັນເມນູດຽວກັນກັບທີ່ພະນັກງານຕັ້ງໄວ້
async function loadMenu(fallback) {
  const { data, error } = await supabase.from("menu_config").select("menu").eq("id", 1).single();
  if (error || !data) return fallback;
  return data.menu;
}

async function saveMenu(menu) {
  const { error } = await supabase.from("menu_config").upsert({ id: 1, menu, updated_at: new Date().toISOString() });
  return !error;
}

// ປະຫວັດການຂາຍ ແລະ ການປິດຍອດ ຍ້າຍໄປເກັບໄວ້ໃນ Supabase ນຳ (backup ຈຸດດຽວ, ບໍ່ຫາຍເມື່ອລ້າງ browser)
async function loadHistory() {
  const { data, error } = await supabase.from("sales_history").select("*").order("sale_date", { ascending: false });
  if (error || !data) return [];
  return data.map((d) => ({
    _id: d.id,
    orderNo: d.order_no,
    date: d.sale_date,
    items: d.items,
    total: Number(d.total),
    paid: Number(d.paid || 0),
    change: Number(d.change || 0),
    note: d.note || "",
  }));
}

async function insertSale(sale) {
  const { data, error } = await supabase
    .from("sales_history")
    .insert({
      order_no: sale.orderNo,
      sale_date: sale.date,
      items: sale.items,
      total: sale.total,
      paid: sale.paid,
      change: sale.change,
      note: sale.note,
    })
    .select()
    .single();
  return { ok: !error, id: data?.id };
}

async function updateSaleRow(id, fields) {
  const { error } = await supabase.from("sales_history").update(fields).eq("id", id);
  return !error;
}

async function loadClosures() {
  const { data, error } = await supabase.from("day_closures").select("*").order("closure_date", { ascending: false });
  if (error || !data) return [];
  return data.map((d) => ({
    dateStr: d.date_str,
    date: d.closure_date,
    total: Number(d.total),
    orderCount: d.order_count,
    itemsSold: d.items_sold || [],
    note: d.note || "",
  }));
}

async function upsertClosure(closure) {
  const { error } = await supabase.from("day_closures").upsert({
    date_str: closure.dateStr,
    closure_date: closure.date,
    total: closure.total,
    order_count: closure.orderCount,
    items_sold: closure.itemsSold,
    note: closure.note || "",
  });
  return !error;
}

// ອັບໂຫລດຮູບເມນູໂດຍກົງໄປ Supabase Storage, ສົ່ງກັບລິ້ງສາທາລະນະ
async function uploadMenuImage(file) {
  const ext = file.name.split(".").pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("menu-images").upload(path, file);
  if (error) return null;
  const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
  return data.publicUrl;
}

export default function CafePOS() {
  const [view, setView] = useState("pos");
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);

  const [menu, setMenu] = useState(DEFAULT_MENU);
  const [activeCat, setActiveCat] = useState(DEFAULT_MENU[0].id);
  const [cart, setCart] = useState([]);
  const [paidInput, setPaidInput] = useState("");
  const [receiptNote, setReceiptNote] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [orderNo, setOrderNo] = useState(() => newOrderNo());

  const [history, setHistory] = useState([]);
  const [closures, setClosures] = useState([]);
  const [incomingOrders, setIncomingOrders] = useState([]);
  const [tableCount, setTableCount] = useState(6);

  const [printData, setPrintData] = useState(null);

  useEffect(() => {
    (async () => {
      const m = await loadMenu(DEFAULT_MENU);
      const h = await loadHistory();
      const c = await loadClosures();
      setMenu(m);
      setActiveCat(m[0]?.id ?? "");
      setHistory(h);
      setClosures(c);
      setLoading(false);
    })();
  }, []);

  // ຮັບຟັງອໍເດີໃໝ່ຈາກລູກຄ້າແບບ real-time (ລໍຖ້າ + ຮັບແລ້ວແຕ່ຍັງບໍ່ຈ່າຍ)
  const [acceptedOrders, setAcceptedOrders] = useState([]);
  const [payingTableOrderIds, setPayingTableOrderIds] = useState(null);

  useEffect(() => {
    const loadOrders = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["pending", "accepted"])
        .order("created_at", { ascending: true });
      if (data) {
        setIncomingOrders(data.filter((o) => o.status === "pending"));
        setAcceptedOrders(data.filter((o) => o.status === "accepted"));
      }
    };
    loadOrders();

    const channel = supabase
      .channel("orders-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ໂຕະທີ່ຍັງບໍ່ຈ່າຍ — ລວມທຸກອໍເດີທີ່ຮັບແລ້ວ ຈັດກຸ່ມຕາມເລກໂຕະ
  const openTabs = useMemo(() => {
    const groups = {};
    acceptedOrders.forEach((order) => {
      const key = order.table_number || "ບໍ່ລະບຸໂຕະ";
      if (!groups[key]) groups[key] = { table: key, orders: [], items: [], total: 0 };
      groups[key].orders.push(order);
      groups[key].items.push(...order.items);
      groups[key].total += Number(order.total);
    });
    return Object.values(groups);
  }, [acceptedOrders]);

  const category = menu.find((c) => c.id === activeCat) || menu[0];

  useEffect(() => {
    if (cart.length === 0 && payingTableOrderIds) {
      setPayingTableOrderIds(null);
    }
  }, [cart, payingTableOrderIds]);

  const persistMenu = async (nextMenu) => {
    setMenu(nextMenu);
    const ok = await saveMenu(nextMenu);
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

  const doPrint = (data) => {
    setPrintData(data);
    requestAnimationFrame(() => {
      window.print();
    });
  };

  const completeSale = async () => {
    setShowReceipt(true);

    const nextMenu = menu.map((cat) => ({
      ...cat,
      items: cat.items.map((it) => {
        const sold = cart.find((c) => c.name === it.name);
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
      note: receiptNote || "",
    };

    setMenu(nextMenu);

    const ok1 = await saveMenu(nextMenu);
    const { ok: ok2, id: saleId } = await insertSale(sale);
    setSaveError(!(ok1 && ok2));
    if (ok2) {
      setHistory([{ ...sale, _id: saleId }, ...history]);
    }

    if (payingTableOrderIds && payingTableOrderIds.length) {
      await supabase.from("orders").update({ status: "paid" }).in("id", payingTableOrderIds);
      setPayingTableOrderIds(null);
    }

    setTimeout(() => {
      setCart([]);
      setPaidInput("");
      setReceiptNote("");
      setOrderNo(newOrderNo());
    }, 1400);
  };

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

  const closeToday = async () => {
    const todayStr = new Date().toDateString();
    const existing = closures.find((c) => c.dateStr === todayStr);
    const record = {
      dateStr: todayStr,
      date: new Date().toISOString(),
      total: todayTotal,
      orderCount: todaySales.length,
      itemsSold: todayItemsSold,
      note: existing?.note || "",
    };
    const ok = await upsertClosure(record);
    if (ok) {
      const existingIdx = closures.findIndex((c) => c.dateStr === todayStr);
      const next = existingIdx >= 0 ? closures.map((c, i) => (i === existingIdx ? record : c)) : [record, ...closures];
      setClosures(next);
    }
    setSaveError(!ok);
  };

  const updateClosure = async (dateStr, field, value) => {
    const existing = closures.find((c) => c.dateStr === dateStr);
    if (!existing) return;
    const updated = { ...existing, [field]: field === "total" ? Number(value) : value };
    const ok = await upsertClosure(updated);
    if (ok) {
      setClosures(closures.map((c) => (c.dateStr !== dateStr ? c : updated)));
    }
    setSaveError(!ok);
  };

  const updateSaleItemQty = async (saleIdx, itemIdx, delta) => {
    const sale = history[saleIdx];
    const items = sale.items
      .map((it, j) => (j === itemIdx ? { ...it, qty: it.qty + delta } : it))
      .filter((it) => it.qty > 0);
    const newTotal = items.reduce((s, it) => s + it.price * it.qty, 0);
    const ok = await updateSaleRow(sale._id, { items, total: newTotal });
    if (ok) {
      setHistory(history.map((s, i) => (i !== saleIdx ? s : { ...s, items, total: newTotal })));
    }
    setSaveError(!ok);
  };

  const updateSaleNote = async (saleIdx, note) => {
    const sale = history[saleIdx];
    const ok = await updateSaleRow(sale._id, { note });
    if (ok) {
      setHistory(history.map((s, i) => (i !== saleIdx ? s : { ...s, note })));
    }
    setSaveError(!ok);
  };

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
                      field === "name" || field === "image"
                        ? value
                        : value === ""
                        ? (field === "stock" ? null : 0)
                        : Number(value),
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

  const addNewItem = (catId, name, price, stock, image) => {
    if (!name || !price) return;
    const nextMenu = menu.map((cat) =>
      cat.id !== catId
        ? cat
        : {
            ...cat,
            items: [
              ...cat.items,
              { id: uid(), name, price: Number(price), stock: stock === "" ? null : Number(stock), image: image || null },
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

  const acceptOrder = async (order) => {
    // ຮັບອໍເດີ = ຮັບຮູ້ວ່າພະນັກງານກຳລັງກະກຽມ, ຍັງບໍ່ຄິດເງິນ — ໂຕະນີ້ຈະໄປຂຶ້ນຢູ່
    // "ໂຕະທີ່ຍັງບໍ່ຈ່າຍ" ແລະ ຍັງຮັບອໍເດີເພີ່ມ (ຮອບ 2, 3, ...) ຂອງໂຕະດຽວກັນໄດ້ຕໍ່
    await supabase.from("orders").update({ status: "accepted" }).eq("id", order.id);
  };

  const payTable = (tab) => {
    setCart(
      tab.items.map((it) => ({
        id: uid(),
        name: it.name,
        price: it.price,
        qty: it.qty,
      }))
    );
    setReceiptNote(tab.table !== "ບໍ່ລະບຸໂຕະ" ? `ໂຕະ ${tab.table}` : "");
    setPayingTableOrderIds(tab.orders.map((o) => o.id));
    setView("pos");
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
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-receipt, #print-receipt * { visibility: visible; }
          #print-receipt { position: absolute; top: 0; left: 0; width: 100%; }
        }
      `}</style>

      {printData && (
        <div
          id="print-receipt"
          style={{
            display: "none",
          }}
        >
          <div className="print-only" style={{ fontFamily: "ui-monospace, monospace", padding: 20, color: "#000", background: "#fff" }}>
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 16 }}>ຮ້ານກາເຟ ບ້ານສວນ</div>
            <div style={{ textAlign: "center", fontSize: 12 }}>ອໍເດີ #{printData.orderNo}</div>
            <div style={{ textAlign: "center", fontSize: 11, marginBottom: 10 }}>{formatDateTime(printData.date)}</div>
            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
            {printData.items.map((it, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span>{it.name} x{it.qty}</span>
                <span>{formatKip(it.price * it.qty)}</span>
              </div>
            ))}
            <div style={{ borderTop: "1px dashed #000", margin: "8px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}>
              <span>ລວມທັງໝົດ</span>
              <span>{formatKip(printData.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span>ຮັບເງິນ</span>
              <span>{formatKip(printData.paid || 0)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span>ເງິນທອນ</span>
              <span>{formatKip(Math.max(0, printData.change || 0))}</span>
            </div>
            {printData.note && (
              <div style={{ marginTop: 8, fontSize: 11, borderTop: "1px dashed #000", paddingTop: 6 }}>
                ໝາຍເຫດ: {printData.note}
              </div>
            )}
            <div style={{ textAlign: "center", fontSize: 11, marginTop: 12 }}>ຂອບໃຈທີ່ອຸດໜູນ</div>
          </div>
        </div>
      )}

      <style>{`#print-receipt { display: none; } @media print { #print-receipt { display: block !important; } }`}</style>

      <div style={{ padding: "20px 24px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700 }}>ຮ້ານກາເຟ ບ້ານສວນ</span>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {navBtn("pos", "ໜ້າຂາຍ", ShoppingCart)}
          {navBtn("orders", `ອໍເດີລູກຄ້າ${incomingOrders.length ? ` (${incomingOrders.length})` : ""}`, Smartphone)}
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
                      padding: item.image ? 0 : "14px 14px 12px",
                      overflow: "hidden",
                      cursor: outOfStock ? "not-allowed" : "pointer",
                      color: outOfStock ? "#6B5C4C" : "#F3E9DA",
                      opacity: outOfStock ? 0.5 : 1,
                    }}
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt=""
                        style={{ width: "100%", height: 80, objectFit: "cover", display: "block" }}
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                    <div style={{ padding: item.image ? "10px 14px 12px" : 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{item.name}</div>
                      <div style={{ fontSize: 13, color: "#C08D4A", fontFamily: "ui-monospace, monospace" }}>
                        {formatKip(item.price)}
                      </div>
                      {item.stock !== null && (
                        <div style={{ fontSize: 10, marginTop: 4, color: outOfStock ? "#A24B3B" : "#9C8B77" }}>
                          {outOfStock ? "ໝົດແລ້ວ" : `ເຫຼືອ ${item.stock}`}
                        </div>
                      )}
                    </div>
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

              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 10, opacity: 0.6 }}>ໝາຍເຫດ (ຖ້າມີ)</label>
                <input
                  value={receiptNote}
                  onChange={(e) => setReceiptNote(e.target.value)}
                  placeholder="ເຊັ່ນ: ລູກຄ້າບໍ່ເອົານ້ຳຕານ"
                  style={{
                    width: "100%",
                    marginTop: 3,
                    padding: "6px 8px",
                    fontFamily: "inherit",
                    fontSize: 12,
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

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                disabled={!canCheckout}
                onClick={completeSale}
                style={{
                  flex: 1,
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
              <button
                disabled={cart.length === 0}
                onClick={() =>
                  doPrint({ orderNo, date: new Date().toISOString(), items: cart, total, paid, change, note: receiptNote })
                }
                style={{
                  padding: "12px",
                  borderRadius: 8,
                  border: "1px solid #3A281C",
                  background: "transparent",
                  color: cart.length === 0 ? "#7A6A5A" : "#F3E9DA",
                  cursor: cart.length === 0 ? "not-allowed" : "pointer",
                }}
                title="ພິມໃບບິນ"
              >
                <Printer size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {view === "orders" && (
        <div style={{ padding: "0 24px 24px", flex: 1, overflowY: "auto" }}>
          <div style={{ background: "#2A1D14", border: "1px solid #3A281C", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <QrCode size={16} /> QR ສັ່ງອາຫານ ຕາມໂຕະ
            </div>
            <div style={{ fontSize: 12, color: "#9C8B77", marginBottom: 14, maxWidth: 500 }}>
              ໃສ່ຈຳນວນໂຕະ, ລະບົບຈະສ້າງ QR ໃຫ້ແຕ່ລະໂຕະ (ຄລິກຂວາ → ບັນທຶກຮູບ ເພື່ອເອົາໄປພິມວາງໃສ່ໂຕະ) ເມື່ອລູກຄ້າສະແກນ, ເລກໂຕະຈະຖືກໃສ່ໃຫ້ອັດຕະໂນມັດ
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "#9C8B77" }}>ຈຳນວນໂຕະ:</label>
              <input
                type="number"
                min="1"
                max="50"
                value={tableCount}
                onChange={(e) => setTableCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                style={{ ...inputStyle, width: 70 }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 14 }}>
              {Array.from({ length: tableCount }, (_, i) => i + 1).map((n) => (
                <div key={n} style={{ background: "#FBF7EF", padding: 10, borderRadius: 8, textAlign: "center" }}>
                  <QRCodeSVG value={`${window.location.origin}${window.location.pathname}?order=1&table=${n}`} size={90} />
                  <div style={{ color: "#2A1D14", fontSize: 12, fontWeight: 700, marginTop: 6 }}>ໂຕະ {n}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 13, color: "#9C8B77", marginBottom: 8 }}>
            ອໍເດີທີ່ລໍຖ້າ ({incomingOrders.length})
          </div>

          {incomingOrders.length === 0 ? (
            <div style={{ opacity: 0.5, fontSize: 13, marginBottom: 20 }}>ຍັງບໍ່ມີອໍເດີເຂົ້າມາ</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {incomingOrders.map((order) => (
                <div key={order.id} style={{ background: "#2A1D14", border: "1px solid #C08D4A", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {order.table_number ? `ໂຕະ ${order.table_number}` : "ບໍ່ລະບຸໂຕະ"}
                    </span>
                    <span style={{ fontSize: 12, color: "#9C8B77" }}>{formatDateTime(order.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#C9BEA8", marginBottom: 8 }}>
                    {order.items.map((it) => `${it.name} x${it.qty}`).join(", ")}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#C08D4A" }}>{formatKip(order.total)}</span>
                    <button
                      onClick={() => acceptOrder(order)}
                      style={{ ...smallBtn, background: "#C08D4A" }}
                    >
                      <Check size={13} /> ຮັບອໍເດີ (ກຳລັງກະກຽມ)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 13, color: "#9C8B77", marginBottom: 8 }}>
            ໂຕະທີ່ຍັງບໍ່ຈ່າຍ ({openTabs.length})
          </div>

          {openTabs.length === 0 ? (
            <div style={{ opacity: 0.5, fontSize: 13 }}>ບໍ່ມີໂຕະທີ່ຄ້າງຈ່າຍ</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {openTabs.map((tab) => (
                <div key={tab.table} style={{ background: "#2A1D14", border: "1px solid #3A281C", borderRadius: 10, padding: "12px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{tab.table === "ບໍ່ລະບຸໂຕະ" ? tab.table : `ໂຕະ ${tab.table}`}</span>
                    <span style={{ fontSize: 12, color: "#9C8B77" }}>{tab.orders.length} ຮອບ</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#C9BEA8", marginBottom: 8 }}>
                    {tab.items.map((it) => `${it.name} x${it.qty}`).join(", ")}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#C08D4A" }}>{formatKip(tab.total)}</span>
                    <button onClick={() => payTable(tab)} style={{ ...smallBtn, background: "#4F6B4C" }}>
                      <Receipt size={13} /> ຈ່າຍເງິນ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "summary" && (
        <div style={{ padding: "0 24px 24px", flex: 1, overflowY: "auto" }}>
          <div style={{ background: "#2A1D14", border: "1px solid #3A281C", borderRadius: 12, padding: 20, marginBottom: 16 }}>
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
              <div style={{ fontSize: 13, color: "#9C8B77", marginBottom: 8 }}>ປະຫວັດການປິດຍອດ (ກົດ ✎ ເພື່ອແກ້ໄຂ)</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {closures.map((c) => (
                  <ClosureRow key={c.dateStr} closure={c} onUpdate={updateClosure} />
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
                  <HistoryRow
                    key={idx}
                    sale={sale}
                    onQtyChange={(itemIdx, delta) => updateSaleItemQty(idx, itemIdx, delta)}
                    onNoteChange={(note) => updateSaleNote(idx, note)}
                    onPrint={() => doPrint(sale)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ClosureRow({ closure, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [totalDraft, setTotalDraft] = useState(closure.total);
  const [noteDraft, setNoteDraft] = useState(closure.note || "");

  if (!editing) {
    return (
      <div style={{ background: "#2A1D14", border: "1px solid #3A281C", borderRadius: 10, padding: "10px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13 }}>{formatDateTime(closure.date)}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#C08D4A" }}>
              {formatKip(closure.total)} · {closure.orderCount} ອໍເດີ
            </span>
            <button onClick={() => setEditing(true)} style={{ ...iconBtnStyleDark, width: 26, height: 26 }}>
              <Pencil size={12} />
            </button>
          </div>
        </div>
        {closure.note && <div style={{ fontSize: 11, color: "#9C8B77", marginTop: 4 }}>ໝາຍເຫດ: {closure.note}</div>}
      </div>
    );
  }

  return (
    <div style={{ background: "#2A1D14", border: "1px solid #C08D4A", borderRadius: 10, padding: "10px 14px" }}>
      <div style={{ fontSize: 12, color: "#9C8B77", marginBottom: 6 }}>{formatDateTime(closure.date)}</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
        <input type="number" value={totalDraft} onChange={(e) => setTotalDraft(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
      </div>
      <input
        value={noteDraft}
        onChange={(e) => setNoteDraft(e.target.value)}
        placeholder="ໝາຍເຫດ (ເຊັ່ນ: ເງິນຂາດ 5,000 ₭ ຍ້ອນທອນຜິດ)"
        style={{ ...inputStyle, width: "100%", marginBottom: 8 }}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => {
            onUpdate(closure.dateStr, "total", totalDraft);
            onUpdate(closure.dateStr, "note", noteDraft);
            setEditing(false);
          }}
          style={{ ...smallBtn, background: "#4F6B4C" }}
        >
          <Check size={13} /> ບັນທຶກ
        </button>
        <button onClick={() => setEditing(false)} style={{ ...smallBtn, background: "#3A281C" }}>
          <X size={13} /> ຍົກເລີກ
        </button>
      </div>
    </div>
  );
}

function HistoryRow({ sale, onQtyChange, onNoteChange, onPrint }) {
  const [editing, setEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(sale.note || "");

  return (
    <div style={{ background: "#2A1D14", border: editing ? "1px solid #C08D4A" : "1px solid #3A281C", borderRadius: 10, padding: "12px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>ອໍເດີ #{sale.orderNo}</span>
        <span style={{ fontSize: 12, color: "#9C8B77" }}>{formatDateTime(sale.date)}</span>
      </div>

      {!editing ? (
        <div style={{ fontSize: 12, color: "#C9BEA8", marginBottom: 6 }}>
          {sale.items.map((it) => `${it.name} x${it.qty}`).join(", ")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
          {sale.items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
              <span>{it.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <button onClick={() => onQtyChange(i, -1)} style={iconBtnStyle}>
                  <Minus size={11} />
                </button>
                <span style={{ minWidth: 14, textAlign: "center" }}>{it.qty}</span>
                <button onClick={() => onQtyChange(i, 1)} style={iconBtnStyle}>
                  <Plus size={11} />
                </button>
              </div>
            </div>
          ))}
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="ໝາຍເຫດ (ເຊັ່ນ: ລູກຄ້າຄືນສິນຄ້າ, ບໍ່ເອົາອັນນີ້ແລ້ວ)"
            style={{ ...inputStyle, width: "100%" }}
          />
        </div>
      )}

      {sale.note && !editing && <div style={{ fontSize: 11, color: "#C08D4A", marginBottom: 6 }}>ໝາຍເຫດ: {sale.note}</div>}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onPrint} style={{ ...iconBtnStyleDark, width: 26, height: 26 }} title="ພິມໃບບິນຄືນ">
            <Printer size={12} />
          </button>
          {!editing ? (
            <button onClick={() => setEditing(true)} style={{ ...iconBtnStyleDark, width: 26, height: 26 }} title="ແກ້ໄຂ">
              <Pencil size={12} />
            </button>
          ) : (
            <button
              onClick={() => {
                onNoteChange(noteDraft);
                setEditing(false);
              }}
              style={{ ...iconBtnStyleDark, width: 26, height: 26, color: "#4F6B4C" }}
              title="ບັນທຶກ"
            >
              <Check size={12} />
            </button>
          )}
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#C08D4A" }}>{formatKip(sale.total)}</span>
      </div>
    </div>
  );
}

function ManageView({ menu, updateItem, deleteItem, addNewItem, addNewCategory, deleteCategory }) {
  const [newCatName, setNewCatName] = useState("");
  const [newItemForms, setNewItemForms] = useState({});
  const [uploadingId, setUploadingId] = useState(null);

  const setForm = (catId, field, value) =>
    setNewItemForms((prev) => ({ ...prev, [catId]: { ...prev[catId], [field]: value } }));

  const handleUpload = async (file, uploadKey, onDone) => {
    setUploadingId(uploadKey);
    const url = await uploadMenuImage(file);
    setUploadingId(null);
    if (url) onDone(url);
  };

  return (
    <div style={{ padding: "0 24px 24px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {menu.map((cat) => {
        const form = newItemForms[cat.id] || { name: "", price: "", stock: "", image: "" };
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

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {cat.items.map((it) => (
                <div key={it.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  {it.image ? (
                    <img src={it.image} alt="" style={{ width: 42, height: 42, borderRadius: 6, objectFit: "cover", flexShrink: 0, background: "#1B120D" }} onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
                  ) : (
                    <div style={{ width: 42, height: 42, borderRadius: 6, background: "#1B120D", flexShrink: 0 }} />
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={it.name} onChange={(e) => updateItem(cat.id, it.id, "name", e.target.value)} style={{ ...inputStyle, flex: 2 }} />
                      <input type="number" value={it.price} onChange={(e) => updateItem(cat.id, it.id, "price", e.target.value)} style={{ ...inputStyle, flex: 1 }} placeholder="ລາຄາ" />
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
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={it.image || ""}
                        onChange={(e) => updateItem(cat.id, it.id, "image", e.target.value)}
                        placeholder="ລິ້ງຮູບພາບ (ຫຼືອັບໂຫລດຈາກອຸປະກອນ →)"
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      <label
                        style={{
                          ...iconBtnStyleDark,
                          width: "auto",
                          padding: "0 10px",
                          fontSize: 11,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {uploadingId === it.id ? "ກຳລັງອັບໂຫລດ..." : "📷 ອັບໂຫລດ"}
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpload(file, it.id, (url) => updateItem(cat.id, it.id, "image", url));
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={form.name} onChange={(e) => setForm(cat.id, "name", e.target.value)} placeholder="ຊື່ເມນູໃໝ່" style={{ ...inputStyle, flex: 2 }} />
                <input type="number" value={form.price} onChange={(e) => setForm(cat.id, "price", e.target.value)} placeholder="ລາຄາ" style={{ ...inputStyle, flex: 1 }} />
                <input type="number" value={form.stock} onChange={(e) => setForm(cat.id, "stock", e.target.value)} placeholder="ສາງ" style={{ ...inputStyle, flex: 1 }} />
                <button
                  onClick={() => {
                    addNewItem(cat.id, form.name, form.price, form.stock, form.image);
                    setNewItemForms((prev) => ({ ...prev, [cat.id]: { name: "", price: "", stock: "", image: "" } }));
                  }}
                  style={{ ...iconBtnStyleDark, color: "#4F6B4C" }}
                >
                  <Plus size={14} />
                </button>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  value={form.image || ""}
                  onChange={(e) => setForm(cat.id, "image", e.target.value)}
                  placeholder="ລິ້ງຮູບພາບສຳລັບເມນູໃໝ່ (ຫຼືອັບໂຫລດ →)"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <label
                  style={{
                    ...iconBtnStyleDark,
                    width: "auto",
                    padding: "0 10px",
                    fontSize: 11,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {uploadingId === `new-${cat.id}` ? "ກຳລັງອັບໂຫລດ..." : "📷 ອັບໂຫລດ"}
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file, `new-${cat.id}`, (url) => setForm(cat.id, "image", url));
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {form.image && (
                <img src={form.image} alt="" style={{ width: 42, height: 42, borderRadius: 6, objectFit: "cover" }} onError={(e) => (e.currentTarget.style.visibility = "hidden")} />
              )}
            </div>
          </div>
        );
      })}

      <div style={{ display: "flex", gap: 8 }}>
        <input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="ຊື່ໝວດໝູ່ໃໝ່ (ເຊັ່ນ ນ້ຳໝາກໄມ້)" style={{ ...inputStyle, flex: 1 }} />
        <button
          onClick={() => {
            addNewCategory(newCatName);
            setNewCatName("");
          }}
          style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#C08D4A", color: "#1B120D", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
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
  color: "#F3E9DA",
};

const smallBtn = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "none",
  color: "#1B120D",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
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
