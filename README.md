这个项目是毕设游戏部分的实现，目的是基于canvas或着webGL实现一个实时的对战系统.即服务器端进行结果判定，而多个客户端接受整个流程然后实时同步显示出整个对战流程。现在做的很简陋。

### API:

**GameScene:**

Function | Description | Parameter |
-- | -- | -- |
GameScene | 构造器 | PIXI Application对象的所有参数width, height, transparent,antialiasing, resolution等 
start | 运行游戏 | side:初始化哪组兵种对象为左边， autoSize：元素是否自适应画布大小
resize | 改变画布大小 | width, height
setClientOrServer | 设置是否客户端 | GameScene.SERVER & GameScene.CLIENT
before，over,after | 设置场景转化的各个阶段的回掉函数 | name: 场景名称， cb： 回调
overScene | 指定结束场景 | name： 结束场景名称，pre:结束前回掉，after: 结束后回掉,over:完全结束回掉
setToFullScreen | 全屏 |
setBg | 设置背景色 | bg
getDriveFrames | 获取驱动帧，一般客户端才使用驱动帧进行动画驱动 |
setDriveFrames | 设置驱动帧,通过设置驱动帧驱动动画 | frames
mountAt | 设置挂载点 | target: 挂载dom对象
makeScene | 制作场景 | name: 场景名称 cb ：如果动态创建场景该参数为回掉函数，接受来自上个场景的结果，如果静态场景，则一个PIXI Container对象
getAllScenes | 获取所有场景
setBattleGround | 设置战场 | width, height, layout：指定行列数 或者 width/height object , layout,或者layout
setFPS | 设置游戏帧率 | FPS
handleLoadProgress | 设置加载资源回掉 | cb 接受两个参数，resource, loader,见PIXI的loader
load | 加载资源 | src:资源 callback: 回掉,一般开始都是在该回调中进行调用，这样才能保证资源已经正确加载完成
setSoldiers | 设置兵种 | groupName1: 某组兵种数据 groupName2: 另一组兵种数据,数据样本{user:'', soildiers: [{soliderType:'',count:0}]}
unmount | 卸载

**必须注意的**  推荐start在load回调函数里调用，并且setBattleGround在load之前定义，最好紧挨着构造函数进行战场的设置


## TodoList:

1. 服务器帧率和客户端帧率不一致时导致的问题

2. 服务器端和客户端实时通信同步驱动帧，而不是服务器端跑完之后才将所有驱动帧发送给客户端

3. 客户端resize 问题 ---可以解决

4. shotItem 的处理方式问题，现在服务器端只有MAL对象保存，而BattleGround对象不保存，还有其初始位置的问题

5. 同一每个场景结束返回值

6. 可自定义兵种类型，及其动作类型

7. 做成一个框架，每个场景有各自的生命周期，可自定义场景加载顺序，场景资源，场景画面，而不是单单的单一战斗画面







