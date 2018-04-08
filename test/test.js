import GameScene from '../src'
import * as PIXI from 'pixi.js'
// import fs from 'fs';
// var fs  = require('fs');
var path  = require('path');


const fileName = 'try.json';

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


const test1 = {
    enemy: enemy,
    my: my
}

const test2 = {
    enemy: [{
        soldierType: 'Archer',
        count: 40
    }],
    my: [{
        soldierType: 'ThiefHead',
        count: 60
    }]
}

var imgTempl = '<img src="../images/cat.png" />';
document.getElementById('test').innerHTML = imgTempl;


document.addEventListener("DOMContentLoaded", function(event) {
    var target = document.getElementById('Test');
    var other = document.getElementById('other');
    var gs = new GameScene();
    gs.setClientOrServer(GameScene.SERVER);
    // 客户端则需要传递帧数据
    // const data = JSON.parse(localStorage.getItem('rt')).data;
    // gs.setDriveFrames(data);
    
    gs.mountAt(target);
    gs.setBattleGround(800, 600, {
        row: 5,
        col: 20
    });
    // 设置背景色
    gs.setBg(0x4f7dc4);
    // 创建结束场景
    gs.makeScene('gameOver', (pre, scene) => {
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
        const txt = pre === 'my'?'恭喜你，我方赢了':'很遗憾,我方溃败!';
        const message = new PIXI.Text(txt, style);
        const center = gs.battleGround.getCenter();
        message.anchor.set(0.5, 0.5);
        message.position.set(center.x, center.y);
        scene.addChild(message);
    });

    // gs.step()

    
    // 指定结束场景,及其回调
    gs.overScene('gameOver', null, null, (result, scene, battleGround)=>{
        console.log('所有的操作都在这里啦！')
        // console.table(battleGround.actionFlows);
        console.log('gameOver 啦');
    })

    gs.load(()=>{

        // gs.setSoldiers({
        //     soldiers: test2.enemy,
        //     user: 'enemy'
        // },{
        //     soldiers: test2.my,
        //     user: 'my'
        // });

        gs.setSoldiers({
            soldiers: test1.enemy, 
            user: 'enemy'
        }, 
        {
            soldiers: test1.my, 
            user: 'my'
        });
        gs.start('my');
    })
    // gs.initResource(my, enemy)
    // gs.gameStart();
});