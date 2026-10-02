import { money, percent, statusLabel } from "../pricing";
import type { QuoteResult } from "../pricing";
export function CalculationSummary({
  result,
  targetMargin,
  manual,
}: {
  result: QuoteResult | null;
  targetMargin: number;
  manual: boolean;
}) {
  return (
    <section className="card summary-card" aria-labelledby="summary-title">
      <div className="summary-head">
        <h2 id="summary-title">報價試算</h2>
        <span>
          目標 {Number.isFinite(targetMargin) ? percent(targetMargin) : "—"}
        </span>
      </div>
      <div className="price-focus">
        <span>最高可接受進價</span>
        <strong data-testid="max-vendor-cost">
          {result?.maxVendorCost !== null && result?.maxVendorCost !== undefined
            ? `$ ${money(result.maxVendorCost)}`
            : "—"}
        </strong>
        <small>廠商要給的進價 · 保留目標淨利後的上限</small>
      </div>
      <div
        className={`quote-status ${result?.status ?? "pending"}`}
        role="status"
      >
        {result ? statusLabel(result, targetMargin) : "填寫商品資料開始試算"}
      </div>
      {manual && (
        <p className="manual-note">手動費率試算 · 提交前請核對正式費率</p>
      )}
      <div className="profit-grid">
        <div>
          <span>廠商淨利</span>
          <strong>$ {money(result?.profit ?? null)}</strong>
        </div>
        <div>
          <span>廠商淨利率</span>
          <strong>
            {result?.profitMargin == null ? "—" : percent(result.profitMargin)}
          </strong>
        </div>
      </div>
      <dl className="summary-details">
        <div>
          <dt>扣除蝦皮直營平台費用後撥款金額</dt>
          <dd>$ {money(result?.payout ?? null)}</dd>
        </div>
        <div>
          <dt>蝦皮直營採購價</dt>
          <dd>$ {money(result?.purchasePrice ?? null)}</dd>
        </div>
        <div>
          <dt>商品材積</dt>
          <dd>{result ? result.volume.toLocaleString("zh-TW") : "—"} cm³</dd>
        </div>
        <div>
          <dt>2% 所得稅</dt>
          <dd>$ {money(result?.incomeTax ?? null)}</dd>
        </div>
        <div>
          <dt>5% 營業稅</dt>
          <dd>$ {money(result?.businessTax ?? null)}</dd>
        </div>
        <div>
          <dt>蝦皮直營毛利率</dt>
          <dd>{result ? percent(result.retailMargin) : "—"}</dd>
        </div>
      </dl>
      <p className="help">
        金額單位為新台幣。顯示至小數點後 2
        位，判定使用未四捨五入的數值。蝦皮直營毛利率＝（市售價 − 蝦皮直營採購價）÷
        市售價。
      </p>
    </section>
  );
}
