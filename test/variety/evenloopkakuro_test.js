var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

var PROBLEM_FILE =
	"pzprv3/evenloopkakuro/5/5/" +
	"0 -1 -1 -1 -1 -1 /-1 -1,-1 -1,14 -1,13 -1,16 -1,-1 /" +
	"-1 12,-1 . . . -1,-1 /-1 13,-1 . . . -1,-1 /-1 18,-1 . . . -1,-1 /" +
	"-1 -1,-1 -1,-1 -1,-1 -1,-1 -1,-1 /" +
	". . . . . /. . . . . /. . . . . /. . . . . /. . . . . /" +
	"0 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /0 0 0 0 /" +
	"0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /0 0 0 0 0 /";

var NUMS = [
	[2, 4, 6],
	[8, 3, 2],
	[4, 6, 8]
];

// 中央3x3の偶数8マスを一周するループの辺(グリッド座標)
var LOOP_EDGES = [
	[4, 3],
	[6, 3],
	[7, 4],
	[7, 6],
	[6, 7],
	[4, 7],
	[3, 6],
	[3, 4]
];

function fillAnswer(puzzle) {
	var board = puzzle.board;
	for (var y = 0; y < 3; y++) {
		for (var x = 0; x < 3; x++) {
			board.getc(2 * (x + 1) + 1, 2 * (y + 1) + 1).setAnum(NUMS[y][x]);
		}
	}
}

function drawLoop(puzzle) {
	var board = puzzle.board;
	LOOP_EDGES.forEach(function(e) {
		board.getb(e[0], e[1]).setLine();
	});
}

describe("Variety:evenloopkakuro", function() {
	it("restores loop lines in a pzprv3 URL roundtrip", function() {
		var puzzle = new pzpr.Puzzle().open(PROBLEM_FILE);
		fillAnswer(puzzle);
		drawLoop(puzzle);

		var url = puzzle.getFileData();
		var restored = new pzpr.Puzzle().open(url);
		LOOP_EDGES.forEach(function(e) {
			assert.equal(restored.board.getb(e[0], e[1]).isLine(), true);
		});
		assert.equal(restored.board.getc(3, 3).anum, 2);
	});

	it("keeps loop lines out of the clue part of the URL", function() {
		var puzzle = new pzpr.Puzzle().open(PROBLEM_FILE);
		fillAnswer(puzzle);
		drawLoop(puzzle);

		var problem = new pzpr.Puzzle().open(puzzle.getURL());
		assert.equal(problem.board.getc(1, 3).is51cell(), true);
		assert.equal(problem.board.getc(1, 3).qnum, 12);
		assert.equal(problem.board.getc(3, 1).qnum2, 14);
		assert.equal(problem.board.getb(4, 3).isLine(), false);
	});

	it("rejects correct numbers without a loop (brNoLine)", function() {
		var puzzle = new pzpr.Puzzle().open(PROBLEM_FILE);
		fillAnswer(puzzle);

		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "brNoLine");
	});

	it("rejects a branching loop (lnBranch)", function() {
		var puzzle = new pzpr.Puzzle().open(PROBLEM_FILE);
		fillAnswer(puzzle);
		drawLoop(puzzle);
		puzzle.board.getb(4, 5).setLine();

		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "lnBranch");
	});

	it("rejects a loop with a gap at an even cell (ceEvenLoopNe)", function() {
		var puzzle = new pzpr.Puzzle().open(PROBLEM_FILE);
		fillAnswer(puzzle);
		drawLoop(puzzle);
		puzzle.board.getb(4, 3).removeLine();

		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "ceEvenLoopNe");
	});

	it("rejects lines through odd cells (ceEvenLoopNe)", function() {
		var puzzle = new pzpr.Puzzle().open(PROBLEM_FILE);
		fillAnswer(puzzle);
		drawLoop(puzzle);
		// 中央の奇数マス(3)に線を通す: (2,2)-(2,3) の辺を追加
		puzzle.board.getb(5, 6).setLine();

		// この配置は枝(lnBranch)も奇数マスの線違反(ceEvenLoopNe)も含むため、
		// 全エラー収集モード(multierr)で両方検出されることを確認する
		puzzle.setConfig("multierr", true);
		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info[0], "lnBranch");
		assert.equal(info.lastcode, "ceEvenLoopNe");
	});

	it("accepts a correct answer with the even loop", function() {
		var puzzle = new pzpr.Puzzle().open(PROBLEM_FILE);
		fillAnswer(puzzle);
		drawLoop(puzzle);

		var info = puzzle.check(true);
		assert.equal(info.complete, true);
		assert.equal(info.lastcode, null);
	});
});
