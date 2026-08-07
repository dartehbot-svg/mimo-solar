export interface UserState {
  step: string;
  data: Record<string, any>;
}

export class StateManager {
  private states = new Map<number, UserState>();

  get(userId: number): UserState | undefined {
    return this.states.get(userId);
  }

  setStep(userId: number, step: string): void {
    const existing = this.states.get(userId);
    if (existing) {
      existing.step = step;
    } else {
      this.states.set(userId, { step, data: {} });
    }
  }

  setData(userId: number, data: Record<string, any>): void {
    const existing = this.states.get(userId);
    if (existing) {
      Object.assign(existing.data, data);
    } else {
      this.states.set(userId, { step: '', data });
    }
  }

  getData(userId: number): Record<string, any> {
    return this.states.get(userId)?.data || {};
  }

  reset(userId: number): void {
    this.states.delete(userId);
  }
}
