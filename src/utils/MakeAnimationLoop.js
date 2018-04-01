// 制作帧动画辅助函数..真的麻烦

// 支持两种方式，传递图片数组和雪碧图

// 雪碧图有部分帧动画([1,2,5])和全部帧动画(支持顺序)()，以及支持start end对象表示法(1, 8)
// 数组表示个别帧,对象表示连续帧

// TODO: 反复的动画，现在只是一个方向的动画，以后添加往复的动画效果.
import * as PIXI from 'pixi.js';
import _ from 'lodash';
import noop from './noop'

const INTERVAL = 1000; // 一秒


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
    constructor() {
        // 管理对象
        this.subscribers = [];
        this.FPS = 60;
        this.isStop = false;
    }

    // 兵种订阅
    subscribe = (child) => {
        child.MAL = this;
        this.subscribers.push(child);
    }

    // 逐帧动画
    animate = () => {
        this.now = Date.now();
        this._gameLoop();
    }

    // 每帧需要进行的函数
    // 每个对象进行相应的操作
    _animateFunc = () => {
        this.subscribers.forEach(subscriber => {
            this._subscribeAnimate(subscriber);
        })
    }

    // 每个订阅者动画
    _subscribeAnimate = (subscriber) => {
        subscriber.active();
    }

    // 统计函数
    // 统计每帧的状态
    _pick = () => {

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
                this._animateFunc();
            }
        }
    }


    getFrames() {
        return this.frames
    }

    getCurentFrameId() {
        return this.currentFrame
    }

    getCurentFrame() {
        return this.frames[this.currentFrame];
    }

    getFPS() {
        return this.FPS;
    }

    setFPS(FPS) {
        this.FPS = FPS;
    }

    stop = () => {
        if (this.isStop) {
            return;
        }
        this.isStop = true;
        this.timer?window.cancelRequestAnimFrame(this.timer):null;
    }
}