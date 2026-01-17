/// <reference types="vite/client" />

declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

// JSX 类型定义 - 为 Vue JSX 提供类型支持
import { VNode, ComponentPublicInstance, Component } from 'vue'

declare global {
    namespace JSX {
        interface IntrinsicAttributes {
            [key: string]: any
        }
        interface IntrinsicElements {
            [elem: string]: any
        }
        // 允许任何组件作为 JSX 元素，包括 Fragment、Svg 和 RouterView
        type Element = any
        type ElementClass = any
        interface ElementChildrenAttribute {
            children?: {}
        }
    }
}

// 扩展 vue-router 组件类型
declare module 'vue-router' {
    export const RouterView: any
    export const RouterLink: any
}

// 扩展 motion-v 组件类型
declare module 'motion-v' {
    export const Motion: any
}

// 扩展 Vue 组件类型，使其可以在 JSX 中使用
declare module 'vue' {
    interface ComponentCustomProperties { }
    interface GlobalComponents {
        [key: string]: Component
    }
}

// 允许任何组件类型在 JSX 中使用
declare module '@vue/runtime-core' {
    export interface GlobalComponents {
        [key: string]: any
    }
}

// 全局变量声明，用于在代码中直接使用 $xxx 而不需要 window.$xxx
declare global {
  var $network: {
    request: (urlKey: string, params?: Object, successCallback?: (data: any) => void, failCallback?: (error: any) => void) => void;
  };
  var $message: {
    info: ({ message, duration }: { message: string; duration?: number }) => void;
    error: ({ message, duration }: { message: string; duration?: number }) => void;
    warning: ({ message, duration }: { message: string; duration?: number }) => void;
    success: ({ message, duration }: { message: string; duration?: number }) => void;
  };
  var $popup: {
    alert: (
      content: string,
      options?: {
        title?: string;
        buttonCount?: 1 | 2;
        btnLeftText?: string;
        btnRightText?: string;
        btnOnlyText?: string;
        onBtnOnly?: Function;
        onBtnLeft?: Function;
        onBtnRight?: Function;
      }
    ) => void;
    closeAll: () => void;
  };
  var $trtc: {
    createTRTC: (roomId: number, userId?: string) => Promise<{ audio: boolean, video: boolean, status: boolean }>;
    joinRoom: (roomId: number) => Promise<void>;
    exitRoom: (roomId: number) => Promise<void>;
    closeRoom: (roomId: number) => void;
    hasRoom: (roomId: number) => boolean;
    openLocalAudio: (roomId: number) => Promise<void>;
    closeLocalAudio: (roomId: number) => Promise<void>;
    openLocalVideo: (roomId: number, view: string) => Promise<void>;
    closeLocalVideo: (roomId: number) => Promise<void>;
    muteRemoteAudio: (roomId: number, userId: string, mute: boolean) => Promise<void>;
    muteRemoteVideo: (roomId: number, userId: string, streamType: string | number, view: string) => Promise<void>;
    startRemoteScreen: (roomId: number) => Promise<void>;
    stopRemoteScreen: (roomId: number) => Promise<void>;
    listenRoomProperties: (roomId: number, event: string, callback: (event: any, room: any) => void) => void;
  };
  var $libGenerateTestUserSig: {
    genTestUserSig: (sdkAppId: number, userId: string, sdkSecretKey: string) => { sdkAppId: number; userSig: string };
  };
  var $roomformat: {
    roomIdToNumber: (roomId: string | number) => number;
    numberToRoomId: (numericRoomId: number) => string;
  };
  var $config: {
    urls: Record<string, { method: string; path: string[]; retry: boolean; cache: boolean }>;
  };

  interface Window {
    $storage: {
      get: (key: string) => Promise<string>;
      set: (key: string, value: any) => Promise<void>;
      remove: (key: string) => Promise<void>;
      clearAll: () => Promise<void>;
    };
    $network: {
      request: (urlKey: string, params?: Object, successCallback?: (data: any) => void, failCallback?: (error: any) => void) => void;
    };
    $message: {
      info: ({ message, duration }: { message: string; duration?: number }) => void;
      error: ({ message, duration }: { message: string; duration?: number }) => void;
      warning: ({ message, duration }: { message: string; duration?: number }) => void;
      success: ({ message, duration }: { message: string; duration?: number }) => void;
    };
    $popup: {
      alert: (
        content: string,
        options?: {
          title?: string;
          buttonCount?: 1 | 2;
          btnLeftText?: string;
          btnRightText?: string;
          btnOnlyText?: string;
          onBtnOnly?: Function;
          onBtnLeft?: Function;
          onBtnRight?: Function;
        }
      ) => void;
      closeAll: () => void;
    };
    $trtc: {
      createTRTC: (roomId: number) => Promise<{ audio: boolean, video: boolean, status: boolean }>;
      joinRoom: (roomId: number) => Promise<void>;
      exitRoom: (roomId: number) => Promise<void>;
      closeRoom: (roomId: number) => void;
      hasRoom: (roomId: number) => boolean;
      openLocalAudio: (roomId: number) => Promise<void>;
      closeLocalAudio: (roomId: number) => Promise<void>;
      openLocalVideo: (roomId: number, view: string) => Promise<void>;
      closeLocalVideo: (roomId: number) => Promise<void>;
      muteRemoteAudio: (roomId: number, userId: string, mute: boolean) => Promise<void>;
      muteRemoteVideo: (roomId: number, userId: string, streamType: string | number, view: string) => Promise<void>;
      startRemoteScreen: (roomId: number) => Promise<void>;
      stopRemoteScreen: (roomId: number) => Promise<void>;
      listenRoomProperties: (roomId: number, event: string, callback: (event: any, room: any) => void) => void;
    };
    $libGenerateTestUserSig: {
      genTestUserSig: (sdkAppId: number, userId: string, sdkSecretKey: string) => { sdkAppId: number; userSig: string };
    };
    $roomformat: {
      roomIdToNumber: (roomId: string | number) => number;
      numberToRoomId: (numericRoomId: number) => string;
    };
    $config: {
      urls: Record<string, { method: string; path: string[]; retry: boolean; cache: boolean }>;
    };
  }
}

export { }
