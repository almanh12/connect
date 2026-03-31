"use client";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  "aria-label"?: string;
}

/**
 * Segmented control with clear selected state (filled background, higher contrast).
 * Keyboard navigable with focus ring.
 */
export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  "aria-label": ariaLabel = "View mode",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--gray-50)] p-0.5"
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-label={opt.label}
            onClick={() => onChange(opt.value)}
            className={`inline-flex items-center gap-2 rounded-[4px] px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1 ${
              isSelected
                ? "bg-[var(--deca-blue)] text-white shadow-sm"
                : "text-[var(--gray-600)] hover:text-[var(--gray-800)]"
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
