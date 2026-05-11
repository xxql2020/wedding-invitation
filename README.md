# Wedding Invitation

一个精美的婚礼邀请函生成器，基于 React + TypeScript + Vite 构建。

## 功能特点

- 📝 自定义婚礼信息（新人名字、日期、地点等）
- 🖼️ 图片上传与裁剪功能
- 📱 响应式设计，适配各种设备
- ✨ 精美的 UI 组件（基于 Radix UI 和 Tailwind CSS）

## 技术栈

- **前端框架**: React + TypeScript
- **构建工具**: Vite
- **UI 组件**: Radix UI
- **样式**: Tailwind CSS
- **表单处理**: React Hook Form + Zod
- **图表**: Recharts

## 项目结构

```
wedding-invitation/
└── react/                 # 前端应用
    ├── src/
    │   ├── components/     # UI 组件
    │   │   ├── ui/         # 基础 UI 组件
    │   │   └── ImageCropper.tsx
    │   ├── pages/          # 页面组件
    │   │   ├── Index.tsx
    │   │   ├── WeddingGenerator.tsx
    │   │   └── WeddingPreview.tsx
    │   ├── hooks/          # 自定义 Hooks
    │   └── lib/            # 工具函数
    ├── public/             # 静态资源
    └── package.json
```

## 开发

```bash
# 进入前端目录
cd react

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 预览

构建完成后，静态文件位于 `react/dist/` 目录。
