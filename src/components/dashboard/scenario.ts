/**
 * How a calculator takes part in saved scenarios: it starts from `initial` (when a saved one was
 * loaded) and reports everything the person has typed through `onState` whenever it changes.
 */
export interface ScenarioProps<T> {
  initial?: T;
  onState?: (state: T) => void;
}
