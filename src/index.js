import * as PIXI from 'pixi.js';
import BG from './battleground'
import Soldier from './characters'
import noop from '@/utils/noop'
import path from 'path'
import MAL, {SERVER, CLIENT} from '@/utils/MakeAnimationLoop';
import CONST_VALUE from '@/utils/ConstValue';


const {SOLDIER_TEXTURES,} = CONST_VALUE.SOLDIER;
const {GAME_DEFAULT_WIDTH, GAME_DEFAULT_HEIGHT} = CONST_VALUE.GAME;

let BattleGround, Soldiers;
let Application = PIXI.Application,
    Container = PIXI.Container,
    loader = PIXI.loader,
    // loader =  new PIXI.loaders.Loader("", 10),
    resources = PIXI.loader.resources,
    Graphics = PIXI.Graphics,
    TextureCache = PIXI.utils.TextureCache,
    Sprite = PIXI.Sprite,
    Text = PIXI.Text,
    TextStyle = PIXI.TextStyle;

const DEFAULT_SOURCE_URL = [
    SOLDIER_TEXTURES
];


// 初始化样式
var newStyle = document.createElement("style");
var style = "* {padding: 0; margin: 0}";
newStyle.appendChild(document.createTextNode(style));
document.head.appendChild(newStyle);

class GameScene {

    static CLIENT = CLIENT;
    static SERVER = SERVER;
    // 默认的画布宽高
    static DEFAULT_WIDTH = GAME_DEFAULT_WIDTH;
    static DEFAULT_HEIGHT = GAME_DEFAULT_HEIGHT;

    constructor(options) {
        this.app = new Application({
            width: GameScene.DEFAULT_WIDTH,
            height: GameScene.DEFAULT_HEIGHT,
            antialiasing: true,
            transparent: false,
            resolution: 1,
            ...options
        });
        this._init();
        this.isClientOrServer = null;
    }
    // 依次按照顺序加载场景
    // 每个场景结束都调用自己的回调函数，
    // 并且接受上个场景的结果
    start(side = 'my', autoSize = true) {
        this.battleGround.initGroup(side);
        this.battleGround.addGroupToScene(autoSize);
        this.battleGround.battle();
    }

    resize = (width, height) => {
        this.battleGround.resize(width, height);

        this.app.renderer.autoResize = true;
        this.renderer.resize(width, height);
        this.width = width;
        this.height = height;
    }

    setResourceBaseUrl = (baseUrl) => {
        loader.baseUrl = baseUrl;
    }

    setClientOrServer(isClientOrServer) {
        if (isClientOrServer === SERVER) {
            BattleGround = BG.server;
            Soldiers = Soldier.Soldier_server;
        } else {
            BattleGround = BG.client;
            Soldiers = Soldier.Soldier_client;
        }
        this.isClientOrServer = isClientOrServer;
    }

    // 指定某个场景before, after, over回调
    before = (name, cb) => {
        const sceneIndex = this.scenes.findIndex(scene => {
            return scene.name === name;
        });
        if (sceneIndex === -1) {
            console.error('没有找到该场景，请检查场景名称是否正确!')
            return;
        }
        const scene = this.scenes[sceneIndex];
        scene.before = cb;
    }

    after = (name, cb) => {
        const sceneIndex = this.scenes.findIndex(scene => {
            return scene.name === name;
        });
        if (sceneIndex === -1) {
            console.error('没有找到该场景，请检查场景名称是否正确!')
            return;
        }
        const scene = this.scenes[sceneIndex];
        scene.after = cb;
    }

    over = (name, cb) => {
        const sceneIndex = this.scenes.findIndex(scene => {
            return scene.name === name;
        });
        if (sceneIndex === -1) {
            console.error('没有找到该场景，请检查场景名称是否正确!')
            return;
        }
        const scene = this.scenes[sceneIndex];
        scene.over = cb;
    }

    // 指定结束场景及其回调
    overScene = (name, pre, after, over) => {
        // 指定结束场景
        const sceneIndex = this.scenes.findIndex(scene => {
            return scene.name === name;
        });
        if (sceneIndex === -1) {
            console.error('没有找到该场景，请检查场景名称是否正确!')
            return;
        }
        const scene = this.scenes.splice(sceneIndex, 1)[0];
        this.scenes.push(scene);
        // 绑定该场景结束回调
        scene.over = over;
        scene.before = pre;
        scene.after = after;
    }

    // 自适应给定宽高的元素
    setToFullParent = () => {
        if (this.parent) {
            const {clientWidth, clientHeight} = this.parent;
            if (clientWidth && clientHeight) {
                this.resize(clientWidth, clientHeight);
            } else {
                throw new Error('the element you mount should has width and height both');  
            }
            return ;
        }
        throw new Error('you must decide where you want to mount the object(you can use the function：mountAt) before you call this function')
    }

    // 全屏
    setToFullScreen = () => {
        this.app.renderer.view.style.position = "absolute";
        this.app.renderer.view.style.display = "block";
        this.resize(window.innerWidth, window.innerHeight);
    }

    setBg = (bg) => {
        this.app.renderer.backgroundColor = bg;
    }

    getDriveFrames() {
        return this.battleGround.actionFlows;
    }

    // 设置驱动帧
    setDriveFrames(frames) {
        if (this.battleGround) {
            this.battleGround.actionFlows = frames;
        }
        this.driveFrames = frames;
    }

    mountAt = (target) => {
        this.parent = target;
        // 可加判断
        target.appendChild(this.view);
    }

    repeatAt = (target) => {
        const gs = _.cloneDeep(this);
        target.appendChild(gs.view);
    }

    // 创建一个Scene，根据回调创建或者直接传一个Scene,指定场景结束回调函数
    makeScene(name, cb, sceneOverCallback) {
        let scene;
        if (typeof cb === 'function') {
            scene = {
                name: name, 
                scene: new Container(),
                before: noop,
                after: noop,
                over: noop,
                cb: cb
            }
        } else if (cb instanceof Container){
            scene = {
                name: name,
                scene: cb,
                before: noop,
                after: noop,
                over: noop
            };
        } else {
            console.error('请输入正确的Scene对象！')
            return;
        }
        scene.scene.visible = false;
        this.scenes.push(scene);
        // this.battleGround.scenes.push(scene);
        this.stage.addChild(scene.scene);
        // 回掉
    }

    // 配置导演场景切换顺序
    directSceneOrder(order) {

    }

    getAllScenes() {
        return this.scenes;
    }

    // 设置战场
    setBattleGround(width, height, layout) {
        if (!BattleGround) {
            console.error('请设置用户端,服务器还是客户端,使用本对象的setClientOrServer方法和GameScene.CLIENT or GameScene.SERVER参数来设置');
        }
        // 适应
        if (!layout) {
            if (typeof height === 'undefined') {
                layout = width || {row: 1, col: 1};
                width = this.width;
                height = this.height;
            } else {
                layout = height;
                width = width.width;
                height = width.height;
            }
        }
        this.width = width;
        this.height =  height;
        this.battleGround = new BattleGround(this.width, this.heigth, layout, this.scenes);
        this.battleGround.game = this;
        if (this.driveFrames) {
            this.battleGround.actionFlows = this.driveFrames;
        }
    }

    // 游戏帧率
    setFPS(fps){
        this.battleGround.setFPS(fps);
    }

    _init() {
        // alias
        this.scenes = [];
        this.view = this.app.view;
        this.renderer = this.app.renderer
        this.stage = this.app.stage;
        this.width = this.renderer.width;
        this.height = this.renderer.height;
        // scale
        // const scale = this.scaleToArea(this.renderer.view);
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
            // 战场资源
            this.battleGround.resources = resources;
            // 回调处理
            callback.apply(this);
        })
    }

    // Todo: 新建其他类型的士兵
    makeSoldier(name) {

    }

    // 制定士兵
    setSoldiers = (friend, enemy) => {
        this.enemyList = enemy.soldiers;
        this.myList = friend.soldiers;

        if (!this.battleGround) {
            console.error('请检查是否BattleGround对象没有初始化！。。。。');
        }
        // 
        for (let _enemy of this.enemyList) {
            let enemys = this._createManageableSprite(_enemy);
            if (enemys.length) {
                this.battleGround.addToGroup(enemys, enemy['user']);
            } else {
                console.warn(enemy.user+'方不能没有士兵啊！')
                return;
            }
        }

        for (let me of this.myList) {
            let mes = this._createManageableSprite(me);
            if (mes.length) {
                this.battleGround.addToGroup(mes, friend['user']);
            } else {
                console.warn(friend.user+'方不能没有士兵啊！')
                return;
            }
        }
    }

    // 创建可管理精灵对象
    _createManageableSprite = ({ soldierType, count }, maxNum = 100) => {
        if (!Soldiers) {
            console.error('请设置用户端,服务器还是客户端,使用本对象的setClientOrServer方法和GameScene.CLIENT or GameScene.SERVER参数来设置');
        }
        let rt = [];
        if (Soldiers[soldierType]) {
            let num = Math.ceil(count / maxNum);
            for (let i = 0; i < num; i++) {
                let solider = new Soldiers[soldierType](count >= maxNum ? maxNum : count,  this.battleGround);
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

    // 重置资源， 以防重新加载是报资源已经存在错误。
    unmount() {
        PIXI.utils.clearTextureCache(); // ?
        loader = loader.reset();
    }

    // 重置动画 TODO
    reset() {
        // 重置帧率
        // 重置缩放
        // 重置对象
        // 重置Scene
    }

    // 获取缩放
    // scaleToArea = (canvas, backgroundColor) => {
    //     var scaleX, scaleY, scale, center;
      
    //     scaleX = window.innerWidth / canvas.offsetWidth;
    //     scaleY = window.innerHeight / canvas.offsetHeight;
      
    //     scale = Math.min(scaleX, scaleY);
    //     canvas.style.transformOrigin = "0 0";
    //     canvas.style.transform = "scale(" + scale + ")";
      
    //     if (canvas.offsetWidth > canvas.offsetHeight) {
    //       if (canvas.offsetWidth * scale < window.innerWidth) {
    //         center = "horizontally";
    //       } else {
    //         center = "vertically";
    //       }
    //     } else {
    //       if (canvas.offsetHeight * scale < window.innerHeight) {
    //         center = "vertically";
    //       } else {
    //         center = "horizontally";
    //       }
    //     }
      
    //     var margin;
    //     if (center === "horizontally") {
    //       margin = (window.innerWidth - canvas.offsetWidth * scale) / 2;
    //       canvas.style.marginTop = 0 + "px";
    //       canvas.style.marginBottom = 0 + "px";
    //       canvas.style.marginLeft = margin + "px";
    //       canvas.style.marginRight = margin + "px";
    //     }
      
    //     if (center === "vertically") {
    //       margin = (window.innerHeight - canvas.offsetHeight * scale) / 2;
    //       canvas.style.marginTop = margin + "px";
    //       canvas.style.marginBottom = margin + "px";
    //       canvas.style.marginLeft = 0 + "px";
    //       canvas.style.marginRight = 0 + "px";
    //     }
      
    //     canvas.style.paddingLeft = 0 + "px";
    //     canvas.style.paddingRight = 0 + "px";
    //     canvas.style.paddingTop = 0 + "px";
    //     canvas.style.paddingBottom = 0 + "px";
    //     canvas.style.display = "block";
      
    //     document.body.style.backgroundColor = backgroundColor;
      
    //     var ua = navigator.userAgent.toLowerCase();
    //     if (ua.indexOf("safari") != -1) {
    //       if (ua.indexOf("chrome") > -1) {
    //         // Chrome
    //       } else {
    //         // Safari

    //       }
    //     }
        
    //     return scale;
    //   } 
}


export default GameScene