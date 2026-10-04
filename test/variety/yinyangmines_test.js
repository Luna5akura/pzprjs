var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

describe("Variety:yinyangmines", function() {
	function playPuzzle(url) {
		var puzzle = new pzpr.Puzzle().open(url);
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("auto");
		return puzzle;
	}

	it("inputs white circles with the left button and black with the right", function() {
		var puzzle = playPuzzle("yinyangmines/5/5");
		var bd = puzzle.board;

		puzzle.mouse.inputPath(1, 1, 1, 1);
		assert.equal(bd.getc(1, 1).getNum(), 1);
		puzzle.mouse.inputPath("right", 3, 1, 3, 1);
		assert.equal(bd.getc(3, 1).getNum(), 2);
	});

	it("toggles a circle off by clicking it with the same button", function() {
		var puzzle = playPuzzle("yinyangmines/5/5");
		var bd = puzzle.board;

		puzzle.mouse.inputPath(1, 1, 1, 1);
		assert.equal(bd.getc(1, 1).getNum(), 1);
		puzzle.mouse.inputPath(1, 1, 1, 1);
		assert.equal(bd.getc(1, 1).getNum(), -1);
	});

	it("paints circles while dragging", function() {
		var puzzle = playPuzzle("yinyangmines/5/5");
		var bd = puzzle.board;

		puzzle.mouse.inputPath("right", 1, 1, 5, 1);
		assert.equal(bd.getc(1, 1).getNum(), 2);
		assert.equal(bd.getc(3, 1).getNum(), 2);
		assert.equal(bd.getc(5, 1).getNum(), 2);
	});

	it("does not change numbered white circles", function() {
		var puzzle = playPuzzle("yinyangmines/5/5");
		var bd = puzzle.board;
		bd.getc(1, 1).setQnum(1);
		bd.getc(1, 1).setAnum(3);

		puzzle.mouse.inputPath(1, 1, 1, 1);
		assert.equal(bd.getc(1, 1).qnum, 1);
		assert.equal(bd.getc(1, 1).anum, 3);
	});

	it("does not change given circles", function() {
		var puzzle = playPuzzle("yinyangmines/5/5");
		var bd = puzzle.board;
		bd.getc(1, 1).setQnum(2);

		puzzle.mouse.inputPath(1, 1, 1, 1);
		assert.equal(bd.getc(1, 1).qnum, 2);
		assert.equal(bd.getc(1, 1).anum, -1);
	});

	it("accepts a correct answer", function() {
		var puzzle = new pzpr.Puzzle().open(
			"pzprv3/yinyangmines/5/5/2 . . . . /. 1 . 1 . /. 1 1 1 . /. 1 . 1 . /. . . . . /2 2 2 2 2 /2 6 2 6 2 /2 5 2 5 2 /2 6 2 6 2 /2 2 2 2 2 /"
		);
		var info = puzzle.check(true);
		assert.equal(info.complete, true);
	});
});
