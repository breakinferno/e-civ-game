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

    gameStart() {
        this._init();
        this.app.stage.addChild(this.gameScene);
        this.app.stage.addChild(this.gameOverScene);
    }

    setBg = (bg) => {
        this.app.renderer.backgroundColor = bg;
    }

    mountAt = (target) => {
        // 可加判断
        target.appendChild(this.view);
    }


    _init() {
        this.gameScene = new Container();
        this.gameOverScene = new Container();
        this.app.renderer.backgroundColor = 0x061639;
        this.view = this.app.view;
        this.gameScene.visible = true;
        this.gameOverScene.visible = false;
        this.battleGround = new BattleGround(800, 600, { row: 5, col: 20 }, this.gameScene, this.gameOverScene);
    }

    initResource(my, enemy, src) {
        this.enemyList = enemy;
        this.myList = my;
        this.definedLoad([
            'static/images/cat.png',
            'static/images/treasureHunter.json',
            'static/images/testCharacter.json'
        ], this.onProgress, () => {
            //console.log(TextureCache);
            console.log(resources);
            const textures = resources['static/images/testCharacter.json'];
            //创建对象
            for (let enemy of this.enemyList) {
                let enemys = this.createManageableSprite(enemy, textures);
                if (enemys.length) {
                    this.battleGround.addToGroup(enemys, 'enemy');
                } else {
                    return;
                }
            }

            for (let me of this.myList) {
                let mes = this.createManageableSprite(me, textures);
                if (mes.length) {
                    this.battleGround.addToGroup(mes, 'my');
                } else {
                    return;
                }
            }
            this._initGameOverMessage();
            // battleGround setting
            this.battleGround.initGroup('my');
            this.battleGround.addGroupToScene(true);
            this.battleGround.battle();
            this.battleGround.over((side) => {
                if (side === 'my') {
                    this.message.text = '恭喜你，己方队伍获得胜利!'
                    return;
                }
                this.message.text = '很遗憾，己方队伍溃败了！';
            })
        })
    }

    // 创建可管理精灵对象
    createManageableSprite = ({ soldierType, count }, cache) => {
        let rt = [];
        if (Soldiers[soldierType]) {
            let num = Math.ceil(count / 100);
            for (let i = 0; i < num; i++) {
                let solider = new Soldiers[soldierType](cache, count >= 100 ? 100 : count);
                count -= 100;
                // 加入数组
                rt.push(solider);
            }
            return rt;
        } else {
            console.error('没有该类士兵，请检查传入的士兵类型是否合法！');
            return [];
        }
    }

    _initGameOverMessage() {
        let style = new TextStyle({
            fontFamily: "Arial",
            fontSize: 36,
            fill: "white",
            stroke: '#ff3300',
            strokeThickness: 4,
            dropShadow: true,
            dropShadowColor: "#000000",
            dropShadowBlur: 4,
            dropShadowAngle: Math.PI / 6,
            dropShadowDistance: 6,
        });
        this.message = new Text('', style);
        const center = this.battleGround.getCenter();
        this.message.anchor.set(0.5, 0.5);
        this.message.position.set(center.x, center.y);
        //this.message.pivot.set(this.message.width/2, this.message.height/2);
        this.gameOverScene.addChild(this.message);
    }

    onProgress = (loader, resource) => {

        console.log("loading: " + resource.url);

        //Display the percentage of files currently loaded
        console.log("progress: " + loader.progress + "%");
        //If you gave your files names as the first argument
        //of the `add` method, you can access them like this
        //console.log("loading: " + resource.name);
    }

    definedLoad = (resources, progressHanlder, callback) => {
        if (!callback) {
            callback = progressHanlder
            progressHanlder = noop;
        }

        loader.add(resources)
            .on('progress', progressHanlder)
            .load(callback)
    }

    getGameScene() {
        return this.gameScene;
    }

    getGameOverScene() {
        return this.gameOverScene;
    }
}


class Scene {
    constructor() {
        this.scene = new Container();
    }
}

export default GameScene