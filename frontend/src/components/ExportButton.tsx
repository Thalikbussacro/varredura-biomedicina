import type { Filters } from '../types';

interface ExportButtonProps {
  filters: Filters;
}

export function ExportButton({ filters }: ExportButtonProps) {
  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.uf) params.set('uf', filters.uf);
    if (filters.city) params.set('city', filters.city);
    if (filters.category) params.set('category', filters.category);

    window.open(`http://localhost:3001/api/export/csv?${params}`, '_blank');
  };

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Exportar CSV
    </button>
  );
}
