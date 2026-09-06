/**
 * `app.json` orientation is `default` so Android MainActivity is not locked
 * to portrait (Play 16KB / tablet / foldable quality). Expo would then allow
 * all iOS orientations too — pin iPhone/iPad back to portrait only.
 */
const { withInfoPlist } = require("expo/config-plugins");

function withIosPortraitOnly(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UISupportedInterfaceOrientations = [
      "UIInterfaceOrientationPortrait",
    ];
    cfg.modResults["UISupportedInterfaceOrientations~ipad"] = [
      "UIInterfaceOrientationPortrait",
    ];
    return cfg;
  });
}

module.exports = withIosPortraitOnly;
