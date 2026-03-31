"use client";

import {
  Search,
  X,
  ChevronDown,
  ChevronRight,
  User,
  UsersRound,
  FileText,
  LayoutGrid,
  LayoutList,
  Clock,
  Users,
  Star,
  Check,
} from "lucide-react";
import type { OntarioDecaEvent } from "@/lib/ontario-deca-data";
import {
  getCategoryTemplate,
  getPrepTimeMinutes,
  getPresentationTimeMinutes,
  isRoleplayEvent,
  isPreparedEvent,
  isOnlineEvent,
} from "@/lib/ontario-deca-data";

// ─── Helpers ──────────────────────────────────────────────────────────────

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── FilterChipBar ────────────────────────────────────────────────────────

export interface FilterChipOption {
  value: string;
  label: string;
  color: string;
}

interface FilterChipBarProps {
  options: FilterChipOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  "aria-label"?: string;
}

export function FilterChipBar({
  options,
  value,
  onChange,
  "aria-label": ariaLabel = "Filter by category",
}: FilterChipBarProps) {
  const hasFilter = value != null;
  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label={ariaLabel}
        className="flex min-w-0 flex-1 overflow-x-auto overflow-y-hidden gap-2 pb-1"
      >
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1 ${
            !value
              ? "bg-[var(--deca-blue)] text-white"
              : "border border-[var(--gray-200)] bg-white text-[var(--gray-600)] hover:border-[var(--gray-300)] hover:bg-[var(--gray-50)]"
          }`}
        >
          All
        </button>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(value === opt.value ? null : opt.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1 ${
              value === opt.value
                ? "text-white"
                : "border border-[var(--gray-200)] bg-white text-[var(--gray-600)] hover:border-[var(--gray-300)] hover:bg-[var(--gray-50)]"
            }`}
            style={
              value === opt.value
                ? { backgroundColor: opt.color }
                : { borderColor: `${opt.color}40` }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
      {hasFilter && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="shrink-0 text-xs font-medium text-[var(--deca-blue)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] rounded"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

// ─── SectionHeader ─────────────────────────────────────────────────────────

interface SectionHeaderProps {
  label: string;
  count: number;
  color: string;
  isCollapsed: boolean;
  onToggle: () => void;
}

export function SectionHeader({
  label,
  count,
  color,
  isCollapsed,
  onToggle,
}: SectionHeaderProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="practice-section-header w-full flex items-center gap-3 text-left"
      style={{
        borderLeftColor: color,
        backgroundColor: hexToRgba(color, 0.06),
        padding: "12px 16px",
        borderRadius: "0 8px 8px 0",
      }}
      aria-expanded={!isCollapsed}
    >
      <ChevronDown
        className={`collapsible-chevron h-5 w-5 shrink-0 text-[var(--gray-500)] ${isCollapsed ? "-rotate-90" : ""}`}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--gray-900)]">
        {label}
      </span>
      <span
        className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
        style={{ backgroundColor: color }}
      >
        {count}
      </span>
    </button>
  );
}

// ─── PracticeEventCard ─────────────────────────────────────────────────────

interface PracticeEventCardProps {
  event: OntarioDecaEvent;
  categoryColor: string;
  practiceCount: number;
  highlight?: boolean;
  listView?: boolean;
  onStartPractice: (code: string) => void;
}

export function PracticeEventCard({
  event,
  categoryColor,
  practiceCount,
  highlight = false,
  listView = false,
  onStartPractice,
}: PracticeEventCardProps) {
  const template = getCategoryTemplate(event.category_key);
  const participants = template?.participants ?? "1";
  const prepMin = getPrepTimeMinutes(event);
  const presMin = getPresentationTimeMinutes(event);
  const canPractice = isRoleplayEvent(event) || isPreparedEvent(event);
  const onlineOnly = isOnlineEvent(event);

  const EventIcon =
    isRoleplayEvent(event) && !participants.toLowerCase().includes("team")
      ? User
      : participants.toLowerCase().includes("team") || participants.includes("2")
        ? UsersRound
        : FileText;

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canPractice) return;
    onStartPractice(event.code);
  };

  if (listView) {
    return (
      <div
        role={canPractice ? "button" : undefined}
        tabIndex={canPractice ? 0 : undefined}
        onClick={canPractice ? () => onStartPractice(event.code) : undefined}
        onKeyDown={
          canPractice
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onStartPractice(event.code);
                }
              }
            : undefined
        }
        className="practice-event-card practice-event-card--list flex min-h-[72px] items-center justify-between gap-4 rounded-xl border-l-4 border-[var(--gray-200)] bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all hover:border-[var(--gray-300)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)]"
        style={{ borderLeftColor: categoryColor }}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <p className="min-w-0 font-semibold text-[var(--gray-900)] line-clamp-2">
              {event.name}
            </p>
            {highlight && (
              <Star className="h-4 w-4 shrink-0 fill-amber-500 text-amber-500" aria-hidden />
            )}
          </div>
          <p className="text-xs text-[var(--gray-500)]">({event.code})</p>
          {practiceCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-[var(--gray-600)]">
              <Check className="h-3.5 w-3.5 text-[var(--success)]" aria-hidden />
              Practiced {practiceCount}x
            </span>
          )}
        </div>
        {canPractice && (
          <button
            type="button"
            onClick={handleStart}
            className="shrink-0 rounded-full px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)]"
            style={{ backgroundColor: categoryColor }}
          >
            Start Practice
          </button>
        )}
      </div>
    );
  }

  const cardContent = (
    <>
      <div className="flex min-h-[2.5rem] items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 font-semibold text-[var(--gray-900)]">{event.name}</p>
          <p className="mt-0.5 text-xs text-[var(--gray-500)]">({event.code})</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {highlight && (
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" aria-hidden />
          )}
          {canPractice && (
            <EventIcon className="h-4 w-4 text-[var(--gray-400)]" strokeWidth={2} aria-hidden />
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span
          className="rounded px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: `${categoryColor}20`, color: categoryColor }}
        >
          {template?.category_name ?? event.category_key}
        </span>
        <span className="flex items-center gap-1 rounded bg-[var(--gray-100)] px-1.5 py-0.5 text-xs text-[var(--gray-600)]">
          <Users className="h-3 w-3" />
          {participants}
        </span>
      </div>
      {(prepMin != null || presMin != null) && (
        <div className="flex flex-wrap gap-2 text-xs text-[var(--gray-600)]">
          {prepMin != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {prepMin}m prep
            </span>
          )}
          {presMin != null && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {presMin}m pres
            </span>
          )}
        </div>
      )}
      {practiceCount > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-[var(--gray-600)]">
          <Check className="h-3.5 w-3.5 text-[var(--success)]" aria-hidden />
          Practiced {practiceCount} time{practiceCount !== 1 ? "s" : ""}
        </p>
      )}
      {onlineOnly && (
        <p className="text-xs text-amber-600">Online event — practice not available</p>
      )}
      {canPractice && (
        <button
          type="button"
          onClick={handleStart}
          className="practice-card-start-btn mt-auto"
          style={{ backgroundColor: categoryColor }}
        >
          Start Practice
        </button>
      )}
    </>
  );

  const interactiveClasses = canPractice
    ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] practice-card-hover focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)]"
    : "cursor-not-allowed opacity-60";

  if (canPractice) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onStartPractice(event.code)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onStartPractice(event.code);
          }
        }}
        className={`practice-event-card flex min-h-[200px] flex-col gap-3 rounded-xl border-t-4 border-[var(--gray-200)] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-200 animate-practice-card-enter focus:outline-none ${interactiveClasses}`}
        style={{ borderTopColor: categoryColor }}
      >
        {cardContent}
      </div>
    );
  }
  return (
    <div
      className={`practice-event-card flex min-h-[200px] flex-col gap-3 rounded-xl border-t-4 border-[var(--gray-200)] bg-white p-4 text-left shadow-[0_2px_8px_rgba(0,0,0,0.06)] animate-practice-card-enter ${interactiveClasses}`}
      style={{ borderTopColor: categoryColor }}
    >
      {cardContent}
    </div>
  );
}

// ─── ViewToggle ───────────────────────────────────────────────────────────

type ViewMode = "grid" | "list";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
  "aria-label"?: string;
}

export function ViewToggle({
  value,
  onChange,
  "aria-label": ariaLabel = "View mode",
}: ViewToggleProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-[var(--gray-200)] bg-[var(--gray-50)] p-0.5"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "grid"}
        aria-label="Grid view"
        onClick={() => onChange("grid")}
        className={`inline-flex items-center justify-center rounded-md p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1 ${
          value === "grid"
            ? "bg-white text-[var(--deca-blue)] shadow-sm"
            : "text-[var(--gray-500)] hover:text-[var(--gray-700)]"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "list"}
        aria-label="List view"
        onClick={() => onChange("list")}
        className={`inline-flex items-center justify-center rounded-md p-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-1 ${
          value === "list"
            ? "bg-white text-[var(--deca-blue)] shadow-sm"
            : "text-[var(--gray-500)] hover:text-[var(--gray-700)]"
        }`}
      >
        <LayoutList className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── SearchInput ───────────────────────────────────────────────────────────

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  "aria-label"?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel = "Search events",
}: SearchInputProps) {
  const hasValue = value.length > 0;
  return (
    <div className="relative flex flex-1 items-center gap-2">
      <Search
        className="absolute left-4 h-5 w-5 shrink-0 text-[var(--gray-400)] pointer-events-none"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded-xl border border-[var(--gray-200)] bg-white py-3 pl-11 pr-10 text-sm text-[var(--gray-900)] placeholder:text-[var(--gray-500)] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition focus:border-[var(--deca-blue)] focus:outline-none focus:ring-2 focus:ring-[var(--deca-blue)]/20"
      />
      {hasValue && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 rounded p-1 text-[var(--gray-400)] hover:bg-[var(--gray-100)] hover:text-[var(--gray-600)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)]"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── EmptyState ────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--gray-200)] bg-[var(--gray-50)] py-12 px-6 text-center">
      {icon && (
        <div className="mb-4 rounded-2xl bg-[var(--deca-blue-light)] p-4">{icon}</div>
      )}
      <p className="text-lg font-semibold text-[var(--gray-900)]">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-[var(--gray-600)]">{description}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--deca-blue)] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[var(--deca-blue-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--deca-blue)] focus-visible:ring-offset-2"
      >
        {actionLabel}
      </button>
    </div>
  );
}
