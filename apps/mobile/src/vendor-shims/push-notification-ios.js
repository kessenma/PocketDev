// Shim for react-native/Libraries/PushNotificationIOS/PushNotificationIOS
// We don't use PushNotificationIOS — this prevents the NativeEventEmitter crash
// that occurs when rspack evaluates the lazy getter in react-native/index.js.
module.exports = { default: null };
