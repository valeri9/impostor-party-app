const isAllSkins = process.env.APP_VARIANT === 'allskins';

// Extends the static app.json — see https://docs.expo.dev/versions/v54.0.0/config/app/
// for how Expo merges a dynamic config on top of it. Only used to produce the
// personal "every skin unlocked" sideload build (eas.json's "allskins" profile);
// the real Play Store build (no APP_VARIANT set) is untouched.
module.exports = ({ config }) => ({
  ...config,
  name: isAllSkins ? `${config.name} (All Skins)` : config.name,
  android: {
    ...config.android,
    package: isAllSkins ? `${config.android.package}.allskins` : config.android.package,
  },
});
