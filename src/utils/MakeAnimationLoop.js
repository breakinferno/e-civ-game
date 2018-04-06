// 制作帧动画辅助函数..真的麻烦

// 支持两种方式，传递图片数组和雪碧图

// 雪碧图有部分帧动画([1,2,5])和全部帧动画(支持顺序)()，以及支持start end对象表示法(1, 8)
// 数组表示个别帧,对象表示连续帧

// 在动画过程中新增加订阅者可以通过一个缓存订阅数组来缓存之， 到下一帧 才实实在在的将缓存的加入订阅者

import * as PIXI from 'pixi.js';
import _ from 'lodash';
import noop from './noop'
import item from '@/item'
import FramesLoader from './FramesLoader'
import CONST_VALUE from '@/utils/ConstValue';


const {SOLDIER_TEXTURES} = CONST_VALUE.SOLDIER;
const ShotItem = item.ShotItem;
const INTERVAL = 1000; // 一秒
export const SERVER = 'server';
export const CLIENT = 'client';

(function() {
    var lastTime = 0;
    var vendors = ['webkit', 'moz'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame =
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());


export default class AnimationManager {
    constructor(FPS = 10, isServer = CLIENT) {
        this.isServerOrClient = isServer;
        // 管理对象
        this.subscribers = [];
        this.FPS = FPS;
        this.isStop = false;
        this.frameIndex = 0;
        this.shotItemCache = [];
        // 将要取消订阅的订阅者数组
        this.willCancelSubscribers = [];
    }

    // 兵种订阅
    subscribe = (child) => {
        child.MAL = this;
        this.subscribers.push(child);
    }


    // 取消动画订阅
    // 立即取消订阅
    cancelSubscribe = (child) => {
        //test
        // const shotItems = this.subscribers.filter(subscriber => {
        //     return subscriber instanceof ShotItem;
        // })
        // console.log('这里还有'+shotItems.length+'只见');

        const index = this.subscribers.findIndex(subscriber => {
            if (child.id) {
                return subscriber.id === child.id
            }
             return subscriber === child;
        });

        this.subscribers.splice(index, 1);
    }

    // 逐帧动画
    animate = () => {
        this.now = Date.now();
        // test
        if (this.isServerOrClient === CLIENT) {
            this.FramesLoader = new FramesLoader(new PIXI.Sprite());
            this.FramesLoader.setResources(this.holder.resources[SOLDIER_TEXTURES]);
            this.FramesLoader.loadActionFramesFromResource('SHOT', 4, 4, null, 'Archer_shot.png');
            this.FramesLoader.loadActionFramesFromState({
                'SHOT': {
                    'UP': 12,
                    'DOWN': 0,
                    'LEFT': 4,
                    'RIGHT': 8
                }
            })
            this.holder.actionFlows = JSON.parse(localStorage.getItem('rt')).data;
            this.actionFrameFlows = this.holder.actionFlows;
        }
        this._gameLoop();
    }

    // 每帧需要进行的函数
    // 每个对象进行相应的操作
    _animateFunc = () => {
        let rt = {
            'shotItem': [],
        };     // 每帧记录对象
        // 每次客户端记录所有位置操作
        if (this.isServerOrClient === SERVER) {
            this.subscribers.forEach(subscriber => {
                this._pick(subscriber, rt);
                this._subscribeAnimate(subscriber);
            });
            // 上传该帧状态的对象
            this.uploadFrameState(rt);
        } 

        if (this.isServerOrClient === CLIENT) {
            const frame = this.actionFrameFlows[this.frameIndex-1];
            // 取消订阅
            this.subscribers = _.difference(this.subscribers, this.willCancelSubscribers);
            // 清除上一真的shotItem 对象
            this.shotItemCache.forEach(shotItem => {
                shotItem.clear();
            })
            this.shotItemCache = [];
            // 获取帧对象
            // const frame = this.actionFrameFlows[this.frameIndex-1];

            if (this.frameIndex === this.actionFrameFlows.length || frame.data.battleOver) {
                // 动画结束
                this.stop();
                this.holder.clearBattleGround(frame.data.winner);
                return ;
            }
            this.subscribers.forEach(subscriber => {
                if (this.frameIndex === frame.index){
                    this._subscribeAnimate(subscriber);
                }
            });
            // 复原未注册的对象
            const data = frame.data;
            data['shotItem'].forEach(item => {
                const shotItem = this._fakeShotItem(item);
                this.shotItemCache.push(shotItem);
            })
        }

    }

    // 用于接受需要取消订阅的订阅者
    // 下一帧或者任意帧取消订阅
    acceptCancelSubscriber = (subscriber) => {
        this.willCancelSubscribers.push(subscriber);
    }


    // 暂时就这样吧...如果同一一点可以将每个shotItem对象设置唯一id。
    _fakeShotItem = (item) => {
        const {position, rotation, direction} = item;
        const frame = this.FramesLoader._getCacheFrames('SHOT@'+direction);
        const shotItem = new ShotItem(null, frame);
        shotItem.direction = direction;
        shotItem.addToScene(this.holder.getScene());
        shotItem._setPosition(position);
        shotItem.setAngel(rotation);
        return shotItem;
    }

    // 上传某帧所有对象状态
    /**
     * 
     * @param {array} state 上传的某一帧的状态数组
     */
    uploadFrameState(state) {
        this.holder.receiveAction({
            index: this.frameIndex,
            data: state
        });
    }

    // 每个订阅者动画
    // 订阅者必须实现active接口
    _subscribeAnimate = (subscriber) => {
        if (this.isServerOrClient === CLIENT) {
            subscriber.active(this.actionFrameFlows[this.frameIndex-1]);
        } else {
            subscriber.active();
        }
    }


    // 统计函数
    // 统计每帧某个对象的状态
    /**
     * @param subscriber object 统计的对象
     * @param dest object 统计到的对象,用于将所有该帧对象状态进行合并
     */
    _pick = (subscriber, dest) => {
        if (subscriber.id) {
            dest[subscriber.id] = {
                id: subscriber.id,
                position: subscriber.getPosition(),
                direction: subscriber.direction,
                health: subscriber.getBlood(),
                isLive: subscriber.getLiveState(),
                frame: subscriber.FramesLoader.getCurentFrameId(),
                action: subscriber.FramesLoader.getAction() || 'INIT'
            }
        } else {
            dest['shotItem'].push({
                position: subscriber._getPosition(),
                isLive: subscriber.canFly,
                rotation: subscriber.getAngel(),
                direction: subscriber.getDirection(),
            });
        }
        return dest;
    }

    // 整个游戏流程
    _gameLoop = () => {
        const interval = INTERVAL / this.FPS;
        let delta;
        // 请求动画帧
        if (window.requestAnimationFrame) {
            // 请求动画帧
            this.timer = window.requestAnimationFrame(this._gameLoop.bind(this));
            // 
            let now = Date.now();
            delta = now - this.now;
            if (delta > interval) {
                this.now = now - (delta % interval);
                // 重绘下一帧
                this.frameIndex ++;
                this._animateFunc();
            }
        }
    }

    getFPS() {
        return this.FPS;
    }

    setFPS(FPS) {
        this.FPS = FPS;
    }

    stop = (result) => {
        if (this.isStop) {
            return;
        }
        if (this.isServerOrClient === SERVER) {
            //发送结果
            this.uploadFrameState({
                winner: result,
                battleOver: true
            })
        }
        this.isStop = true;
        this.timer?window.cancelAnimationFrame(this.timer):null;
    }
}