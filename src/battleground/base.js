// 该对象设计主要用于检测浏览器窗口变化和管理游戏界面的尺寸比例
// 仲裁各个对象的行为和状态，类似于一个管理器
import _ from 'lodash';
import * as PIXI from 'pixi.js';
import Bump from 'bump.js'
import MakeAnimationLoop, {
    SERVER
} from '@/utils/MakeAnimationLoop';
import CONST_VALUE from '@/utils/ConstValue';
import ShotItem from '../item/ShotItem';

const {
    GAME_DEFAULT_WIDTH,
    GAME_DEFAULT_HEIGHT
} = CONST_VALUE.GAME;

export default class BattleGround {
    constructor(x = 800, y = 600, layout = {
        col: 30,
        row: 40
    }, scenes = []) {
        this.currentSceneIndex = 0;
        this.currentScene = scenes[this.currentSceneIndex];
        this.scenes = scenes;
        this.layout = layout;
        this.children = [];
        this.groups = {};
        // 缩放比例 根据前一次大小进行缩放
        this.scale = {
            x: 1,
            y: 1
        };
        // 记录前一次的大小
        this.beforeArea = {
            x,
            y
        }
        this.padding = 5;
        this.marging = 5;
        this.bump = new Bump(PIXI);
        // 每格单位所占长宽
        this.resize(x, y);
        // 是否胜利
        this.isBattleOver = 0;
        // 上一个场景的结果
        this.preResult = null;
        // 所有士兵的操作流程
        this.actionFlows = [];
        this.MAL = new MakeAnimationLoop(10, SERVER);
        this.MAL.holder = this;
    }

    setFPS(FPS) {
        this.MAL.setFPS(FPS);
    }

    setSceneVisible(scene) {
        scene.scene.visible = true;
    }

    setSceneFade(scene) {
        scene.scene.visible = false;
    }

    loadScene(scene) {
        // 当前场景消失
        this.setSceneFade(this.currentScene);
        // 加载下一个场景
        typeof scene.before === 'function' ? scene.before.call(scene, this.preResult, scene.scene, this) : null;
        // 下一个场景传递参数
        if (typeof scene.cb === 'function') {
            scene.cb.call(scene.scene, this.preResult, scene.scene, this);
        }
        scene.scene.visible = true;
        typeof scene.after === 'function' ? scene.after.call(scene, this.preResult, scene.scene, this) : null;
        typeof scene.over === 'function' ? scene.over.call(scene, this.preResult, scene.scene, this) : null;

    }

    getCenter() {
        return {
            x: this.x / 2,
            y: this.y / 2
        }
    }

    getBoxSize() {
        return {
            width: this.xs,
            height: this.ys
        }
    }

    getScene() {
        return this.currentScene.scene;
    }

    // 战场开始
    initGroup(dist) {
        // 初始化人物位置
        // this._initChildren(dist);
        // 人物战斗循环及其移动、攻击、技能判定
        for (let group of Object.keys(this.groups)) {
            this._initGroupPosition(group, group === dist);
        }
        return this;
    }

    // 初始化一组位置
    _initGroupPosition(group, isLeft) {
        const children = this.groups[group];
        // 默认
        let direction = 1;
        // 记录一次的位置
        let prePosition = 0;
        // 设置大体位置
        if (!isLeft) {
            direction = -1;
            prePosition = this.layout.row * (this.layout.col - 1);
        }
        // 按照优先级排序之后进行初始化位置
        const groupChildren = _.groupBy(children, (child) => {
            return child.primarity;
        });
        const orderedChildren = _.sortBy(groupChildren, ['primarity']);
        // console.log(orderedChildren);
        // 判断每种兵种所占位置
        orderedChildren.forEach(child => {
            prePosition = this._judgeArea(child, direction, prePosition);
        })
    }

    // 判断所占区域
    // 参数说明: 需要放置的原素，方向， 上次结束放置位置
    _judgeArea(children, direction, last) {
        const length = children.length;
        //适配横版或者竖版这里默认为横版
        const isLandScope = true;
        let boardMap = isLandScope ? (val) => {
            // 默认为横版
            const {
                row
            } = this.layout;
            const rt = [(val % row + row - 1) % row, Math.floor((val - 1) / row)];
            return rt;
        } : (val) => {
            const {
                col
            } = this.layout;
            return [Math.floor((val - 1) / col), (val % col - 1 + col) % col];
        }
        // 列数
        if (direction < 0) {
            // 从右到左放置
            let temp = 1;
            for (let i = 0; i < length; i++) {
                // 如果当前可以被row整除,则下一次减一
                last++;
                // console.log(last);
                const matrix = boardMap(last);
                // console.log(matrix);
                this._justifyBox(matrix[0], matrix[1], children[i]);
                if (last % this.layout.row === 0) {
                    temp = -1;
                }
                if (temp === -1) {
                    last -= 2 * this.layout.row;
                    temp = 1;
                }
            }
        } else {
            // 从左到右放置
            for (let i = 0; i < length; i++) {
                last++;
                // console.log(last);
                const matrix = boardMap(last);
                // console.log(matrix);
                this._justifyBox(matrix[0], matrix[1], children[i]);
            }

        }
        return last;
    }

    // 将组对象加入场景。fittable是否保持缩放
    addGroupToScene = (fittable) => {
        this.fittable = fittable;
        let totalChildren = [];
        for (let group of Object.keys(this.groups)) {
            totalChildren = [...totalChildren, ...this.groups[group]];
        }
        totalChildren.forEach(child => {
            this.addChildToScene(child);
        })
        return this;
    }

    battle = () => {
        //this.makeChildrenActive();
        this.MAL.animate();
        // console.log('battle start');
    }

    // 将所有子对象加载到场景中
    addChildToScene(child) {
        if (this.fittable) {
            const {
                sprite,
                pivot
            } = child;
            this._justify(child);
            //sprite.anchor.set(0.5, 0.5);
            child.setPosition(child.originPosition);
        } else {
            child.setPosition(child.pivotPosition);
        }
        const {
            width,
            height
        } = this.getBoxSize();
        child.unitX = width;
        child.unitY = height;
        child.addToScene(this.getScene());
    }

    // 士兵自适应格子大小,弓箭自适应scale大小
    _justify(child) {
        const {sprite} = child;
        if (!child.originSize) {
            child.originSize = {
                width: sprite.width,
                height: sprite.height
            }
        }
        const {
            height,
            width
        } = child.originSize;
        const {
            ys,
            xs
        } = this;
        // 弓箭之类的东东
        if (child instanceof ShotItem) {
            sprite.scale.x = this.scale.x;
            sprite.scale.y = this.scale.y;
            return ;
        }
        sprite.scale.x = xs / width;
        sprite.scale.y = ys / height;
    }



    // 自适应格子
    _justifyBox(row, col, element) {
        const y = row * this.ys;
        const x = col * this.xs;
        const {
            sprite
        } = element;
        const {
            height,
            width
        } = sprite;
        element.originSize = {
            width,
            height
        }
        // 使中心重叠即可
        const pivot = {
            x: x + this.xs / 2,
            y: y + this.ys / 2
        }

        const origin = {
            x: pivot.x - width / 2,
            y: pivot.y - height / 2
        }
        element.originPosition = {
            x: x,
            y: y
        };
        element.pivotPosition = origin;
    }

    _setScale(x, y) {
        // 新的缩放比列
        this.scale.x = x / this.beforeArea.x;
        this.scale.y = y / this.beforeArea.y;
    }

    _setBeforeArea(x, y) {
        // 重置宽高记录
        this.beforeArea.x = x;
        this.beforeArea.y = y;
    }

    // 窗口改变,自适应改变
    resize(x, y) {
        this.x = x;
        this.y = y;
        this.xs = x / this.layout.col;
        this.ys = y / this.layout.row;
        // 改变窗口缩放
        this._setScale(x, y);
        // 改变对象大小
        this._resize();
        // 记录当前改变以便下次改变参考缩放
        this._setBeforeArea(x, y);
    }

    // 初始化之后所有对象resize
    _resize() {
        this.children.forEach(child => {
            this.setChildResize(child);
        })
    }

    // 子元素重新确定位置缩放
    setChildResize = (child) => {
        const {
            sprite
        } = child;
        // 复原大小
        // child.sprite.width = child.originSize.width;
        // child.sprite.height = child.originSize.height;
        // 重新确定位置
        const {
            x,
            y
        } = child.getPosition();
        const nx = x * this.scale.x;
        const ny = y * this.scale.y;
        child.setPosition(nx, ny);
        // 重新确定缩放比列
        if (this.fittable) {
            this._justify(child);
        }
        // 重新确定速度
        if (child instanceof ShotItem) {
            return;
        }
        const speed = child.getSpeed();
        child.setSpeed(speed.vx * this.scale.x, speed.vy * this.scale.y);
    }

    battleOver = (result) => {
        this.MAL.stop(result);
    }

    // 清理战场
    clearBattleGround = (side) => {
        if (this.isBattleOver === 1) {
            console.log('清理战场中...');
            // 停止所有动作
            // 发送结果
            // typeof this.overCB === 'function'?this.overCB(side):null;
            console.log('战场打扫完毕！');
            // 下一个场景
            this.currentSceneIndex++;
            const scene = this.scenes[this.currentSceneIndex];
            this.preResult = side;
            this.battleOver(this.preResult);
            // 传递结果
            this.loadScene(scene);
        }
    }

    // 接受回调
    over = (cb) => {
        this.overCB = cb;
    }

    moveToOtherSide = () => {

    }

    // 获取每个对象所在的所有敌对正营
    _getEnemies = (target) => {
        let otherSide;
        // 没有地方战斗结束
        const side = target.groupName; // 本方阵营
        for (let name of Object.keys(this.groups)) {
            if (name !== side) {
                otherSide = this.groups[name]
            }
        }

        return otherSide;
    }

    _generateEnemyQuene = (target) => {
        const sides = this._getEnemies(target);
        const arr = Array.from({
            length: sides.length
        }, (k, v) => {
            return v;
        });
        const shuffle_arr = _.shuffle(arr);
    }

    _findChildById(id) {
        return this.children.find(child => {
            return child.id === id;
        })
    }


    // 接受一个士兵整个过程的所有动作
    // 可能存在的问题： 游戏结束后仍有部分士兵并没有死亡
    receiveAction = (actions) => {
        // console.log('收到了来自' + actions.id + '的操作流程!');
        if (toString.call(actions).slice(8, -1) === 'Array') {
            this.actionFlows = [...this.actionFlows, ...actions];
        } else {
            this.actionFlows.push(actions);
        }
    }


    // TODO: 判断战斗是否结束-> 判断该对象是否存活 -> 判断该对象是否可以攻击-> 移动到
    // 可攻击范围->
    makeChildrenActive(child) {
        if(child instanceof ShotItem) {
            if(child.canFly) {
                child.fly();
            }
            return
        }
        let otherSide;
        const side = child.groupName;
        // 没有地方战斗结束
        otherSide = this._getEnemies(child);
        // 敌方全灭
        if (otherSide.length === 0) {
            //console.log(side+'方赢了这场战斗!');
            this.isBattleOver++;
            child.stop();
            this.clearBattleGround(side);
            return;
        }
        // 便利每个孩子决定其行为
        if (!this.judgeLiveState(child)) {
            child.die();
            return;
        }
        // 该对象没有目标则随机分配一个目标
        if (!child.enemy) {
            // 随机一个目标对象
            const randEnemy = otherSide[Math.floor(Math.random() * otherSide.length)];
            // const randEnemy = otherSide[0];
            child.enemy = randEnemy;
            // 该目标对象保存攻击者，以便于自己死亡时通知攻击者更改目标对象
            randEnemy.attackedBy.push(child);
        }

        // 判断是否可以攻击
        if (this.judgeAttack(child, child.enemy)) {
            // console.log('你已经在我攻击范围了： '+child.enemy.SoldierType);
            // 是否使用技能
            if (this.judgeSkill(child, child.enemy)) {
                console.log('使用技能了');
            } else {
                // 平A
                if (!child.isStop()) {
                    child.stopMove();
                }
                //  console.log(child.SoldierType+' has '+ child.blood +'HP will attack the ' + child.enemy.blood + 'HP ' + child.enemy.SoldierType)
                child.attack(child.enemy);
            }
            return;
        }
        // 判断是否可以移动，并且决定移动方向
        this.judgeMove(child, child.enemy);
    }

    // 注册动画
    registAnimation = (child) => {
        if (!child.BattleGround) {
            child.BattleGround = this;
        }
        this.MAL.subscribe(child);
    }

    // 加入分组
    addToGroup = (children, groupName) => {
        // 将每个对象的战场对象注册为本对象
        children.forEach((child, index) => {
            child.id = groupName + '@' + child.SoldierType[0] + '@' + index;
            child.setGroup(groupName);
            // 注册MAL对象
            this.registAnimation(child);
        })
        // 加入this.children数组
        children.reduce((target, child) => {
            target.push(child);
            return target;
        }, this.children);
        // 加入group
        return this.groups[groupName] ? this.groups[groupName] = [...this.groups[groupName], ...children] : this.groups[groupName] = [...children];
    }

    // 加入对象
    addChild(child) {
        child.BattleGround = this;
        this.children.push(child);
        this.registAnimation(child);
    }

    // 移除对象
    removeChild(child) {
        const index = this.children.findIndex(ele => {
            return ele === child;
        });
        if (index === -1) {
            return console.error('没有该对象，不能移除!');
        }
        this.children.splice(index, 1);
        // 移出group
        const groups = this.groups[child.groupName];
        if (groups) {
            const _index = groups.findIndex(ele => {
                return ele === child;
            });
            if (_index === -1) {
                return console.error(child.groupName + ' 中没有改对象,请检查!');
            }
            groups.splice(_index, 1);
        }
        return this;
    }

    // 获取当前对象之外的其他对象
    _getExtraChildren = (child) => {
        const children = [...this.children];
        const index = children.findIndex(ele => {
            return ele === child;
        });
        if (index === -1) {
            return console.error('没有找到该对象，请检查参数!');
        }
        children.splice(index, 1);
        return children;
    }

    // 判断边界
    // 返回边界数组
    getChildForbiddenDirection(child) {
        // 判断移动范围
        const forbiddenDirection = this._judgeBounds(child);
        // 碰撞检测
        const otherChildren = this._getExtraChildren(child);
        const sprites = otherChildren.map(oChild => {
            return oChild.getSprite();
        })
        const collision = this.bump.hit(child.getSprite(),
            sprites,
            false,
            false,
            true,
            (colli, platform) => {
                // console.log('get Collision: collision is '+colli+'; platform is '+ platform);
                // const {x, y} = child.getSprite().getGlobalPosition();
                // console.log('x: '+x+' : y '+y);
                // child.setPosition(x, y);
                // child.stopMove();
                return;
            }
        )
        // 存在碰撞
        if (collision) {
            // 转向
            switch (collision) {
                case 'right':
                    forbiddenDirection.add('RIGHT');
                    break;
                case 'left':
                    forbiddenDirection.add('LEFT');
                    break;
                case 'top':
                    forbiddenDirection.add('UP');
                    break;
                case 'down':
                    forbiddenDirection.add('DOWN');
                    break;
                default:
                    //console.log('collistion has '+collision);   
            }
        }
        // TFD 可转向方向
        return Array.from(forbiddenDirection);
    }

    // 封装contain函数
    _contain = (child) => {
        const {
            x,
            y
        } = this;
        const sprite = child.getSprite();
        return this.bump.contain(sprite, {
            x: 0,
            y: 0,
            width: x,
            height: y
        })
    }

    // 判断战场边界
    _judgeBounds = (child) => {
        const bounds = new Set();
        let boundLimit = this._contain(child);
        if (boundLimit) {
            if (boundLimit.has("left")) {
                // console.log("The sprite hit the left");
                bounds.add('LEFT');
            }
            if (boundLimit.has("top")) {
                //console.log("The sprite hit the top");
                bounds.add('UP');

            }
            if (boundLimit.has("right")) {
                //console.log("The sprite hit the right");
                bounds.add('RIGHT');
            }
            if (boundLimit.has("bottom")) {
                //console.log("The sprite hit the bottom");
                bounds.add('DOWN');
            }
        }
        return bounds;
    }

    // 判断是否移动
    judgeMove = (child, enemy) => {
        const TFD = [];
        child.moveTo(enemy, TFD);
    }

    // 判断是否能够攻击
    judgeAttack = (child, enemy) => {
        const point = enemy.getPosition();
        const {
            x,
            y
        } = point;
        const {
            width,
            height
        } = this.getBoxSize();
        const attackArea = this._getAttackArea(child);
        const enemyR = {
            x: x,
            y: y,
            width: width,
            height: height
        }
        // 判断敌人是否在攻击范围内
        const canAttack = attackArea.some(area => {
            return this.bump.hitTestRectangle(area, enemyR)
        });
        return canAttack;
    }


    // 判断两个区域是否相交


    // 周围九宫格或者四个方向
    // 返回Rectangle对象数组
    _getAttackArea = (target) => {
        const local = target.getPosition();
        // 单元格数目
        const {
            attackArea
        } = target;
        // 单元格长宽
        const {
            width,
            height
        } = this.getBoxSize();
        const {
            x,
            y
        } = local;
        const rectangles = [];
        // 中间矩形
        const cr = {
            x: x,
            y: y,
            width: width,
            height: height
        }
        rectangles.push(cr);
        // 上面矩形
        for (let i = 0; i < attackArea; i++) {
            // 左右
            let rr = {
                x: x + width * i,
                y: y,
                width: width,
                height: height
            };
            let lr = {
                x: x - width * i,
                y: y,
                width: width,
                height: height
            };
            // 上下
            let ur = {
                x: x,
                y: y + i * height,
                width: width,
                height: height
            }
            let dr = {
                x: x,
                y: y - i * height,
                width: width,
                height: height
            }
            rectangles.push(rr);
            rectangles.push(lr);
            rectangles.push(ur);
            rectangles.push(dr);
        }


        return rectangles

    }

    // 判断对象状态
    judgeLiveState(child) {
        return child.getLiveState();
    }

    // 指挥对象释放技能
    judgeSkill(child) {
        return false;
    }

}