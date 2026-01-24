import { useState } from 'react';
import { DataTable } from './components/DataTable';
import { Filters as FiltersComponent } from './components/Filters';
import { ExportButton } from './components/ExportButton';
import { useEstablishments, useStats } from './hooks/useEstablishments';
import type { Filters } from './types';

function App() {
  const [filters, setFilters] = useState<Filters>({
    uf: '',
    city: '',
    category: '',
    search: '',
  });

  const { data, loading, error } = useEstablishments(filters);
  const stats = useStats();

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Leads para Estágio em Biomedicina - Sul do Brasil
          </h1>
          {stats && (
            <p className="text-sm text-gray-600 mt-1">
              {stats.total} estabelecimentos | {stats.withContacts} com contatos
            </p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-between items-start mb-4">
          <FiltersComponent filters={filters} onChange={setFilters} />
          <ExportButton filters={filters} />
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Carregando dados...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            Erro ao carregar dados: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              {data.length} resultados encontrados
            </p>
            <DataTable data={data} />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
