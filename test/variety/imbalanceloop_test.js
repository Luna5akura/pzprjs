var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

describe("Variety:imbalanceloop", function() {
	function playPuzzle(url) {
		var puzzle = new pzpr.Puzzle().open(url || "imbalanceloop/4/4");
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("line");
		return puzzle;
	}

	// (x, y) と隣のマス (x+1, y) の間の線 (ヨコ辺) を引く
	function drawHBorder(bd, x, y) {
		bd.getb(2 * x + 2, 2 * y + 1).setLine();
	}
	// (x, y) と隣のマス (x, y+1) の間の線 (タテ辺) を引く
	function drawVBorder(bd, x, y) {
		bd.getb(2 * x + 1, 2 * y + 2).setLine();
	}

	function hasFailcode(result, code) {
		for (var i = 0; i < result.length; i++) {
			if (result[i] === code) {
				return true;
			}
		}
		return false;
	}

	// 4x4 の全マスを通る一周ループを描く:
	// (0,0)-(0,1)-(0,2)-(0,3)-(1,3)-(2,3)-(3,3)-(3,2)-(3,1)-(3,0)-(2,0)-(2,1)-(2,2)-(1,2)-(1,1)-(1,0)-(0,0)
	function drawFullLoop(bd) {
		drawHBorder(bd, 0, 0);
		drawHBorder(bd, 2, 0);
		drawHBorder(bd, 1, 2);
		drawHBorder(bd, 0, 3);
		drawHBorder(bd, 1, 3);
		drawHBorder(bd, 2, 3);
		drawVBorder(bd, 0, 0);
		drawVBorder(bd, 0, 1);
		drawVBorder(bd, 0, 2);
		drawVBorder(bd, 1, 0);
		drawVBorder(bd, 1, 1);
		drawVBorder(bd, 2, 0);
		drawVBorder(bd, 2, 1);
		drawVBorder(bd, 3, 0);
		drawVBorder(bd, 3, 1);
		drawVBorder(bd, 3, 2);
	}

	it("round-trips clues and black cells through the URL", function() {
		var puzzle = new pzpr.Puzzle().open("imbalanceloop/5/5/g+c42a01k");
		var bd = puzzle.board;
		assert.equal(bd.getc(3, 5).qnum, 2); // (1,2): 数字2
		assert.equal(bd.getc(3, 5).qdir, bd.getc(3, 5).RT); // 矢印: 右
		assert.equal(bd.getc(5, 3).qans, 1); // (2,1): 黒マス
		assert.equal(bd.getc(7, 5).qnum, 1); // (3,2): 数字1
		assert.equal(bd.getc(7, 5).qdir, 0); // 矢印なし

		var url = puzzle.getURL(pzpr.parser.URL_PZPRV3);
		assert.equal(url, "http://pzv.jp/p.html?imbalanceloop/5/5/g+c42a01k");
	});

	it("accepts a correct loop and rejects a wrong difference", function() {
		// 一周ループの上で (3,1) はタテに直進し、
		// 上方向の長さ1、下方向の長さ2 → 差は1
		var puzzle = playPuzzle("imbalanceloop/4/4");
		var bd = puzzle.board;
		var clue = bd.getc(7, 3); // (3,1)
		clue.setQnum(1);

		drawFullLoop(bd);
		assert.equal(puzzle.check().complete, true);

		// 数字を2にすると差 (1) と一致しなくなる
		clue.setQnum(2);
		var result = puzzle.check();
		assert.equal(result.complete, false);
		assert.ok(hasFailcode(result, "ilWrongDiff"));
	});

	it("checks the arrow axis", function() {
		var puzzle = playPuzzle("imbalanceloop/4/4");
		var bd = puzzle.board;
		var clue = bd.getc(7, 3); // (3,1)
		clue.setQnum(1);
		clue.setQdir(clue.RT); // 矢印: 右

		// 一周ループは (3,1) をタテに直進するので矢印 (右) と平行にならない
		drawFullLoop(bd);

		var result = puzzle.check();
		assert.equal(result.complete, false);
		assert.ok(hasFailcode(result, "ilNotStraight"));
	});

	it("flags lines through black cells", function() {
		var puzzle = playPuzzle("imbalanceloop/4/4");
		var bd = puzzle.board;
		bd.getc(3, 3).qans = 1; // (1,1) を黒マスに
		drawFullLoop(bd); // ループは (1,1) も通ってしまう

		var result = puzzle.check();
		assert.equal(result.complete, false);
		assert.ok(hasFailcode(result, "ilLineOnBlack"));
	});

	it("cycles the number by click and sets the arrow by drag", function() {
		var puzzle = new pzpr.Puzzle().open("imbalanceloop/5/5");
		puzzle.setMode("edit");
		var bd = puzzle.board;
		var mouse = puzzle.mouse;

		var cell = bd.getc(5, 5); // (2,2)
		var pc = puzzle.painter;
		var px = (cell.bx * pc.bw + pc.x0) / pc.bw,
			py = (cell.by * pc.bh + pc.y0) / pc.bh;
		mouse.inputPoint.init(px, py);
		mouse.mousestart = true;
		mouse.inputqnum();
		assert.equal(cell.qnum, 1);
		mouse.mousestart = false;
		mouse.mouseCell = null;
		mouse.inputqnum();
		assert.equal(cell.qnum, 2);

		// ドラッグで右矢印を付ける (prevPos = ドラッグ開始マス)
		mouse.prevPos = new mouse.klass.Address(cell.bx, cell.by);
		mouse.inputPoint.init(px + 2, py);
		mouse.inputdirec();
		assert.equal(cell.qdir, cell.RT);
		// 下方向へドラッグすると矢印が変わる
		mouse.prevPos = new mouse.klass.Address(cell.bx, cell.by);
		mouse.inputPoint.init(px, py + 2);
		mouse.inputdirec();
		assert.equal(cell.qdir, cell.DN);
		// 同じ方向へもう一度ドラッグすると消える
		mouse.prevPos = new mouse.klass.Address(cell.bx, cell.by);
		mouse.inputPoint.init(px, py + 2);
		mouse.inputdirec();
		assert.equal(cell.qdir, 0);
	});

	it("decreases numbers with right-click and toggles black cells", function() {
		var puzzle = new pzpr.Puzzle().open("imbalanceloop/5/5");
		puzzle.setMode("edit");
		var bd = puzzle.board;
		var mouse = puzzle.mouse;
		var pc = puzzle.painter;
		var cell = bd.getc(5, 5); // (2,2)

		function clickAt(c, btn) {
			mouse.inputPoint.init(
				(c.bx * pc.bw + pc.x0) / pc.bw,
				(c.by * pc.bh + pc.y0) / pc.bh
			);
			mouse.btn = btn;
			mouse.mouseend = true;
			mouse.mousestart = false;
			mouse.mousemove = false;
			mouse.mouseCell = null;
			mouse.inputData = null;
			mouse.inputqnumDec();
			mouse.mouseend = false;
		}

		// 右クリック: 数字のないマスに黒マスを置く
		clickAt(cell, "right");
		assert.equal(cell.qans, 1);
		assert.equal(cell.qnum, -1);

		// 右クリック: 黒マスを消す
		clickAt(cell, "right");
		assert.equal(cell.qans, 0);

		// 左クリックで 1 → 2 と増やす
		mouse.inputPoint.init((cell.bx * pc.bw + pc.x0) / pc.bw, (cell.by * pc.bh + pc.y0) / pc.bh);
		mouse.mouseCell = null;
		mouse.inputqnum();
		mouse.mouseCell = null;
		mouse.inputqnum();
		assert.equal(cell.qnum, 2);

		// 右クリックで 2 → 1 → なし と減らす
		clickAt(cell, "right");
		assert.equal(cell.qnum, 1);
		clickAt(cell, "right");
		assert.equal(cell.qnum, -1);
		assert.equal(cell.qdir, 0);

		// 右クリック: なし → ? (逆巡回)
		clickAt(cell, "right");
		assert.equal(cell.qans, 1, "empty cell gets black cell first");
	});
});
