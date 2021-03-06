// 制作帧动画辅助函数..真的麻烦

// 支持两种方式，传递图片数组和雪碧图

// 雪碧图有部分帧动画([1,2,5])和全部帧动画(支持顺序)()，以及支持start end对象表示法(1, 8)
// 数组表示个别帧,对象表示连续帧

// TODO: 反复的动画，现在只是一个方向的动画，以后添加往复的动画效果.
import * as PIXI from 'pixi.js';
import _ from 'lodash';
import noop from './noop'

export default class AnimationManager {
    constructor(sprite) {
        this.sprite = sprite;
        // 默认传入雪碧图
        this.isSingleFileWithFrame = false;
        // 所有帧
        this.frames = [];
        // 当前帧数
        this.currentFrame = 0;
        // 目标帧顺序
        this.cacheFrames = [];
        this.isStop = true;
        this.fps = 10;
        this.now = Date.now();
        this.animations = {};
        // 是否循环往复播放
        this.loopDirection = true;
        this.actionCallback = noop;
        // 时间间隔，这个参数的意义在于同步外界时间间隙，
        // 动画的播放速率是由interval 和 fps决定的
        // speed = interval / fps
        this.interval = 1000;
        // 动作类型
        this.actionType = null;
        // 当前循环函数，每帧
        this.currentLoop = noop;
        // 当前循环函数, 多帧结束
        this.overLoop = noop;
    }

    setInterval(interval) {
        this.interval = interval;
    }

    getInterval() {
        return this.interval;
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
        return this.fps;
    }

    setFPS(fps) {
        this.fps = fps;
    }

    _loadFramesFromResource = (textures, special, rowCount = 1, colCount = 1) => {
        let width, height, texture, _textures, frame;
        let frames = [];
        const type = toString.call(textures).slice(8, -1);
        // 一级texture Texture数组
        if (type === 'Array') {
            frames = [...textures];
        } else {
            // 3级textures 这个对象为Resource对象
            if (special) {
                _textures = _.cloneDeep(textures);
                texture = _textures.textures[special];
                frame = _textures.data.frames[special];
                height = texture.height / rowCount;
                width = texture.width / colCount;
                // 从左到右，从上到下
                for (let i = 0; i < rowCount; i++) {
                    for (let j = 0; j < colCount; j++) {
                        let rectangle = new PIXI.Rectangle(frame.frame.x + j * width, frame.frame.y + i * height, width, height);
                        let distTexture = _.cloneDeep(texture);
                        distTexture.frame = rectangle;
                        frames.push(distTexture);
                    }
                }
            } else {
                // 二级texture Texture对象
                texture = textures;
                // 单个一级图
                if (rowCount === 1 && colCount === 1) {
                    frames.push(_.cloneDeep(texture));
                } else {
                    // 二级图
                    height = texture.height / rowCount;
                    width = texture.width / colCount;
                    for (let i = 0; i < rowCount; i++) {
                        for (let j = 0; j < colCount; j++) {
                            let rectangle = new PIXI.Rectangle(j * width, i * height, width, height);
                            let distTexture = _.cloneDeep(texture);
                            distTexture.frame = rectangle;
                            frames.push(distTexture);
                        }
                    }
                }
            }
        }
        this.frames = [...this.frames, ...frames];
        return frames;
    }

    _loadFramesFromIMG(frames, rowCount = 1, colCount = 1) {
        let rawTexture;
        const type = toString.call(frames).slice(8, -1);
        // 一系列图片
        if (type === 'Array') {
            this.isSingleFileWithFrame = true;
            const rawTextures = frames.map((frame) => {
                return PIXI.Texture.fromImage(frame);
            });
            return this._loadFramesFromResource(rawTextures, null, rowCount, colCount);
        }
        // 一张雪碧图
        if (colCount && rowCount) {
            rawTexture = PIXI.Texture.fromImage(frames);
            // 从左到右，从上到下
            return this._loadFramesFromResource(rawTexture, null, rowCount, colCount);
        }
        // 一张单图
        return this._loadFramesFromResource(PIXI.Texture.fromImage(frames))
    }

    _loadFramesFromJSON(resource, special, rowCount = 1, colCount = 1) {
        return this._loadFramesFromResource(resource, special, rowCount, colCount);
    }

    _update = () => {
        if (this.sprite.texture) {
            this.sprite.texture.update();
            this.sprite.texture._updateUvs();
        } else{
            console.error('没有texture');
        }
    }

    loadFrames = (frames, rowCount, colCount, special) => {
        const rt = this.frames.length;
        const type = toString.call(frames).slice(8, -1);
        // 一级小texture
        if (type === 'Array') {
            this.isSingleFileWithFrame = true;
            this._loadFramesFromIMG(frames, rowCount, colCount);
        }

        if (type === 'Object') {
            this._loadFramesFromJSON(frames, special, rowCount, colCount);
        }

        if (type === 'String') {
            // const pix = frames.split('.')[1];
            // 判断条件
            // 加载
            this._loadFramesFromIMG(frames, rowCount, colCount);
        }
        // 二级png
        return rt;
    }

    // 分配帧给某个特定行为
    dispatchAnimation(actionType, ...sequence) {
        this.animations[actionType] ? this.animations[actionType] : this.getSequenceFrames(sequence);
    }

    // 直接运行分配帧
    directAnimationFrames(...sequence) {
        this.animate(this.getSequenceFrames(sequence));
    }


    directAnimationFramesOnce(...sequence) {
        this.animateOnce(this.getSequenceFrames(sequence));
    }

    // 根据参数获取指定帧
    getSequenceFrames = (sequence, base = 0) => {
        let sequenceFrames = [];
        sequence.length
            ? sequence.forEach((val) => {
                let type = toString.call(val).slice(8, -1)
                if (type === 'Array') {
                    sequenceFrames = [...sequenceFrames, ...val.map(v => this.frames[v + base])];
                }
                if (type === 'Object') {
                    if (typeof val.start !== 'undefined') {
                        const end = val.end ? val.end : this.frames.length - 1;
                        const arr = Array.from({ length: end - val.start + 1 }, (v, k) => { return k + val.start });
                        sequenceFrames = [...sequenceFrames, ...arr.map(v => this.frames[v + base])];
                    } else {
                        console.error('对象必须包含start属性');
                    }
                }
                if (type === 'Number') {
                    sequenceFrames.push(this.frames[val + base]);
                }
                if (type === 'String') {
                    sequenceFrames.push(this.frames[+val + base]);
                }
            })
            : sequenceFrames;
        return sequenceFrames;
    }

    // 根据传入帧产生动画
    _animate = (name, frames, callback, once, cb) => {
        // 当前对象行为和上次一样则直接跳过逻辑，继续以当前状态运行
        // if (this.actionType === name) {
        //     return;
        // }
        // 停止正在运行的动画
        this.stop();
        // 改变当前动画
        this.actionType = name;
        // 重置帧状态
        this.currentFrame = 0;
        this.isStop = false;
        this.actionCallback = callback;
        // 设置缓存帧
        this.cacheFrames = frames;
        // 设置当前循环函数
        this.currentLoop = callback;
        this.overLoop = cb;
        // 帧循环控制
        this.loop(this._loopFunc, once);
    }

    // 每帧的改变
    _loopFunc = () => {
        this.sprite.texture = this.cacheFrames[this.currentFrame];
        this._update();
        this.currentFrame = (this.currentFrame + 1) % this.cacheFrames.length;
        this.currentLoop.call(this.owner, this.owner);
    }

    changeFrame(frame) {
        this.stop();
        this.sprite.texture = frame;
        this._update();
    }

    // 逆向帧动画
    _animateReverse(frames, callback, once, cb) {
        return cb;
    }

    // 只动画一次
    animateOnce(name, frames, callback, cb) {
        this._animate(name, frames, callback, true, cb);
    }

    // frames and action
    //
    animate(name, frames, callback, cb) {
        this._animate(name, frames, callback, false, cb);
    }

    pause() {
        this.isStop = true;
    }

    resume = () => {
        this.isStop = false;
        this.currentFrame = (this.currentFrame + 1) % this.cacheFrames.length;
        // 控制程序
        this.loop(() => {
            this.sprite.texture = this.cacheFrames[this.currentFrame];
            this._update();
            this.currentFrame = (this.currentFrame + 1) % this.cacheFrames.length;
            this.actionCallback.call(this.owner, this.owner);
        })
    }

    stop = () => {
        if (this.isStop) {
            return;
        }
        this.isStop = true;
        window.cancelRequestAnimFrame = (function () {
            return window.cancelAnimationFrame ||
                window.webkitCancelRequestAnimationFrame ||
                window.mozCancelRequestAnimationFrame ||
                window.oCancelRequestAnimationFrame ||
                window.msCancelRequestAnimationFrame ||
                clearTimeout;
        })();
        this.timer?window.cancelRequestAnimFrame(this.timer):null;
    }


    // 清除overLoop函数
    clearOverLoop = () => {
        this.overLoop = noop;
    }

    // 清除每帧循环函数
    clearCurrentLoop = () => {
        this.currentLoop = noop;
    }

    // 传入每帧调用回调函数，是否只动画一次，动画一次调用回调函数
    loop = (callback, once) => {
        const interval = this.interval / this.fps;
        let delta;
        window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
        if (this.isStop) {
            this.stop();
            return;
        }
        // 请求动画帧
        if (window.requestAnimationFrame) {
            let now = Date.now();
            delta = now - this.now;
            if (delta > interval) {
                this.now = now - (delta % interval);
                // 简单的通过最后帧和是否once参数来决定是否继续循环
                if (once && this.currentFrame === this.cacheFrames.length - 1) {
                    // this.stop();
                    typeof this.overLoop === 'function'?this.overLoop():null;
                    this.stop();
                    return;
                }
                // 运行完一次动画后调用的回调函数
                if (this.currentFrame === (this.cacheFrames.length - 1)) {
                    typeof this.overLoop === 'function'?this.overLoop():null;
                }
                // 每帧的变化回调
                callback();
            }
            this.timer = window.requestAnimationFrame(this.loop.bind(this, callback, once));
        }
    }


}