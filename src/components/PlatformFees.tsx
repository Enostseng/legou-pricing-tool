import type { Fees } from "../feeTable";
import { feeTable } from "../feeTable";
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
          : "依靜態費率表計算；若未匹配級距，請確認費率設定。"}
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
            <dd>{fees ? `$ ${money(fees.handling)}` : "待提供費率"}</dd>
          </div>
          <div>
            <dt>物流運送費</dt>
            <dd>{fees ? `$ ${money(fees.logistics)}` : "待提供費率"}</dd>
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
