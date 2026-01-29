import { useConnectionStatus } from '../hooks/useConnectionStatus';

interface ConnectionStatusBadgeProps {
  inline?: boolean;
}

export function ConnectionStatusBadge({ inline = false }: ConnectionStatusBadgeProps) {
  const status = useConnectionStatus();

  const isOnline = status.isOnline;
  const isDev = import.meta.env.MODE === 'development';

  // Cores e ícones baseados no status
  const badge = isOnline
    ? {
        icon: '🌐',
        text: 'Online',
        bg: 'bg-green-100',
        text_color: 'text-green-700',
        border: 'border-green-300',
      }
    : {
        icon: '📦',
        text: 'Fallback (BD Local)',
        bg: 'bg-yellow-100',
        text_color: 'text-yellow-700',
        border: 'border-yellow-300',
      };

  // Tooltip info
  const modeText = status.isConfigured
    ? 'Modo estático configurado'
    : isOnline
    ? 'Conectado à API'
    : 'Fallback automático (API offline)';

  return (
    <div className={inline ? 'inline-block' : 'fixed top-4 right-4 z-50'}>
      <div className="group relative">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${badge.bg} ${badge.text_color} ${badge.border}`}
        >
          <span>{badge.icon}</span>
          <span>{badge.text}</span>
        </span>

        {/* Tooltip */}
        <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
            <div className="mb-1">
              <strong>Status:</strong> {modeText}
            </div>
            {isDev && (
              <>
                <div className="mb-1">
                  <strong>API URL:</strong> {status.apiUrl}
                </div>
                <div>
                  <strong>Modo:</strong> {status.mode}
                </div>
              </>
            )}
            {/* Seta do tooltip */}
            <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
