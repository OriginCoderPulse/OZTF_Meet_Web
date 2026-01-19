/**
 * v-loading 自定义指令
 * 用于在元素上显示/隐藏加载动画
 */

import { createApp, App } from "vue";
import Loading from "../components/Loading/Loading";

interface LoadingElement extends HTMLElement {
  _loadingInstance?: App | null;
  _loadingOriginalPosition?: string;
  _loadingOriginalOverflow?: string;
}

const createLoadingInstance = (el: LoadingElement): App => {
  const loadingDiv = document.createElement("div");
  loadingDiv.className = "v-loading-wrapper";
  loadingDiv.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(37, 37, 37, 0.49);
    border-radius: 8px;
    z-index: 9999;
  `;

  const app = createApp(Loading);
  app.mount(loadingDiv);
  el.appendChild(loadingDiv);

  return app;
};

const removeLoadingInstance = (el: LoadingElement) => {
  const loadingWrapper = el.querySelector(".v-loading-wrapper");
  if (loadingWrapper && el._loadingInstance) {
    el._loadingInstance.unmount();
    loadingWrapper.remove();
    el._loadingInstance = null;
  }
};

export default {
  mounted(el: LoadingElement, binding: { value: boolean }) {
    // 确保元素有相对定位
    const originalPosition = window.getComputedStyle(el).position;
    if (originalPosition === "static") {
      el._loadingOriginalPosition = originalPosition;
      el.style.position = "relative";
    }

    const originalOverflow = window.getComputedStyle(el).overflow;
    el._loadingOriginalOverflow = originalOverflow;
    el.style.overflow = "hidden";

    if (binding.value) {
      el._loadingInstance = createLoadingInstance(el);
    }
  },
  updated(el: LoadingElement, binding: { value: boolean }) {
    if (binding.value) {
      if (!el._loadingInstance) {
        el._loadingInstance = createLoadingInstance(el);
      }
    } else {
      removeLoadingInstance(el);
    }
  },
  unmounted(el: LoadingElement) {
    removeLoadingInstance(el);
    // 恢复原始样式
    if (el._loadingOriginalPosition) {
      el.style.position = el._loadingOriginalPosition;
    }
    if (el._loadingOriginalOverflow) {
      el.style.overflow = el._loadingOriginalOverflow;
    }
  },
};
