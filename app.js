App({
  globalData: {
    // Incremented whenever the saved config changes.
    configVersion: 0,
    // Settings being edited (see utils/draft.js).
    draft: null,
    draftDirty: false,
    draftTouchedAt: 0,
    draftVersion: 0,
  },
  onCreate() {},
  onDestroy() {},
})
