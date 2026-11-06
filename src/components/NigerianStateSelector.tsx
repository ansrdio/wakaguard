import { ChevronDown } from "lucide-react";
import { MOST_USED_STATES, NigerianState, OTHER_STATES, stateLabel } from "@/lib/nigerianStates";

export default function NigerianStateSelector({
  value,
  onChange,
}: {
  value: NigerianState | null;
  onChange: (s: NigerianState) => void;
}) {
  return (
    <div className="relative">
      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <span className="text-sm font-medium text-slate-700">State</span>

        <div className="relative">
          <select
            value={value || MOST_USED_STATES[0]}
            onChange={(e) => onChange(e.target.value as NigerianState)}
            className="appearance-none bg-transparent pr-7 text-sm font-semibold text-slate-900 outline-none"
          >
            <optgroup label="Most used">
              {MOST_USED_STATES.map((s) => (
                <option key={s} value={s}>
                  {stateLabel(s)}
                </option>
              ))}
            </optgroup>
            <optgroup label="All states">
              {OTHER_STATES.map((s) => (
                <option key={s} value={s}>
                  {stateLabel(s)}
                </option>
              ))}
            </optgroup>
          </select>

          <ChevronDown className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        </div>
      </label>
    </div>
  );
}
