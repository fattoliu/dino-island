# Dino Island · 恐龙漫游
原创绘制的彩色恐龙跑酷网页，灵感来自 Chrome 离线小游戏。纯 HTML/CSS/JavaScript，无第三方依赖。

## 玩耍
在 iPad Safari 打开部署地址。点击屏幕或跳跃按钮跳跃，按住可以跳得更高。按住下蹲按钮躲避飞鸟。支持空格/方向键；P 暂停。音效默认关闭，点击音符启用。
场景每 300 米轮换：晨光草原、落日沙丘、星夜森林。最高分存储在当前浏览器。切换到后台自动暂停。

## 本地开发
`python3 -m http.server 8080 --directory dist`，打开 http://localhost:8080。
主文件为 dist/index.html。无需安装依赖或构建。

网页需要首次联网打开；此版本不承诺断网离线启动。未使用 Google 品牌或原版美术素材。

## 在线试玩
https://fatto-dino-island.foggysaffron.chatgpt.site

当前部署为仅所有者可访问，iPad 请登录同一 ChatGPT 账号。源码仓库与 Sites 发布存储独立；修改 GitHub 不会自动更新线上版本。
