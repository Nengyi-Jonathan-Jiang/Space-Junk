//#region get page elements (audio, images, divs, buttons, etc.)

var btn_LOAD_GAME = document.getElementById("load-game");

var div_CONTENT = document.getElementById("content");
var div_CANVAS_CONTAINER = document.getElementById("canvas-container");

var form_CONTROLS = document.getElementById('controls');

var inp_MUSIC_GAIN = document.getElementById('music-gain');
var inp_SFX_GAIN = document.getElementById('sfx-gain');

var addhpSound = document.getElementById("chime-sound");
var mcrashSound = document.getElementById("metal-sound");
var crashSound = document.getElementById("rock-sound");
var clangSound = document.getElementById("clank-sound");
var gameOverSound = document.getElementById("end-sound");
var soundtrack_game = document.getElementById("soundtrack-game");
var soundtrack_win = document.getElementById("soundtrack-win");
var soundtrack_menu = document.getElementById("soundtrack-menu");

var wrenchIMG  = document.getElementById("wrench-img");
var playerIMG  = document.getElementById("player-1-img");
var playerIMGT = document.getElementById("player-2-img");
var meteorIMG  = document.getElementById("rock-img");
var dedSpaceshipIMG = document.getElementById("ship-img");
var hpIMG = document.getElementById("red-heart-img");
var xtraHpIMG = document.getElementById("gold-heart-img");

//#endregion

let started = false;

function clearSelection(){
	if(document.selection&&document.selection.empty)
		document.selection.empty();
	else if(window.getSelection)
		window.getSelection().removeAllRanges();
}

window.addEventListener("mousedown", clearSelection);
window.addEventListener("mouseup",   clearSelection);

btn_LOAD_GAME.onclick = _=> {
	if(started) return;
	started = true;
	btn_LOAD_GAME.style.setProperty("display","none");

	let content = div_CONTENT

	inp_MUSIC_GAIN.oninput=(f=>(f(),f))(_=>{
		[
			[soundtrack_menu, 0.125],
			[soundtrack_game, 0.125],
			[soundtrack_win,  0.125]
		].forEach(function([k,v]){
			k.volume = v * Number(inp_MUSIC_GAIN.value);
		});
	})
	inp_SFX_GAIN.oninput=(f=>(f(),f))(_=>{
		[
			[addhpSound,    0.125],
			[mcrashSound,   1],
			[crashSound,    0.125],
			[clangSound,    0.05],
			[gameOverSound, 0.1]
		].forEach(function([k,v]){
			k.volume = v * Number(inp_SFX_GAIN.value);
		});
	})

	
	function hitsound(lvl = 1) {
		switch (lvl) {
			case 5:
				mcrashSound.currentTime = 0.1;
				mcrashSound.play();
				break;
			case 3:
				crashSound.currentTime = 0;
				crashSound.play();
				break;
			case 1:
				clangSound.currentTime = 0;
				clangSound.play();
				break;
		}
	}
	function addhpsound() {
		addhpSound.currentTime = 0;
		addhpSound.play();
	}
	function gameoversound() {
		gameOverSound.play();
	}
	var canvas = new Canvas(0,0,div_CANVAS_CONTAINER);

	var display = canvas.canvas;

	console.log(content.clientHeight,content.clientWidth)

	console.log(canvas);
	
	let ctx = display.getContext("2d");

	form_CONTROLS.style.display = "initial";

	var WIDTH = display.width, HEIGHT = display.height;
	var tickSpeed = 50 / 3;
	const
		RED = "#FF0000",
		TEAL = "#16B385",
		BLUE = "#0000FF",
		PURPLE = "#8003FF",
		MAGENTA = "#A020E6",
		BLACK = "#000000",
		WHITE = "#FFFFFF",
		T_RED = "rgba(255,0,0,0.5)",
		T_GREEN = "rgba(0,255,0,0.5)",
		T_DARK_GREY = "rgba(128,128,128,0.5)"
		;

	function fillAll(color) {
		ctx.fillStyle = color;
		ctx.fillRect(-WIDTH/2, -1.6667/2, WIDTH, 1.6667);
	}
	function image(img, x, y, factor = 1) {
		ctx.drawImage(img,
			x - img.width / 2 * factor,
			- y - img.height / 2 * factor,
			factor * img.width,
			factor * img.height
		);
	}

	function write(color, x, y, text, size) {
		ctx.beginPath();
		ctx.fillStyle = color;
		ctx.font = size + "px courier";
		ctx.textAlign = "center";
		ctx.textBaseline = 'middle';
		ctx.fillText(text, x, -y);
		ctx.closePath();
	}

	function intersects(a, b, c, d, p, q, r, s) {
		var det, gamma, lambda;
		det = (c - a) * (s - q) - (r - p) * (d - b);
		if (det === 0) { return false; }
		else {
			lambda = ((s - q) * (r - a) + (p - r) * (s - b)) / det;
			gamma = ((b - d) * (r - a) + (c - a) * (s - b)) / det;
			return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
		}
	};
	function polygonIntersects(poly1, poly2) {
		for (var i = 0; i < poly1.length; i++) {
			for (var j = 0; j < poly2.length; j++) {
				var paa = poly1[i];
				var pab = poly1[(i + 1) % poly1.length];
				var pba = poly2[j];
				var pbb = poly2[(j + 1) % poly2.length];
				if (intersects(paa[0], paa[1], pab[0], pab[1], pba[0], pba[1], pbb[0], pbb[1])) return true;
			}
		}
		return false;
	}
	var isfullscreen = false;

	let paused;

	window.onblur = _ => {
		paused = true;
		soundtrack_game.pause();
	}

	content.addEventListener("dblclick", _=>{
		display.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
	});
	var junk;
	var shipcoords;
	var playerMovement;
	var lives;
	var mouseclick = false;
	var keys = {};
	var t;
	var wave;
	var playing = false;

	const numWaves = 81;

	function get_img(s) {
		if (s.lvl <= 3) return wrenchIMG;
		else if (s.lvl == 4) return xtraHpIMG;
		else if (s.lvl <= 10) return meteorIMG;
		else return dedSpaceshipIMG;
	}
	function get_hitbox(s, center) {
		if (s.lvl <= 3) {
			return [[center[0] + 1 / 50 - 1 / 240, center[1] + 1 / 50 + 1 / 240],
			[center[0] + 1 / 50 + 1 / 240, center[1] + 1 / 50 - 1 / 240],
			[center[0] - 1 / 50 + 1 / 240, center[1] - 1 / 50 - 1 / 240],
			[center[0] - 1 / 50 - 1 / 240, center[1] - 1 / 50 + 1 / 240]]
		}
		else if (s.lvl == 4) {
			return [[center[0] + 1 / 60, center[1] + 1 / 60],
			[center[0] + 1 / 60, center[1] - 1 / 60],
			[center[0] - 1 / 60, center[1] - 1 / 60],
			[center[0] - 1 / 60, center[1] + 1 / 60]]
		}
		else if (s.lvl <= 10) {
			return [[center[0] + 1 / 27, center[1] + 1 / 120],
			[center[0] + 1 / 28, center[1] + 1 / 40],
			[center[0] + 0 / 30, center[1] + 1 / 30],
			[center[0] - 1 / 27, center[1] + 1 / 120],
			[center[0] - 1 / 30, center[1] - 1 / 30],
			[center[0] + 1 / 60, center[1] - 1 / 30]]
		}
		else {
			return [[center[0] + 1 / 16, center[1] - 1 / 32],
			[center[0] - 1 / 16, center[1] - 1 / 16],
			[center[0] - 1 / 32, center[1] + 1 / 16]];
		}
	}
	window.addEventListener("click", function (e) { mouseclick = [e.offsetX - 1 / 2, -(isfullscreen ? e.screenY : e.offsetY) + (isfullscreen ? screen.height : 1.6667) / 2] });
	window.addEventListener("contextmenu", function (e) { e.preventDefault(); });
	window.addEventListener("keydown", function (e) { e.preventDefault();keys[e.key] = true;});
	window.addEventListener("keyup", function (e) { keys[e.key] = false; });
    display.addEventListener("touchmove", function (e) {
		const touch = e.touches[0];
	    shipcoords.x = touch.clientX/window.innerWidth
	});
	function draw(){
		let turbo = false;
		if (keys['ArrowDown']) {turbo = true;}
		fillAll(BLACK);
		var playerHitBox = [[shipcoords.x - 1 / 2 - 1 / 14, -1.6667 / 64],
		[shipcoords.x - 1 / 2, 1.6667 / 18],
		[shipcoords.x - 1 / 2 + 1 / 14, -1.6667 / 64]];
		let shouldGoToAnswer = false;
		ctx.strokeStyle = "#FF00FF";
		junk.filter(function (s) { return s.y - shipcoords.y >= -1 && s.y - shipcoords.y <= 2 }).forEach(function (s) {
			let center = [(((s["x"] + (t * (s.v) / 100) + 1000000) % 1)) - 1 / 2, s["y"] * 1.6667 - shipcoords.y * 1.6667];
			image(get_img(s), center[0], center[1], 0.002);
			if (polygonIntersects(get_hitbox(s, center), playerHitBox)) {
				s.y = -10;
				if (s.lvl == 4) {
					addhpsound();
					lives += 5 + ~~(shipcoords.y / 8);
				} else {
					const penalty = s.lvl < 5 ? 1 : s.lvl < 11 ? 3 : 5
					hitsound(penalty);
					lives -= penalty;
				}
			}
		});
		junk = junk.filter(s => s.y > 0);
		image(turbo ? playerIMGT : playerIMG, shipcoords.x - 1 / 2, 0, 0.002);
		let hpFactor = lives < 60 ? 1 : lives < 240 ? 2 : 3;
		for (var i = 0; i < lives; i++) {
			image(hpIMG, 1 / 2 - (25 * ((i % (20 * hpFactor) + 0.5))) * 0.002 / hpFactor, 1.6667 / 2 - (12 + 24 * (~~(i / 20 / hpFactor))) * 0.002 / hpFactor, 0.002 / hpFactor);
		}
		write(WHITE, 0, -0.8, "Wave: " + ~~(shipcoords.y / 2), 0.05);
	}

	function mainGameTick() {
		let turbo = false;
		if (keys['ArrowLeft' ]){
			shipcoords.x -= 0.01;
			if (shipcoords.x <= 0)
				shipcoords.x = 1;
		}
		if (keys['ArrowRight']){
			shipcoords.x += 0.01;
			if (shipcoords.x >= 1)
				shipcoords.x = 0;
		}
		if (keys['ArrowDown' ])
			shipcoords.y += 0.005;
		shipcoords.y += 0.005;
		t++;
		draw();
		if(paused){
			requestAnimationFrame(gamePauseTick);
		}
		else if (shipcoords.y > numWaves * 2) {
			requestAnimationFrame(gameWinTick); playing = false;
			soundtrack_game.pause();
			soundtrack_game.currentTime = 0;
			soundtrack_win.currentTime = 7;
			soundtrack_win.play();
		}
		else if (lives <= 0) {
			gameoversound(); playing = false;
			requestAnimationFrame(function () { gameOverTick(~~(shipcoords.y / 2)); });
			soundtrack_game.pause();
			soundtrack_game.currentTime = 0;
		}
		else { requestAnimationFrame(mainGameTick); }
		mouseclick = false;
	}
	function gamePauseTick(){
		draw();
		fillAll("#8884");
		write(WHITE, 0, 0, "GAME PAUSED",0.08)
		if (mouseclick){
			paused = false;
			soundtrack_game.play();
			requestAnimationFrame(mainGameTick);
		}
		else
			requestAnimationFrame(gamePauseTick);
		mouseclick = false;
	}
	function gameOverTick(score) {
		fillAll(BLACK);
		write(BLUE, 1.5 / 200, 0, "GAME OVER", 1 / 6);
		write(PURPLE, 0.5 / 200, 0, "GAME OVER", 1 / 6);
		write(MAGENTA, -0.5 / 200, 0, "GAME OVER", 1 / 6);
		write(RED, -1.5 / 200, 0, "GAME OVER", 1 / 6);

		write(WHITE, 0, -0.10, "WAVES PASSED:" + score, 0.05);
		write(WHITE, 0, -0.15, "CLICK TO PLAY AGAIN", 0.03);


		if (mouseclick != false) requestAnimationFrame(onStartTick);
		else setTimeout(function () { gameOverTick(score); }, tickSpeed);
		mouseclick = false;
	}
	function gameWinTick() {
		fillAll(BLACK);
		image(playerIMG, 0, 0, 1.6667 / 850);
		write(BLUE, 1.5 / 200, 1 / 6, "YOU WIN", 0.15);
		write(PURPLE, 0.5 / 200, 1 / 6, "YOU WIN", 0.15);
		write(MAGENTA, -0.5 / 200, 1 / 6, "YOU WIN", 0.15);
		write(RED, -1.5 / 200, 1 / 6, "YOU WIN", 0.15);

		if (mouseclick){
			soundtrack_win.pause();
			requestAnimationFrame(onStartTick);
		}
		else 
			requestAnimationFrame(gameWinTick);
		mouseclick = false;
	}
	function resetGame() {
		soundtrack_menu.pause();
		lives = 32;
		shipcoords = { x: 0.5, y: 1 };
		junk = [];
		for (var i = 0; i <= numWaves; i++) {
			for (var j = 0; j < (Math.min(i, 8 + ~~(i / 4))); j++) {
				junk.push({
					x: Math.random(),
					y: Math.random() + i * 2,
					v: Math.min(Math.random() / 2, i / 5) - Math.min(0.5, i / 5) / 2,
					lvl: ~~Math.min(15, Math.random() * i),
				});
			}
		}
		t = 0;
		requestAnimationFrame(mainGameTick);
		mouseclick = false;
		playing = true;
		//paused = false;
		soundtrack_game.currentTime = 0;
		soundtrack_game.play();

	}
	function onStartTick() {
		fillAll(BLACK);

		write(BLUE, 0.011, 0.496, "╔═════╗ ╔══════╗╔═════╗ ╔═════╗ ╔═╗ ╔═════╗", 0.03);
		write(BLUE, 0.011, 0.471, "║ ╔══╗╚╗║ ╔════╝║ ╔══╗╚╗║ ╔══╗╚╗║ ║╔╝╔════╝", 0.03);
		write(BLUE, 0.011, 0.446, "║ ║  ║ ║║ ╚══╗  ║ ╚══╝╔╝║ ╚══╝╔╝║ ║╚╗╚═══╗ ", 0.03);
		write(BLUE, 0.011, 0.421, "║ ║  ║ ║║ ╔══╝  ║ ╔══╗╚╗║ ╔══╗╚╗║ ║ ╚═══╗╚╗", 0.03);
		write(BLUE, 0.011, 0.396, "║ ╚══╝╔╝║ ╚════╗║ ╚══╝╔╝║ ║  ║ ║║ ║╔════╝╔╝", 0.03);
		write(BLUE, 0.011, 0.371, "╚═════╝ ╚══════╝╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝ ", 0.03);
		write(RED , 0.009, 0.496, "╔═════╗ ╔══════╗╔═════╗ ╔═════╗ ╔═╗ ╔═════╗", 0.03);
		write(RED , 0.009, 0.471, "║ ╔══╗╚╗║ ╔════╝║ ╔══╗╚╗║ ╔══╗╚╗║ ║╔╝╔════╝", 0.03);
		write(RED , 0.009, 0.446, "║ ║  ║ ║║ ╚══╗  ║ ╚══╝╔╝║ ╚══╝╔╝║ ║╚╗╚═══╗ ", 0.03);
		write(RED , 0.009, 0.421, "║ ║  ║ ║║ ╔══╝  ║ ╔══╗╚╗║ ╔══╗╚╗║ ║ ╚═══╗╚╗", 0.03);
		write(RED , 0.009, 0.396, "║ ╚══╝╔╝║ ╚════╗║ ╚══╝╔╝║ ║  ║ ║║ ║╔════╝╔╝", 0.03);
		write(RED , 0.009, 0.371, "╚═════╝ ╚══════╝╚═════╝ ╚═╝  ╚═╝╚═╝╚═════╝ ", 0.03);

		write(BLUE   , 0.003, 0.15, "CLICK TO START", 0.08);
		write(PURPLE , 0.001, 0.15, "CLICK TO START", 0.08);
		write(MAGENTA,-0.001, 0.15, "CLICK TO START", 0.08);
		write(RED    ,-0.003, 0.15, "CLICK TO START", 0.08);

		write(BLUE   , 0.003,-0.15, "ARROW KEYS TO MOVE ←→", 0.07);
		write(PURPLE , 0.001,-0.15, "ARROW KEYS TO MOVE ←→", 0.07);
		write(MAGENTA,-0.001,-0.15, "ARROW KEYS TO MOVE ←→", 0.07);
		write(RED    ,-0.003,-0.15, "ARROW KEYS TO MOVE ←→", 0.07);

		write(WHITE, 0, -0.5, "MADE BY JONATHAN JIANG", 0.05);
		write(WHITE, 0, -0.55, "MUSIC AND SFX FROM SOUNDIMAGE.ORG", 0.04);

		image(playerIMG, 0, 0, 0.002);

		if (mouseclick == false)
			requestAnimationFrame(onStartTick);
		else
			requestAnimationFrame(resetGame);
		mouseclick = false;
	}

	content.onresize = _ => {
		if (content.clientHeight * 0.6 <= content.clientWidth) {
			display.width  = content.clientHeight * 0.6;
			display.height = content.clientHeight;
		}
		else {
			display.width = content.clientWidth;
			display.height = content.clientWidth / 0.6;
		}
		WIDTH = display.width, HEIGHT = display.height;
		ctx.transform(WIDTH, 0, 0, WIDTH, WIDTH / 2, HEIGHT / 2);
	};

	content.onresize();
	soundtrack_menu.play();
	onStartTick();
	display.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"});
}