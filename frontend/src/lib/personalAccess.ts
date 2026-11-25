// O acesso direto é exclusivo da prévia local; os endereços publicados mantêm a sessão.
export const personalAccess = import.meta.env.DEV && import.meta.env.VITE_REQUIRE_LOGIN !== 'true'
  && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
