/** Prevent server-only native modules from linking into the Expo mobile app. */
module.exports = {
  dependencies: {
    "better-sqlite3": {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
