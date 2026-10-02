import { DEFAULT_TARGET_MARGIN } from "./pricing";
export interface FormState {
  name: string;
  retailPrice: string;
  length: string;
  width: string;
  height: string;
  vendorPrice: string;
  targetMargin: string;
  handling: string;
  logistics: string;
  feeMode: "table" | "manual";
  cost: string;
  taxInclusiveCost: string;
  checkFixed: string;
  retailMargin: string;
  actualPrice: string;
}
export const emptyForm = (
  target = String(DEFAULT_TARGET_MARGIN * 100),
): FormState => ({
  name: "",
  retailPrice: "",
  length: "",
  width: "",
  height: "",
  vendorPrice: "",
  targetMargin: target,
  handling: "",
  logistics: "",
  feeMode: "table",
  cost: "",
  taxInclusiveCost: "",
  checkFixed: "",
  retailMargin: "",
  actualPrice: "",
});
