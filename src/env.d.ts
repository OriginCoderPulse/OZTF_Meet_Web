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

export { }
