import GameScene from '../src'
import * as PIXI from 'pixi.js'
var enemy = [{
    soldierType: 'Archer',
    count: 420
}, {
    soldierType: 'ThiefHead',
    count: 350
}];
var my = [{
    soldierType: 'Archer',
    count: 620
}, {
    soldierType: 'ThiefHead',
    count: 130
}];

document.addEventListener("DOMContentLoaded", function(event) {
    var target = document.getElementById('Test');
    var gs = new GameScene();
    gs.mountAt(target);
    gs.setBattleGround(800, 600, {
        row: 5,
        col: 20
    });
    // 设置背景色
    gs.setBg(0x4f7dc4);
    // 创建结束场景
    gs.makeScene('gameOver', (scene) => {
        let style = new PIXI.TextStyle({
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
        const message = new PIXI.Text('', style);
        const center = gs.battleGround.getCenter();
        message.anchor.set(0.5, 0.5);
        message.position.set(center.x, center.y);
        scene.addChild(message);
    });

    // gs.step()

    // 结束后
    gs.over('gameOver', ()=>{
        console.log('gameOver 啦');
    })

    gs.load(()=>{
        gs.setSoldiers({
            soldiers: enemy, 
            user: 'enemy'
        }, 
        {
            soldiers: my, 
            user: 'my'
        });
        gs.start('my');
    })
    // gs.initResource(my, enemy)
    // gs.gameStart();
});