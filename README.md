# OZTF 会议室 Web 版

基于 Vue3 + TypeScript + TSX 实现的网页版实时音视频会议室应用，支持多人视频会议、屏幕共享等功能。

## 📋 目录

- [项目概述](#项目概述)
- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [配置说明](#配置说明)
- [使用指南](#使用指南)
- [开发指南](#开发指南)

## 项目概述

OZTF 会议室 Web 版是一个基于浏览器的实时音视频会议系统，允许用户通过 Web 链接快速加入会议，无需安装任何客户端。系统支持多人视频通话、屏幕共享、麦克风和摄像头控制等功能。

## 功能特性

### 核心功能

- ✅ **快速加入会议**：通过 URL 参数直接进入会议室
- ✅ **实时音视频通话**：基于腾讯云 TRTC SDK v5 实现
- ✅ **屏幕共享**：支持桌面/窗口共享
- ✅ **设备控制**：麦克风、摄像头开关控制
- ✅ **参会人管理**：查看参会人列表、视频状态
- ✅ **网络状态显示**：实时显示网络质量
- ✅ **响应式设计**：适配不同屏幕尺寸

### 技术特性

- 基于 Vue 3 Composition API
- TypeScript 类型安全
- TSX 语法支持
- 组件化开发
- 模块化架构

## 技术栈

### 核心框架

- **Vue 3.5** - 渐进式 JavaScript 框架
- **TypeScript 5.6** - 类型安全的 JavaScript 超集
- **TSX** - JSX 的 TypeScript 版本
- **Vue Router 4.5** - 官方路由管理器

### 构建工具

- **Vite 6.0** - 下一代前端构建工具
- **vue-tsc** - Vue 3 TypeScript 类型检查

### 音视频 SDK

- **TRTC SDK v5.15** - 腾讯云实时音视频 SDK

### 样式处理

- **Sass** - CSS 预处理器

### 工具库

- **axios** - HTTP 客户端
- **crypto-js** - 加密工具（用于 UserSig 生成）
- **pako** - 数据压缩库
- **motion-v** - Vue 动画库

## 快速开始

### 环境要求

- Node.js >= 14.x
- pnpm >= 7.x（推荐）或 npm >= 6.x

### 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 开发模式

```bash
# 使用 pnpm
pnpm dev

# 或使用 npm
npm run dev
```

启动后访问 `http://localhost:5173`（Vite 默认端口）

### 构建生产版本

```bash
pnpm build
# 或
npm run build
```

构建产物输出到 `dist/` 目录

### 预览生产构建

```bash
pnpm preview
# 或
npm run preview
```

## 项目结构

```
OZTF_Meet_Web/
├── src/
│   ├── components/          # 通用组件
│   │   ├── Alert/          # 警告提示组件
│   │   ├── Message/         # 消息提示组件
│   │   └── Svg/             # SVG 图标组件
│   ├── views/              # 页面视图
│   │   ├── Error/          # 错误页面
│   │   ├── InfoPage/       # 会议信息页面
│   │   └── Meet/           # 会议室页面
│   │       ├── Meet.tsx
│   │       ├── Meet.controller.ts
│   │       ├── Meet.scss
│   │       └── Meet.config.ts
│   ├── utils/              # 工具函数
│   │   ├── GlobalConfig.ts # 全局配置
│   │   ├── IconPath.ts     # 图标路径配置
│   │   ├── Message.ts       # 消息工具
│   │   ├── Network.ts      # 网络请求工具
│   │   ├── Popup.ts        # 弹窗工具
│   │   └── Meet/           # 会议相关工具
│   │       ├── TRTC.ts     # TRTC SDK 封装
│   │       ├── LibGenerateTestUserSig.ts  # UserSig 生成
│   │       ├── RoomFormat.ts  # 房间ID格式化
│   │       └── IdGenerator.ts # ID 生成器
│   ├── router/             # 路由配置
│   │   └── index.ts
│   ├── App.tsx             # 根组件
│   ├── App.scss            # 全局样式
│   ├── main.ts             # 应用入口
│   ├── env.d.ts            # 环境类型定义
│   └── vite-env.d.ts       # Vite 类型定义
├── public/                 # 静态资源
├── index.html              # HTML 模板
├── package.json            # 项目配置
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
└── README.md               # 项目文档
```

## 配置说明

### 环境变量

创建 `.env` 文件（如需要）：

```env
# API 基础地址
VITE_API_BASE_URL=http://localhost:1024

# TRTC 配置
VITE_TRTC_APP_ID=你的TRTC_APP_ID
VITE_TRTC_SECRET_KEY=你的TRTC_SECRET_KEY
```

### TRTC SDK 配置

在 `src/utils/Meet/TRTC.ts` 中配置 TRTC SDK：

```typescript
private _sdkAppId: number = Number(import.meta.env.VITE_TRTC_APP_ID);
private _sdkSecretKey: string = import.meta.env.VITE_TRTC_SECRET_KEY;
```

**⚠️ 安全提示**：生产环境中，UserSig 应该从后端服务器获取，而不是在前端生成。

### 路由配置

路由定义在 `src/router/index.ts`：

- `/` - 首页（重定向到错误页）
- `/:roomId` - 会议信息页面
- `/:roomId/meet` - 会议室页面
- `/error` - 错误页面

## 使用指南

### 加入会议流程

1. **访问会议链接**
   ```
   http://your-domain.com/{roomId}
   ```
   其中 `{roomId}` 是会议房间ID（格式：`xxx-xxxx-xxxx`）

2. **输入昵称**
   - 在会议信息页面输入您的昵称
   - 点击"进入会议室"按钮

3. **授权设备权限**
   - 浏览器会请求麦克风和摄像头权限
   - 请允许权限以便正常使用

4. **进入会议室**
   - 自动跳转到会议室页面
   - 可以控制麦克风、摄像头、屏幕共享等功能

### 会议功能使用

#### 麦克风控制

- 点击麦克风图标开启/关闭麦克风
- 图标状态显示当前麦克风状态

#### 摄像头控制

- 点击摄像头图标开启/关闭摄像头
- 关闭摄像头时显示占位图标

#### 屏幕共享

- 点击屏幕共享图标开始共享
- 系统会请求屏幕共享权限
- 同一时间只能有一人共享屏幕

#### 参会人列表

- 点击右侧箭头展开/收起参会人列表
- 显示所有参会人的视频画面
- 显示参会人姓名（超长自动省略）

#### 退出会议

- 点击退出按钮退出会议
- 系统会自动清理资源

## 开发指南

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 Vue 3 Composition API 最佳实践
- 组件使用 TSX 语法
- 样式使用 SCSS 预处理器

### 组件开发

#### 创建新组件

```tsx
import { defineComponent } from "vue";
import "./Component.scss";

export default defineComponent({
  name: "ComponentName",
  setup() {
    return () => (
      <div class="component">
        {/* 组件内容 */}
      </div>
    );
  },
});
```

#### 使用全局工具

```typescript
// 消息提示
$message.success({ message: "操作成功" });
$message.error({ message: "操作失败" });

// 网络请求
$network.request(
  "apiKey",
  { param1: "value1" },
  (data) => {
    // 成功回调
  },
  (error) => {
    // 失败回调
  }
);

// 弹窗
$popup.alert("提示内容", {
  buttonCount: 2,
  onBtnRight: () => {
    // 确认操作
  },
});
```

### TRTC SDK 使用

#### 初始化 TRTC

```typescript
// 创建房间
const result = await $trtc.createTRTC(roomId, userId);

// 加入房间
await $trtc.joinRoom(roomId);

// 开启本地音频
await $trtc.openLocalAudio(roomId);

// 开启本地视频
await $trtc.openLocalVideo(roomId, "view-id");
```

#### 监听事件

```typescript
// 监听远端用户进入
$trtc.listenRoomProperties(
  roomId,
  TRTCSDK.EVENT.REMOTE_USER_ENTER,
  (event) => {
    console.log("用户进入:", event.userId);
  }
);

// 监听远端视频可用
$trtc.listenRoomProperties(
  roomId,
  TRTCSDK.EVENT.REMOTE_VIDEO_AVAILABLE,
  ({ userId, streamType }) => {
    // 处理视频流
  }
);
```

### 样式开发

- 使用 SCSS 嵌套语法
- 遵循 BEM 命名规范
- 使用 CSS 变量管理主题色
- 响应式设计使用媒体查询

### 调试技巧

1. **查看 TRTC 日志**：浏览器控制台会输出 TRTC SDK 的详细日志
2. **网络请求调试**：使用浏览器开发者工具的 Network 面板
3. **状态调试**：在组件中使用 `console.log` 输出状态

## 常见问题

### 1. 无法连接会议

- 检查网络连接
- 确认 TRTC 配置正确
- 检查浏览器是否支持 WebRTC

### 2. 无法获取设备权限

- 检查浏览器权限设置
- 确保使用 HTTPS 或 localhost
- 某些浏览器需要用户手动授权

### 3. 视频黑屏

- 检查摄像头是否被其他应用占用
- 确认摄像头权限已授予
- 检查浏览器是否支持视频编码

### 4. 音频无法播放

- 检查麦克风权限
- 确认浏览器音频设置
- 检查系统音量设置

## 浏览器兼容性

### 推荐浏览器

- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+

### 必需功能

- WebRTC 支持
- MediaDevices API
- WebSocket 支持

## 许可证

ISC
