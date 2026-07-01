'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTranslation, type Language } from '@/lib/i18n';
import { api, githubToken as ghTokenHelper } from '@/lib/api';
import { notify } from '@/lib/toast';
import { useTour } from '@/components/Tour';
import { useRouter } from 'next/navigation';

type Tab = 'pref' | 'integ';

export default function SettingsPage() {
  const { t, language, setLanguage } = useTranslation();
  const { startTour } = useTour();
  const router = useRouter();

  function handleReplayTour() {
    startTour();
    router.push('/dashboard');
  }
  const [activeTab, setActiveTab] = useState<Tab>('pref');
  
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Preference Settings
  const [webhookUrl, setWebhookUrl] = useState('');
  const [applyingToAll, setApplyingToAll] = useState(false);

  useEffect(() => {
    // Load local settings
    const savedWebhook = localStorage.getItem('pg_webhook_url') || '';
    setWebhookUrl(savedWebhook);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserEmail(user.email ?? null);
      setUserId(user.id);
      supabase.auth.getSession().then(({ data: { session } }) => {
        setToken(session?.access_token ?? null);
        const provider = user.app_metadata?.provider;
        if (provider === 'github' || ghTokenHelper.get()) setGithubConnected(true);
        setLoading(false);
      });
    });
  }, []);

  function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem('pg_webhook_url', webhookUrl);
    notify.success(t('settings_saved'));
  }

  async function handleApplyWebhookToAll() {
    if (!token || !webhookUrl) return;
    setApplyingToAll(true);
    try {
      const monitors = await api.monitors.list(token);
      await Promise.all(monitors.map(m => api.monitors.update(m.id, { notificationWebhookUrl: webhookUrl }, token)));
      notify.success(`Webhook aplicado a ${monitors.length} monitor${monitors.length !== 1 ? 'es' : ''}`);
    } catch {
      notify.error('No se pudo aplicar el webhook. Intentá de nuevo.');
    } finally {
      setApplyingToAll(false);
    }
  }

  async function handleSendTestWebhook() {
    if (!webhookUrl) {
      notify.warning('Ingresá una URL de webhook primero');
      return;
    }

    const toastId = notify.loading('Enviando payload de prueba...');
    try {
      const isDiscord = webhookUrl.includes('discord.com/api/webhooks');
      const isSlack = webhookUrl.includes('hooks.slack.com');

      let payload = {};
      if (isDiscord) {
        payload = {
          content: '🔔 **PulseGuard Test Notification**',
          embeds: [
            {
              title: 'Integration Test Successful',
              description: 'This is a test alert sent from the PulseGuard Dashboard.',
              color: 13303552, // var(--color-acid) in decimal
              fields: [
                { name: 'Status', value: '🟢 Operational', inline: true },
                { name: 'Environment', value: 'Production', inline: true }
              ],
              footer: { text: 'PulseGuard DevSecOps' }
            }
          ]
        };
      } else if (isSlack) {
        payload = {
          text: '🔔 *PulseGuard Test Notification*\nIntegration Test Successful!\nThis is a test alert sent from the PulseGuard Dashboard.'
        };
      } else {
        payload = {
          event: 'integration_test',
          message: 'PulseGuard webhook alert test success!'
        };
      }

      // Use no-cors for cross-origin webhooks; response is opaque so we always
      // show a "sent" message and ask the user to verify their channel.
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors',
      });

      notify.dismiss(toastId);
      notify.success('Test enviado — verificá tu canal', 'No podemos confirmar la entrega debido a restricciones CORS del servicio externo.');
    } catch (e: any) {
      notify.dismiss(toastId);
      notify.error('Error al enviar webhook', e.message);
    }
  }

  async function handleConnectGithub() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=/settings`,
        scopes: 'repo write:repo_hook read:user'
      }
    });
  }

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both', maxWidth: 800, margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#7C3AED', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px', fontFamily: 'var(--font-body)' }}>
          System Config
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: 'var(--color-txt-primary)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {t('settings_title')}
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-txt-muted)', marginTop: 8 }}>
          {t('settings_desc')}
        </p>
      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--color-border-main)', paddingBottom: 16, marginBottom: 32 }}>
        {[
          { id: 'pref', name: t('settings_tab_pref') },
          { id: 'integ', name: t('settings_tab_integ') },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as Tab)}
            style={{
              padding: '8px 16px',
              background: activeTab === t.id ? 'var(--color-brand-light)' : 'transparent',
              border: activeTab === t.id ? '1px solid var(--color-brand-mid)' : '1px solid transparent',
              borderRadius: 8,
              color: activeTab === t.id ? 'var(--color-brand-primary)' : 'var(--color-txt-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border-main)', borderRadius: 16, padding: 28 }}>
        
        {/* Tab 1: Preferences */}
        {activeTab === 'pref' && (
          <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Language Selector */}
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-primary)', fontWeight: 'bold', marginBottom: 6 }}>
                {t('settings_lang')}
              </label>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#555', margin: '0 0 12px 0' }}>
                {t('settings_lang_desc')}
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  style={{
                    padding: '8px 18px',
                    background: language === 'en' ? 'var(--color-brand-light)' : 'transparent',
                    border: language === 'en' ? '1px solid var(--color-brand-mid)' : '1px solid var(--color-border-main)',
                    color: language === 'en' ? 'var(--color-brand-primary)' : 'var(--color-txt-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  🇺🇸 English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('es')}
                  style={{
                    padding: '8px 18px',
                    background: language === 'es' ? 'var(--color-brand-light)' : 'transparent',
                    border: language === 'es' ? '1px solid var(--color-brand-mid)' : '1px solid var(--color-border-main)',
                    color: language === 'es' ? 'var(--color-brand-primary)' : 'var(--color-txt-muted)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: 12,
                    borderRadius: 3,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  🇪🇸 Español
                </button>
              </div>
            </div>

            {/* Webhook Configuration */}
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-primary)', fontWeight: 'bold', marginBottom: 6 }}>
                {t('settings_alert')}
              </label>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#555', margin: '0 0 12px 0' }}>
                {t('settings_alert_desc')}
              </p>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                style={{
                  width: '100%',
                  background: 'var(--color-bg-base)',
                  border: '1px solid var(--color-border-main)',
                  color: 'var(--color-txt-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  padding: '0 12px',
                  borderRadius: 3,
                  height: 40,
                  marginBottom: 10
                }}
              />
              <button
                type="button"
                onClick={handleSendTestWebhook}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border-main)',
                  color: 'var(--color-txt-primary)',
                  padding: '6px 12px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-card-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                🔔 Enviar alerta de prueba
              </button>
              {/* Message Preview */}
              {webhookUrl && (
                <div style={{ marginTop: 14, padding: 14, background: 'var(--color-bg-card-hover)', border: '1px solid var(--color-border-main)', borderRadius: 10 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--color-txt-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                    Preview del mensaje
                  </div>
                  {webhookUrl.includes('discord.com') ? (
                    <div style={{ background: '#36393f', borderRadius: 8, padding: 14, borderLeft: '4px solid #5865F2' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🔔</div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#fff' }}>PulseGuard</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#72767d' }}>Today at {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                      <div style={{ background: '#2f3136', borderRadius: 6, padding: 12, borderLeft: '4px solid #7C3AED' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4 }}>🚨 Alerta de Monitor</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#dcddde' }}>Tu servicio está caído. PulseGuard detectó una interrupción.</div>
                        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                          <div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#72767d', textTransform: 'uppercase' }}>Estado</div><div style={{ color: '#ED4245', fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>● CAÍDO</div></div>
                          <div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#72767d', textTransform: 'uppercase' }}>Hora</div><div style={{ color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{new Date().toLocaleString()}</div></div>
                        </div>
                      </div>
                    </div>
                  ) : webhookUrl.includes('hooks.slack.com') ? (
                    <div style={{ background: '#1d1c1d', borderRadius: 8, padding: 14, borderLeft: '4px solid #4A154B' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#fff', fontWeight: 700, marginBottom: 4 }}>PulseGuard Alerts</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#d1d2d3' }}>🚨 *Alerta de Monitor* — Tu servicio está CAÍDO. Revisá inmediatamente.</div>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--color-bg-card)', borderRadius: 8, padding: 14, border: '1px solid var(--color-border-main)' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-muted)', marginBottom: 6 }}>JSON Payload</div>
                      <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-txt-secondary)', margin: 0, overflow: 'auto' }}>{JSON.stringify({ event: 'monitor_down', monitor: 'My Service', status: 'down', timestamp: new Date().toISOString() }, null, 2)}</pre>
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border-main)' }}>

                <button
                  type="button"
                  onClick={handleApplyWebhookToAll}
                  disabled={applyingToAll || !webhookUrl}
                  style={{ background: 'transparent', border: '1px solid var(--color-border-main)', color: webhookUrl ? 'var(--color-brand-primary)' : 'var(--color-txt-muted)', padding: '6px 12px', borderRadius: 8, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: webhookUrl ? 'pointer' : 'not-allowed' }}
                >
                  {applyingToAll ? 'Aplicando...' : 'Aplicar a todos los monitores'}
                </button>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#555', margin: '6px 0 0' }}>
                  Guarda esta URL de webhook en todos tus monitores actuales.
                </p>
              </div>
            </div>

            {/* Tour replay */}
            <div style={{ paddingTop: 8, borderTop: '1px solid var(--color-border-main)' }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-txt-primary)', fontWeight: 'bold', marginBottom: 6 }}>
                Tour de bienvenida
              </label>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#555', margin: '0 0 12px 0' }}>
                Volvé a ver el recorrido guiado por las funciones de PulseGuard.
              </p>
              <button
                type="button"
                onClick={handleReplayTour}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--color-border-main)',
                  color: 'var(--color-brand-primary)',
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-brand-light)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                🗺️ Repasar tour
              </button>
            </div>

            <button
              type="submit"
              className="btn-strict-primary"
              style={{ height: 42, fontSize: 13, alignSelf: 'flex-start', padding: '0 24px' }}
            >
              {t('btn_save')}
            </button>
          </form>
        )}

        {/* Tab 2: Integrations */}
        {activeTab === 'integ' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-txt-primary)', margin: '0 0 8px' }}>
                {t('settings_gh_status')}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-txt-muted)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
                {githubConnected ? t('settings_gh_connected') : t('settings_gh_not_connected')}
              </p>
              
              <button
                onClick={handleConnectGithub}
                className="btn-strict-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 10, height: 38, fontSize: 12 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
                {githubConnected ? t('btn_reconnect_gh') : t('btn_connect_gh')}
              </button>
            </div>

            {userId && (
              <div style={{ borderTop: '1px solid var(--color-border-main)', paddingTop: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-txt-primary)', margin: '0 0 6px' }}>
                  Public Status Page
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--color-txt-muted)', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                  Share this URL so anyone can see your monitors' live status without logging in.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-brand-primary)', background: 'var(--color-brand-light)', border: '1px solid var(--color-brand-mid)', padding: '8px 14px', borderRadius: 8, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/s/${userId}` : `/s/${userId}`}
                  </code>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/s/${userId}`;
                      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
                    }}
                    style={{ background: copied ? 'rgba(0,230,118,0.1)' : 'transparent', border: `1px solid ${copied ? '#00E676' : 'var(--color-border-main)'}`, color: copied ? '#00E676' : 'var(--color-txt-primary)', padding: '8px 14px', borderRadius: 3, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                  >
                    {copied ? '✓ Copied' : 'Copy URL'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid var(--color-border-main)', paddingTop: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--color-txt-primary)', margin: '0 0 8px' }}>
                Supabase Session Profile
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: 'var(--color-txt-muted)' }}>Email:</span>
                <span style={{ color: 'var(--color-txt-primary)' }}>{userEmail || '—'}</span>
                
                <span style={{ color: 'var(--color-txt-muted)' }}>Status:</span>
                <span style={{ color: 'var(--color-status-up)' }}>{t('settings_active_session') || 'Active Session'}</span>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
