/**
 * react-native-keyboard-controller@1.18.5 does not ship app.plugin.js.
 * Listing the package name in app.json makes Expo import the JS runtime as a
 * config plugin, which crashes Node 24/26 (`Unexpected token 'typeof'`).
 * Autolinking still wires the native module; this stub only satisfies Expo.
 */
module.exports = function withKeyboardController(config) {
  return config;
};
