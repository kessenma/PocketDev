/**
 * @format
 */

import 'react-native';
import React from 'react';
import App from '../App';

// Note: test renderer must be required after react-native.
import ReactTestRenderer from 'react-test-renderer';

declare const it: (name: string, test: () => Promise<void> | void) => void;

it('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
