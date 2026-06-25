'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'es';

const translations = {
  en: {
    nav_projects: 'Projects',
    nav_security: 'Security',
    nav_playground: 'Playground',
    nav_status: 'Status',
    nav_settings: 'Settings',
    nav_signout: 'Sign out',
    nav_signedin: 'Signed in',
    nav_navigation: 'Navigation',

    btn_import: 'Import Repository',
    btn_check: 'Check Now',
    btn_scan: 'Scan Commits',
    btn_scan_now: 'Scan Recent Commits Now',
    btn_pause: 'Pause',
    btn_resume: 'Resume',
    btn_delete: 'Delete',
    btn_resolve: 'Resolve',
    btn_save: 'Save Preferences',
    btn_connect_gh: 'Connect GitHub',
    btn_reconnect_gh: 'Reconnect GitHub',

    dash_system: 'System',
    dash_total: 'Total',
    dash_operational: 'Operational',
    dash_down: 'Down',
    dash_degraded: 'Degraded',
    dash_project: 'Project',
    dash_response: 'Response',
    dash_ssl: 'SSL',
    dash_interval: 'Int.',
    dash_empty_title: 'No projects monitored yet',
    dash_empty_desc: 'To get started, import a Git repository and configure its public URL.',

    sec_global: 'Global',
    sec_title: 'Security Operations',
    sec_critical: 'Critical Risks',
    sec_high: 'High Risks',
    sec_medium: 'Medium Risks',
    sec_resolved: 'Resolved',
    sec_all_clear: 'All Clear!',
    sec_no_incidents: 'No security incidents have been detected across your projects.',
    sec_detected: 'AI Security Incidents Detected',
    sec_resolved_badge: 'RESOLVED',
    sec_responsible: 'Responsible',
    sec_recommendation: 'Recommendation',
    sec_author: 'Author',

    play_sub: 'SecOps Laboratory',
    play_title: 'Developer Playground',
    play_desc: 'Test API endpoints, scan code snippets, check network configurations, and run safe attack simulations in real-time.',
    play_tab_api: 'API Auditor',
    play_tab_code: 'Code Auditor',
    play_tab_dns: 'SSL & DNS Inspector',
    play_tab_hack: 'Hacking Simulator',

    settings_title: 'Settings & Preferences',
    settings_desc: 'Manage your profile preferences, webhook integrations, and application language.',
    settings_tab_pref: 'Preferences',
    settings_tab_integ: 'Integrations',
    settings_lang: 'Language',
    settings_lang_desc: 'Choose the language for the PulseGuard dashboard.',
    settings_alert: 'Slack / Discord Alert Webhook',
    settings_alert_desc: 'Receive alerts when downtime or security risks are detected.',
    settings_saved: 'Settings saved successfully!',
    settings_gh_status: 'GitHub Connectivity',
    settings_gh_connected: 'Your GitHub account is connected. You can import repositories and scan commits.',
    settings_gh_not_connected: 'Your GitHub account is not connected. Connect it to pull repository lists.',
  },
  es: {
    nav_projects: 'Proyectos',
    nav_security: 'Seguridad',
    nav_playground: 'Consola',
    nav_status: 'Estado',
    nav_settings: 'Configuración',
    nav_signout: 'Cerrar sesión',
    nav_signedin: 'Conectado como',
    nav_navigation: 'Navegación',

    btn_import: 'Importar Repositorio',
    btn_check: 'Comprobar ahora',
    btn_scan: 'Escanear commits',
    btn_scan_now: 'Escanear commits recientes ahora',
    btn_pause: 'Pausar',
    btn_resume: 'Reanudar',
    btn_delete: 'Eliminar',
    btn_resolve: 'Resolver',
    btn_save: 'Guardar preferencias',
    btn_connect_gh: 'Conectar GitHub',
    btn_reconnect_gh: 'Reconectar GitHub',

    dash_system: 'Sistema',
    dash_total: 'Total',
    dash_operational: 'Operativo',
    dash_down: 'Caído',
    dash_degraded: 'Degradado',
    dash_project: 'Proyecto',
    dash_response: 'Respuesta',
    dash_ssl: 'SSL',
    dash_interval: 'Int.',
    dash_empty_title: 'No hay proyectos monitoreados',
    dash_empty_desc: 'Para comenzar, importa un repositorio de Git y configura su URL pública.',

    sec_global: 'Global',
    sec_title: 'Operaciones de Seguridad',
    sec_critical: 'Riesgos Críticos',
    sec_high: 'Riesgos Altos',
    sec_medium: 'Riesgos Medios',
    sec_resolved: 'Resueltos',
    sec_all_clear: '¡Todo Limpio!',
    sec_no_incidents: 'No se han detectado incidentes de seguridad en tus proyectos.',
    sec_detected: 'Incidentes de seguridad de IA detectados',
    sec_resolved_badge: 'RESUELTO',
    sec_responsible: 'Responsable',
    sec_recommendation: 'Recomendación',
    sec_author: 'Autor',

    play_sub: 'Laboratorio de SecOps',
    play_title: 'Consola del Desarrollador',
    play_desc: 'Prueba endpoints de API, escanea fragmentos de código, audita configuraciones de red y ejecuta simulaciones de ataque seguras.',
    play_tab_api: 'Auditor de APIs',
    play_tab_code: 'Auditor de Código',
    play_tab_dns: 'Inspector SSL/DNS',
    play_tab_hack: 'Simulador de Hacking',

    settings_title: 'Configuración y Preferencias',
    settings_desc: 'Administra tus preferencias de perfil, integraciones de webhooks y el idioma de la aplicación.',
    settings_tab_pref: 'Preferencias',
    settings_tab_integ: 'Integraciones',
    settings_lang: 'Idioma',
    settings_lang_desc: 'Elige el idioma del panel de control de PulseGuard.',
    settings_alert: 'Webhook de Alertas (Slack / Discord)',
    settings_alert_desc: 'Recibe alertas inmediatas en caso de caídas del servidor o vulnerabilidades.',
    settings_saved: '¡Configuración guardada con éxito!',
    settings_gh_status: 'Conectividad con GitHub',
    settings_gh_connected: 'Tu cuenta de GitHub está conectada. Puedes importar repositorios y escanear commits.',
    settings_gh_not_connected: 'Tu cuenta de GitHub no está conectada. Conéctala para listar tus repositorios.',
  }
};

type TranslationKey = keyof typeof translations.en;

interface i18nContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const i18nContext = createContext<i18nContextProps | undefined>(undefined);

export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('pg_language') as Language;
    if (saved === 'en' || saved === 'es') {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('pg_language', lang);
  };

  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations['en'][key] || String(key);
  };

  return (
    <i18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </i18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(i18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
