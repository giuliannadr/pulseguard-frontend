'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTranslation, type Language } from '@/lib/i18n';
import { api, githubToken as ghTokenHelper } from '@/lib/api';

type Tab = 'pref' | 'integ';

export default function SettingsPage() {
  const { t, language, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('pref');
  
  const [token, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [githubConnected, setGithubConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  // Preference Settings
  const [webhookUrl, setWebhookUrl] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [testStatus, setTestStatus] = useState('');
  const [applyingToAll, setApplyingToAll] = useState(false);
  const [applyResult, setApplyResult] = useState('');

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
        if (ghTokenHelper.get()) setGithubConnected(true);
        setLoading(false);
      });
    });
  }, []);

  function handleSavePreferences(e: React.FormEvent) {
    e.preventDefault();
    localStorage.setItem('pg_webhook_url', webhookUrl);
    setSuccessMsg(t('settings_saved'));
    setTimeout(() => setSuccessMsg(''), 3000);
  }

  async function handleApplyWebhookToAll() {
    if (!token || !webhookUrl) return;
    setApplyingToAll(true);
    setApplyResult('');
    try {
      const monitors = await api.monitors.list(token);
      await Promise.all(monitors.map(m => api.monitors.update(m.id, { notificationWebhookUrl: webhookUrl }, token)));
      setApplyResult(`Applied to ${monitors.length} monitor${monitors.length !== 1 ? 's' : ''}.`);
    } catch {
      setApplyResult('Failed to apply. Try again.');
    } finally {
      setApplyingToAll(false);
      setTimeout(() => setApplyResult(''), 4000);
    }
  }

  async function handleSendTestWebhook() {
    if (!webhookUrl) {
      setTestStatus('Please enter a Webhook URL first.');
      return;
    }

    setTestStatus('Sending test payload...');
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

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors' // avoid CORS block for Discord/Slack direct calls
      });

      setTestStatus('Test alert sent! Check your channel.');
    } catch (e: any) {
      console.error(e);
      setTestStatus('Failed to send webhook request: ' + e.message);
    }
  }

  async function handleConnectGithub() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/settings`,
        scopes: 'repo write:repo_hook read:user'
      }
    });
  }

  return (
    <div style={{ width: '100%', animation: 'pg-fade-in 0.35s ease-out both', maxWidth: 800, margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--color-acid)', letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 8px' }}>
          // System Config
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: '#F0F0F0', margin: 0, letterSpacing: '-0.02em', lineHeight: 1 }}>
          {t('settings_title')}
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#666', marginTop: 8 }}>
          {t('settings_desc')}
        </p>
      </div>

      {/* Tabs Selector */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 16, marginBottom: 32 }}>
        {[
          { id: 'pref', name: t('settings_tab_pref') },
          { id: 'integ', name: t('settings_tab_integ') },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as Tab)}
            style={{
              padding: '8px 16px',
              background: activeTab === t.id ? 'rgba(0,240,255,0.05)' : 'transparent',
              border: activeTab === t.id ? '1px solid rgba(0,240,255,0.3)' : '1px solid transparent',
              borderRadius: 3,
              color: activeTab === t.id ? 'var(--color-acid)' : '#888',
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
      <div style={{ background: '#080808', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 3, padding: 28 }}>
        
        {/* Tab 1: Preferences */}
        {activeTab === 'pref' && (
          <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Language Selector */}
            <div>
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#F0F0F0', fontWeight: 'bold', marginBottom: 6 }}>
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
                    background: language === 'en' ? 'rgba(0,240,255,0.05)' : 'transparent',
                    border: language === 'en' ? '1px solid var(--color-acid)' : '1px solid rgba(255,255,255,0.1)',
                    color: language === 'en' ? 'var(--color-acid)' : '#888',
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
                    background: language === 'es' ? 'rgba(0,240,255,0.05)' : 'transparent',
                    border: language === 'es' ? '1px solid var(--color-acid)' : '1px solid rgba(255,255,255,0.1)',
                    color: language === 'es' ? 'var(--color-acid)' : '#888',
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
              <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#F0F0F0', fontWeight: 'bold', marginBottom: 6 }}>
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
                  background: '#000',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#F0F0F0',
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
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#F0F0F0',
                  padding: '6px 12px',
                  borderRadius: 3,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Send Test Alert Webhook
              </button>
              {testStatus && (
                <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'var(--font-mono)', color: '#888' }}>
                  {testStatus}
                </div>
              )}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                  type="button"
                  onClick={handleApplyWebhookToAll}
                  disabled={applyingToAll || !webhookUrl}
                  style={{ background: 'transparent', border: '1px solid rgba(0,240,255,0.2)', color: webhookUrl ? 'var(--color-acid)' : '#4A4A4A', padding: '6px 12px', borderRadius: 3, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: webhookUrl ? 'pointer' : 'not-allowed' }}
                >
                  {applyingToAll ? 'Applying...' : 'Apply to all existing monitors'}
                </button>
                {applyResult && (
                  <span style={{ marginLeft: 12, fontSize: 11, fontFamily: 'var(--font-mono)', color: applyResult.includes('Failed') ? '#FF1744' : '#00E676' }}>
                    {applyResult}
                  </span>
                )}
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#555', margin: '6px 0 0' }}>
                  Saves this webhook URL on all your current monitors.
                </p>
              </div>
            </div>

            {/* Msg Success */}
            {successMsg && (
              <div style={{ background: 'rgba(0,230,118,0.08)', border: '1px solid #00E676', borderRadius: 3, color: '#00E676', padding: 12, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                {successMsg}
              </div>
            )}

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
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#F0F0F0', margin: '0 0 8px' }}>
                {t('settings_gh_status')}
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#888', lineHeight: 1.5, margin: '0 0 16px 0' }}>
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
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#F0F0F0', margin: '0 0 6px' }}>
                  Public Status Page
                </h3>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#888', lineHeight: 1.5, margin: '0 0 14px 0' }}>
                  Share this URL so anyone can see your monitors' live status without logging in.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-acid)', background: 'rgba(0,240,255,0.05)', border: '1px solid rgba(0,240,255,0.15)', padding: '8px 14px', borderRadius: 3, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/s/${userId}` : `/s/${userId}`}
                  </code>
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/s/${userId}`;
                      navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
                    }}
                    style={{ background: copied ? 'rgba(0,230,118,0.1)' : 'transparent', border: `1px solid ${copied ? '#00E676' : 'rgba(255,255,255,0.15)'}`, color: copied ? '#00E676' : '#F0F0F0', padding: '8px 14px', borderRadius: 3, fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                  >
                    {copied ? '✓ Copied' : 'Copy URL'}
                  </button>
                </div>
              </div>
            )}

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#F0F0F0', margin: '0 0 8px' }}>
                Supabase Session Profile
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: '#4A4A4A' }}>Email:</span>
                <span style={{ color: '#F0F0F0' }}>{userEmail || '—'}</span>
                
                <span style={{ color: '#4A4A4A' }}>Status:</span>
                <span style={{ color: '#00E676' }}>{t('settings_active_session') || 'Active Session'}</span>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
