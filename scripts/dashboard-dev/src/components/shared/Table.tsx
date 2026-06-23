import React, { useState, useMemo } from 'react';

interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
}

/**
 * Table — generic sortable, clickable table.
 *
 * Features:
 * - Column sorting (click header to sort ascending/descending)
 * - Row click handler (for navigation to detail view)
 * - Empty state message
 *
 * Evolved from dashboard-template.html .overview-table.
 */
export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = '暂无数据',
  className = '',
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const sorted = [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const as = String(av ?? '');
      const bs = String(bv ?? '');
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return sorted;
  }, [data, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  if (data.length === 0) {
    return (
      <div className={`text-center text-text2 text-sm py-8 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <table className={`w-full border-collapse text-xs ${className}`}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th
              key={String(col.key)}
              onClick={() => col.sortable && handleSort(String(col.key))}
              className={`text-left px-2.5 py-2 bg-surface2 text-text2 font-semibold text-2xs uppercase tracking-wide ${
                col.sortable ? 'cursor-pointer hover:text-text' : ''
              }`}
              style={col.width ? { width: col.width } : undefined}
            >
              {col.label}
              {sortKey === String(col.key) && (
                <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sortedData.map((row, idx) => (
          <tr
            key={idx}
            onClick={() => onRowClick?.(row)}
            className={`border-t border-border ${onRowClick ? 'cursor-pointer hover:bg-surface2' : ''}`}
          >
            {columns.map((col) => (
              <td key={String(col.key)} className="px-2.5 py-2">
                {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
