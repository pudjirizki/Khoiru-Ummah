import { supabase } from './supabase';

type Listener = (payload: any) => void;

interface SharedSubscription {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<Listener>;
}

const subscriptions = new Map<string, SharedSubscription>();
let nextChannelId = 0;

export const subscribeToTableChanges = (table: string, listener: Listener, filter?: string): (() => void) => {
  const key = `${table}:${filter ?? '*'}`;
  let subscription = subscriptions.get(key);

  if (!subscription) {
    const listeners = new Set<Listener>();
    const channel = supabase.channel(`db-${table}-${++nextChannelId}`);
    const config = {
      event: '*' as const,
      schema: 'public' as const,
      table,
      ...(filter ? { filter } : {}),
    };

    channel.on('postgres_changes', config, (payload) => {
      listeners.forEach((registeredListener) => registeredListener(payload));
    });
    channel.subscribe();

    subscription = { channel, listeners };
    subscriptions.set(key, subscription);
  }

  subscription.listeners.add(listener);

  return () => {
    const currentSubscription = subscriptions.get(key);
    if (!currentSubscription) return;

    currentSubscription.listeners.delete(listener);
    if (currentSubscription.listeners.size === 0) {
      subscriptions.delete(key);
      void supabase.removeChannel(currentSubscription.channel);
    }
  };
};
