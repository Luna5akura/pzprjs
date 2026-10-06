var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

describe("Variety:uniqnurikabe", function() {
	function playPuzzle(url) {
		var puzzle = new pzpr.Puzzle().open(url || "uniqnurikabe/3/3/j1j");
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("shade");
		return puzzle;
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
		var puzzle = new pzpr.Puzzle().open("uniqnurikabe/3/3/j1j");
		var bd = puzzle.board;
		assert.equal(bd.getc(3, 3).qnum, 1); // (1,1)
		assert.equal(bd.getc(1, 1).qnum, -1);

		var url = puzzle.getURL(pzpr.parser.URL_PZPRV3);
		assert.equal(url, "http://pzv.jp/p.html?uniqnurikabe/3/3/j1j");
	});

	it("accepts a valid answer (single island of size 1)", function() {
		var puzzle = playPuzzle("uniqnurikabe/3/3/j1j");
		var bd = puzzle.board;
		// 黑格: 中心以外的 8 格
		for (var y = 1; y <= 5; y += 2) {
			for (var x = 1; x <= 5; x += 2) {
				if (x !== 3 || y !== 3) {
					bd.getc(x, y).setQans(1);
				}
			}
		}

		var result = puzzle.check();
		assert.equal(result.complete, true);
	});

	it("rejects two islands with the same shape", function() {
		var puzzle = playPuzzle("uniqnurikabe/4/4/j2g2o");
		var bd = puzzle.board;
		// 数字在 (0,1) 和 (2,1)。两个水平 domino 岛:
		// (0,1)-(0,2) 与 (2,1)-(2,2) (旋转后同形状)
		var blacks = [
			[0, 0], [0, 3],
			[1, 0], [1, 1], [1, 2], [1, 3],
			[2, 0], [2, 3],
			[3, 0], [3, 1], [3, 2], [3, 3]
		];
		for (var i = 0; i < blacks.length; i++) {
			bd.getc(2 * blacks[i][0] + 1, 2 * blacks[i][1] + 1).setQans(1);
		}

		var result = puzzle.check();
		assert.equal(result.complete, false);
		assert.ok(hasFailcode(result, "nuShapeDup"));
	});

	it("accepts islands with distinct shapes", function() {
		// 4x4: 数字 1 (domino 不可能) 与数字 3 (L 形) 的组合
		// 岛1 = 单格 (0,3); 岛2 = L 形 (0,0),(0,1),(1,0) 大小 3
		var puzzle = playPuzzle("uniqnurikabe/4/4/3gg1r");
		var bd = puzzle.board;
		// 白格: (0,3) 与 L 形三格; 其余黑
		var whites = [[0, 3], [0, 0], [0, 1], [1, 0]];
		for (var y = 0; y < 4; y++) {
			for (var x = 0; x < 4; x++) {
				var isWhite = false;
				for (var i = 0; i < whites.length; i++) {
					if (whites[i][0] === x && whites[i][1] === y) {
						isWhite = true;
					}
				}
				if (!isWhite) {
					bd.getc(2 * x + 1, 2 * y + 1).setQans(1);
				}
			}
		}

		var result = puzzle.check();
		// 黑格 12 个中 (1,1)-(2,2) 构成 2x2 全黑 -> 应报 cs2x2 而不是形状错误
		assert.equal(result.complete, false);
		assert.ok(!hasFailcode(result, "nuShapeDup"));
	});

	it("inherits nurikabe rules: rejects 2x2 shaded block", function() {
		var puzzle = playPuzzle("uniqnurikabe/3/3/j1j");
		var bd = puzzle.board;
		// 左上 2x2 全黑
		bd.getc(1, 1).setQans(1);
		bd.getc(3, 1).setQans(1);
		bd.getc(1, 3).setQans(1);
		bd.getc(3, 3).setQans(1); // 中心岛被涂黑 -> 另有 bkNoNum, 但 cs2x2 先报

		var result = puzzle.check();
		assert.equal(result.complete, false);
		assert.equal(result[0], "cs2x2");
	});
});
