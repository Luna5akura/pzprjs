var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

var URL5x5 = "torch/5/5/m1o0m";

describe("Variety:torch", function() {
	it("restores given black cells and numbers from the URL", function() {
		var puzzle = new pzpr.Puzzle().open(URL5x5);
		var bd = puzzle.board;

		assert.equal(bd.getc(5, 3).qnum, 1); // (1,2)
		assert.equal(bd.getc(5, 7).qnum, 0); // (3,2)
		assert.equal(bd.getc(5, 3).isShade(), true);
		assert.equal(bd.getc(5, 7).isShade(), true);
		assert.equal(bd.getc(1, 1).isShade(), false);
	});

	it("accepts a correct answer", function() {
		var puzzle = new pzpr.Puzzle().open(URL5x5);
		[
			[3, 3],
			[7, 3],
			[5, 5]
		].forEach(function(e) {
			puzzle.board.getc(e[0], e[1]).setQans(1);
		});

		var info = puzzle.check(true);
		assert.equal(info.complete, true);
		assert.equal(info.lastcode, null);
	});

	it("rejects a loop of shaded cells (csLoop)", function() {
		var puzzle = new pzpr.Puzzle().open("torch/3/3");
		[
			[1, 1],
			[3, 1],
			[5, 1],
			[1, 3],
			[5, 3],
			[1, 5],
			[3, 5],
			[5, 5]
		].forEach(function(e) {
			puzzle.board.getc(e[0], e[1]).setQans(1);
		});

		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "csLoop");
	});

	it("rejects a 2x2 block of shaded cells (cs2x2)", function() {
		var puzzle = new pzpr.Puzzle().open("torch/3/3");
		[
			[1, 1],
			[3, 1],
			[1, 3],
			[3, 3]
		].forEach(function(e) {
			puzzle.board.getc(e[0], e[1]).setQans(1);
		});

		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "cs2x2");
	});

	it("rejects divided shaded cells (csDivide)", function() {
		var puzzle = new pzpr.Puzzle().open("torch/3/3");
		[
			[1, 1],
			[5, 5]
		].forEach(function(e) {
			puzzle.board.getc(e[0], e[1]).setQans(1);
		});

		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "csDivide");
	});

	it("rejects a wrong endpoint distance (nmTorchNe)", function() {
		var puzzle = new pzpr.Puzzle().open(URL5x5);
		puzzle.board.getc(5, 3).setQnum(3);
		[
			[3, 3],
			[7, 3],
			[5, 5]
		].forEach(function(e) {
			puzzle.board.getc(e[0], e[1]).setQans(1);
		});

		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "nmTorchNe");
	});

	it("roundtrips givens, numbers and shading in a pzprv3 URL", function() {
		var puzzle = new pzpr.Puzzle().open(URL5x5);
		[
			[3, 3],
			[7, 3],
			[5, 5]
		].forEach(function(e) {
			puzzle.board.getc(e[0], e[1]).setQans(1);
		});

		var restored = new pzpr.Puzzle().open(puzzle.getFileData());
		assert.equal(restored.board.getc(5, 3).qnum, 1);
		assert.equal(restored.board.getc(5, 7).qnum, 0);
		assert.equal(restored.board.getc(3, 3).qans, 1);
		assert.equal(restored.board.getc(5, 5).qans, 1);
	});

	it("keeps answers out of the compressed problem URL", function() {
		var puzzle = new pzpr.Puzzle().open(URL5x5);
		[
			[3, 3],
			[7, 3],
			[5, 5]
		].forEach(function(e) {
			puzzle.board.getc(e[0], e[1]).setQans(1);
		});

		var problem = new pzpr.Puzzle().open(puzzle.getURL());
		assert.equal(problem.board.getc(3, 3).qans, 0);
		assert.equal(problem.board.getc(5, 3).qnum, 1);
	});

	it("toggles given black cells and inputs numbers in edit mode", function() {
		var puzzle = new pzpr.Puzzle().open("torch/5/5");
		puzzle.setMode("edit");
		puzzle.mouse.setInputMode("auto");

		puzzle.mouse.inputPath(5, 3, 5, 3);
		assert.equal(puzzle.board.getc(5, 3).qnum, -2);
		puzzle.mouse.inputPath(5, 3, 5, 3);
		assert.equal(puzzle.board.getc(5, 3).qnum, -1);

		puzzle.mouse.setInputMode("number");
		puzzle.mouse.inputPath(5, 3, 5, 3);
		puzzle.key.inputKeys("2");
		assert.equal(puzzle.board.getc(5, 3).qnum, 2);
	});

	it("shades with the left button and unshades with the right in play mode", function() {
		var puzzle = new pzpr.Puzzle().open("torch/5/5");
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("auto");

		puzzle.mouse.inputPath(1, 1, 1, 1);
		assert.equal(puzzle.board.getc(1, 1).qans, 1);
		puzzle.mouse.inputPath("right", 1, 1, 1, 1);
		assert.equal(puzzle.board.getc(1, 1).qans, 0);
	});
});

describe("Variety:torch (aux marks)", function() {
	it("marks cells as definitely white with the right button in play mode", function() {
		var puzzle = new pzpr.Puzzle().open("torch/5/5");
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("auto");

		puzzle.mouse.inputPath("right", 1, 1, 1, 1);
		assert.equal(puzzle.board.getc(1, 1).qsub, 1);
		assert.equal(
			puzzle.painter.getBGCellColor(puzzle.board.getc(1, 1)),
			"rgb(160, 255, 160)"
		);

		// もう一度右クリックで消去
		puzzle.mouse.inputPath("right", 1, 1, 1, 1);
		assert.equal(puzzle.board.getc(1, 1).qsub, 0);
	});

	it("does not mark given black cells", function() {
		var puzzle = new pzpr.Puzzle().open("torch/5/5/h0i010i0r");
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("auto");

		puzzle.mouse.inputPath("right", 5, 3, 5, 3);
		assert.equal(puzzle.board.getc(5, 3).qsub, 0);
		assert.equal(puzzle.board.getc(5, 3).qnum, 1);
	});

	it("ignores green marks in the answer check", function() {
		var puzzle = new pzpr.Puzzle().open("torch/5/5/h0i010i0r");
		[
			[1, 1],
			[1, 3],
			[1, 9],
			[3, 1],
			[3, 9],
			[9, 9]
		].forEach(function(e) {
			puzzle.board.getc(e[0], e[1]).setQsub(1);
		});

		var info = puzzle.check(true);
		assert.equal(info.complete, true);
	});
});
