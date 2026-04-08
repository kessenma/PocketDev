// Centralized asset imports — brand icons from shared package, mobile-only assets local
import { BrandAssets } from '@pocketdev/shared/assets';

export const Assets = {
  ...BrandAssets,
  // Mobile-only assets
  githubAddSshScreen: require('./github-add-ssh-web-screen.png'),
  ohmyzshBlack: require('./ohmyzsh-black.png'),
};
