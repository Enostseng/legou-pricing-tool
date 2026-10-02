import type { FormState } from "../form";
interface Props {
  form: FormState;
  setField: (key: keyof FormState, value: string) => void;
}
export function QuoteForm({ form, setField }: Props) {
  const numeric = (
    key: keyof FormState,
    label: string,
    unit: string,
    optional = false,
  ) => (
    <label className="field" key={key}>
      <span>{label}</span>
      <div className="input-wrap">
        <input
          aria-label={label}
          type="number"
          inputMode="decimal"
          min={key === "retailMargin" ? undefined : "0"}
          max={key === "targetMargin" ? "99.99" : "1000000000"}
          step="any"
          value={form[key]}
          placeholder={optional ? "可留空" : "0"}
          onChange={(e) => setField(key, e.target.value)}
        />
        <span>{unit}</span>
      </div>
    </label>
  );
  return (
    <section className="card input-card" aria-labelledby="input-title">
      <div className="section-heading">
        <span className="step">01</span>
        <div>
          <h2 id="input-title">商品資料</h2>
          <p>填入商品資訊，即時查看報價結果</p>
        </div>
      </div>
      <label className="field">
        <span>商品名稱</span>
        <input
          autoComplete="off"
          maxLength={200}
          placeholder="例如：陶瓷手沖咖啡杯"
          value={form.name}
          onChange={(e) => setField("name", e.target.value)}
        />
      </label>
      {numeric("retailPrice", "商品市售價", "元")}
      <div className="dimensions">
        {numeric("length", "長", "cm")}
        {numeric("width", "寬", "cm")}
        {numeric("height", "高", "cm")}
      </div>
      {numeric("vendorPrice", "廠商實際報價", "元")}
      <div className="target-setting">
        {numeric("targetMargin", "目標淨利率", "%")}
        <p>每筆商品都會保存當次設定的目標值。</p>
      </div>
      <details className="sheet-options">
        <summary>
          試算表補充欄位 <span>選填</span>
        </summary>
        <p className="help">
          成本預設為廠商報價；實際售價預設為樂購採購價；市價毛利預設為樂購毛利率。稅後進價、check
          Fixed 未定義公式，先留空供手動填寫。
        </p>
        <div className="two-columns">
          {numeric("cost", "成本", "元", true)}
          {numeric("taxInclusiveCost", "稅後進價", "元", true)}
          {numeric("retailMargin", "市價毛利", "%", true)}
          {numeric("actualPrice", "實際售價", "元", true)}
        </div>
        <label className="field">
          <span>check Fixed</span>
          <input
            value={form.checkFixed}
            maxLength={200}
            onChange={(e) => setField("checkFixed", e.target.value)}
            placeholder="依公司工作表填寫"
          />
        </label>
      </details>
    </section>
  );
}
