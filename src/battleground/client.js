
// 该对象设计主要用于检测浏览器窗口变化和管理游戏界面的尺寸比例
// 仲裁各个对象的行为和状态，类似于一个管理器
import _ from 'lodash';
import * as PIXI from 'pixi.js';
import Bump from 'bump.js'
import MakeAnimationLoop, { CLIENT } from '@/utils/MakeAnimationLoop';
import CONST_VALUE from '@/utils/ConstValue';

const {GAME_DEFAULT_WIDTH, GAME_DEFAULT_HEIGHT} = CONST_VALUE.GAME;

export default class BattleGround {
    constructor(x = 800, y = 600, layout = { col: 30, row: 40 }, scenes = []) {
        this.currentSceneIndex = 0;
        this.currentScene = scenes[this.currentSceneIndex];
        this.scenes = scenes;
        this.layout = layout;
        this.children = [];
        this.groups = {};
        // 缩放比例
        this.scale = {
            x: 1,
            y: 1
        };
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
        this.MAL = new MakeAnimationLoop(10, CLIENT);
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
            const { row } = this.layout;
            const rt = [(val % row + row - 1) % row, Math.floor((val - 1) / row)];
            return rt;
        } : (val) => {
            const { col } = this.layout;
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
        let totalChildren = [];
        for (let group of Object.keys(this.groups)) {
            totalChildren = [...totalChildren, ...this.groups[group]];
        }
        totalChildren.forEach(child => {
            this.addChildToScene(child, fittable);
        })
        return this;
    }

    battle = () => {
        //this.makeChildrenActive();
        this.MAL.animate();
        // console.log('battle start');
    }

    // 将所有子对象加载到场景中
    addChildToScene(child, fittable) {
        if (fittable) {
            const { sprite } = child;
            const { height, width } = sprite;
            const { ys, xs } = this;
            sprite.scale.x = xs / width;
            sprite.scale.y = ys / height;
            //sprite.anchor.set(0.5, 0.5);
        }
        const { width, height } = this.getBoxSize();
        child.unitX = width;
        child.unitY = height;
        child.addToScene(this.getScene());
    }

    // 自适应格子
    _justifyBox(row, col, element) {
        const y = row * this.ys;
        const x = col * this.xs;
        element.setPosition(x, y);
        // test
        //element.addToScene(this.scene);
    }

    resize(x, y) {
        this.x = x;
        this.y = y;
        this.xs = x / this.layout.col;
        this.ys = y / this.layout.row;
        this.setScale(x, y);
    }

    // 设置缩放
    setScale(x, y) {
        this.scale.x = x / GAME_DEFAULT_WIDTH;
        this.scale.y = y / GAME_DEFAULT_HEIGHT;
        return this;
    }


    // 清理战场
    clearBattleGround = (side) => {
        console.log('清理战场中...');
        // 停止所有动作
        // typeof this.overCB === 'function'?this.overCB(side):null;
        console.log('战场打扫完毕！');
        // 下一个场景
        this.currentSceneIndex++;
        const scene = this.scenes[this.currentSceneIndex];
        this.preResult = side;
        // 传递结果
        this.loadScene(scene);

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
        const side = target.groupName;   // 本方阵营
        for (let name of Object.keys(this.groups)) {
            if (name !== side) {
                otherSide = this.groups[name]
            }
        }

        return otherSide;
    }

    _generateEnemyQuene = (target) => {
        const sides = this._getEnemies(target);
        const arr = Array.from({ length: sides.length }, (k, v) => {
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


    // 注册动画
    registAnimation = (child) => {
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

}

