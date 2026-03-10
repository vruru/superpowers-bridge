# Superpowers Bridge for OpenClaw

自动从 GitHub 获取 Superpowers 工作流 skills 的 OpenClaw 插件。

基于 [obra/superpowers](https://github.com/obra/superpowers) 项目。

## 功能

- ✅ **自动获取**：首次启用自动从 GitHub clone skills
- ✅ **按需加载**：根据对话内容智能加载相关 skills
- ✅ **手动加载**：提供 `skill` 工具供助手主动调用
- ✅ **版本管理**：内置 tools 用于更新和查看 skills 版本
- ✅ **自动更新**：可选配置在启动时自动更新 skills

## 安装

### 方式 A：npm 安装（最简单）

```bash
openclaw plugins install @vruru/superpowers-bridge
openclaw gateway restart
```

自动安装并启用。

### 方式 B：Git Clone

```bash
cd ~/.openclaw/workspace/plugins
git clone https://github.com/vruru/superpowers-bridge.git
```

然后在 `~/.openclaw/openclaw.json` 中启用：

```json
{
  "plugins": {
    "entries": {
      "superpowers-bridge": {
        "enabled": true,
        "config": {
          "enabled": true,
          "autoDetectCode": true
        }
      }
    }
  }
}
```

### 方式 C：下载 ZIP

1. 点击仓库页面的 **Code** → **Download ZIP**
2. 下载后解压得到 `superpowers-bridge-main/` 目录
3. 重命名并复制到插件目录：

```bash
mv ~/Downloads/superpowers-bridge-main ~/.openclaw/workspace/plugins/superpowers-bridge
```

然后按方式 B 启用。

### 安装后验证

完成后目录结构应该是：

```
~/.openclaw/workspace/plugins/superpowers-bridge/
├── index.ts
├── README.md
├── package.json
├── openclaw.plugin.json
└── .gitignore
```

重启 OpenClaw：

```bash
openclaw gateway restart
```

首次启动时会自动从 GitHub 下载 skills（约几秒钟）。

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `enabled` | boolean | `true` | 是否启用插件 |
| `skillsRepo` | string | `obra/superpowers` | Skills 仓库地址 |
| `autoDetectCode` | boolean | `true` | 自动检测代码任务并加载相关 skills |
| `autoUpdate` | boolean | `false` | 启动时自动更新 skills（不推荐） |
| `docsPath` | string | `docs/superpowers` | 设计文档保存路径 |

## 使用方法

### 自动加载

当用户提到代码相关任务时（如"写代码"、"实现功能"、"修复 bug"），插件会自动加载相关的 Superpowers skills：

- **brainstorming** - 代码任务前的设计阶段
- **writing-plans** - 编写实现计划
- **subagent-driven-development** - 子代理驱动开发
- **test-driven-development** - 测试驱动开发
- **systematic-debugging** - 系统化调试

### 手动调用

助手可以使用 `skill` 工具手动加载特定 skill：

```json
{
  "name": "brainstorming"
}
```

### 更新 Skills

使用 `update_superpowers_skills` 工具从 GitHub 拉取最新 skills：

```json
{}
```

或查看当前版本：

```json
{
  "tool": "superpowers_version"
}
```

## 更新插件本身

插件更新需手动操作：

1. 从我们发布的 GitHub release 下载新版本
2. 替换插件目录
3. 重启 OpenClaw

或者如果你是从源码安装：

```bash
cd ~/.openclaw/workspace/plugins/superpowers-bridge
git pull
openclaw gateway restart
```

## 目录结构

```
superpowers-bridge/
├── index.ts                 # 插件主代码
├── openclaw.plugin.json     # OpenClaw 插件配置
├── package.json             # npm 配置
├── README.md                # 本文件
└── .superpowers-cache/      # 自动下载的 skills 缓存（自动生成）
    └── skills/              # Superpowers skills 目录
```

## 工作原理

1. **首次启动**：检测到没有缓存 → `git clone` obra/superpowers
2. **日常运行**：从缓存目录加载 skills
3. **会话开始**：分析用户输入 → 匹配相关 skills → 注入系统提示
4. **更新 skills**：调用 `update_superpowers_skills` → `git pull` → 重新加载

## 故障排查

### Skills 未自动下载

检查网络连接和 git 是否可用：

```bash
git clone https://github.com/obra/superpowers.git /tmp/test-superpowers
```

### 查看缓存状态

```bash
ls -la ~/.openclaw/workspace/plugins/superpowers-bridge/.superpowers-cache/
cd ~/.openclaw/workspace/plugins/superpowers-bridge/.superpowers-cache
git log --oneline -3
```

### 手动重新下载

删除缓存后重启：

```bash
rm -rf ~/.openclaw/workspace/plugins/superpowers-bridge/.superpowers-cache
openclaw gateway restart
```

## License

MIT

## 链接

- **插件仓库**：https://github.com/vruru/superpowers-bridge
- **Superpowers 项目**：https://github.com/obra/superpowers
- **OpenClaw**：https://github.com/openclaw/openclaw
