"use client";

export interface FilterChipOption {
  value: string;
  label: string;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  "aria-label"?: string;
}

/** Normalize value for comparison — empty string treated as null for "All" */
function normalizeValue(v: string | null): string {
  return v ?? "";
}

/**
 * Filter chips for quick filtering. Selected chip has filled background.
 * Medium radius, subtle border. Keyboard focus states.
 */
export function FilterChips({
  options,
  value,
  onChange,
  "aria-label": ariaLabel = "Filter by type",
}: FilterChipsProps) {
  if (options.length === 0) return null;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-2"
    >
      {options.map((opt) => {
        const isSelected = normalizeValue(value) === opt.value;
        return (
          <button
            key={opt.value || "__all__"}
            type="button"
            onClick={() => onChange(isSelected ? null : (opt.value || null))}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1 ${
              isSelected
                ? "border-[var(--deca-blue)] bg-[var(--deca-blue-light)] text-[var(--deca-blue)]"
                : "border-[var(--gray-200)] bg-white text-[var(--gray-600)] hover:border-[var(--gray-300)] hover:bg-[var(--gray-50)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
