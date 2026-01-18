/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// JSX 类型定义 - 为 Vue JSX 提供类型支持
import { VNode, ComponentPublicInstance, Component } from "vue";

declare global {
  namespace JSX {
    interface IntrinsicAttributes {
      [key: string]: any;
    }
    interface IntrinsicElements {
      [elem: string]: any;
    }
    // 允许任何组件作为 JSX 元素，包括 Fragment、Svg 和 RouterView
    type Element = any;
    type ElementClass = any;
    interface ElementChildrenAttribute {
      children?: {};
    }
  }
}

// 扩展 vue-router 组件类型
declare module "vue-router" {
  export const RouterView: any;
  export const RouterLink: any;
}

// 扩展 motion-v 组件类型
declare module "motion-v" {
  export const Motion: any;
}

// 扩展 Vue 组件类型，使其可以在 JSX 中使用
declare module "vue" {
  interface ComponentCustomProperties { }
  interface GlobalComponents {
    [key: string]: Component;
  }
}

// 允许任何组件类型在 JSX 中使用
declare module "@vue/runtime-core" {
  export interface GlobalComponents {
    [key: string]: any;
  }
}

// 全局变量声明，用于在代码中直接使用 $xxx 而不需要 window.$xxx
declare global {
  var $network: {
    request: (
      urlKey: string,
      params?: Object,
      successCallback?: (data: any) => void,
      failCallback?: (error: any) => void
    ) => void;
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
    createTRTC: (
      roomId: number,
      userId?: string
    ) => Promise<{ audio: boolean; video: boolean; status: boolean }>;
    joinRoom: (roomId: number) => Promise<void>;
    exitRoom: (roomId: number) => Promise<void>;
    closeRoom: (roomId: number) => void;
    hasRoom: (roomId: number) => boolean;
    openLocalAudio: (roomId: number) => Promise<void>;
    closeLocalAudio: (roomId: number) => Promise<void>;
    openLocalVideo: (roomId: number, view: string) => Promise<void>;
    closeLocalVideo: (roomId: number) => Promise<void>;
    muteRemoteAudio: (roomId: number, userId: string, mute: boolean) => Promise<void>;
    muteRemoteVideo: (
      roomId: number,
      userId: string,
      streamType: string | number,
      view: string
    ) => Promise<void>;
    startRemoteScreen: (roomId: number) => Promise<void>;
    stopRemoteScreen: (roomId: number) => Promise<void>;
    listenRoomProperties: (
      roomId: number,
      event: string,
      callback: (event: any, room: any) => void
    ) => void;
  };
  var $libGenerateTestUserSig: {
    genTestUserSig: (
      sdkAppId: number,
      userId: string,
      sdkSecretKey: string
    ) => { sdkAppId: number; userSig: string };
  };
  var $roomformat: {
    roomIdToNumber: (roomId: string | number) => number;
    numberToRoomId: (numericRoomId: number) => string;
  };
  var $config: {
    urls: Record<string, { method: string; path: string[]; retry: boolean; cache: boolean }>;
  };
  var MEET_ROOM_SHOW_PARTICIPANT_ARROW: string[];
  var MEET_ROOM_CAMERA_OFF_PLACEHOLDER: string[];
  var MEET_ROOM_MICROPHONE_ON: string[];
  var MEET_ROOM_MICROPHONE_OFF: string[];
  var MEET_ROOM_CAMERA_ON: string[];
  var MEET_ROOM_CAMERA_OFF: string[];
  var MEET_ROOM_COPY_MEET_INFO: string[];
  var MEET_ROOM_SCREEN_SHARE_STOP: string[];
  var MEET_ROOM_SCREEN_SHARE_START: string[];
  var MEET_ROOM_ADD_PARTICIPANT: string[];
  var MEET_ROOM_EXIT_MEETING: string[];
  var MEET_COPY_MEETING_INFO: string[];
  var VIDEO_HISTORY: string[];
  var VIDEO_BIG_SCREEN: string[];
  var HISTORY_VIDEO_FOLD: string[];
  var HISTORY_VIDEO_EXPORT: string[];
  var STAFF_DETAIL_CLOSE_PDF: string[];
  var PROJECT_FEATURE_DETAIL_BTN: string[];
  var PROJECT_BUG_DETAIL_BTN: string[];
  var PROJECT_ADD: string[];
  var NFC_WAITING: string[];
  interface Window {
    $storage: {
      get: (key: string) => Promise<string>;
      set: (key: string, value: any) => Promise<void>;
      remove: (key: string) => Promise<void>;
      clearAll: () => Promise<void>;
    };
    $network: {
      request: (
        urlKey: string,
        params?: Object,
        successCallback?: (data: any) => void,
        failCallback?: (error: any) => void
      ) => void;
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
      createTRTC: (roomId: number) => Promise<{ audio: boolean; video: boolean; status: boolean }>;
      joinRoom: (roomId: number) => Promise<void>;
      exitRoom: (roomId: number) => Promise<void>;
      closeRoom: (roomId: number) => void;
      hasRoom: (roomId: number) => boolean;
      openLocalAudio: (roomId: number) => Promise<void>;
      closeLocalAudio: (roomId: number) => Promise<void>;
      openLocalVideo: (roomId: number, view: string) => Promise<void>;
      closeLocalVideo: (roomId: number) => Promise<void>;
      muteRemoteAudio: (roomId: number, userId: string, mute: boolean) => Promise<void>;
      muteRemoteVideo: (
        roomId: number,
        userId: string,
        streamType: string | number,
        view: string
      ) => Promise<void>;
      startRemoteScreen: (roomId: number) => Promise<void>;
      stopRemoteScreen: (roomId: number) => Promise<void>;
      listenRoomProperties: (
        roomId: number,
        event: string,
        callback: (event: any, room: any) => void
      ) => void;
    };
    $libGenerateTestUserSig: {
      genTestUserSig: (
        sdkAppId: number,
        userId: string,
        sdkSecretKey: string
      ) => { sdkAppId: number; userSig: string };
    };
    $roomformat: {
      roomIdToNumber: (roomId: string | number) => number;
      numberToRoomId: (numericRoomId: number) => string;
    };
    $config: {
      urls: Record<string, { method: string; path: string[]; retry: boolean; cache: boolean }>;
    };
    MEET_ROOM_SHOW_PARTICIPANT_ARROW: string[];
    MEET_ROOM_CAMERA_OFF_PLACEHOLDER: string[];
    MEET_ROOM_MICROPHONE_ON: string[];
    MEET_ROOM_MICROPHONE_OFF: string[];
    MEET_ROOM_CAMERA_ON: string[];
    MEET_ROOM_CAMERA_OFF: string[];
    MEET_ROOM_COPY_MEET_INFO: string[];
    MEET_ROOM_SCREEN_SHARE_STOP: string[];
    MEET_ROOM_SCREEN_SHARE_START: string[];
    MEET_ROOM_ADD_PARTICIPANT: string[];
    MEET_ROOM_EXIT_MEETING: string[];
    MEET_COPY_MEETING_INFO: string[];
    VIDEO_HISTORY: string[];
    VIDEO_BIG_SCREEN: string[];
    HISTORY_VIDEO_FOLD: string[];
    HISTORY_VIDEO_EXPORT: string[];
  }
}

export { };
