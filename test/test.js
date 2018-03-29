import GameScene from '../src'

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
    gs.initResource(my, enemy)
    gs.gameStart();
});