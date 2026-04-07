import { createRecorderState, markRecorderInjected, shouldSkipRecorderInjection } from "./shared.js";
import { mountIndicator } from "./indicator.js";
import { registerRecorderEvents } from "./events.js";

if (!shouldSkipRecorderInjection()) {
  markRecorderInjected();
  const state = createRecorderState();
  mountIndicator(state);
  registerRecorderEvents(state);
}
