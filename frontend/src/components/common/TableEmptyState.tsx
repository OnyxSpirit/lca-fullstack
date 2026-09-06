import React from 'react';
import { LoaderCircle } from 'lucide-react';

interface TableEmptyStateProps {
  colSpan: number;
  message: string;
  isLoading?: boolean;
}

export const TableEmptyState: React.FC<TableEmptyStateProps> = ({
  colSpan,
  message,
  isLoading = false,
}) => (
  <tr>
    <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-slate-500">
      <div className="flex items-center justify-center gap-2">
        {isLoading && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
        <span>{message}</span>
      </div>
    </td>
  </tr>
);
