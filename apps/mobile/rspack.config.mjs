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
    symlinks: true,
    alias: {
      '@pocketdev/shared/types': path.resolve(__dirname, '../../packages/shared/src/types/index.ts'),
      '@pocketdev/shared/theme': path.resolve(__dirname, '../../packages/shared/src/theme/index.ts'),
      '@pocketdev/shared/schema': path.resolve(__dirname, '../../packages/shared/src/schema/index.ts'),
      '@pocketdev/shared/crypto': path.resolve(__dirname, '../../packages/shared/src/crypto/index.ts'),
      '@pocketdev/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
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
