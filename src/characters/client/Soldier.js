// 物理攻击时无视目标的部分护甲，来自其他单位的物理伤害不会享受来自你的物理穿透效果。
// 护甲穿透分为比例穿透和定值穿透：
// 1.比例穿透：你的物理攻击在计算伤害时默认降低被攻击者一定百分比护甲；
// 2.定值穿透：你的物理攻击在计算伤害时默认降低被攻击者一定值的护甲，在其护甲低于你的护甲穿透时护甲减免伤害为0。
// 当你同时拥有固定和比例两种穿透时，先计算比例穿透，再计算固定穿透。
// 例：目标护甲为100，你有50%的比例护甲穿透和60定值穿透，当你攻击该目标时，目标护甲值先减少50%,剩余50，再受到60点护甲穿透，为0，你对他造成的伤害不会减少。
// 护甲的减少伤害公式：100/（100+护甲值）
import * as PIXI from 'pixi.js';
import _ from 'lodash';
import FramesLoader from '@/utils/FramesLoader';
import noop from '@/utils/noop.js';
import ShotItem from '@/item/ShotItem';
import CONST_VALUE from '@/utils/ConstValue';

const {SOLDIER_TEXTURES, HEALTH_HEIGHT, HEALTH_WIDTH, SECEND_STEP_LENGTH} = CONST_VALUE.SOLDIER;
// 决定速度的，每秒的补偿,
// SecondStepLength/FPS == speedX/Y;

class Solider {
    static primarity = 0;
    static SoldierType = 'Soldier';

    // cache 为空时在loadFrames中指定帧来源，为对象
    constructor(blood, BattleGround) {
        this.BattleGround = BattleGround;
        // 生命值
        this.blood = blood;
        this.maxBlood = blood;
        // 攻击范围
        this.attackArea = 1;
        // 攻击力
        this.ATK = 10;
        // 防御力
        this.DEF = 10;
        // 物理穿透
        this.Penetration = 10;
        // 精灵图标
        this.sprite = new PIXI.Sprite();
        this.displayEntity = new PIXI.Container();
        // 方向
        this.direction = 'RIGHT';
        // 状态设置
        // 动作状态
        this.steps = []; // 该对象从开始到最后经历的动作集合
        this.maxStepLength = 50; // 默认最多的步骤为50步
        this.lastStep = ''; // 上一步
        this.nowActionState = '';
        // 动作怔状态
        this.loopState = 0;
        this.maxLoopState = 4;
        // 是否存活
        this.isLive = true;
        // 组名
        this.group = '';
        // 敌人
        this.enemy = null;
        // 用于判断是否是上次的敌人，以确保目标，最好的方法是为每个敌人设置一个id
        this.lastEnemy = null;
        // 受到的攻击者
        this.attackedBy = [];
        this.shotedBy = [];
        this.enemyQuene = [];
        // 远程对象
        // 是否是间接伤害
        this.isShotType = false;
        this.shotItems = [];
        // 初始化可见对象
        this._init();
    }

    _init() {
        // 动画管理对象
        this.FramesLoader = new FramesLoader(this.sprite);
        this.FramesLoader.owner = this;
        // 加载资源
        this.FramesLoader.setResources(this.BattleGround.resources[SOLDIER_TEXTURES]);
        // 状态
        this.initSpeed();
        this._createBloodState(this.blood);
        this.displayEntity.addChild(this.sprite);
        this.displayEntity.addChild(this.healthBar);
    }


    setGroup =(group) => {
        let style;
        this.groupName = group;
        const {innerBar} = this.healthBar;
        if (this.groupName === 'enemy') {
            // this.healthBar.innerBar.clear();
            innerBar.beginFill(0xf46f0b);
            innerBar.drawRect(0, 0, HEALTH_WIDTH, HEALTH_HEIGHT);
            innerBar.endFill();
            style = new PIXI.TextStyle({
                fontFamily: "Arial",
                fontSize: 10,
                fill: "white",
                stroke: 'red',
                strokeThickness: 4,
                dropShadow: true,
                dropShadowColor: "#000000",
                dropShadowBlur: 4,
                dropShadowAngle: Math.PI / 6,
                dropShadowDistance: 6,
            });
        } else {
            style = new PIXI.TextStyle({
                fontFamily: "Arial",
                fontSize: 10,
                fill: "white",
                stroke: 'orange',
                strokeThickness: 4,
                dropShadow: true,
                dropShadowColor: "#000000",
                dropShadowBlur: 4,
                dropShadowAngle: Math.PI / 6,
                dropShadowDistance: 6,
            });
        }

        const message = new PIXI.Text(this.id, style);
        this.healthBar.addChild(message);
    }

    // 制作血条
    _createBloodState = () => {
        const healthBar = new PIXI.Container();
        //const {x, y} = this.getPosition();
        healthBar.position.set(0, 10);
        //Create the black background rectangle
        let innerBar = new PIXI.Graphics();
        innerBar.beginFill(0xff1c1c);
        innerBar.drawRect(0, 0, HEALTH_WIDTH, HEALTH_HEIGHT);
        innerBar.endFill();
        healthBar.addChild(innerBar);

        //Create the front red rectangle
        let outerBar = new PIXI.Graphics();
        outerBar.beginFill(0x31d255);
        outerBar.drawRect(0, 0, HEALTH_WIDTH, HEALTH_HEIGHT);
        outerBar.endFill();
        healthBar.addChild(outerBar);
        healthBar.outer = outerBar;
        healthBar.innerBar = innerBar;
        this.healthBar = healthBar;
    }
    // 获取真正的血条
    getHealthBar() {
        return this.healthBar;
    }

    setHealthBar(len) {
        this.healthBar.outer.width = len;
    }



    getBlood() {
        return this.blood;
    }



    getSprite() {
        return this.sprite;
    }

    // 获取某动作的帧数组
    _getFrames = (action) => {
        return this.FramesLoader._getCacheFrames(action);
    }

    setLiveState(state) {
        this.isLive = state;
    }

    getLiveState() {
        return this.isLive;
    }


    destroy = () => {
        // console.log(this.id+'destroying...');
        this.BattleGround.removeChild(this);
        this.sprite.destroy();
        this.displayEntity.destroy();
        this.stop();
    }

    initSpeed() {
        const {FPS} = this.BattleGround.MAL;
        this.speedX = SECEND_STEP_LENGTH*this.BattleGround.scale.x/FPS;
        this.speedY = SECEND_STEP_LENGTH*this.BattleGround.scale.y/FPS;
    }

    setSpeed(x, y) {
        if (typeof x === 'object') {
            this.speedX = x.vx;
            this.speedY = x.vy;
        } else {
            this.speedX = x;
            this.speedY = y;
        }
    }

    setSpeedX(vx) {
        this.speedX = vx;
    }

    setSpeedY(vy) {
        this.speedY = vy;
    }


    // 初始化动作函数
    initAction(actionName) {
        this.actionCallbacks[actionName] = noop;
    }

    // 注册行为函数
    // 指定某个行为的回调函数 {name: ,callback}
    // 指定一系列行为的回调
    // 指定一系列行为各自的回调
    setAction = (map, callback) => {
        const type = toString.call(map).slice(8, -1);
        if (type === 'Array') {
            map.forEach(_map => {
                const _map_type = toString.call(_map.name).slice(8, -1);
                if (_map_type === 'Array') {
                    _map.name.forEach(name => {
                        this._setAction(name, _map.callback ? _map.callback : noop);
                    })
                }

                if (_map_type === 'String') {
                    this._setAction(_map.name, _map.callback ? _map.callback : noop);
                }
            })
        }

        if (type === 'String') {
            this._setAction(map, callback);
        }

        if (type === 'Object') {
            const _type = toString.call(map.name).slice(8, -1);
            if (_type === 'Array') {
                map.name.forEach(name => {
                    this._setAction(name, map.callback ? map.callback : noop);
                })
            }
            if (_type === 'String') {
                this._setAction(map.name, map.callback ? map.callback : noop);
            }
        }
        return this;
    }

    // 以后考虑move,up而不是move@up
    _setAction(name, callback) {
        this.FramesLoader.registerAction(name, callback);
        return this;
    }

    // 人物静止
    stop = () => {
        // 取消订阅
        this.sprite.destroy();
        this.displayEntity.destroy();
        // this.MAL.cancelSubscribe(this);
    }

    // 通知取消该对象的订阅
    notifyCancelSubscribe() {
        this.MAL.acceptCancelSubscriber(this);
    }

    // 复原函数
    // 复原每帧对象的状态
    /**
     * @param subscriber object 需要复原的对象
     */
    active = (frame) => {
        let temp = {...frame.data};
        // 判断是否是该帧
        const { data } = frame;
        let target = data[this.id];
        // 存在对象
        if (target) {
            this.recoverFrame(target);
            delete temp[this.id];
        } else {
            // 可能导致bug 因为该数组正在被使用，但是下一步也进行了更改。
            if (this.blood === 0) {
                this.notifyCancelSubscribe();
                this.stop();
            }
            return;
        }
        // // 复原shotItem
        // const shotItems = data['shotItem'];
        // shotItems.forEach(shotItem => {
        //     // 复原位置
        // });
        // delete temp['shotItem'];
        // // 删除多余的元素，类似于角色死亡
        // // 剩余的元素使之消失
        
    }


    // 获取自己的矩形
    getArea() {
        const {x, y} = this.getPosition();
        return {
            x: x,
            y: y,
            width: this.displayEntity.width,
            height: this.displayEntity.height
        }
    }


    // 复原动作
    recoverAction = (action, frameIndex) => {
        const frame = this.FramesLoader.getActionFrame(action, frameIndex);
        this.FramesLoader.changeFrame(frame);
    }

    // 复原血量
    recoverBlood = (blood) => {
        this.blood = blood;
        const percent = blood / this.maxBlood;
        this.setHealthBar(HEALTH_WIDTH*percent);
    }

    // 每帧复原
    recoverFrame = (state) => {
        const {id, direction, position, health, isLive, frame, action} = state;
        // 复原操作。。。。。
        // 复原位置
        this.setPosition(position);
        // 复原动作及其方向
        this.recoverAction(action, frame);
        // 复原血量
        this.recoverBlood(health);
    }

    // 加载帧
    // frames为路径数组或者路径或者undefined(此时必须制定src),
    // 所以只有两种情况，frames有时srcID没有值, frames没有值时，srcID有值
    loadFrames(actionType, rowNum = 1, colNum = 1, frames, srcID) {
        this.FramesLoader.loadActionFramesFromResource(actionType, rowNum, colNum, frames, srcID);
        return this;
    }

    // state制定每个动作所需要的动画帧
    setState(callback) {
        const state = callback.call(this, this);
        this.FramesLoader.loadActionFramesFromState(state);

        // 初始化动作函数
        // 初始化INIT
        this.sprite.texture = this.FramesLoader.getActionFrame('INIT');
        this._update();
        this.setAction('MOVE@UP', (archer)=>{
            archer.moveUP();
            //archer.moveUp();
        })
        this.setAction({
            name: ['MOVE@DOWN'],
            callback: (archer) => {
                archer.moveDown();
            }
        })
        this.setAction([{
            name: 'MOVE@LEFT',
            callback: (archer) => {
                archer.moveLeft();
            }
        },{
            name: 'MOVE@RIGHT',
            callback: (archer) => {
                archer.moveRight();
            }
        }])
        // console.log(this.animateState);
    }

    _update(){
        this.sprite.texture?this.sprite.texture.update():null;
        this.sprite.texture._updateUvs();
    }

    // 指定初始化帧，指定精灵位置，指定精灵交互情况,如果你有特定的初始帧可以在回调函数中
    // 指定，否则输入帧序数，该初始化会在loadFrames之后进行
    init(x, y, interactiveable, callback) {
        // 初始化精灵
        this.setPosition(x, y);
        // 相应事件
        if (interactiveable) {
            this.sprite.interactive = true;
            this.sprite.buttonMode = true;
        }
        const that = this;
        // 默认行为
        // 改变帧
        // 注册时间
        this.sprite.on('pointerdown', () => {
            switch (that.direction) {
            case 'U':
                that.doAction('TURN@RIGHT')
                that.turnTo('R');
                break;
            case 'R':
                that.doAction('TURN@DOWN');
                that.turnTo('D');
                break;
            case 'D':
                that.doAction('MOVE@LEFT');
                that.turnTo('L');
                break;
            case 'L':
                that.doAction('MOVE@UP');
                that.turnTo('U');
                break;
            default:
                return;
            }
        });
        typeof callback === 'function' ? callback.call(this) : null;
        return this;
    }

    isStop() {
        const rt = this.speedX || this.speedY;
        return !rt;
    }

    stopMove = () => {
        // console.log('stop soldier');
        this.setSpeed(0, 0);
    }

    startMove() {
        this.initSpeed();
    }


    // 获取位置
    getPosition() {
        return {
            x: this.displayEntity.x,
            y: this.displayEntity.y
        }
    }

    // 设置位置
    setPosition(x = 0, y = 0) {
        if (typeof x === 'object') {
            this.displayEntity.position.set(x.x, x.y);
        } else {
            this.displayEntity.position.set(x, y);
        }
    }


    // 将该对象加入容器中
    addToScene(scene) {
        // console.log(this.SoldierType + '加入战场');
        scene.addChild ? scene.addChild(this.displayEntity) : console.error('加入的不是容器，请检查其类型');
    }
}

export default Solider
