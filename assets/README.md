# 游戏素材目录说明

这个 `assets` 文件夹专门存放游戏使用的图片、视频和音频素材。新增素材时，请按照用途放进对应文件夹，并使用小写英文单词加连字符的命名方式，例如 `button-restart.png`。

## 新素材处理约定

以后每次新增图片、视频或音频素材，都会先统一重命名，再归入本目录的对应分类文件夹，并同步更新游戏中的引用路径。这样项目根目录不会堆积素材文件，后期替换和查找也更方便。

## 图片

- `images/backgrounds`：背景图片。`menu-background-static.png` 是首页视频无法使用时可替换的静态备用背景。
- `images/characters`：角色序列帧图片。`player-idle-5dir.png` 是小女孩 5 方向待机图，`player-walk-5dir.png` 是小女孩 5 方向行走图。`player-sprite-data.js` 是由这两张图生成的本地角色数据文件，用来保证直接双击打开 `index.html` 时也能稳定显示真实角色。
- `images/ui/menu`：首页菜单按钮图片。
- `images/ui/story`：碎片统计面板等剧情/收集界面图片。
- `images/ui/progress`：进度条、血条等进度显示图片。当前有空进度条和填充进度条素材，暂时还未接入游戏画面。
- `images/ui/tutorial`：探险手册的书页背板和操作按钮图片。

## 视频和音频

- `videos`：视频素材。`menu-background.mp4` 是当前首页循环播放的背景视频。
- 以后新增音乐或音效时，请创建 `audio/music` 和 `audio/sfx` 文件夹，分别存放背景音乐和操作音效。

## 命名小规则

- 只使用小写英文字母、数字和连字符 `-`。
- 名字要说明用途，例如 `button-settings.png`、`level-01-theme.mp3`。
- 不要使用空格、中文文件名或容易看不懂的缩写，后期查找和替换会更轻松。
