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
      { accessorKey: 'estado', header: 'UF', size: 60 },
      { accessorKey: 'cidade', header: 'Cidade', size: 150 },
      { accessorKey: 'nome', header: 'Nome', size: 250 },
      {
        accessorKey: 'categoria',
        header: 'Categoria',
        cell: ({ getValue }) => (getValue() as string).replace(/_/g, ' '),
        size: 150
      },
      {
        accessorKey: 'telefones',
        header: 'Telefones',
        size: 130,
        cell: ({ getValue }) => getValue() || '-'
      },
      {
        accessorKey: 'emails',
        header: 'Email',
        size: 200,
        cell: ({ getValue }) => {
          const value = getValue() as string | null;
          if (!value) return '-';
          const firstEmail = value.split(',')[0].trim();
          return (
            <a href={`mailto:${firstEmail}`} className="text-blue-600 hover:underline text-xs">
              {firstEmail}
            </a>
          );
        }
      },
      {
        accessorKey: 'site',
        header: 'Site',
        size: 80,
        cell: ({ getValue }) => {
          const value = getValue() as string | null;
          if (!value) return '-';
          return (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-xs"
            >
              🔗 Acessar
            </a>
          );
        }
      },
      {
        id: 'redes',
        header: 'Redes Sociais',
        size: 150,
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
                className="text-pink-600 hover:underline"
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
                className="text-green-600 hover:underline"
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
                className="text-blue-700 hover:underline"
                title="Facebook"
              >
                👍
              </a>
            );
          }

          return links.length > 0 ? (
            <div className="flex gap-2">{links}</div>
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
    <div className="overflow-x-auto border rounded-lg">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
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
                <td key={cell.id} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
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
