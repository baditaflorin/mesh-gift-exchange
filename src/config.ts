import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-gift-exchange",
  description: "A fair, private gift draw that stays directly between the people in your room.",
  accentHex: "#db2777",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
