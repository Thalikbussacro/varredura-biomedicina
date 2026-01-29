import { useState } from 'react';
import { useSendBatch, useBatchStatus } from '../hooks/useEmail';

interface BatchEmailSenderProps {
  selectedIds: number[];
  onClearSelection: () => void;
}

export function BatchEmailSender({ selectedIds, onClearSelection }: BatchEmailSenderProps) {
  const [batchId, setBatchId] = useState<string | null>(null);
  const sendBatch = useSendBatch();
  const { data: batchStatus } = useBatchStatus(batchId);

  const handleSendBatch = async () => {
    if (selectedIds.length === 0) {
      alert('Selecione pelo menos um estabelecimento');
      return;
    }

    const confirmed = confirm(
      `Deseja iniciar o envio em massa para ${selectedIds.length} estabelecimento(s)?\n\n` +
      `Os e-mails serão gerados automaticamente (se necessário) e enviados com intervalo de 30 segundos entre cada um.`
    );

    if (!confirmed) return;

    try {
      const result = await sendBatch.mutateAsync(selectedIds);
      setBatchId(result.batchId);
    } catch (error) {
      alert(`Erro ao iniciar batch: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const handleClose = () => {
    setBatchId(null);
    onClearSelection();
  };

  if (selectedIds.length === 0 && !batchId) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 max-w-md">
      {!batchId ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">
              {selectedIds.length} selecionado(s)
            </h3>
            <button
              onClick={onClearSelection}
              className="text-gray-500 hover:text-gray-700 text-xl leading-none"
            >
              ×
            </button>
          </div>
          <button
            onClick={handleSendBatch}
            disabled={sendBatch.isPending}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
          >
            {sendBatch.isPending ? 'Iniciando...' : 'Processar Selecionados'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Processando E-mails</h3>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {batchStatus && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total:</span>
                <span className="font-medium">{batchStatus.total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Completados:</span>
                <span className="font-medium">{batchStatus.completed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-600">Falhas:</span>
                <span className="font-medium">{batchStatus.failed}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-yellow-600">Pendentes:</span>
                <span className="font-medium">{batchStatus.pending}</span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((batchStatus.completed + batchStatus.failed) / batchStatus.total) * 100}%`
                  }}
                />
              </div>

              {batchStatus.pending === 0 && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm">
                  <p className="text-green-800 font-medium">
                    ✓ Processamento concluído!
                  </p>
                  <p className="text-green-700 text-xs mt-1">
                    {batchStatus.completed} enviados, {batchStatus.failed} falhas
                  </p>
                </div>
              )}

              {batchStatus.jobs.some(j => j.error) && (
                <div className="mt-2 max-h-40 overflow-y-auto">
                  <p className="text-xs font-medium text-gray-700 mb-1">Erros:</p>
                  {batchStatus.jobs
                    .filter(j => j.error)
                    .map((job, idx) => (
                      <div key={idx} className="text-xs text-red-600 bg-red-50 p-1 rounded mb-1">
                        ID {job.establishmentId}: {job.error}
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
