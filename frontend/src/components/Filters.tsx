import { useCategories, useCities } from '../hooks/useEstablishments';
import type { Filters } from '../types';

interface FiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export function Filters({ filters, onChange }: FiltersProps) {
  const categories = useCategories();
  const cities = useCities(filters.uf || undefined);

  return (
    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Estado</label>
        <select
          value={filters.uf}
          onChange={(e) => onChange({ ...filters, uf: e.target.value, city: '' })}
          className="px-3 py-2 border rounded-md min-w-[120px]"
        >
          <option value="">Todos</option>
          <option value="RS">RS</option>
          <option value="SC">SC</option>
          <option value="PR">PR</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Cidade</label>
        <select
          value={filters.city}
          onChange={(e) => onChange({ ...filters, city: e.target.value })}
          className="px-3 py-2 border rounded-md min-w-[180px]"
          disabled={!filters.uf}
        >
          <option value="">Todas</option>
          {cities.map((c) => (
            <option key={`${c.uf}-${c.name}`} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Categoria</label>
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="px-3 py-2 border rounded-md min-w-[200px]"
        >
          <option value="">Todas</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-700 mb-1">Buscar</label>
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Nome ou cidade..."
          className="px-3 py-2 border rounded-md min-w-[200px]"
        />
      </div>
    </div>
  );
}
