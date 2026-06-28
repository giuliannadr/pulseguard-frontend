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
    dash_sec_grade: 'Sec. Grade',
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
    settings_active_session: 'Active Session',
    settings_gh_status: 'GitHub Connectivity',
    settings_gh_connected: 'Your GitHub account is connected. You can import repositories and scan commits.',
    settings_gh_not_connected: 'Your GitHub account is not connected. Connect it to pull repository lists.',

    // Dashboard main
    dash_overview: 'Overview',
    dash_my_dashboard: 'My Dashboard',
    dash_system_health: 'System Health',
    dash_active: 'Active',
    dash_add_monitor: 'Add Monitor',
    dash_security_console: 'Security Console',
    dash_active_monitors: 'Active Monitors',
    dash_services: 'Services',
    dash_all_checked: 'All systems checked',
    dash_system_latency: 'System Latency',
    dash_latency_avg: 'Checks latency average',
    dash_stable: 'STABLE',
    dash_latency_flow: 'Latency Flow',
    dash_recent_checks: 'Recent Checks',
    dash_no_metrics: 'No check metrics.',
    dash_status_split: 'Status Split',
    dash_uptime: 'Uptime',
    dash_incidents_log: 'Recent Incidents Log',
    dash_logs_active: 'System logs active',
    dash_check_failed: 'Status Check Failed',
    dash_all_operational: 'All Systems Operational',
    dash_no_incidents: 'No incident reports in the last checks history.',
    dash_my_services: 'My Services',
    dash_col_service: 'Service',
    dash_col_status: 'Status',
    dash_col_uptime: 'Uptime',
    dash_col_latency: 'Latency',
    dash_no_monitors_yet: 'No monitors configured yet.',
    dash_selected_monitor: 'Selected Monitor',
    dash_response: 'Response',
    dash_ssl_label: 'SSL',
    dash_status_code: 'Status Code',
    dash_view_details: 'View Full Details →',
    dash_getting_started: 'Getting started',
    dash_step1_title: 'Add a monitor',
    dash_step1_desc: 'Paste any URL or connect a GitHub repo. Takes 30 seconds.',
    dash_step2_title: 'Set up alerts',
    dash_step2_desc: 'Add a Discord/Slack webhook or email in Settings → Preferences.',
    dash_step3_title: 'Go to sleep',
    dash_step3_desc: 'PulseGuard checks every minute and alerts you when something breaks.',
    dash_latency_label: 'Latency',
    dash_stats: 'Stats',

    // Status page
    stat_sub: 'Infrastructure',
    stat_title: 'System Status',
    stat_desc: 'Current status of all tracked infrastructure',
    stat_no_monitors: 'No monitors configured',
    stat_all_operational: 'All Systems Operational',
    stat_has_issues: 'Some Systems are Experiencing Issues',
    stat_last_updated: 'Last updated',
    stat_services_count: 'monitored',

    // Monitor detail
    mon_delete_title: 'Delete monitor?',
    mon_delete_desc: 'This will permanently delete the monitor and all its checks, metrics, and security incidents. This action cannot be undone.',
    btn_cancel: 'Cancel',

    // Import modes
    import_mode_full: 'Full Project',
    import_mode_full_desc: 'URL uptime monitoring + GitHub security scanning. For any deployed project you own.',
    import_mode_url: 'URL Monitor',
    import_mode_url_desc: 'Uptime, SSL & response time only. No repo needed. Works for any website.',
    import_mode_repo: 'Repo Scanner',
    import_mode_repo_desc: 'Security scanning only, no URL required. For backends, libraries, or services not yet deployed.',
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
    dash_sec_grade: 'Nota Seg.',
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
    settings_active_session: 'Sesión Activa',
    settings_gh_status: 'Conectividad con GitHub',
    settings_gh_connected: 'Tu cuenta de GitHub está conectada. Puedes importar repositorios y escanear commits.',
    settings_gh_not_connected: 'Tu cuenta de GitHub no está conectada. Conéctala para listar tus repositorios.',

    // Dashboard main
    dash_overview: 'Resumen',
    dash_my_dashboard: 'Mi Panel',
    dash_system_health: 'Salud del Sistema',
    dash_active: 'Activos',
    dash_add_monitor: 'Agregar Monitor',
    dash_security_console: 'Consola de Seguridad',
    dash_active_monitors: 'Monitores Activos',
    dash_services: 'Servicios',
    dash_all_checked: 'Todos los sistemas verificados',
    dash_system_latency: 'Latencia del Sistema',
    dash_latency_avg: 'Latencia promedio de verificaciones',
    dash_stable: 'ESTABLE',
    dash_latency_flow: 'Flujo de Latencia',
    dash_recent_checks: 'Checks Recientes',
    dash_no_metrics: 'Sin métricas de checks.',
    dash_status_split: 'Distribución de Estado',
    dash_uptime: 'Uptime',
    dash_incidents_log: 'Registro de Incidentes Recientes',
    dash_logs_active: 'Logs del sistema activos',
    dash_check_failed: 'Verificación de Estado Fallida',
    dash_all_operational: 'Todos los Sistemas Operativos',
    dash_no_incidents: 'Sin reportes de incidentes en el historial reciente.',
    dash_my_services: 'Mis Servicios',
    dash_col_service: 'Servicio',
    dash_col_status: 'Estado',
    dash_col_uptime: 'Uptime',
    dash_col_latency: 'Latencia',
    dash_no_monitors_yet: 'Aún no hay monitores configurados.',
    dash_selected_monitor: 'Monitor Seleccionado',
    dash_response: 'Respuesta',
    dash_ssl_label: 'SSL',
    dash_status_code: 'Código de Estado',
    dash_view_details: 'Ver Detalles Completos →',
    dash_getting_started: 'Primeros pasos',
    dash_step1_title: 'Agregar un monitor',
    dash_step1_desc: 'Pegá cualquier URL o conectá un repositorio de GitHub. Toma 30 segundos.',
    dash_step2_title: 'Configurar alertas',
    dash_step2_desc: 'Agrega un webhook de Discord/Slack o email en Configuración → Preferencias.',
    dash_step3_title: 'Descansá tranquilo',
    dash_step3_desc: 'PulseGuard verifica cada minuto y te avisa cuando algo falla.',
    dash_latency_label: 'Latencia',
    dash_stats: 'Estadísticas',

    // Status page
    stat_sub: 'Infraestructura',
    stat_title: 'Estado del Sistema',
    stat_desc: 'Estado actual de toda la infraestructura monitorizada',
    stat_no_monitors: 'Sin monitores configurados',
    stat_all_operational: 'Todos los Sistemas Operativos',
    stat_has_issues: 'Algunos Sistemas Están Experimentando Problemas',
    stat_last_updated: 'Última actualización',
    stat_services_count: 'monitoreados',

    // Monitor detail
    mon_delete_title: '¿Eliminar monitor?',
    mon_delete_desc: 'Esto eliminará permanentemente el monitor y todos sus checks, métricas e incidentes de seguridad. Esta acción no se puede deshacer.',
    btn_cancel: 'Cancelar',

    // Import modes
    import_mode_full: 'Proyecto Completo',
    import_mode_full_desc: 'Monitoreo de uptime de URL + escaneo de seguridad de GitHub. Para cualquier proyecto desplegado.',
    import_mode_url: 'Monitor de URL',
    import_mode_url_desc: 'Solo uptime, SSL y tiempo de respuesta. Sin repositorio. Funciona para cualquier sitio web.',
    import_mode_repo: 'Escáner de Repositorio',
    import_mode_repo_desc: 'Solo escaneo de seguridad, sin URL requerida. Para backends, librerías o servicios no desplegados.',
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
