import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type SortingState,
  type ColumnDef,
} from '@tanstack/react-table';
import { useState, useMemo } from 'react';
import type { Establishment } from '../types';

interface DataTableProps {
  data: Establishment[];
}

export function DataTable({ data }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Establishment>[]>(
    () => [
      { accessorKey: 'estado', header: 'UF', size: 50 },
      {
        accessorKey: 'cidade',
        header: 'Cidade',
        size: 110,
        cell: ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span title={value} className="block truncate max-w-[110px]">
              {value}
            </span>
          );
        }
      },
      {
        accessorKey: 'distancia_km',
        header: 'Distância',
        size: 90,
        cell: ({ getValue }) => {
          const value = getValue() as number | null;
          if (!value) return '-';
          return `${value} km`;
        },
        sortingFn: 'basic',
      },
      {
        accessorKey: 'nome',
        header: 'Nome',
        size: 180,
        cell: ({ getValue }) => {
          const value = getValue() as string;
          return (
            <span title={value} className="block truncate max-w-[180px]">
              {value}
            </span>
          );
        }
      },
      {
        accessorKey: 'categoria',
        header: 'Categoria',
        cell: ({ getValue }) => (getValue() as string).replace(/_/g, ' '),
        size: 130
      },
      {
        accessorKey: 'telefones',
        header: 'Telefones',
        size: 110,
        cell: ({ getValue }) => {
          const value = getValue() as string | null;
          if (!value) return '-';
          return <span className="text-xs">{value}</span>;
        }
      },
      {
        accessorKey: 'emails',
        header: 'Email',
        size: 160,
        cell: ({ getValue }) => {
          const value = getValue() as string | null;
          if (!value) return '-';
          const firstEmail = value.split(',')[0].trim();
          return (
            <a
              href={`mailto:${firstEmail}`}
              className="text-blue-600 hover:underline text-xs block truncate max-w-[160px]"
              title={firstEmail}
            >
              {firstEmail}
            </a>
          );
        }
      },
      {
        accessorKey: 'site',
        header: 'Site',
        size: 50,
        cell: ({ getValue }) => {
          const value = getValue() as string | null;
          if (!value) return '-';
          return (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-xs"
              title={value}
            >
              🔗
            </a>
          );
        }
      },
      {
        id: 'redes',
        header: 'Redes',
        size: 80,
        cell: ({ row }) => {
          const instagram = row.original.instagram;
          const whatsapp = row.original.whatsapp;
          const facebook = row.original.facebook;

          const links = [];

          if (instagram) {
            links.push(
              <a
                key="ig"
                href={instagram.includes('http') ? instagram : `https://instagram.com/${instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 hover:underline text-sm"
                title="Instagram"
              >
                📷
              </a>
            );
          }

          if (whatsapp) {
            const waNumber = whatsapp.replace(/\D/g, '');
            links.push(
              <a
                key="wa"
                href={`https://wa.me/${waNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:underline text-sm"
                title="WhatsApp"
              >
                💬
              </a>
            );
          }

          if (facebook) {
            links.push(
              <a
                key="fb"
                href={facebook.includes('http') ? facebook : `https://facebook.com/${facebook}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 hover:underline text-sm"
                title="Facebook"
              >
                👍
              </a>
            );
          }

          return links.length > 0 ? (
            <div className="flex gap-1">{links}</div>
          ) : (
            '-'
          );
        }
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto border rounded-lg shadow-sm">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-tight cursor-pointer hover:bg-gray-100"
                  style={{ width: header.getSize() }}
                >
                  <div className="flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {{
                      asc: ' ↑',
                      desc: ' ↓',
                    }[header.column.getIsSorted() as string] ?? ''}
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-2 py-2 text-sm text-gray-900">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
