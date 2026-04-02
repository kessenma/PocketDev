/**
 * @format
 */

import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import { Buffer } from 'buffer';
import App from './App';

globalThis.Buffer = globalThis.Buffer ?? Buffer;

if (!globalThis.crypto?.randomUUID && globalThis.crypto?.getRandomValues) {
  globalThis.crypto = globalThis.crypto ?? {};
  globalThis.crypto.randomUUID = () => {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join('-');
  };
}

AppRegistry.registerComponent('Mobile', () => App);
