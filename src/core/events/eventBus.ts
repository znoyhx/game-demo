export type EventHandler<TPayload> = (payload: TPayload) => void;
export type EventEnvelope<
  TEvents extends object,
  TEventName extends keyof TEvents,
> = {
  name: TEventName;
  payload: TEvents[TEventName];
  createdAt: string;
};
export type AnyEventEnvelope<TEvents extends object> = {
  [TEventName in keyof TEvents]: EventEnvelope<TEvents, TEventName>;
}[keyof TEvents];
export type AnyEventHandler<TEvents extends object> = (
  event: AnyEventEnvelope<TEvents>,
) => void;

export class EventBus<TEvents extends object> {
  private handlers = new Map<keyof TEvents, Set<EventHandler<TEvents[keyof TEvents]>>>();

  private allHandlers = new Set<AnyEventHandler<TEvents>>();

  constructor(private readonly now: () => string = () => new Date().toISOString()) {}

  subscribe<TKey extends keyof TEvents>(
    event: TKey,
    handler: EventHandler<TEvents[TKey]>,
  ) {
    const current = this.handlers.get(event) ?? new Set();
    current.add(handler as EventHandler<TEvents[keyof TEvents]>);
    this.handlers.set(event, current);

    return () => {
      current.delete(handler as EventHandler<TEvents[keyof TEvents]>);
    };
  }

  subscribeAll(handler: AnyEventHandler<TEvents>) {
    this.allHandlers.add(handler);

    return () => {
      this.allHandlers.delete(handler);
    };
  }

  emit<TKey extends keyof TEvents>(
    event: TKey,
    payload: TEvents[TKey],
  ): EventEnvelope<TEvents, TKey> {
    const current = this.handlers.get(event);
    const envelope: EventEnvelope<TEvents, TKey> = {
      name: event,
      payload,
      createdAt: this.now(),
    };

    current?.forEach((handler) => {
      handler(payload);
    });

    this.allHandlers.forEach((handler) => {
      handler(envelope as AnyEventEnvelope<TEvents>);
    });

    return envelope;
  }
}
