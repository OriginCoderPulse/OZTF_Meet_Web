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
    }
});
