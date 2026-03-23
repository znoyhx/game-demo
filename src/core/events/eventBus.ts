export type EventHandler<TPayload> = (payload: TPayload) => void;

export class EventBus<TEvents extends Record<string, unknown>> {
  private handlers = new Map<keyof TEvents, Set<EventHandler<TEvents[keyof TEvents]>>>();

  subscribe<TKey extends keyof TEvents>(event: TKey, handler: EventHandler<TEvents[TKey]>) {
    const current = this.handlers.get(event) ?? new Set();
    current.add(handler as EventHandler<TEvents[keyof TEvents]>);
    this.handlers.set(event, current);

    return () => {
      current.delete(handler as EventHandler<TEvents[keyof TEvents]>);
    };
  }

  emit<TKey extends keyof TEvents>(event: TKey, payload: TEvents[TKey]) {
    const current = this.handlers.get(event);

    current?.forEach((handler) => {
      handler(payload);
    });
  }
}
