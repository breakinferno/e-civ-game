// 画布相关
// 画布默认宽高
const GAME_DEFAULT_WIDTH = 800;
const GAME_DEFAULT_HEIGHT = 600;

// 士兵的常量
// 士兵的贴图
const SOLDIER_TEXTURES = '/static/images/testCharacter.json';
const HEALTH_WIDTH = 30;
const HEALTH_HEIGHT = 3;
// 士兵每秒移动距离
const SECEND_STEP_LENGTH = 1; //相对于800*600画布来说

// 飞行物的常量
const FLY_STEP_LENGTH = 2.5;

export default {
    SOLDIER: {
        SOLDIER_TEXTURES,
        HEALTH_HEIGHT,
        HEALTH_WIDTH,
        SECEND_STEP_LENGTH
    },
    SHOTITEM: {
        FLY_STEP_LENGTH
    },
    MAL: {

    },
    FRAMESLOADER: {

    },
    GAME: {
        GAME_DEFAULT_WIDTH,
        GAME_DEFAULT_HEIGHT
    }
}