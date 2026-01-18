import { createApp } from "vue";
import App from "./App.tsx";
import router from "./router";
import GlobalConfig from "./utils/GlobalConfig";
import Message from "./utils/Message";
import Popup from "./utils/Popup";
import Network from "./utils/Network";
import TRTC from "./utils/Meet/TRTC";
import LibGenerateTestUserSig from "./utils/Meet/LibGenerateTestUserSig";
import RoomFormat from "./utils/Meet/RoomFormat";
import IconPath from "./utils/IconPath";

// 根据环境变量控制是否允许打开控制台
// 如果 VITE_INSPECTOR 不为 'true'，则禁用控制台（生产环境和开发环境都生效）
const isInspectorEnabled = import.meta.env.VITE_INSPECTOR === "true";
if (!isInspectorEnabled) {
  // 禁用控制台
  const noop = () => { };
  const methods = [
    "log",
    "debug",
    "info",
    "warn",
    "error",
    "assert",
    "dir",
    "dirxml",
    "group",
    "groupEnd",
    "time",
    "timeEnd",
    "count",
    "trace",
    "profile",
    "profileEnd",
  ];
  methods.forEach((method) => {
    (console as any)[method] = noop;
  });

  // 禁用开发者工具
  const devtools = {
    open: noop,
    close: noop,
  };
  Object.defineProperty(window, "__REACT_DEVTOOLS_GLOBAL_HOOK__", {
    get: () => devtools,
    set: noop,
  });

  // 禁用右键菜单
  document.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    return false;
  });

  // 禁用 F12、Ctrl+Shift+I、Ctrl+Shift+J、Ctrl+U 等快捷键
  document.addEventListener("keydown", (e) => {
    // F12
    if (e.key === "F12") {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I (Chrome DevTools)
    if (e.ctrlKey && e.shiftKey && e.key === "I") {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+J (Chrome Console)
    if (e.ctrlKey && e.shiftKey && e.key === "J") {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+C (Chrome Inspect Element)
    if (e.ctrlKey && e.shiftKey && e.key === "C") {
      e.preventDefault();
      return false;
    }
    // Ctrl+U (View Source)
    if (e.ctrlKey && e.key === "u") {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+K (Firefox Console)
    if (e.ctrlKey && e.shiftKey && e.key === "K") {
      e.preventDefault();
      return false;
    }
  });

  // 持续检测开发者工具是否被打开
  let devtoolsDetected = { open: false };
  const element = new Image();
  Object.defineProperty(element, "id", {
    get: function () {
      devtoolsDetected.open = true;
      return "";
    },
  });
  setInterval(() => {
    devtoolsDetected.open = false;
    console.log(element);
    if (devtoolsDetected.open) {
      // 检测到开发者工具被打开，可以执行一些操作，比如关闭页面或显示警告
      // window.location.href = 'about:blank';
    }
  }, 1000);
}

const app = createApp(App);

app
  .use(router)
  .use(GlobalConfig)
  .use(Message)
  .use(Popup)
  .use(Network)
  .use(LibGenerateTestUserSig)
  .use(TRTC)
  .use(RoomFormat)
  .use(IconPath)
  .mount("#app");
