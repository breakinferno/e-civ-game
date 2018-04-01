// 加载对象的帧的对象

import * as PIXI from 'pixi.js';
import _ from 'lodash';
import noop from './noop'

export default class FramesLoader {
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
        // 是否循环往复播放
        this.loopDirection = true;
        this.actionCallback = noop;
        // 动作类型
        this.actionType = null;
        // 当前循环函数，每帧
        this.currentLoop = noop;
        // 当前循环函数, 多帧结束
        this.overLoop = noop;
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

    changeFrame(frame) {
        this.sprite.texture = frame;
        this._update();
    }
}