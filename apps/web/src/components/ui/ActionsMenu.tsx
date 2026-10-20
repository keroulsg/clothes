import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, MoreVertical, MoreHorizontal } from 'lucide-react';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  onClick: () => void;
}

interface ActionsMenuProps {
  label?: string;
  items: ActionMenuItem[];
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'icon-vertical' | 'icon-horizontal';
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  className?: string;
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({
  label = 'إجراءات',
  items,
  variant = 'secondary',
  size = 'sm',
  align = 'right',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const sizeClasses = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm';

  const getButtonClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#7F1625] text-white hover:bg-[#6a121e] border border-[#7F1625] shadow-sm font-bold';
      case 'outline':
        return 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold';
      case 'ghost':
        return 'text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold';
      case 'icon-vertical':
      case 'icon-horizontal':
        return 'p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700';
      case 'secondary':
      default:
        return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-semibold';
    }
  };

  return (
    <div className={`relative inline-block text-right rtl:text-right ${className}`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`inline-flex items-center justify-between gap-1.5 rounded-lg transition-all select-none cursor-pointer ${
          variant === 'icon-vertical' || variant === 'icon-horizontal' ? '' : sizeClasses
        } ${getButtonClasses()}`}
      >
        {variant === 'icon-vertical' ? (
          <MoreVertical className="w-4 h-4" />
        ) : variant === 'icon-horizontal' ? (
          <MoreHorizontal className="w-4 h-4" />
        ) : (
          <>
            <span>{label}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 w-56 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl py-1 text-xs text-zinc-900 dark:text-zinc-100 animate-in fade-in zoom-in-95 duration-100 ${
            align === 'left' ? 'left-0' : 'right-0 rtl:right-0 rtl:left-auto ltr:right-auto ltr:left-0'
          }`}
          style={{ minWidth: '13rem' }}
        >
          {items.map((item, idx) => (
            <React.Fragment key={item.id || idx}>
              {item.divider && <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />}
              <button
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick();
                    setIsOpen(false);
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-right rtl:text-right ltr:text-left transition-colors cursor-pointer select-none ${
                  item.disabled
                    ? 'opacity-40 cursor-not-allowed text-zinc-400'
                    : item.danger
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-700 dark:hover:text-red-400'
                    : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{item.icon}</span>}
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    {item.badge}
                  </span>
                )}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};
