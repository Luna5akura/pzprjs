var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

describe("Variety:windkabe", function() {
	function playPuzzle(url) {
		var puzzle = new pzpr.Puzzle().open(url || "windkabe/3/3");
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("arrow");
		return puzzle;
	}

	// (x, y) のセルに矢印 (dir) を置く
	function setArrow(bd, x, y, dir) {
		bd.getc(2 * x + 1, 2 * y + 1).setQdir(dir);
	}

	function hasFailcode(result, code) {
		for (var i = 0; i < result.length; i++) {
			if (result[i] === code) {
				return true;
			}
		}
		return false;
	}

	it("round-trips clues and arrows through the URL", function() {
		var puzzle = new pzpr.Puzzle().open("windkabe/3/3/a01g");
		var bd = puzzle.board;
		assert.equal(bd.getc(3, 1).qnum, 1); // (1,0): 数字1

		// 答案矢印: (1,1) に下向き矢印 (唯一解)
		var cell = bd.getc(3, 3);
		cell.setQdir(cell.DN);
		var url = puzzle.getURL(pzpr.parser.URL_PZPRV3);
		assert.equal(url, "http://pzv.jp/p.html?windkabe/3/3/a01b-2fffd");

		// URL から開き直しても矢印が残っている
		var puzzle2 = new pzpr.Puzzle().open("windkabe/3/3/a01b-2fffd");
		var cell2 = puzzle2.board.getc(3, 3);
		assert.equal(cell2.qdir, cell2.DN);
		assert.equal(cell2.qnum, -1);
	});

	it("accepts the unique solution", function() {
		var puzzle = playPuzzle("windkabe/3/3/a01g");
		var bd = puzzle.board;
		var cell = bd.getc(3, 3);
		setArrow(bd, 1, 1, cell.DN);

		var result = puzzle.check();
		assert.equal(result.complete, true);
	});

	it("rejects a wrong arrow total", function() {
		var puzzle = playPuzzle("windkabe/3/3/a01g");
		// 数字(1,0)=1 なのに下方向の矢印を置かない → nmArrowNe
		var result = puzzle.check();
		assert.equal(result.complete, false);
		assert.ok(hasFailcode(result, "nmArrowNe"));
	});

	it("rejects an arrow that does not start next to a clue", function() {
		var puzzle = playPuzzle("windkabe/3/3/a01g");
		var bd = puzzle.board;
		var cell = bd.getc(3, 3);
		// 正しい矢印に加えて、孤立した矢印を置く
		setArrow(bd, 1, 1, cell.DN);
		setArrow(bd, 0, 2, bd.getc(1, 5).LT);

		var result = puzzle.check();
		assert.equal(result.complete, false);
		assert.ok(hasFailcode(result, "arStartNe"));
	});

	it("rejects a disconnected wall", function() {
		// 中心 (1,1)=2 の盤面で、矢印を右と下に1マスずつ: 右下 (2,2) の黒マスが孤立する
		var puzzle2 = new pzpr.Puzzle().open("windkabe/3/3/d02d");
		var bd2 = puzzle2.board;
		var center = bd2.getc(3, 3);
		// 中心 (1,1)=2 の矢印を右と下に1マスずつ: 右下 (2,2) の黒マスが孤立する
		setArrow(bd2, 2, 1, center.RT); // (2,1) 右
		setArrow(bd2, 1, 2, center.DN); // (1,2) 下

		var result = puzzle2.check();
		assert.equal(result.complete, false);
		assert.ok(hasFailcode(result, "wkWallDivide"));
	});

	it("rejects a 2x2 black block", function() {
		var puzzle = new pzpr.Puzzle().open("windkabe/3/3/01h");
		var bd = puzzle.board;
		var cell = bd.getc(3, 1);
		// 数字(0,0)=1 から右に矢印: 右下 2x2 が全黒になる
		setArrow(bd, 1, 0, cell.RT);

		var result = puzzle.check();
		assert.equal(result.complete, false);
		assert.ok(hasFailcode(result, "wkWall2x2"));
	});
});
