import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  perPage: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  isAr?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  isLoading = false,
  isAr = true,
  className = '',
}) => {
  if (totalItems === 0 || totalPages <= 1) {
    return null;
  }

  const from = Math.min((currentPage - 1) * perPage + 1, totalItems);
  const to = Math.min(currentPage * perPage, totalItems);

  // Generate page numbers with ellipsis for large ranges
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-card)] text-xs text-[var(--text-secondary)] rounded-b-2xl ${className}`}
      aria-label={isAr ? 'التنقل بين الصفحات' : 'Pagination'}
    >
      {/* Range Info */}
      <div className="font-medium text-[var(--text-muted)] font-sans">
        {isAr ? (
          <>
            عرض <span className="font-bold text-[var(--text-primary)]">{from}</span> إلى{' '}
            <span className="font-bold text-[var(--text-primary)]">{to}</span> من إجمالي{' '}
            <span className="font-bold text-[var(--text-primary)]">{totalItems}</span> عنصر
          </>
        ) : (
          <>
            Showing <span className="font-bold text-[var(--text-primary)]">{from}</span> to{' '}
            <span className="font-bold text-[var(--text-primary)]">{to}</span> of{' '}
            <span className="font-bold text-[var(--text-primary)]">{totalItems}</span> entries
          </>
        )}
      </div>

      {/* Page Navigation Controls */}
      <div className="flex items-center gap-1.5">
        {/* Previous Button */}
        <button
          type="button"
          disabled={currentPage <= 1 || isLoading}
          onClick={() => onPageChange(currentPage - 1)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label={isAr ? 'الصفحة السابقة' : 'Previous page'}
        >
          {isAr ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline font-medium">{isAr ? 'السابق' : 'Prev'}</span>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === 'ellipsis') {
              return (
                <span key={`ell-${idx}`} className="px-1.5 text-[var(--text-muted)] select-none">
                  …
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                disabled={isLoading}
                onClick={() => onPageChange(p)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-w-[30px] h-[30px] px-2 flex items-center justify-center rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#7F1625] dark:bg-[#9E2A3B] text-white shadow-xs font-bold'
                    : 'border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Button */}
        <button
          type="button"
          disabled={currentPage >= totalPages || isLoading}
          onClick={() => onPageChange(currentPage + 1)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          aria-label={isAr ? 'الصفحة التالية' : 'Next page'}
        >
          <span className="hidden sm:inline font-medium">{isAr ? 'التالي' : 'Next'}</span>
          {isAr ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
