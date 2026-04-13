import Foundation

@objc(PushTokenModule)
class PushTokenModule: NSObject, RCTBridgeModule {

  static func moduleName() -> String! { "PushTokenModule" }

  // Allow calls from any thread; reading UserDefaults is safe from any thread.
  @objc static func requiresMainQueueSetup() -> Bool { false }

  /// Returns the APNs device token stored by AppDelegate, or null if not yet registered.
  @objc func getToken(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    resolve(UserDefaults.standard.string(forKey: "apnsDeviceToken"))
  }

  /// Triggers APNs registration. The token will be delivered asynchronously via
  /// AppDelegate.application(_:didRegisterForRemoteNotificationsWithDeviceToken:)
  /// and stored in UserDefaults. Call getToken() after a short delay to read it.
  @objc func register(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      UIApplication.shared.registerForRemoteNotifications()
      resolve(nil)
    }
  }
}
