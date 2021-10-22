try {
	var baseUrl = window.client.getBaseUrl();
var isHost = window.client.isHost();
} catch (err) {
	var baseUrl = ''
	var isHost = 'p1'
}

const myRole = isHost ? 'p1' : 'p2';
console.log('myRole :>> ', myRole);
var game = new Game(myRole, baseUrl);
if (myRole === 'p1') {
	// game.init()
	document.querySelector('.start').style.display = 'block'
} else {
	document.querySelector('.p2starttext').style.display = 'block'
}
game.addSuccessFn(success)
game.addFailedFn(failed)

var mask = document.querySelector('.mask')
var mask2 = document.querySelector('.mask2')
var restartButton = document.querySelector('.restart')
var startButton = document.querySelector('.start')
var score = document.querySelector('.score')
// var winnerText = document.querySelector('.winner-text')
var winnerText2 = document.querySelector('.winner-text2')

restartButton.addEventListener('click', restart)
startButton.addEventListener('click', start)

// 房主开始游戏
function start () {
	mask2.style.display = 'none';
	game.notifyInfo({
		type: "begin",
		data: "",
	})
	game.init()
}

// 游戏重新开始，执行函数
function restart () {
	game.restart()
}
// 游戏失败执行函数
function failed(){
	score.innerText = game.score
	// winnerText.innerText = `获胜者是：${game.winUser}`
	winnerText2.innerText = game.myRole === game.activeUser ? 'You Lose!' : 'You Win!'

	document.querySelector('.restart').style.display = game.myRole === 'p1' ? 'block' : 'none';
	document.querySelector('.restartText').style.display = game.myRole === 'p2' ? 'block' : 'none';

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


window.onReceivedMessage = (data) => {
	console.log('接收到通知 :>> ', data);
	// alert('接收到通知 :>> '+JSON.stringify(data))
	console.log('data :>> ', JSON.parse(data));
	const resData = JSON.parse(data);
	if(resData.type === 'begin') {
		mask2.style.display = 'none';
	} else if (resData.type === 'init') {
		game.init(resData.data)
	} else if (resData.type === 'jump') {
		game._handleReceiveMouseDown(resData.data)
	} else if (resData.type === 'land') {
		game.handleOtherLand(resData.data)
	} else if (resData.type === 'restart') {
		game.restart(resData.data)
	}
}



// 
window.logoImg = new Image();
logoImg.src = "/src/img/1.png";
window.logoImg.onload = function() {
	console.log(logoImg);
} 