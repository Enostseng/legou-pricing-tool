import { useState } from "react";
import type { ProductRecord } from "../storage";
import { money, percent, statusLabel } from "../pricing";
import { downloadFile, exportCsv } from "../csv";
interface Props {
  products: ProductRecord[];
  onEdit: (p: ProductRecord) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}
export function ProductHistory({ products, onEdit, onDelete, onClear }: Props) {
  const [search, setSearch] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [headers, setHeaders] = useState(false);
  const filtered = products.filter((p) =>
    p.input.name
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  function exportRecords(mode: "sheet" | "full") {
    downloadFile(
      exportCsv(filtered, mode, mode === "full" || headers),
      `樂購商品-${mode === "sheet" ? "I-S" : "完整"}-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }
  return (
    <section className="history-section">
      <div className="history-heading">
        <div>
          <h1>商品清單</h1>
          <p>已記錄 {products.length} 項商品 · 僅儲存於此瀏覽器</p>
        </div>
        <button
          className="danger-link"
          disabled={!products.length}
          onClick={() => setConfirmClear(true)}
        >
          清空全部紀錄
        </button>
      </div>
      <div className="card history-toolbar">
        <label className="field">
          <span>搜尋商品</span>
          <input
            type="search"
            placeholder="輸入商品名稱"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="export-actions">
          <button
            disabled={!filtered.length}
            onClick={() => exportRecords("sheet")}
          >
            匯出 I:S CSV
          </button>
          <button
            disabled={!filtered.length}
            onClick={() => exportRecords("full")}
          >
            匯出完整 CSV
          </button>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={headers}
              onChange={(e) => setHeaders(e.target.checked)}
            />
            I:S 包含欄位標題
          </label>
        </div>
        <p className="help">
          匯出目前搜尋結果。I:S 預設不含標題，共 11 欄；可匯入試算表後貼至
          I:S。請定期匯出備份，清除瀏覽器資料會移除紀錄。
        </p>
      </div>
      {!filtered.length ? (
        <div className="card empty-state">
          <span aria-hidden="true">▤</span>
          <h2>{products.length ? "找不到符合的商品" : "從第一筆報價開始"}</h2>
          <p>
            {products.length
              ? "試試其他商品名稱。"
              : "完成試算後，按下「記錄商品並清空」即可在這裡查看。"}
          </p>
        </div>
      ) : (
        <div className="product-list">
          {filtered.map((p) => (
            <article className="card product-card" key={p.id}>
              <div className="product-heading">
                <div>
                  <h2>{p.input.name}</h2>
                  <p>
                    {p.input.length} × {p.input.width} × {p.input.height} cm ·{" "}
                    {p.result.volume.toLocaleString()} cm³
                  </p>
                </div>
                <span className={`badge ${p.result.status}`}>
                  {statusLabel(p.result, p.input.targetMargin)}
                </span>
              </div>
              <div className="record-stats">
                <div>
                  <span>廠商實際報價</span>
                  <strong>$ {money(p.input.vendorPrice)}</strong>
                </div>
                <div>
                  <span>最高可接受進價</span>
                  <strong>$ {money(p.result.maxVendorCost)}</strong>
                </div>
                <div>
                  <span>強哥淨利</span>
                  <strong>$ {money(p.result.profit)}</strong>
                </div>
                <div>
                  <span>強哥淨利率 / 目標</span>
                  <strong>
                    {p.result.profitMargin === null
                      ? "—"
                      : percent(p.result.profitMargin)}{" "}
                    / {percent(p.input.targetMargin)}
                  </strong>
                </div>
              </div>
              <details>
                <summary>查看試算表欄位與費用</summary>
                <dl className="record-details">
                  {Object.entries({
                    成本: money(p.sheet.cost),
                    稅後進價: money(p.sheet.taxInclusiveCost),
                    "check Fixed": p.sheet.checkFixed || "—",
                    市價: money(p.input.retailPrice),
                    市價毛利: percent(p.sheet.retailMargin),
                    實際售價: money(p.sheet.actualPrice),
                    寄倉處理費: money(p.fees?.handling ?? null),
                    物流運送費: money(p.fees?.logistics ?? null),
                    費率來源:
                      p.fees?.source === "manual"
                        ? "手動試算"
                        : p.fees?.source === "table"
                          ? p.fees.tableVersion
                          : "待提供",
                  }).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              <div className="record-footer">
                <time dateTime={p.createdAt}>
                  {new Date(p.createdAt).toLocaleString("zh-TW")}
                </time>
                <div>
                  <button onClick={() => onEdit(p)}>編輯</button>
                  <button
                    className="danger-link"
                    onClick={() => {
                      if (window.confirm(`確定刪除「${p.input.name}」？`))
                        onDelete(p.id);
                    }}
                  >
                    刪除
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {confirmClear && (
        <div className="modal-backdrop">
          <div
            className="card modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="clear-title"
          >
            <h2 id="clear-title">確定清空全部 {products.length} 筆紀錄？</h2>
            <p>此操作無法復原，建議先匯出 CSV 備份。</p>
            <div>
              <button autoFocus onClick={() => setConfirmClear(false)}>
                保留紀錄
              </button>
              <button
                className="danger-button"
                onClick={() => {
                  onClear();
                  setConfirmClear(false);
                }}
              >
                確認清空全部
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
