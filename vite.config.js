import { defineConfig } from 'vite';

export default defineConfig({
  // 可以在這裡添加 Vite 配置選項
  // 例如，設置基礎路徑（如果部署到子目錄）
  // base: '/your-repo-name/',
  build: {
    // 可以配置構建選項
    // outDir: 'dist', // 輸出目錄
  },
  server: {
    // 可以配置開發服務器選項
    // port: 3000, // 開發服務器端口
    // open: true, // 自動打開瀏覽器
  }
});