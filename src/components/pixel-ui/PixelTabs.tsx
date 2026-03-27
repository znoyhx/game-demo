import { cn } from '../../core/utils/cn';

interface PixelTabItem {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

interface PixelTabsProps {
  items: PixelTabItem[];
  label: string;
  className?: string;
}

export function PixelTabs({ items, label, className }: PixelTabsProps) {
  return (
    <nav className={cn('pixel-tabs', className)} aria-label={label}>
      {items.map((item) => {
        const tabClassName = cn(
          'pixel-tabs__item',
          item.isActive && 'pixel-tabs__item--active',
          item.disabled && 'pixel-tabs__item--disabled',
        );

        if (item.href) {
          return (
            <a
              key={item.id}
              className={tabClassName}
              href={item.href}
              aria-disabled={item.disabled}
              onClick={(event) => {
                if (item.disabled) {
                  event.preventDefault();
                  return;
                }

                item.onClick?.();
              }}
            >
              {item.label}
            </a>
          );
        }

        return (
          <button
            key={item.id}
            type="button"
            className={tabClassName}
            disabled={item.disabled}
            onClick={item.onClick}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
