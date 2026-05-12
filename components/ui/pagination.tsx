import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

type PaginationSize = "sm" | "md" | "lg";

const sizeClasses: Record<PaginationSize, { button: string; ellipsis: string; icon: string }> = {
  sm: {
    button: "h-7 min-w-7 px-1.5 text-xs gap-1",
    ellipsis: "h-7 w-7",
    icon: "h-3.5 w-3.5",
  },
  md: {
    button: "h-9 min-w-9 px-3 text-sm gap-1.5",
    ellipsis: "h-9 w-9",
    icon: "h-4 w-4",
  },
  lg: {
    button: "h-11 min-w-11 px-4 text-base gap-2",
    ellipsis: "h-11 w-11",
    icon: "h-5 w-5",
  },
};

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

function PaginationButton({
  className,
  isActive,
  disabled,
  size = "md",
  ...props
}: React.ComponentProps<"button"> & { isActive?: boolean; size?: PaginationSize }) {
  return (
    <button
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size].button,
        isActive
          ? "bg-green-600 text-white"
          : "text-gray-400 hover:bg-white/10 hover:text-white",
        className
      )}
      {...props}
    />
  )
}

function PaginationEllipsis({ className, size = "md", ...props }: React.ComponentProps<"span"> & { size?: PaginationSize }) {
  return (
    <span
      aria-hidden
      className={cn("flex items-center justify-center text-gray-500", sizeClasses[size].ellipsis, className)}
      {...props}
    >
      <MoreHorizontalIcon className={sizeClasses[size].icon} />
    </span>
  )
}

/**
 * Generates page numbers to display: first, last, current ± siblings, with ellipsis
 */
function getPageNumbers(current: number, total: number, siblings = 1): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];

  const rangeStart = Math.max(2, current - siblings);
  const rangeEnd = Math.min(total - 1, current + siblings);

  // Always show first page
  pages.push(1);

  // Ellipsis after first if needed
  if (rangeStart > 2) {
    pages.push("ellipsis");
  }

  // Middle range
  for (let i = rangeStart; i <= rangeEnd; i++) {
    pages.push(i);
  }

  // Ellipsis before last if needed
  if (rangeEnd < total - 1) {
    pages.push("ellipsis");
  }

  // Always show last page (if more than 1 page)
  if (total > 1) {
    pages.push(total);
  }

  return pages;
}

interface PaginationControlProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  size?: PaginationSize;
  showLabels?: boolean;
  prevLabel?: string;
  nextLabel?: string;
}

function PaginationControl({
  page,
  totalPages,
  onPageChange,
  disabled,
  size = "md",
  showLabels = true,
  prevLabel = "Anterior",
  nextLabel = "Próximo",
}: PaginationControlProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <Pagination>
      <PaginationContent>
        {/* Previous */}
        <PaginationItem>
          <PaginationButton
            size={size}
            onClick={() => onPageChange(page - 1)}
            disabled={disabled || page === 1}
            aria-label="Página anterior"
          >
            <ChevronLeftIcon className={sizeClasses[size].icon} />
            {showLabels && <span className="hidden sm:inline">{prevLabel}</span>}
          </PaginationButton>
        </PaginationItem>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${i}`}>
              <PaginationEllipsis size={size} />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationButton
                size={size}
                isActive={p === page}
                onClick={() => onPageChange(p)}
                disabled={disabled}
              >
                {p}
              </PaginationButton>
            </PaginationItem>
          )
        )}

        {/* Next */}
        <PaginationItem>
          <PaginationButton
            size={size}
            onClick={() => onPageChange(page + 1)}
            disabled={disabled || page === totalPages}
            aria-label="Próxima página"
          >
            {showLabels && <span className="hidden sm:inline">{nextLabel}</span>}
            <ChevronRightIcon className={sizeClasses[size].icon} />
          </PaginationButton>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationButton,
  PaginationEllipsis,
  PaginationControl,
}
export type { PaginationSize }
