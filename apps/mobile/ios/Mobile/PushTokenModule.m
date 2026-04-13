#import <React/RCTBridgeModule.h>

RCT_EXTERN_MODULE(PushTokenModule, NSObject)
RCT_EXTERN_METHOD(getToken:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(register:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
