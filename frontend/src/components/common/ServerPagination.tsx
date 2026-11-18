import { Button } from '../ui/Button';

export const STANDARD_PAGE_SIZES = [10, 20, 50, 100] as const;

type ServerPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages?: number;
  loading?: boolean;
  label?: string;
  pageSizes?: readonly number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

const pageWindow = (page: number, totalPages: number) => {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  return [...pages].filter(value => value >= 1 && value <= totalPages).sort((a, b) => a - b);
};

export function ServerPagination({
  page,
  pageSize,
  total,
  totalPages = Math.max(1, Math.ceil(total / pageSize)),
  loading = false,
  label = 'élément(s)',
  pageSizes = STANDARD_PAGE_SIZES,
  onPageChange,
  onPageSizeChange,
}: ServerPaginationProps) {
  const lastPage = Math.max(1, totalPages);
  const currentPage = Math.min(Math.max(1, page), lastPage);
  const pages = pageWindow(currentPage, lastPage);
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(total, currentPage * pageSize);

  return (
    <nav aria-label={`Pagination des ${label}`} className="flex flex-wrap items-center justify-between gap-3 border-t p-3 text-xs">
      <span aria-live="polite">{start}–{end} sur {total} {label}</span>
      <div className="flex flex-wrap items-center gap-1">
        <label className="mr-2 flex items-center gap-2">
          <span>Par page</span>
          <select
            aria-label="Taille de page"
            className="rounded border border-slate-300 bg-white px-2 py-1"
            value={pageSize}
            disabled={loading}
            onChange={event => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizes.map(size => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <Button size="xs" variant="outline" aria-label="Première page" disabled={loading || currentPage <= 1} onClick={() => onPageChange(1)}>«</Button>
        <Button size="xs" variant="outline" aria-label="Page précédente" disabled={loading || currentPage <= 1} onClick={() => onPageChange(currentPage - 1)}>Précédent</Button>
        {pages.map((value, index) => (
          <span key={value} className="contents">
            {index > 0 && value - pages[index - 1] > 1 && <span aria-hidden="true" className="px-1">…</span>}
            <Button
              size="xs"
              variant={value === currentPage ? 'primary' : 'outline'}
              aria-label={`Page ${value}`}
              aria-current={value === currentPage ? 'page' : undefined}
              disabled={loading}
              onClick={() => onPageChange(value)}
            >{value}</Button>
          </span>
        ))}
        <Button size="xs" variant="outline" aria-label="Page suivante" disabled={loading || currentPage >= lastPage} onClick={() => onPageChange(currentPage + 1)}>Suivant</Button>
        <Button size="xs" variant="outline" aria-label="Dernière page" disabled={loading || currentPage >= lastPage} onClick={() => onPageChange(lastPage)}>»</Button>
      </div>
    </nav>
  );
}
