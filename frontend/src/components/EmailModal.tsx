import { useState } from 'react';
import type { GeneratedEmail } from '../types';
import { useSendEmail, useDeleteEmail } from '../hooks/useEmail';

interface EmailModalProps {
  email: GeneratedEmail;
  onClose: () => void;
}

export function EmailModal({ email, onClose }: EmailModalProps) {
  const [isSending, setIsSending] = useState(false);
  const sendEmail = useSendEmail();
  const deleteEmail = useDeleteEmail();

  const handleSend = async () => {
    if (!confirm('Deseja realmente enviar este e-mail?')) {
      return;
    }

    setIsSending(true);
    try {
      await sendEmail.mutateAsync(email.id);
      alert('E-mail enviado com sucesso!');
      onClose();
    } catch (error) {
      alert(`Erro ao enviar e-mail: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Deseja realmente deletar este rascunho?')) {
      return;
    }

    try {
      await deleteEmail.mutateAsync(email.id);
      alert('Rascunho deletado com sucesso!');
      onClose();
    } catch (error) {
      alert(`Erro ao deletar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">
            {email.status === 'draft' && 'Rascunho de E-mail'}
            {email.status === 'sent' && 'E-mail Enviado'}
            {email.status === 'failed' && 'Falha no Envio'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Para:
              </label>
              <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                {email.recipient_email}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assunto:
              </label>
              <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                {email.subject}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mensagem:
              </label>
              <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200 whitespace-pre-wrap">
                {email.body}
              </div>
            </div>

            {email.status === 'sent' && email.sent_at && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <p className="text-green-800 text-sm">
                  ✓ Enviado em {new Date(email.sent_at).toLocaleString('pt-BR')}
                </p>
              </div>
            )}

            {email.status === 'failed' && email.error_message && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <p className="text-red-800 text-sm font-medium">Erro:</p>
                <p className="text-red-700 text-sm mt-1">{email.error_message}</p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          {email.status === 'draft' && (
            <>
              <button
                onClick={handleDelete}
                disabled={deleteEmail.isPending}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded border border-red-300 disabled:opacity-50"
              >
                {deleteEmail.isPending ? 'Deletando...' : 'Deletar'}
              </button>
              <button
                onClick={handleSend}
                disabled={isSending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
              >
                {isSending ? 'Enviando...' : 'Enviar Agora'}
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded border border-gray-300"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
