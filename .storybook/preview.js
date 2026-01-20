// Import global styles
import '../src/index.css';
import '../src/globals.css';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // RTL support for Hebrew
    direction: 'rtl',
  },
};

export default preview;