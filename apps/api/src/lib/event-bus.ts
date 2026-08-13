import { EventEmitter } from "node:events";

export type OperationalEvent = {
  id: string;
  topic: string;
  aggregateType: string;
  aggregateId: string;
  payload: unknown;
  createdAt: string;
};

class OperationalEventBus extends EventEmitter {
  constructor() { super(); this.setMaxListeners(200); }
  publish(event: OperationalEvent) { this.emit("event", event); }
  subscribe(listener: (event: OperationalEvent) => void) {
    this.on("event", listener);
    return () => this.off("event", listener);
  }
}

export const eventBus = new OperationalEventBus();
