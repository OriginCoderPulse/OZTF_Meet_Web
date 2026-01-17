# OZTF 会议室 Web 版

基于 Vue3 + TypeScript + TSX 实现的网页版会议室应用。

## 功能特性

- 通过 URL 参数进入会议室信息页面
- 输入昵称后进入会议室
- 支持摄像头和麦克风控制
- 实时音视频通话（基于 TRTC SDK）

## 技术栈

- Vue 3.5
- TypeScript
- TSX
- Vue Router
- TRTC SDK v5
- Vite
- Sass

## 快速开始

### 安装依赖

```bash
npm install
# 或
pnpm install
```

### 开发

```bash
npm run dev
```

### 构建

```bash
npm run build
```

### 预览

```bash
npm run preview
```

## 使用说明

1. 访问 `http://localhost:3000/{roomId}` 进入信息页面
2. 输入昵称后点击"进入会议室"
3. 自动跳转到 `http://localhost:3000/{roomId}/meet` 进入会议室

## 配置说明

在 `src/utils/TRTC.ts` 中配置 TRTC SDK 的 AppID 和 SecretKey。

**注意：** UserSig 的生成应该从后端获取，当前为简化实现。

## 项目结构

```
OZTF_Meet_Web/
├── src/
│   ├── components/      # 组件
│   ├── views/          # 页面
│   ├── utils/          # 工具类
│   ├── router/         # 路由配置
│   ├── styles/         # 样式文件
│   ├── App.tsx         # 根组件
│   └── main.ts         # 入口文件
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```
