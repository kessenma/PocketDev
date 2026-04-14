#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(APNsDiagnostics, NSObject)

RCT_EXTERN_METHOD(getLastDeliveredToken:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearStoredToken:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(forceRegisterForRemoteNotifications:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
