module.exports = ({ config }) => ({
  ...config,

  name: "WatchWeek",
  slug: "watchweek",
  owner: "nubble207",

  plugins: [
    ...(config.plugins ?? []),
    "expo-localization",
  ],

  android: {
    ...(config.android ?? {}),
    package: "com.nubble.watchweek",
    googleServicesFile: "./google-services.json",
  },

  extra: {
    ...(config.extra ?? {}),
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: {
      projectId: "62f45ac9-f18d-4009-828e-e049844d48c9",
    },
  },
});