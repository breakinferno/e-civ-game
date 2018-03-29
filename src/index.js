import * as PIXI from 'pixi.js';
import BattleGround from './battleground'
import Soldiers from './characters'

let Application = PIXI.Application,
    Container = PIXI.Container,
    loader = PIXI.loader,
    resources = PIXI.loader.resources,
    Graphics = PIXI.Graphics,
    TextureCache = PIXI.utils.TextureCache,
    Sprite = PIXI.Sprite,
    Text = PIXI.Text,
    TextStyle = PIXI.TextStyle;

const DEFAULT_SOURCE_URL = [
    '/images/cat.png',
    '/images/treasureHunter.json',
    '/images/testCharacter.json'
];


class GameScene {
    constructor(options) {
        this.app = new Application({
            width: 800,
            height: 600,
            antialiasing: true,
            transparent: false,
            resolution: 1,
            ...options
        });
        this._init();
    }
    // 依次按照顺序加载场景
    // 每个场景结束都调用自己的回调函数，
    // 并且接受上个场景的结果
    start(side = 'my', autoSize = true) {
        this.battleGround.initGroup(side);
        this.battleGround.addGroupToScene(autoSize);
        this.battleGround.battle();
        // this.battleGround.over((side) => {
        //     if (side === 'my') {
        //         this.message.text = '恭喜你，己方队伍获得胜利!'
        //         return;
        //     }
        //     this.message.text = '很遗憾，己方队伍溃败了！';
        // })
    }

    

    over = (name, cb) => {
        // 指定结束场景
        const sceneIndex = this.scenes.findIndex(scene => {
            return scene.name === name;
        });
        if (sceneIndex === -1) {
            console.error('没有找到该场景，请检查场景名称是否正确!')
            return;
        }
        const scene = this.scenes.splice(sceneIndex, 1);
        this.scenes.push(scene);
        cb.apply(this, scene);
    }

    setBg = (bg) => {
        this.app.renderer.backgroundColor = bg;
    }

    mountAt = (target) => {
        // 可加判断
        target.appendChild(this.view);
    }

    // 创建一个Scene，根据回调创建或者直接传一个Scene,指定场景结束回调函数
    makeScene(name, cb, isParticle) {
        const scene = {
            name: name, 
            scene: new Container()
        }
        scene.scene.visible = false;
        cb.call(this, scene.scene);
        this.scenes.push(scene);
        this.stage.addChild(scene.scene);
    }

    // 配置导演场景切换顺序
    directSceneOrder(order) {

    }

    getAllScenes() {
        return this.scenes;
    }

    setBattleGround(width, heigth, layout) {
        this.battleGround = new BattleGround(width, heigth, layout, this.scenes);
    }

    _init() {
        // alias
        this.scenes = [];
        this.view = this.app.view;
        this.renderer = this.app.renderer
        this.stage = this.app.stage;
        // main/start scene
        const gameScene = new Container();
        this.scenes.push({
            name: 'GAME_START_FIRST_SCENE',
            scene: gameScene
        });
        gameScene.visible = true;
        this.stage.addChild(gameScene);
    }


    // 定制资源加载器
    handleLoadProgress = (cb) => {
        this._onProgress = cb.bind(this);
    }

    getTextures(textureName) {
        return this.textures[textureName];
    }

    // 加载资源及其回调
    load = (src, callback) => {
        let SRC;
        if (typeof callback === 'undefined') {
            // 没有其他要加载的资源
            callback = src;
            SRC = [...DEFAULT_SOURCE_URL];
        } else {
            SRC = [...DEFAULT_SOURCE_URL, ...src];
        }
        this._definedLoad(SRC, this._onProgress, ()=> {
            // 所有textures
            this.textures = resources;
            // 回调处理
            callback.apply(this);
        })
    }

    // Todo: 新建其他类型的士兵
    makeSoldier(name) {

    }

    // 制定士兵
    setSoldiers(friend, enemy) {
        this.enemyList = enemy.soldiers;
        this.myList = friend.soldiers;
        // 设置内置兵种的url资源
        const textures = this.textures['/images/testCharacter.json'];

        if (!this.battleGround) {
            console.error('请检查是否BattleGround对象没有初始化！。。。。');
        }
        // 
        for (let _enemy of this.enemyList) {
            let enemys = this._createManageableSprite(_enemy, textures);
            if (enemys.length) {
                this.battleGround.addToGroup(enemys, enemy['user']);
            } else {
                console.warn(enemy.user+'方不能没有士兵啊！')
                return;
            }
        }

        for (let me of this.myList) {
            let mes = this._createManageableSprite(me, textures);
            if (mes.length) {
                this.battleGround.addToGroup(mes, friend['user']);
            } else {
                console.warn(friend.user+'方不能没有士兵啊！')
                return;
            }
        }
    }

    // 创建可管理精灵对象
    _createManageableSprite = ({ soldierType, count }, cache, maxNum = 100) => {
        let rt = [];
        if (Soldiers[soldierType]) {
            let num = Math.ceil(count / maxNum);
            for (let i = 0; i < num; i++) {
                let solider = new Soldiers[soldierType](cache, count >= maxNum ? maxNum : count);
                count -= maxNum;
                // 加入数组
                rt.push(solider);
            }
            return rt;
        } else {
            console.error('没有该类士兵，请检查传入的士兵类型是否合法！');
            return [];
        }
    }

    // 默认加载的回调
    _onProgress = (loader, resource) => {
        console.log("loading: " + resource.url);
        //Display the percentage of files currently loaded
        console.log("progress: " + loader.progress + "%");
        //If you gave your files names as the first argument
        //of the `add` method, you can access them like this
        //console.log("loading: " + resource.name);
    }

    _definedLoad = (resources, progressHanlder, callback) => {
        if (!callback) {
            callback = progressHanlder
            progressHanlder = noop;
        }
        loader.add(resources)
            .on('progress', progressHanlder)
            .load(callback)
    }
}


export default GameScene