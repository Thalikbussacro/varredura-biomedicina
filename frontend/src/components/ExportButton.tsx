import { useState, useEffect } from 'react';
import type { Filters, Establishment } from '../types';

interface ExportButtonProps {
  filters: Filters;
  data?: Establishment[]; // Dados para exportação client-side (fallback)
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function ExportButton({ filters, data }: ExportButtonProps) {
  const [useClientExport, setUseClientExport] = useState(false);

  // Verifica se a API está disponível no mount
  useEffect(() => {
    fetch(`${API_URL}/stats`, { signal: AbortSignal.timeout(2000) })
      .then(res => {
        if (!res.ok) throw new Error('API not available');
        setUseClientExport(false);
      })
      .catch(() => {
        setUseClientExport(true);
      });
  }, []);

  const handleExport = async () => {
    if (!useClientExport) {
      // Tenta exportar via API
      try {
        const params = new URLSearchParams();
        if (filters.uf) params.set('uf', filters.uf);
        if (filters.city) params.set('city', filters.city);
        if (filters.category) params.set('category', filters.category);

        const url = `${API_URL}/export/csv?${params}`;
        const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = 'leads-biomedica-sul.csv';
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        return;
      } catch (error) {
        console.warn('API export failed, using client-side export');
      }
    }

    // Fallback: exportação client-side
    if (!data) {
      alert('Nenhum dado disponível para exportar');
      return;
    }

    const csv = generateCSV(data);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leads-biomedica-sul.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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

function generateCSV(data: Establishment[]): string {
  const headers = [
    'ID',
    'Estado',
    'Cidade',
    'Nome',
    'Categoria',
    'Site',
    'Telefones',
    'Emails',
    'WhatsApp',
    'Instagram',
    'Facebook',
  ];

  const rows = data.map(item => [
    item.id,
    item.estado,
    item.cidade,
    `"${item.nome.replace(/"/g, '""')}"`,
    item.categoria,
    item.site || '',
    item.telefones || '',
    item.emails || '',
    item.whatsapp || '',
    item.instagram || '',
    item.facebook || '',
  ]);

  return [
    headers.join(';'),
    ...rows.map(row => row.join(';'))
  ].join('\n');
}
