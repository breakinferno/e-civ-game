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
        // this.healthBar.addChild(message);
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

    // 受到攻击
    attacked = (enemy, hurt) => {
        this.blood -= hurt;
        if (this.blood<0) {
            this.blood = 0;
        }
        const percent = this.blood / this.maxBlood;
        this.setHealthBar(HEALTH_WIDTH * percent);
        // console.log('受到来自'+enemy.SoldierType+'的攻击,损失'+hurt+'点血量！');
        // this.SoldierType === 'Archer' ? console.log('Archer只剩%s点血量了', this.blood) : console.error('ThiefHead只剩%s点血量了', this.blood);
        if (this.blood <= 0 && this.getLiveState()) {
            this.setLiveState(false);
        }
    }

    getBlood() {
        return this.blood;
    }


    // 计算伤害值
    computeHurt(ATK, Penetration, DEF) {
        const actualDEF = DEF - Penetration > 0 ? DEF - Penetration : 0;
        return ATK - actualDEF > 0 ? ATK - actualDEF : 1;
    }

    // 停止射击
    stopShot() {
    }

    // 攻击击中计算伤害
    _hit = (enemy) => {
        const {
            ATK,
            Penetration
        } = this;
        const {
            DEF
        } = enemy;
        const hurt = this.computeHurt(ATK, Penetration, DEF);
        enemy.attacked(this, hurt);
    }

    // 飞行物攻击操作
    _shotHit = (enemy, frames, direction) => {
        let initWidth, initHeight;
        // shot fly
        const shotItem = new ShotItem(enemy);
        shotItem.direction = direction;
        this.BattleGround.registAnimation(shotItem);
        // this.BattleGround.addChild(shotItem);
        // shotItem.setDirection(this.direction);
        const scene = this.BattleGround.getScene();
        shotItem.addToScene(scene);
        // 被瞄准
        enemy.shotedBy.push(shotItem);
        const {x, y} = this.getPosition();
        const {width, height} = this.displayEntity;
        switch(this.direction) {
        case 'RIGHT':
            initWidth = x + width;
            initHeight = y + height/3;
            break;
        case 'LEFT':
            initWidth = x;
            initHeight = y + height/3;
            break;
        case 'UP':
            initWidth = x + width/2;
            initHeight = y;
            break;
        case 'DOWN':
            initWidth = x + width/2;
            initHeight = y + height;
            break;
        default:
            throw new Error('方向有误');
        }
        shotItem.init(frames, initWidth, initHeight, this._hit);
        // shotItem.fly(this._hit);
    }

    // 射击类间接伤害
    _shot = (enemy) => {
        // 转向目标, 最不好好的方向
        const directions = this._judgeDirection(enemy);
        let best;
        const prefer = this._judgeLongestDirection(enemy);
        directions.forEach(direction => {
            // 有优化的选择
            if (prefer.includes(direction)) {
                best = direction;
            }
        })
        this.direction = best;

        // 判断是否是同意敌人
        if (this.lastEnemy !== enemy) {
            this.doAction('ATTACK@' + this.direction, false, () => {
                const frames = this._getFrames('SHOT@'+this.direction);
                this._shotHit(enemy, frames, this.direction);
            }, true);
            this.lastEnemy = enemy;
            return this;
        }
        this.doAction('ATTACK@' + this.direction, false, () => {
            const frames = this._getFrames('SHOT@'+this.direction);
            this._shotHit(enemy, frames, this.direction);
        });
        return this;
    }

    // 停止攻击
    // 停止内部循环函数
    stopAttack() {
        // console.log('stop attack');
    }

    attack = (enemy) => {
        if (this.isShotType) {
            this._shot(enemy);
        } else {
            this._attack(enemy);
        }
    }

    // 攻击,直接伤害
    _attack = (enemy) => {
        // 转向目标
        const directions = this._judgeDirection(enemy);
        if (!directions.includes(this.direction)) {
            this.direction = directions[Math.floor(Math.random()*directions.length)];
        }

        if (!this.direction) {
            throw new Error('方向都没有你怎么不上天呢？');
        }

        // 判断是否是同意敌人
        if (this.lastEnemy !== enemy) {
            this.doAction('ATTACK@' + this.direction, false, () => {
                this._hit(enemy);
            }, true);
            this.lastEnemy = enemy;
            return this;
        }
        this.doAction('ATTACK@' + this.direction, false, () => {
            this._hit(enemy);
        });
        return this;
    }

    getSprite() {
        return this.sprite;
    }

    _getFrames = (action) => {
        return this.FramesLoader._getCacheFrames(action);
    }

    setLiveState(state) {
        this.isLive = state;
    }

    getLiveState() {
        return this.isLive;
    }

    // bug原因可能是A对象死亡过程中某个对象通知A对象的MAL stop，导致A对象死亡过程不彻底
    // 从而导致回调不触发
    // 比如A attack B , C attack A, 当B死亡回调触发时，通知A stop，但是此时刚好A死亡，导致
    // A的死亡过程被终止
    die = () => {
        this.doAction('DEAD', true, ()=>{
            // 移除攻击者目标
            this.attackedBy.forEach(attacker => {
                attacker.enemy = null;
                // 如果该对象是存活的
                if (attacker.getLiveState()) {
                    attacker.stopAttack();
                }
            });
            // 移除瞄准该对象的飞行物
            this.shotedBy.forEach(item => {
                item.stopFly();
            });
            // 给GameScene对象传递当前对象所做的所有操作
            // this.uploadAction(this.steps);
            // 移除
            this.destroy();
        });
    }

    destroy = () => {
        this.BattleGround.removeChild(this);
        this.sprite.destroy();
        this.displayEntity.destroy();
        this.stop();
    }

    initSpeed() {
        const {FPS} = this.BattleGround.MAL;
        this.speedX = SECEND_STEP_LENGTH*this.BattleGround.scale.x * FPS;
        this.speedY = SECEND_STEP_LENGTH*this.BattleGround.scale.y * FPS;
    }

    getSpeed() {
        return {
            vx: this.speedX,
            vy: this.speedY
        }
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

    moveUP(pix) {
        const DIRECTION = 'UP';
        if (pix) {
            this.setSpeed(this.speedX, pix);
        }
        this.displayEntity.y -= this.speedY;
        this.turnTo('UP');
    }

    moveDown(pix) {
        const DIRECTION = 'DOWN';
        if (pix) {
            this.setSpeed(this.speedX, pix);
        }
        this.displayEntity.y += this.speedY;
        this.turnTo('DOWN');
    }

    moveLeft(pix) {
        const DIRECTION = 'LEFT';
        if (pix) {
            this.setSpeed(pix, this.speedY);
        }
        this.displayEntity.x -= this.speedX;
        this.turnTo('LEFT');
    }

    moveRight(pix) {
        const DIRECTION = 'RIGHT';
        if (pix) {
            this.setSpeed(pix, this.speedY);
        }
        this.displayEntity.x += this.speedX;
        this.turnTo('RIGHT');
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
        this.MAL.cancelSubscribe(this);
    }

    // 人物运动循环，激活人物
    active = () => {

        if (!this.BattleGround) {
            return console.error('该对象没有加载到BattleGround对象上')
        }
        // 时间可能存在一点问题，存在补足或者缺失问题.
        this.BattleGround.makeChildrenActive(this);
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

    // 上传执行过的动作,用于客户端检验
    uploadAction = (actions) => {
        this.BattleGround.receiveAction({
            id: this.id,
            actions: actions
        })
    }
    

    // 每帧都doAction
    doAction = (actionType, once, cb, reset = false) => {
        this.lastStep = actionType;
        // 如果强制重置
        if (reset) {
            this.FramesLoader.resetActionFrame();
        }
        // 加载指定帧及其回调
        this.FramesLoader.loadActionFrame(actionType, cb);
        return this;
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


    // 设计路径的优化
    _judgeLongestDirection(target) {
        const {x,y} = target.getPosition();
        const position = this.getPosition();
        const xLength = Math.abs(position.x - x);
        const yLength = Math.abs(position.y - y); 
        let primarity;
        if (xLength < yLength && xLength) {
            primarity = ['UP', 'DOWN'];
        }

        if (yLength < xLength && yLength) {
            primarity = ['LEFT', 'RIGHT'];
        }

        if (yLength === xLength) {
            primarity = ['LEFT', 'RIGHT', 'UP', 'DOWN'];
        }

        if (xLength === 0) {
            primarity = ['UP', 'DOWN'];
        }

        if (yLength === 0) {
            primarity = ['LEFT', 'RIGHT'];
        }
    
        return primarity;
    }


    // 路径优化一下
    _judgeShortestDirection(target) {
        const {x,y} = target.getPosition();
        const position = this.getPosition();
        const xLength = Math.abs(position.x - x);
        const yLength = Math.abs(position.y - y);
        let primarity;
        if (xLength < yLength && xLength) {
            primarity = ['LEFT', 'RIGHT'];
        }

        if (yLength < xLength && yLength) {
            primarity = ['UP', 'DOWN'];
        }

        if (yLength === xLength) {
            primarity = ['LEFT', 'RIGHT', 'UP', 'DOWN'];
        }

        if (xLength === 0) {
            primarity = ['UP', 'DOWN'];
        }

        if (yLength === 0) {
            primarity = ['LEFT', 'RIGHT'];
        }
    
        return primarity;
    }

    // 判断目标方向
    // 参数是Soldier对象
    _judgeDirection(target) {
        let rt = [];
        const {x,y} = target.getPosition();
        const position = this.getPosition();
        if (x > position.x) {
            rt.push('RIGHT');
        }

        if (x < position.x) {
            rt.push('LEFT');
        }

        if (y > position.y) {
            rt.push('DOWN');
        }

        if (y < position.y) {
            rt.push('UP');
        }

        if (rt.length === 0) {
            rt = ['UP', 'DOWN', 'RIGHT', 'LEFT'];
            // console.error('我擦难道你已经无路可走了吗？。。');
        }
        return rt;
    }

    // 移动到目标
    // 参数目标坐标
    moveTo = (dest, forbiddenDirection = []) => {
        const totalAction = ['RIGHT', 'LEFT', 'DOWN', 'UP'];
        this.isStop() ? this.startMove() : null;
        this.avaliableDirection = [];
        // 判断方向
        const directions = this._judgeDirection(dest);
        directions.forEach(direction => {
            // this.avaliableDirection.push('MOVE@'+direction);
            this.avaliableDirection.push(direction);
        })
        // 剔除禁止的方向
        forbiddenDirection.forEach((direc) => {
            let index = this.avaliableDirection.findIndex(d => {
                return d === direc
            })
            if (index !== -1) {
                this.avaliableDirection.splice(index, 1);
            }
        });

        // 如果没有路径可走，则随机一个没有禁止的方向
        if (this.avaliableDirection.length <= 0) {
            // 剔除禁止方向
            forbiddenDirection.forEach((direc) => {
                let index = totalAction.findIndex(d => {
                    return d === direc
                })
                if (index !== -1) {
                    totalAction.splice(index, 1);
                }
            });
            // 剩余随机方向
            // 剩余方向没有
            if (totalAction.length > 0) {
                const randomDirection = totalAction[Math.floor(Math.random() * totalAction.length)];
                this.doAction('MOVE@' + randomDirection);
                return;
            }
            this.doAction(this.actionTypes[Math.floor(Math.random() * this.actionTypes.length)]);
            return;
        }

        // 是否是同一方向，这里采取的是如果上一次方向可用，则继续上一次方向，而不是随机方向
        // 导致人物走较长的折线
        const temp = this.lastStep.split('@');
        if (temp[0] === 'MOVE' && this.avaliableDirection.includes(temp[1])) {
            this.doAction(this.lastStep);
            return;
        }
        const action = this.avaliableDirection[Math.floor(Math.random() * this.avaliableDirection.length)];
        //console.log(actions)
        this.direction = action;
        action ? this.doAction('MOVE@'+action) : null;
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
    // 转向
    // 参数方向或者Soldier对象
    turnTo(to) {
        if (typeof to === 'string') {
            this.direction = to;
        } else {
            const directions = this._judgeDirection(to);
            this.direction = directions[Math.floor(Math.random()*directions.length)];
        }
        // console.log('turn to '+this.direction);
        // this.changeFrame(this.direction, this.texture);
        // this.sprite.texture = this.texture;
        //this.sprite.texture.update();
    }

    // 将该对象加入容器中
    addToScene(scene) {
        // console.log(this.SoldierType + '加入战场');
        scene.addChild ? scene.addChild(this.displayEntity) : console.error('加入的不是容器，请检查其类型');
    }
}

export default Solider
