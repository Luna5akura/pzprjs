var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

var URL6x5 = "akari-regional/6/5/2h1h2g.g0h.n.m4i288hh002";

// 正解の灯り (cspuz のテストと同じ配置)
var LIGHTS = [
	[5, 1],
	[3, 3],
	[7, 3],
	[1, 5],
	[5, 5],
	[3, 7],
	[11, 9]
];

function fillAnswer(puzzle) {
	LIGHTS.forEach(function(e) {
		puzzle.board.getc(e[0], e[1]).setQans(1);
	});
}

describe("Variety:akari-regional", function() {
	it("restores borders, blocks and region numbers from the URL", function() {
		var puzzle = new pzpr.Puzzle().open(URL6x5);
		var bd = puzzle.board;

		assert.equal(bd.getc(1, 1).qnum, 2);
		assert.equal(bd.getc(7, 1).qnum, 1);
		assert.equal(bd.getc(1, 3).qnum, 2);
		assert.equal(bd.getc(9, 3).qnum, 0);
		assert.equal(bd.getc(5, 3).qnum, -2);
		assert.equal(bd.getc(3, 5).qnum, -2);
		assert.equal(bd.getc(9, 7).qnum, -2);
		assert.equal(bd.getb(2, 1).ques, 0); // (0,0)-(0,1) は境界なし
		assert.equal(bd.getb(1, 2).ques, 1); // (0,0)-(1,0) は境界あり
	});

	it("accepts a correct answer", function() {
		var puzzle = new pzpr.Puzzle().open(URL6x5);
		fillAnswer(puzzle);

		var info = puzzle.check(true);
		assert.equal(info.complete, true);
		assert.equal(info.lastcode, null);
	});

	it("rejects a wrong number of lights in a region", function() {
		var puzzle = new pzpr.Puzzle().open("akari-regional/3/3");
		var bd = puzzle.board;
		bd.getc(1, 1).setQnum(1);
		bd.getc(3, 3).setQnum(-2);
		[
			[3, 1],
			[1, 3],
			[5, 3],
			[3, 5]
		].forEach(function(e) {
			bd.getc(e[0], e[1]).setQans(1);
		});

		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "nmRegionAkariNe");
	});

	it("roundtrips lights, blocks and borders in a pzprv3 URL", function() {
		var puzzle = new pzpr.Puzzle().open(URL6x5);
		fillAnswer(puzzle);

		var restored = new pzpr.Puzzle().open(puzzle.getFileData());
		assert.equal(restored.board.getc(5, 1).qans, 1);
		assert.equal(restored.board.getc(5, 3).qnum, -2);
		assert.equal(restored.board.getc(1, 1).qnum, 2);
		assert.equal(restored.board.getb(1, 2).ques, 1);
	});

	it("keeps answers out of the compressed problem URL", function() {
		var puzzle = new pzpr.Puzzle().open(URL6x5);
		fillAnswer(puzzle);

		var problem = new pzpr.Puzzle().open(puzzle.getURL());
		assert.equal(problem.board.getc(5, 1).qans, 0);
		assert.equal(problem.board.getc(1, 1).qnum, 2);
		assert.equal(problem.board.getc(5, 3).qnum, -2);
	});

	it("draws region borders by dragging and cycles numbers by clicking", function() {
		var puzzle = new pzpr.Puzzle().open("akari-regional/3/3");
		puzzle.setMode("edit");
		puzzle.mouse.setInputMode("auto");

		// 境界線に沿ってドラッグすると (0,0)-(1,0) の境界が引かれる
		puzzle.mouse.inputPath(0, 2, 2, 2);
		assert.equal(puzzle.board.getb(1, 2).ques, 1);

		// クリックで数字を巡回入力: 黒マス(-2) → 0 → 1 → 2
		// (1回目のクリックはカーソル移動)
		puzzle.mouse.inputPath(3, 1, 3, 1);
		assert.equal(puzzle.board.getc(3, 1).qnum, -1);
		puzzle.mouse.inputPath(3, 1, 3, 1);
		assert.equal(puzzle.board.getc(3, 1).qnum, -2);
		puzzle.mouse.inputPath(3, 1, 3, 1);
		assert.equal(puzzle.board.getc(3, 1).qnum, 0);
		puzzle.mouse.inputPath(3, 1, 3, 1);
		assert.equal(puzzle.board.getc(3, 1).qnum, 1);
		puzzle.mouse.inputPath(3, 1, 3, 1);
		assert.equal(puzzle.board.getc(3, 1).qnum, 2);

		// クリックでカーソルが置かれるためキーボード入力もできる
		puzzle.key.inputKeys("7");
		assert.equal(puzzle.board.getc(3, 1).qnum, 7);
		puzzle.key.inputKeys("-");
		assert.equal(puzzle.board.getc(3, 1).qnum, -2);
	});

	it("places lights in play mode", function() {
		var puzzle = new pzpr.Puzzle().open(URL6x5);
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("auto");

		puzzle.mouse.inputPath(5, 1, 5, 1);
		assert.equal(puzzle.board.getc(5, 1).qans, 1);
	});
});
