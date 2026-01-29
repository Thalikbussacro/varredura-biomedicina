import { useState } from 'react';
import { useGeneratedEmail, useGenerateEmail } from '../hooks/useEmail';
import { EmailModal } from './EmailModal';

interface EmailActionsProps {
  establishmentId: number;
  hasEmail: string | null;
}

export function EmailActions({ establishmentId, hasEmail }: EmailActionsProps) {
  const [showModal, setShowModal] = useState(false);
  const { data: generatedEmail, isLoading } = useGeneratedEmail(establishmentId);
  const generateEmail = useGenerateEmail();

  const handleGenerate = async () => {
    if (generatedEmail) {
      setShowModal(true);
      return;
    }

    try {
      await generateEmail.mutateAsync(establishmentId);
      setShowModal(true);
    } catch (error) {
      alert(`Erro ao gerar e-mail: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  if (!hasEmail) {
    return (
      <span className="text-xs text-gray-400" title="Estabelecimento não possui e-mail">
        -
      </span>
    );
  }

  if (isLoading) {
    return (
      <span className="text-xs text-gray-500">
        ...
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {!generatedEmail && (
        <button
          onClick={handleGenerate}
          disabled={generateEmail.isPending}
          className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded border border-blue-300 disabled:opacity-50"
          title="Gerar e-mail com IA"
        >
          {generateEmail.isPending ? 'Gerando...' : 'Gerar E-mail'}
        </button>
      )}

      {generatedEmail?.status === 'draft' && (
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded border border-green-300"
          title="Ver e enviar e-mail"
        >
          Ver E-mail
        </button>
      )}

      {generatedEmail?.status === 'sent' && (
        <span className="text-xs text-green-600 font-medium" title="E-mail enviado">
          ✓ Enviado
        </span>
      )}

      {generatedEmail?.status === 'failed' && (
        <button
          onClick={() => setShowModal(true)}
          className="px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded border border-red-300"
          title="Ver erro"
        >
          ✗ Falha
        </button>
      )}

      {showModal && generatedEmail && (
        <EmailModal
          email={generatedEmail}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
