# 小小汽车工坊 · Little Car Workshop

面向小朋友的触屏 3D 汽车拆解、拼装小游戏。纯静态 HTML / CSS / ES modules，Three.js 0.171.0 随项目提供，不依赖外部 CDN、账号、广告或数据采集。

## 玩法

- 点「拆开，开始拼装」将 9 个零件放回托盘。
- 将零件拖到车上的发光圆圈，或者先点零件，再点圆圈。桌面还可用「帮我装上」按钮。
- 「拆一拆」模式下，轻点汽车上的部件或对应托盘卡片，即可单独拆下。
- 拖动空白处旋转，双指缩放；也有放大、缩小与复位按钮。
- 四种车身颜色，拼好后可试驾。声音默认关闭，需要主动开启。
- 没有计时、惩罚、广告、登录或联网音频。玩具结构用于认知启蒙，不是实际维修教学。

## 运行与测试

建议使用支持 WebGL 2 的现代 Safari / Chrome / Edge。若 GPU 3D 不可用，自动使用相同 3D 模型的 CPU 投影绘制，玩法保持不变。iPad 横竖屏和手机布局均已适配。浏览器仍需要先通过 HTTP 加载文件，不支持直接双击 file:// 入口。

```sh
python3 -m http.server 8080
npm test
```

当前目录是完整静态发布目录。Three.js 的 MIT 许可证见 `vendor/THREE-LICENSE.txt`。所有模型、图标、音效由代码生成。

## 与恐龙游戏共存

提交到 `fattoliu/dino-island` 时，这个游戏部署在独立的 `car-workshop/` 目录。原有根入口与 `dist/` 不作修改。

## 在线试玩

https://fattoliu.github.io/dino-island/car-workshop/
