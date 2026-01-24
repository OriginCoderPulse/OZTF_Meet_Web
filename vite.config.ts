import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vueJsxPlugin from "@vitejs/plugin-vue-jsx";
import path from 'path';

export default defineConfig({
    plugins: [
        vue(),
        vueJsxPlugin({
            transformOn: true,
            mergeProps: true
        })
    ],
    server: {
        port: 3000,
        strictPort: true,
        host: true
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // 将 Vue 相关库单独打包
                    vue: ["vue", "vue-router"],
                    // 将 TRTC SDK 单独打包（通常比较大）
                    trtc: ["trtc-sdk-v5"],
                    // 将 Socket.IO 单独打包
                    socketio: ["socket.io-client"],
                    // 将其他工具库打包在一起
                    utils: ["axios"],
                },
            },
        },
        // 提高 chunk 大小警告限制到 1000 KB
        chunkSizeWarningLimit: 1000,
    },
});
