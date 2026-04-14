import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Rspack configuration enhanced with Re.Pack defaults for React Native.
 *
 * Learn about Rspack configuration: https://rspack.dev/config/
 * Learn about Re.Pack configuration: https://re-pack.dev/docs/guides/configuration
 */

export default Repack.defineRspackConfig({
  context: __dirname,
  entry: './index.js',
  resolve: {
    ...Repack.getResolveOptions(),
    // Ensure deps from shared package (e.g. @noble/*, zod) resolve through mobile's node_modules
    modules: [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      'node_modules',
    ],
    extensionAlias: {
      '.js': ['.js', '.ts'],
      '.mjs': ['.mjs', '.mts'],
      '.cjs': ['.cjs', '.cts'],
    },
    symlinks: true,
    alias: {
      '@pocketdev/shared/types': path.resolve(__dirname, '../../packages/shared/src/types/index.ts'),
      '@pocketdev/shared/theme': path.resolve(__dirname, '../../packages/shared/src/theme/index.ts'),
      '@pocketdev/shared/schema': path.resolve(__dirname, '../../packages/shared/src/schema/index.ts'),
      '@pocketdev/shared/crypto': path.resolve(__dirname, '../../packages/shared/src/crypto/index.ts'),
      '@pocketdev/shared/assets': path.resolve(__dirname, '../../packages/shared/src/assets/index.ts'),
      '@pocketdev/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      // Shim PushNotificationIOS — rspack triggers its lazy getter from react-native/index.js
      // which crashes because RCTPushNotificationManager native module is not linked.
      'react-native/Libraries/PushNotificationIOS/PushNotificationIOS': path.resolve(__dirname, 'src/vendor-shims/push-notification-ios.js'),
      // Shim unused react-native-executorch LLM-only deps (we only use TextEmbeddingsModule)
      '@huggingface/jinja': path.resolve(__dirname, 'src/vendor-shims/empty.js'),
      'zod/v4': path.resolve(__dirname, 'src/vendor-shims/empty.js'),
      'zod/v4/core': path.resolve(__dirname, 'src/vendor-shims/empty.js'),
      'jsonschema': path.resolve(__dirname, 'src/vendor-shims/empty.js'),
      'jsonrepair': path.resolve(__dirname, 'src/vendor-shims/empty.js'),
    },
  },
  module: {
    rules: [
      {
        test: /\.[cm]?[jt]sx?$/,
        exclude: [
          /node_modules\/lucide-react-native\/dist\/esm\/icons\/infinity\.js$/,
        ],
        type: 'javascript/auto',
        use: {
          loader: '@callstack/repack/babel-swc-loader',
          parallel: true,
          options: {},
        },
      },
      ...Repack.getAssetTransformRules(),
    ],
  },
  plugins: [
    new Repack.RepackPlugin(),
    new ReanimatedPlugin({
      unstable_disableTransform: true,
    }),
  ],
});
