var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

describe("Variety:hashitree", function() {
	function playPuzzle(url) {
		var puzzle = new pzpr.Puzzle().open(url || "hashitree/5/1/1g2g1");
		puzzle.setMode("play");
		return puzzle;
	}

	// (x,y) と (x+1,y) の間の橋 (ヨコ border) を n 本かける
	function drawHBridge(bd, x, y, n) {
		bd.getb(2 * x + 2, 2 * y + 1).setLineVal(n || 1);
	}

	function hasFailcode(result, code) {
		for (var i = 0; i < result.length; i++) {
			if (result[i] === code) {
				return true;
			}
		}
		return false;
	}

	it("round-trips clues through the URL", function() {
		var puzzle = new pzpr.Puzzle().open("hashitree/5/1/1g2g1");
		var bd = puzzle.board;
		assert.equal(bd.cols, 5);
		assert.equal(bd.rows, 1);
		assert.equal(bd.getc(1, 1).qnum, 1);
		assert.equal(bd.getc(5, 1).qnum, 2);
		assert.equal(bd.getc(9, 1).qnum, 1);
		assert.equal(bd.getc(3, 1).qnum, -1);

		var url = puzzle.getURL(pzpr.parser.URL_PZPRV3);
		assert.equal(url, "http://pzv.jp/p.html?hashitree/5/1/1g2g1");
	});

	it("accepts a tree of bridges (chain 1-2-1)", function() {
		var puzzle = playPuzzle("hashitree/5/1/1g2g1");
		var bd = puzzle.board;
		drawHBridge(bd, 0, 0, 1);
		drawHBridge(bd, 1, 0, 1);
		drawHBridge(bd, 2, 0, 1);
		drawHBridge(bd, 3, 0, 1);

		var result = puzzle.check();
		assert.equal(result.complete, true);
	});

	it("rejects a loop of bridges", function() {
		// 3x3 四角 2: 外周ぐるりの橋はループ
		var puzzle = playPuzzle("hashitree/3/3/2g2gh2g2");
		var bd = puzzle.board;
		drawHBridge(bd, 0, 0, 1);
		drawHBridge(bd, 1, 0, 1);
		drawHBridge(bd, 0, 2, 1);
		drawHBridge(bd, 1, 2, 1);
		bd.getb(1, 2).setLineVal(1); // 左列 縦橋 (0,0)-(1,0)
		bd.getb(1, 4).setLineVal(1); // 左列 縦橋 (1,0)-(2,0)
		bd.getb(5, 2).setLineVal(1); // 右列 縦橋 (0,2)-(1,2)
		bd.getb(5, 4).setLineVal(1); // 右列 縦橋 (1,2)-(2,2)

		var result = puzzle.check();
		assert.equal(result.complete, false);
		assert.ok(hasFailcode(result, "htLoop"));
	});

	it("inherits hashi rules: bridge count must match the clue", function() {
		var puzzle = playPuzzle("hashitree/5/1/1g2g1");
		var bd = puzzle.board;
		// 数字2の島 (中央) に橋を1本しかかけない (左2島は接続済み)
		drawHBridge(bd, 0, 0, 1);
		drawHBridge(bd, 1, 0, 1);

		var result = puzzle.check();
		assert.equal(result.complete, false);
		assert.ok(hasFailcode(result, "nmLineLt"));
	});

	it("inherits hashi rules: all islands connected", function() {
		// 1x7: 2つの双橋グループ (島2ずつ) が分断されている
		var puzzle = playPuzzle("hashitree/7/1/2g2g2g2");
		var bd = puzzle.board;
		drawHBridge(bd, 0, 0, 2);
		drawHBridge(bd, 1, 0, 2);
		drawHBridge(bd, 4, 0, 2);
		drawHBridge(bd, 5, 0, 2);

		var result = puzzle.check();
		assert.equal(result.complete, false);
		assert.ok(hasFailcode(result, "lcDivided"));
	});
});
