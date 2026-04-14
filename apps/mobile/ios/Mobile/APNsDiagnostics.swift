import Foundation
import UIKit
import UserNotifications
import React

@objc(APNsDiagnostics)
class APNsDiagnostics: NSObject {

  // Static storage for the last delivered token (persists across JS bridge reloads).
  // Solves the race condition where AppDelegate receives the token before JS is ready.
  private static var lastDeliveredToken: String?
  private static var lastDeliveredTokenTimestamp: Date?

  @objc
  static func requiresMainQueueSetup() -> Bool {
    // Must be true — UIApplication.shared must be called on the main thread.
    return true
  }

  // Called from AppDelegate when APNs delivers a token.
  @objc
  static func storeDeliveredToken(_ token: String) {
    NSLog("[APNsDiagnostics] Storing delivered token: %@...", String(token.prefix(20)))
    lastDeliveredToken = token
    lastDeliveredTokenTimestamp = Date()
  }

  /// Retrieve the last token delivered by iOS. Returns { hasToken, token, ageSeconds }.
  @objc
  func getLastDeliveredToken(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    var result: [String: Any] = [:]
    if let token = APNsDiagnostics.lastDeliveredToken {
      result["token"] = token
      result["hasToken"] = true
      if let timestamp = APNsDiagnostics.lastDeliveredTokenTimestamp {
        result["ageSeconds"] = Date().timeIntervalSince(timestamp)
      }
    } else {
      result["token"] = NSNull()
      result["hasToken"] = false
    }
    resolve(result)
  }

  /// Clear the stored token after JS has processed it.
  @objc
  func clearStoredToken(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    APNsDiagnostics.lastDeliveredToken = nil
    APNsDiagnostics.lastDeliveredTokenTimestamp = nil
    resolve(["success": true])
  }

  /// Trigger APNs registration. The token is delivered asynchronously to AppDelegate
  /// which stores it via APNsDiagnostics.storeDeliveredToken(). Poll getLastDeliveredToken()
  /// to retrieve it.
  @objc
  func forceRegisterForRemoteNotifications(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      UIApplication.shared.registerForRemoteNotifications()
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
        let isRegistered = UIApplication.shared.isRegisteredForRemoteNotifications
        resolve(["success": true, "isRegistered": isRegistered])
      }
    }
  }
}
