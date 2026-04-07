import type { createActionStore } from "../storage/action-store.js";
import type { createDomSnapshotStore } from "../storage/dom-snapshot-store.js";
import type { createNetworkStore } from "../storage/network-store.js";

export type ReturnTypeCreateActionStore = ReturnType<typeof createActionStore>;
export type ReturnTypeCreateNetworkStore = ReturnType<typeof createNetworkStore>;
export type ReturnTypeCreateDomSnapshotStore = ReturnType<typeof createDomSnapshotStore>;
