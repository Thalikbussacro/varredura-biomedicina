import { useEmailConfig, useInitiateGmailAuth } from '../hooks/useEmail';

export function EmailConfigBadge() {
  const { data: config, isLoading, refetch } = useEmailConfig();
  const initiateAuth = useInitiateGmailAuth();

  const handleAuth = async () => {
    try {
      await initiateAuth.mutateAsync();
      // Aguarda 3 segundos e recarrega o status
      setTimeout(() => {
        refetch();
      }, 3000);
    } catch (error) {
      alert('Erro ao iniciar autenticação');
    }
  };

  if (isLoading) {
    return (
      <span className="text-xs text-gray-500">
        Verificando config...
      </span>
    );
  }

  if (!config) {
    return null;
  }

  const allConfigured = config.openai.configured && config.gmail.authenticated;

  return (
    <div className="flex items-center gap-2 text-xs">
      {/* OpenAI Status */}
      <div className="flex items-center gap-1">
        <span className={config.openai.configured ? 'text-green-600' : 'text-red-600'}>
          {config.openai.configured ? '✓' : '✗'} OpenAI
        </span>
      </div>

      <span className="text-gray-300">|</span>

      {/* Gmail Status */}
      <div className="flex items-center gap-1">
        <span className={config.gmail.authenticated ? 'text-green-600' : 'text-yellow-600'}>
          {config.gmail.authenticated ? '✓' : '⚠'} Gmail
        </span>
      </div>

      {/* Auth Button */}
      {!config.gmail.authenticated && config.gmail.clientConfigured && (
        <button
          onClick={handleAuth}
          disabled={initiateAuth.isPending}
          className="ml-2 px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
        >
          {initiateAuth.isPending ? 'Abrindo...' : 'Conectar Gmail'}
        </button>
      )}

      {!config.gmail.clientConfigured && !config.gmail.authenticated && (
        <span className="text-xs text-red-600">
          (Configure GMAIL_CLIENT_ID no .env)
        </span>
      )}

      {allConfigured && (
        <span className="text-xs text-green-600 font-medium">
          Sistema pronto!
        </span>
      )}
    </div>
  );
}
