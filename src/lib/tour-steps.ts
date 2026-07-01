export interface TourStep {
  id: string;
  target: string | null; // data-tour value, null = centered modal
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    title: '¡Bienvenido a PulseGuard! 👋',
    description: 'En 2 minutos te mostramos todo lo que podés hacer: monitorear servicios, detectar vulnerabilidades en código y recibir alertas automáticas.',
  },
  {
    id: 'stats',
    target: 'stats',
    title: 'Estado global de tus servicios',
    description: 'Uptime, latencia promedio, incidentes activos y monitores corriendo — todo actualizado en tiempo real.',
    position: 'bottom',
  },
  {
    id: 'monitors',
    target: 'monitors',
    title: 'Tus monitores',
    description: 'Cada card es un servicio que PulseGuard chequea automáticamente. Podés pausarlo, chequearlo ahora mismo o ver métricas detalladas.',
    position: 'bottom',
  },
  {
    id: 'add-monitor',
    target: 'add-monitor',
    title: 'Agregá tu primer servicio',
    description: 'Creá un monitor con solo la URL de tu API o sitio web. También podés conectar un repo de GitHub para análisis de seguridad con IA.',
    position: 'bottom',
  },
  {
    id: 'nav-security',
    target: 'nav-security',
    title: 'Seguridad con IA',
    description: 'PulseGuard analiza cada commit de tus repos de GitHub con Gemini AI y detecta vulnerabilidades automáticamente antes de que lleguen a producción.',
    position: 'right',
  },
  {
    id: 'nav-playground',
    target: 'nav-playground',
    title: 'Consola de auditoría',
    description: 'Testea endpoints, auditá código con SAST, inspeccioná DNS/SSL o simulá ataques — todas las herramientas en un solo lugar.',
    position: 'right',
  },
  {
    id: 'nav-settings',
    target: 'nav-settings',
    title: 'Alertas y notificaciones',
    description: 'Configurá alertas por email o webhook (Discord, Slack) para que te avisen cuando un servicio cae o se detecta una vulnerabilidad.',
    position: 'right',
  },
  {
    id: 'done',
    target: null,
    title: '¡Ya conocés PulseGuard! 🚀',
    description: 'Estás listo para empezar. Creá tu primer monitor y conectá un repo de GitHub para verlo todo en acción.',
  },
];

export const TOUR_STORAGE_KEY = 'pg_tour_done';
