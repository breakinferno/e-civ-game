这个项目是毕设游戏部分的实现，目的是基于canvas或着webGL实现一个实时的对战系统，

Todo:

1. 这里设置动画回调函数只能有一个，以后支持多个，比如moveUp动作由于自带了，所以指定的会覆盖，除非在写this.moveUp，以后支持合并和不合并回调函数(通过true/false参数)

// 做了建库打包，稍微重构了代码，尝试同步流程，尝试同步位置

2.  // 依次按照顺序加载场景
    // 每个场景结束都调用自己的回调函数，
    // 并且接受上个场景的结果

3. 1.同步位置，每一个士兵采取动作时同步其敌人的位置及其操作，
    2. 同步流程, 只要到指定位置执行相应动作即可，但是事实证明由于线程的不确定性，不可能完全一致，有点失败
    3. 客户端与服务端实时同步，需要更高的要求
    4. 帧同步， 服务端将每帧操作流程记录，需要重构服务端，
    5. 改变架构，判断人物状态之类的也在MAL对象中

4. todoList： Soldier注册新的操作或者更改/合并/添加原来回调函数的功能实现...

api：

Game: 指定游戏大体框架
    // 必须注意的
    // Game.load => Game.handleLoadProgress => Game.setBattleGround 在setSoldiers之前

    Game(options)
    Game.mountAt
    Game.start
    Game.over
    Game.step
    // 配置加载场景顺序
    Game.directScenes
    // 加载图片资源
    Game.load
    // 初始化 battleGround对象之类的
    Game.init
    // 设置两方士兵
    Game.setSoldiers
    // 定制士兵类型
    Game.makeSoldier
    // 资源加载过程
    Game.handleLoadProgress
    // 图层
    Game.makeScene
    // 指定当前显示图层
    Game.designScene
    // 战斗结束
    Game.over
    // 帧率
    Game.fps
    // 跳过动画
    Game.skipAnimation
    // 指定BatteleGround，在gameScene中指定
    Game.setBattleGround
    // 指定背景色
    Game.setBackGround

    Game.battlGround 对象

    // 获取指定的图像帧
    Game.getTextures

BattleGround: 决定游戏元素具体行为
    // 分配敌人
    BattleGround.assignSoldier
    // 激活士兵
    BattleGround.makeSoldierActive
    // 


Soldier:
    // 是否射击类
    Soldier.isShotType
    // 加载动画帧
    Soldier.loadAnimateFrames
    // 指定动画帧
    Soldier.setAnimateFrames
    // 指定动画对应回调函数
    Soldier.setAnimateCallback
    // 攻击
    Soldier.attack
    // 死亡
    Soldier.die
    // 


