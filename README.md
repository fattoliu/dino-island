# Dino Island · 蓝色小恐龙

保留 Chrome 离线小游戏的简洁像素风格：蓝色小恐龙、细线地面、像素云朵，以及晨光、落日、淡紫暮色三套配色。

试玩：https://fattoliu.github.io/dino-island/

## 玩法

- 轻触画面或 ↑ 开始 / 跳跃；按住跳得更高。也支持空格和方向键。
- 跳过仙人掌、紫色小妖怪和珊瑚色小虫子，碰到地面敌人会结束。
- 跃起吃金色小鸟，每只 +20 分，左上角记录吃鸟数量。小鸟不会伤害恐龙。
- ↓ 下蹲，空中按下可加快落地；Ⅱ 或 P / Escape 暂停与继续。
- ♪ 切换本地合成的背景音乐和音效。切到后台自动暂停。
- 最高分及声音偏好保存在当前浏览器。总分为距离分加吃鸟奖励。

## 本地运行

纯 HTML / CSS / JavaScript，无外部依赖或网络素材。主文件为 dist/index.html。

`python3 -m http.server 8080 --directory dist`

GitHub Pages 从 main 根目录发布。此版本不承诺断网启动。非 Google 官方游戏。
