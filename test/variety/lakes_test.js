var assert = require("assert");

var pzpr = require("../../");

var puzzle = new pzpr.Puzzle();

function setupLakes() {
	puzzle.open("lakes/3/3");

	puzzle.board.getc(1, 1).setQnum(2);
	puzzle.board.getc(5, 1).setQnum(2);

	puzzle.board.getc(1, 3).setQsub(1);
	puzzle.board.getc(5, 3).setQsub(1);

	puzzle.board.getc(3, 1).setShade();
	puzzle.board.getc(3, 3).setShade();
	puzzle.board.getc(1, 5).setShade();
	puzzle.board.getc(3, 5).setShade();
	puzzle.board.getc(5, 5).setShade();

	puzzle.board.rebuildInfo();
}

describe("Variety:lakes", function() {
	it("accepts completed lakes regions", function() {
		setupLakes();
		assert.equal(puzzle.check(true).complete, true);
	});

	it("rejects an unshaded region without a clue", function() {
		setupLakes();
		puzzle.board.getc(5, 1).setQnum(-1);
		puzzle.board.rebuildInfo();
		assert.equal(puzzle.check(true)[0], "bkNoNum");
	});

	it("rejects an unshaded region with multiple clues", function() {
		setupLakes();
		puzzle.board.getc(1, 3).setQnum(1);
		puzzle.board.rebuildInfo();
		assert.equal(puzzle.check(true)[0], "bkNumGe2");
	});

	it("rejects an unshaded region with the wrong size", function() {
		setupLakes();
		puzzle.board.getc(1, 1).setQnum(3);
		puzzle.board.rebuildInfo();
		assert.equal(puzzle.check(true)[0], "bkSizeNe");
	});
});
