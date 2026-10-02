import { useEffect, useState } from "react";
import { QuoteForm } from "./components/QuoteForm";
import { emptyForm } from "./form";
import type { FormState } from "./form";
import { PlatformFees } from "./components/PlatformFees";
import { CalculationSummary } from "./components/CalculationSummary";
import { ProductHistory } from "./components/ProductHistory";
import {
  calculateQuote,
  validInput,
  validPricingInput,
  RATES,
} from "./pricing";
import type { QuoteInput } from "./pricing";
import { resolveFees } from "./feeTable";
import type { Fees } from "./feeTable";
import { loadProducts, saveProducts, STORAGE_KEY } from "./storage";
import type { ProductRecord } from "./storage";
import { downloadFile } from "./csv";
const number = (s: string) => (s.trim() === "" ? NaN : Number(s));
export default function App() {
  const [form, setForm] = useState<FormState>(() => emptyForm());
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [page, setPage] = useState("quote");
  const [editing, setEditing] = useState<ProductRecord | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    function read() {
      try {
        setProducts(loadProducts());
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
    }
    read();
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);
  const input: QuoteInput = {
    name: form.name.trim(),
    retailPrice: number(form.retailPrice),
    length: number(form.length),
    width: number(form.width),
    height: number(form.height),
    vendorPrice: number(form.vendorPrice),
    targetMargin: number(form.targetMargin) / 100,
  };
  const valid = validInput(input);
  const manualValid = [form.handling, form.logistics].every(
    (s) => Number.isFinite(number(s)) && number(s) >= 0 && number(s) <= 1e9,
  );
  const fees: Fees | null =
    form.feeMode === "manual"
      ? manualValid
        ? {
            handling: number(form.handling),
            logistics: number(form.logistics),
            source: "manual",
            tableVersion: "manual",
          }
        : null
      : resolveFees(
          input.length * input.width * input.height,
          Math.floor(input.retailPrice * RATES.purchase),
          form.shippingChannel,
        );
  const result = validPricingInput(input) ? calculateQuote(input, fees) : null;
  const setField = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setNotice("");
    setError("");
  };
  function persist(next: ProductRecord[]) {
    try {
      saveProducts(next);
      setProducts(next);
      setError("");
      return true;
    } catch {
      setError(
        "儲存失敗：瀏覽器空間不足或不允許儲存。輸入尚未清空，請先匯出備份。",
      );
      return false;
    }
  }
  function save() {
    if (!result || !valid || storageError) return;
    if (form.feeMode === "manual" && !manualValid) {
      setError(
        "請完整填入寄倉與物流費用（可為 0），或切回公司費率表儲存待補費率的紀錄。",
      );
      return;
    }
    if (
      ["cost", "taxInclusiveCost", "actualPrice", "retailMargin"].some((k) => {
        const v = form[k as keyof FormState];
        return (
          v !== "" &&
          (!Number.isFinite(number(v)) ||
            (k !== "retailMargin" && number(v) < 0) ||
            Math.abs(number(v)) > 1e9)
        );
      })
    ) {
      setError("請檢查試算表補充欄位的數值。");
      return;
    }
    const now = new Date().toISOString();
    const record: ProductRecord = {
      id: editing?.id ?? crypto.randomUUID(),
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
      input,
      fees,
      result,
      sheet: {
        cost: form.cost === "" ? input.vendorPrice : number(form.cost),
        taxInclusiveCost:
          form.taxInclusiveCost === "" ? null : number(form.taxInclusiveCost),
        checkFixed: form.checkFixed,
        retailMargin:
          form.retailMargin === ""
            ? result.retailMargin
            : number(form.retailMargin) / 100,
        actualPrice:
          form.actualPrice === ""
            ? result.purchasePrice
            : number(form.actualPrice),
      },
    };
    try {
      const latest = loadProducts();
      if (editing && !latest.some((p) => p.id === editing.id)) {
        setError("此紀錄已在其他分頁刪除，請取消編輯後重新記錄。");
        return;
      }
      if (
        persist(
          editing
            ? latest.map((p) => (p.id === editing.id ? record : p))
            : [record, ...latest],
        )
      ) {
        setForm(emptyForm(form.targetMargin));
        setEditing(null);
        setNotice(
          editing
            ? "商品紀錄已更新，表單已清空。"
            : "商品已記錄，準備填寫下一項商品。",
        );
        document.querySelector<HTMLInputElement>(".input-card input")?.focus();
      }
    } catch {
      setStorageError(true);
      setError("無法讀取最新紀錄，為避免覆蓋資料，未儲存此次輸入。");
    }
  }
  function edit(p: ProductRecord) {
    setEditing(p);
    setPage("quote");
    setNotice("");
    setError("");
    setForm({
      name: p.input.name,
      retailPrice: String(p.input.retailPrice),
      length: String(p.input.length),
      width: String(p.input.width),
      height: String(p.input.height),
      vendorPrice: String(p.input.vendorPrice),
      targetMargin: String(p.input.targetMargin * 100),
      shippingChannel: p.fees?.channel ?? "standard",
      feeMode: p.fees?.source === "manual" ? "manual" : "table",
      handling: p.fees === null ? "" : String(p.fees.handling),
      logistics: p.fees === null ? "" : String(p.fees.logistics),
      cost: String(p.sheet.cost),
      taxInclusiveCost:
        p.sheet.taxInclusiveCost === null
          ? ""
          : String(p.sheet.taxInclusiveCost),
      checkFixed: p.sheet.checkFixed,
      retailMargin: String(p.sheet.retailMargin * 100),
      actualPrice: String(p.sheet.actualPrice),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function remove(id: string) {
    try {
      if (
        persist(loadProducts().filter((p) => p.id !== id)) &&
        editing?.id === id
      ) {
        setEditing(null);
        setForm(emptyForm(form.targetMargin));
      }
    } catch {
      setStorageError(true);
    }
  }
  return (
    <>
      <header className="site-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("quote");
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            試
          </span>
          <span>
            蝦皮直營<span className="brand-sub">提品試算工具</span>
          </span>
        </a>
        <span className="local-pill">
          <i />
          本機安心試算
        </span>
      </header>
      <main>
        <nav className="tabs" aria-label="主要頁面">
          <button
            className={page === "quote" ? "active" : ""}
            aria-current={page === "quote" ? "page" : undefined}
            onClick={() => setPage("quote")}
          >
            商品報價
          </button>
          <button
            className={page === "history" ? "active" : ""}
            aria-current={page === "history" ? "page" : undefined}
            onClick={() => setPage("history")}
          >
            商品清單 <span>{products.length}</span>
          </button>
        </nav>
        {storageError && (
          <div className="error" role="alert">
            無法讀取本機紀錄，已暫停寫入以保留原始資料。
            <button
              onClick={() => {
                try {
                  downloadFile(
                    localStorage.getItem(STORAGE_KEY) ?? "",
                    "蝦皮直營原始紀錄備份.json",
                    "application/json",
                  );
                } catch {
                  setError("瀏覽器不允許讀取資料，請檢查隱私設定。");
                }
              }}
            >
              下載原始備份
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "已備份原始紀錄？重設會清除這個瀏覽器所有蝦皮直營商品紀錄。",
                  ) &&
                  persist([])
                )
                  setStorageError(false);
              }}
            >
              重設本機儲存
            </button>
          </div>
        )}
        {notice && (
          <div className="success-message" role="status">
            ✓ {notice}
          </div>
        )}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {page === "quote" ? (
          <>
            <div className="intro">
              <span className="eyebrow">SHOPEE · PRODUCT PRICING</span>
              <h1>
                好商品，<span>好報價。</span>
              </h1>
              <p>從成本到淨利，一次算清楚。讓每一筆合作，都有把握。</p>
            </div>
            {editing && (
              <div className="editing-bar">
                正在編輯：{editing.input.name}
                <button
                  onClick={() => {
                    setEditing(null);
                    setForm(emptyForm(form.targetMargin));
                    setError("");
                  }}
                >
                  取消編輯
                </button>
              </div>
            )}
            <div className="quote-layout">
              <div className="form-stack">
                <QuoteForm form={form} setField={setField} />
                <PlatformFees
                  form={form}
                  setField={setField}
                  result={result}
                  fees={fees}
                />
              </div>
              <aside>
                <CalculationSummary
                  result={result}
                  targetMargin={input.targetMargin}
                  manual={form.feeMode === "manual"}
                />
                <button
                  className="primary save-button"
                  disabled={!valid || storageError}
                  onClick={save}
                >
                  {editing ? "更新紀錄並清空" : "記錄商品並清空"}
                  <span aria-hidden="true">↗</span>
                </button>
                {result && !input.name.trim() && (
                  <p className="save-hint">
                    試算不需品名；記錄商品前請填寫商品名稱。
                  </p>
                )}
                <p className="save-hint">
                  商品資料只存在目前瀏覽器，不會上傳。
                  <br />
                  記錄後清空商品輸入，保留目標淨利率設定。
                </p>
              </aside>
            </div>
          </>
        ) : (
          <ProductHistory
            products={products}
            onEdit={edit}
            onDelete={remove}
            onClear={() => {
              if (persist([])) {
                setEditing(null);
                setForm(emptyForm(form.targetMargin));
                setNotice("所有商品紀錄已清空。");
              }
            }}
          />
        )}
        <footer>
          <span>蝦皮直營提品試算工具</span>
          <span>簡單報價 · 清楚合作</span>
        </footer>
      </main>
    </>
  );
}
