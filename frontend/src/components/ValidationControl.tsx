import { useState } from 'react';
import { useStartValidationBatch, useValidationBatchStatus, useValidationStats } from '../hooks/useValidation';

export function ValidationControl() {
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null);
  const startBatch = useStartValidationBatch();
  const batchStatus = useValidationBatchStatus(activeBatchId);
  const stats = useValidationStats();

  const handleStartValidation = async () => {
    try {
      const result = await startBatch.mutateAsync();
      setActiveBatchId(result.batchId);
    } catch (error) {
      alert('Erro ao iniciar validação');
    }
  };

  const progress = batchStatus.data
    ? (batchStatus.data.completed / batchStatus.data.total) * 100
    : 0;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h2 className="text-lg font-semibold mb-4">Validação por IA</h2>

      {/* Statistics */}
      {stats.data && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.data.total}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stats.data.byStatus.validated || 0}
            </div>
            <div className="text-sm text-gray-600">Validados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {stats.data.byStatus.flagged || 0}
            </div>
            <div className="text-sm text-gray-600">Sinalizados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {stats.data.byStatus.pending || 0}
            </div>
            <div className="text-sm text-gray-600">Pendentes</div>
          </div>
        </div>
      )}

      {/* Start Button */}
      {!activeBatchId && (
        <button
          onClick={handleStartValidation}
          disabled={startBatch.isPending || (stats.data?.byStatus.pending || 0) === 0}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {startBatch.isPending
            ? 'Iniciando...'
            : `Validar Estabelecimentos Pendentes (${stats.data?.byStatus.pending || 0})`
          }
        </button>
      )}

      {/* Progress */}
      {activeBatchId && batchStatus.data && (
        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span>Progresso</span>
            <span>{batchStatus.data.completed} / {batchStatus.data.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm text-center">
            <div>
              <span className="text-green-600 font-semibold">{batchStatus.data.validated}</span>
              <span className="text-gray-600"> validados</span>
            </div>
            <div>
              <span className="text-red-600 font-semibold">{batchStatus.data.flagged}</span>
              <span className="text-gray-600"> sinalizados</span>
            </div>
            <div>
              <span className="text-yellow-600 font-semibold">{batchStatus.data.failed}</span>
              <span className="text-gray-600"> falhas</span>
            </div>
          </div>
          {batchStatus.data.status === 'completed' && (
            <button
              onClick={() => {
                setActiveBatchId(null);
                stats.refetch();
              }}
              className="mt-4 w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Fechar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
