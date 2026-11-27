import { finalizeIntegerInput, sanitizeIntegerInput } from '../utils/numericInput';
import { InfoTooltip } from './InfoTooltip';

interface IntegerInputFieldProps {
  id: string;
  label: string;
  value: string;
  min: number;
  max: number;
  fallback: number;
  infoTooltip?: string;
  infoTooltipAlign?: 'left' | 'right';
  onChangeText: (nextText: string) => void;
  onCommitNumber: (nextValue: number) => void;
}

export function IntegerInputField({
  id,
  label,
  value,
  min,
  max,
  fallback,
  infoTooltip,
  infoTooltipAlign = 'right',
  onChangeText,
  onCommitNumber,
}: IntegerInputFieldProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="block text-xs font-medium text-slate-700">
          {label}
        </label>
        {infoTooltip && (
          <InfoTooltip
            label={`More information about ${label}`}
            content={infoTooltip}
            align={infoTooltipAlign}
          />
        )}
      </div>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const cleaned = sanitizeIntegerInput(e.target.value);
          if (e.currentTarget.value !== cleaned) {
            e.currentTarget.value = cleaned;
          }
          onChangeText(cleaned);
          if (cleaned !== '') {
            onCommitNumber(Number.parseInt(cleaned, 10));
          }
        }}
        onBlur={() => {
          const clamped = finalizeIntegerInput(value, min, max, fallback);
          onChangeText(String(clamped));
          onCommitNumber(clamped);
        }}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 tabular-nums focus:border-teal-700 focus:outline-none"
      />
    </div>
  );
}
