import { defineBackground } from 'wxt/utils/define-background';
import { browser } from '#imports';

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });
});
