App({
  globalData: {
    // Incremented whenever the saved config changes so the main page reloads it.
    configVersion: 0,
    // Settings being edited (see utils/draft.js).
    draft: null,
    draftDirty: false,
    draftVersion: 0,
  },
  onCreate() {},
  onDestroy() {},
})
