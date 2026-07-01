import { sileo } from 'sileo';

export const notify = {
  success: (title: string, description?: string) =>
    sileo.success({ title, description, duration: 2500 }),

  error: (title: string, description?: string) =>
    sileo.error({ title, description, duration: 3500 }),

  warning: (title: string, description?: string) =>
    sileo.warning({ title, description, duration: 3000 }),

  info: (title: string, description?: string) =>
    sileo.info({ title, description, duration: 2500 }),

  loading: (title: string) =>
    sileo.show({ title, type: 'loading', duration: null }),

  promise: <T>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string },
  ) =>
    sileo.promise(promise, {
      loading: { title: msgs.loading, type: 'loading' },
      success: { title: msgs.success, type: 'success' },
      error: { title: msgs.error, type: 'error' },
    }),

  dismiss: (id?: string) => { if (id) sileo.dismiss(id); },
};
