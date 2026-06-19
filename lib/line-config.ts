// Shared LINE configuration (in-memory + env fallback)
// Used by both line-config route and LINE notification sender

let lineConfig: { accessToken?: string; targetIdMaint?: string; targetIdIT?: string } = {};

export function getLineConfig() {
  return {
    accessToken: lineConfig.accessToken || process.env.LINE_ACCESS_TOKEN || '',
    targetIdMaint: lineConfig.targetIdMaint || process.env.LINE_TARGET_ID_MAINT || process.env.LINE_TARGET_ID || '',
    targetIdIT: lineConfig.targetIdIT || process.env.LINE_TARGET_ID_IT || process.env.LINE_TARGET_ID || '',
  };
}

export function setLineConfig(config: { accessToken?: string; targetIdMaint?: string; targetIdIT?: string }) {
  if (config.accessToken && config.accessToken !== 'undefined') {
    lineConfig.accessToken = config.accessToken;
  }
  if (config.targetIdMaint !== undefined) {
    lineConfig.targetIdMaint = config.targetIdMaint || undefined;
  }
  if (config.targetIdIT !== undefined) {
    lineConfig.targetIdIT = config.targetIdIT || undefined;
  }
}
