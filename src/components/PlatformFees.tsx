import type { Fees } from "../feeTable";
import { feeTable, CHANNEL_LABELS } from "../feeTable";
import { money } from "../pricing";
import type { QuoteResult } from "../pricing";
import type { FormState } from "../form";
export function PlatformFees({
  form,
  setField,
  result,
  fees,
}: {
  form: FormState;
  setField: (key: keyof FormState, value: string) => void;
  result: QuoteResult | null;
  fees: Fees | null;
}) {
  return (
    <section className="card platform-card" aria-labelledby="fees-title">
      <div className="section-heading">
        <span className="step">02</span>
        <div>
          <h2 id="fees-title">樂購平台收費（以下皆由樂購收取）</h2>
          <p>此區費用由樂購收取，並非我們額外加收。</p>
        </div>
      </div>
      <div className="notice">
        {feeTable.status === "placeholder"
          ? "正式費率待提供。可先手動填入費用試算，結果會標註為手動費率。"
          : "依材積與樂購採購價查表。優惠僅限指定運送渠道：採購價 ≤ 25 元按 50%，26–50 元按 75% 計費。"}
      </div>
      <label className="field">
        <span>費率來源</span>
        <select
          value={form.feeMode}
          onChange={(e) => setField("feeMode", e.target.value)}
        >
          <option value="table">
            公司費率表{feeTable.status === "placeholder" ? "（待提供）" : ""}
          </option>
          <option value="manual">手動輸入／試算</option>
        </select>
      </label>
      {form.feeMode === "table" && (
        <>
          <label className="field">
            <span>運送渠道</span>
            <select
              value={form.shippingChannel}
              onChange={(e) => setField("shippingChannel", e.target.value)}
            >
              {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <p className="help">
            查價金額：樂購採購價 $ {money(result?.purchasePrice ?? null)} ·
            費率版本 {feeTable.version}
          </p>
          {fees && (
            <p className="help">
              {fees.discountMultiplier === 1
                ? "使用原費率"
                : `寄倉與物流費均已按 ${Number(fees.discountMultiplier) * 100}% 計算`}
            </p>
          )}
        </>
      )}
      {form.feeMode === "manual" ? (
        <div className="two-columns">
          {(["handling", "logistics"] as const).map((key, i) => (
            <label className="field" key={key}>
              <span>{i === 0 ? "寄倉處理費" : "物流運送費"}</span>
              <div className="input-wrap">
                <input
                  aria-label={i === 0 ? "寄倉處理費" : "物流運送費"}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="1000000000"
                  step="any"
                  value={form[key]}
                  placeholder="請輸入"
                  onChange={(e) => setField(key, e.target.value)}
                />
                <span>元</span>
              </div>
            </label>
          ))}
        </div>
      ) : (
        <dl>
          <div>
            <dt>寄倉處理費</dt>
            <dd>{fees ? `$ ${money(fees.handling)}` : "待填完整商品資料"}</dd>
          </div>
          <div>
            <dt>物流運送費</dt>
            <dd>{fees ? `$ ${money(fees.logistics)}` : "待填完整商品資料"}</dd>
          </div>
        </dl>
      )}
      <dl>
        <div>
          <dt>
            銷售獎勵金 <span>3%</span>
          </dt>
          <dd>$ {money(result?.reward ?? null)}</dd>
        </div>
        <div>
          <dt>
            活動贊助費 <span>1.5%</span>
          </dt>
          <dd>$ {money(result?.sponsorship ?? null)}</dd>
        </div>
      </dl>
    </section>
  );
}
