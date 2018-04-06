// 加载对象的帧的对象

import * as PIXI from 'pixi.js';
import _ from 'lodash';
import noop from './noop'


export default class FramesLoader {
    constructor(sprite) {
        // 默认的操作
        this._defaultActions = ['INIT', 'DEAD', 'ATTACK@UP', 'ATTACK@DOWN', 'ATTACK@LEFT', 'ATTACK@RIGHT', 'MOVE@UP', 'MOVE@DOWN', 'MOVE@LEFT', 'MOVE@RIGHT']
        // 整个程序所有的资源
        this.resource = null;
        // 所有帧---某类/某个对象的所有帧
        this.frames = [];
        // 当前帧数
        this.currentFrameIndex = 0;
        // 目标缓存的帧
        this.cacheFrames = [];
        // 动作类型
        this.currentAction = null;
        // 当前循环函数，每帧
        this.currentLoop = noop;
        // 当前循环函数, 多帧结束
        this.overLoop = noop;
        // 当前对象的动画对应帧
        this.stateMapFrames = {}
        // 动作效果回调函数存储
        this.actionCallbacks = {}; 
        // 精灵对象
        this.sprite = sprite;
    }

    setSprite = (sprite) => {
        this.sprite = sprite;
    }

    // 注册一个新的动作
    registerAction = (name, callback) => {
        this._defaultActions.includes(name) ? null : this._defaultActions.push(name);
        // 注册其函数
        const actions = name.split('@');
        let pointer = this.actionCallbacks;
        const length = actions.length;
        for (let i = 0; i < length - 1; i++) {
            pointer = pointer[actions[i]];
        }
        pointer[actions[length - 1]] = callback;
        return this;
    }

    // 加载某个帧集
    setResources = (resource) => {
        this.resource = resource;
    }

    // 获取某个动作的某一帧
    /**
     * @param action string 动作名称
     * @param frameIndex number 帧序列
     * @return Texture 帧纹理对象
     */
    getActionFrame(action, frameIndex = 0) {
        const actions = action.split('@');
        const target = actions.reduce((storage, action) => {
            return storage[action];
        }, this.stateMapFrames);

        const type = toString.call(target).slice(8, -1);
        // 一级小texture
        if (type === 'Array') {
            return target[frameIndex];
        }

        if (type === 'Object') {
            return target;
        }

    }

    // 加载指定动作的动画帧
    /**
     * @param action string 动作名称
     * @param callback function 每加载一帧的回调
     * @param overCallback function 加载完该动作最后一帧的回调
     */
    loadActionFrame = (action, overCallback = noop) => {
        if (this.currentAction === action) {
            this._stepToNextFrame(action);
        } else {
            this.currentAction = action;
            // 新的动作
            this.currentFrameIndex = 0;
            this.cacheFrames = this._getCacheFrames(action);
            this.currentLoop = this._getActionFrameCallback(action);
            this.overLoop = overCallback;
            this._stepToNextFrame(action);
        }
    }

    // 进入下一帧
    _stepToNextFrame = (action) => {
        // 改变帧
        this.changeFrame(this.cacheFrames[this.currentFrameIndex]);
        this.currentFrameIndex = (this.currentFrameIndex + 1) % this.cacheFrames.length;
        // 回调   
        this.currentLoop.call(this.owner, this.owner);
        // 是否结束帧
        if (this.currentFrameIndex === this.cacheFrames.length-1) {
            this.overLoop.call(this, this, this.owner);
        }
    }

    // 获取缓存帧数组
    /**
     * @param action string 动作名称
     */
    _getCacheFrames = (action) => {
        const actions = action.split('@');
        const frames = actions.reduce((pre, next) => {
            return pre[next];
        }, this.stateMapFrames);
        return frames;
    }

    // 获取当前动作每帧的回调
    /**
     * @param action string 动作名称
     */
    _getActionFrameCallback = (action) => {
        const actions = action.split('@');
        const actionFunc = actions.reduce((pre, next) => {
            return pre[next];
        }, this.actionCallbacks);
        return actionFunc;
    }

    // 重置动画帧
    resetActionFrame = () => {
        this.currentAction = '';
        // 新的动作
        // console.log('你重置动画帧了');
    }

    /**
     * @param state string 从指定的帧状态获取实实在在的动画帧
     * @return states map texutures
     */
    loadActionFramesFromState = (state) => {
        this._loadActionFramesFromState(state, this.stateMapFrames, this.actionCallbacks, (val, base) => {
            let type = toString.call(val).slice(8, -1);
            let sequences = val;
            if (type === 'Array') {
                sequences = {
                    start: val[0],
                    end: val[1]
                }
                return this.getSequenceFrames([sequences], base);
            }
            return this.getSequenceFrames([sequences], base)[0];
        })
    }

    // 递归函数
    _loadActionFramesFromState = (obj, dist , actions, mapFunc) => {
        for (let key of Object.keys(obj)) {
            let type = toString.call(obj[key]).slice(8, -1);
            if (type === 'Object') {
                dist[key] = { ...dist[key]};
                actions[key] = {};
                this._loadActionFramesFromState(obj[key], dist[key], actions[key], mapFunc);
            } else {
                actions[key] = noop;
                dist[key] = mapFunc(obj[key], typeof dist.base !== 'undefined'?dist.base:dist[key].base);
            }
        }
    }

    getAction() {
        return this.currentAction;
    }

    getFrames() {
        return this.frames
    }

    getCurentFrameId() {
        return this.currentFrameIndex
    }

    getCurentFrame() {
        return this.frames[this.currentFrameIndex];
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

    // 从给定资源加载动画帧
    loadActionFramesFromResource = (actionType, rowNum = 1 , colNum = 1, frames, srcID) => {
        let loadedFrames;
        // const type = toString.call(frames).slice(8, -1);
        const actions = actionType.split('.');
        if (frames) {
            loadedFrames = this._loadFrames(frames, rowNum, colNum);
            actions.forEach(action => {
                this.stateMapFrames[action] = {};
                this.stateMapFrames[action]['base'] = loadedFrames;
            })
        } else {
            loadedFrames = this._loadFrames(this.resource, rowNum, colNum, srcID);
            actions.forEach(action => {
                this.stateMapFrames[action] = {};
                this.stateMapFrames[action]['base'] = loadedFrames;
            })
        }
        return this;
    }

    // 从资源加载帧对象
    _loadFrames = (frames, rowCount, colCount, special) => {
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

    changeFrame(frame) {
        this.sprite.texture = frame;
        this._update();
    }
}