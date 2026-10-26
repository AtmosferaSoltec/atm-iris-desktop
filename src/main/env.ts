export const env = {
  irisHome: process.env.IRIS_HOME,
  e2eUpdates: process.env.IRIS_E2E_UPDATES,
  isE2e: process.env.IRIS_E2E === "1",
  rendererUrl: process.env.ELECTRON_RENDERER_URL,
};
