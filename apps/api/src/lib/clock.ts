/** Source de l'heure courante, injectable pour les tests. */
export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
