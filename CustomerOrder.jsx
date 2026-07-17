import { useState, useEffect, useMemo } from "react";
import { Plus, Minus, Coffee, ShoppingCart, Check } from "lucide-react";
import { supabase } from "./supabaseClient.js";

function formatKip(n) {
  return n.toLocaleString("en-US") + " ₭";
}

export default function CustomerOrder() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("");
  const [cart, setCart] = useState([]);
  const tableFromQr = new URLSearchParams(window.location.search).get("table") || "";
  const [tableNumber, setTableNumber] = useState(tableFromQr);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("menu_config").select("menu").eq("id", 1).single();
      if (!error && data) {
        setMenu(data.menu);
        setActiveCat(data.menu[0]?.id ?? "");
      }
      setLoading(false);
    })();
  }, []);

  const category = menu.find((c) => c.id === activeCat);

  const addItem = (item) => {
    if (item.stock !== null && item.stock <= 0) return;
    setCart((prev) => {
      const found = prev.find((p) => p.id === item.id);
      if (found) return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const changeQty = (id, delta) => {
    setCart((prev) => prev.map((p) => (p.id === id ? { ...p, qty: p.qty + delta } : p)).filter((p) => p.qty > 0));
  };

  const total = useMemo(() => cart.reduce((s, p) => s + p.price * p.qty, 0), [cart]);

  const submitOrder = async () => {
    setSubmitting(true);
    const { error } = await supabase.from("orders").insert({
      table_number: tableNumber || null,
      items: cart.map((p) => ({ name: p.name, price: p.price, qty: p.qty })),
      total,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      setError(true);
    } else {
      setSubmitted(true);
      setCart([]);
    }
  };

  if (loading) {
    return (
      <div style={{ background: "#1B120D", color: "#F3E9DA", minHeight: "100vh", padding: 40, fontFamily: "Inter, sans-serif" }}>
        ກຳລັງໂຫຼດເມນູ...
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        style={{
          background: "#1B120D",
          color: "#F3E9DA",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          textAlign: "center",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 999, background: "#4F6B4C", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Check size={28} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>ສົ່ງອໍເດີສຳເລັດແລ້ວ!</div>
        <div style={{ fontSize: 13, color: "#9C8B77", marginBottom: 24 }}>ພະນັກງານກຳລັງກະກຽມອາຫານຂອງທ່ານ</div>
        <button
          onClick={() => setSubmitted(false)}
          style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#C08D4A", color: "#1B120D", fontWeight: 700, cursor: "pointer" }}
        >
          ສັ່ງເພີ່ມ
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: "#1B120D", color: "#F3E9DA", minHeight: "100vh", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", paddingBottom: cart.length ? 90 : 20 }}>
      <div style={{ padding: "20px 16px 12px", textAlign: "center" }}>
        <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700 }}>ຮ້ານກາເຟ ບ້ານສວນ</div>
        <div style={{ fontSize: 12, color: "#C08D4A" }}>ສັ່ງອາຫານຜ່ານມືຖື</div>
      </div>

      <div style={{ padding: "0 16px 10px" }}>
        {tableFromQr ? (
          <div
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #C08D4A",
              background: "#2A1D14",
              color: "#C08D4A",
              fontSize: 13,
              fontWeight: 700,
              boxSizing: "border-box",
            }}
          >
            ໂຕະ {tableFromQr}
          </div>
        ) : (
          <input
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            placeholder="ເລກໂຕະ (ບໍ່ບັງຄັບ)"
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #3A281C", background: "#2A1D14", color: "#F3E9DA", fontSize: 13, boxSizing: "border-box" }}
          />
        )}
      </div>

      <div style={{ display: "flex", gap: 8, padding: "0 16px 12px", overflowX: "auto" }}>
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
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              <Coffee size={14} />
              {c.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {(category?.items || []).map((item) => {
          const outOfStock = item.stock !== null && item.stock <= 0;
          const inCart = cart.find((p) => p.id === item.id);
          return (
            <div
              key={item.id}
              style={{
                background: "#2A1D14",
                border: "1px solid #3A281C",
                borderRadius: 10,
                padding: "14px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                opacity: outOfStock ? 0.5 : 1,
              }}
            >
              {item.image && (
                <img
                  src={item.image}
                  alt=""
                  style={{ width: 54, height: 54, borderRadius: 8, objectFit: "cover", marginRight: 12, flexShrink: 0 }}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{item.name}</div>
                <div style={{ fontSize: 13, color: "#C08D4A", fontFamily: "ui-monospace, monospace" }}>{formatKip(item.price)}</div>
                {outOfStock && <div style={{ fontSize: 11, color: "#A24B3B", marginTop: 2 }}>ໝົດແລ້ວ</div>}
              </div>

              {!outOfStock &&
                (inCart ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => changeQty(item.id, -1)} style={roundBtn}>
                      <Minus size={16} />
                    </button>
                    <span style={{ fontSize: 15, fontWeight: 700, minWidth: 18, textAlign: "center" }}>{inCart.qty}</span>
                    <button onClick={() => addItem(item)} style={roundBtn}>
                      <Plus size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addItem(item)}
                    style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#C08D4A", color: "#1B120D", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    ເພີ່ມ
                  </button>
                ))}
            </div>
          );
        })}
      </div>

      {cart.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#FBF7EF",
            color: "#2A1D14",
            padding: "14px 16px",
            boxShadow: "0 -8px 24px rgba(0,0,0,0.35)",
          }}
        >
          {error && <div style={{ fontSize: 12, color: "#A24B3B", marginBottom: 6 }}>⚠ ສົ່ງອໍເດີບໍ່ສຳເລັດ, ລອງໃໝ່ອີກຄັ້ງ</div>}
          <button
            disabled={submitting}
            onClick={submitOrder}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: 8,
              border: "none",
              background: "#C08D4A",
              color: "#1B120D",
              fontWeight: 700,
              fontSize: 15,
              cursor: submitting ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <ShoppingCart size={18} />
            {submitting ? "ກຳລັງສົ່ງ..." : `ສັ່ງອາຫານ · ${formatKip(total)}`}
          </button>
        </div>
      )}
    </div>
  );
}

const roundBtn = {
  width: 30,
  height: 30,
  borderRadius: 999,
  border: "1px solid #C08D4A",
  background: "transparent",
  color: "#F3E9DA",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};
