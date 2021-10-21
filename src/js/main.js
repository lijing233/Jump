const myRole = location.search ? 'p2' : 'p1';
console.log('myRole :>> ', myRole);
var game = new Game(myRole);
if (myRole === 'p1') {
	game.init()
}
game.addSuccessFn(success)
game.addFailedFn(failed)

var mask = document.querySelector('.mask')
var restartButton = document.querySelector('.restart')
var score = document.querySelector('.score')
var winnerText = document.querySelector('.winner-text')

restartButton.addEventListener('click', restart)

// 游戏重新开始，执行函数
function restart () {
	mask.style.display = 'none'
	game.restart()
}
// 游戏失败执行函数
function failed(){
	score.innerText = game.score
	winnerText.innerText = `获胜者是：${game.winUser}`
	mask.style.display = 'flex'
}
// 游戏成功，更新分数
function success (score) {
	var scoreCurrent = document.querySelector('.score-current')
	scoreCurrent.innerText = score;
	// 记录最高分
	var record = document.querySelector('.record');
	var item = 'JUMP_KING_RECORD_SCORE';
	var itemScore = parseInt(localStorage.getItem(item) || 0);
	if( itemScore < score){
		localStorage.setItem(item, score);
		record.innerText = score;
	}else{
		record.innerText = itemScore;
	}
}

// 背景音乐/音效
function audioBgm() {
	var bgm = new Audio('./src/bgm.mp3');
	bgm.volume = .05
	bgm.play();
	return bgm;
}
var bgm = audioBgm();

var ActMusic = new Audio('./src/jump.mp3');
ActMusic.volume = .05;
ActMusic.loop = false;

var FallMusic = new Audio('./src/fall.mp3');
FallMusic.volume = .05;
FallMusic.loop = false;

// 禁止移动端长按弹出菜单
document.addEventListener('contextmenu', function (e) {
	e.preventDefault();
})


window.receiveNotifiy = (data) => {
	if (data.type === 'init') {
		game.init(data.data)
	} else if (data.type === 'jump') {
		game._handleReceiveMouseDown(data.data)
	} else if (data.type === 'land') {
		game.handleOtherLand(data.data)
	}
}