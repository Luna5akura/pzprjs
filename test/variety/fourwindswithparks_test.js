var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

describe("Variety:fourwindswithparks", function() {
	it("checks arrow starts, clue totals and one park per row/column", function() {
		var puzzle = new pzpr.Puzzle().open("fourwindswithparks/3/3");
		var board = puzzle.board;

		board.getc(1, 1).setQnum(0);
		board.getc(5, 3).setQnum(2);
		board.getc(3, 5).setQnum(1);
		board.getc(5, 1).setQdir(1);
		board.getc(3, 3).setQdir(3);
		board.getc(1, 5).setQdir(3);

		assert.equal(puzzle.check().complete, true);
	});

	it("does not encode answer arrows as puzzle clues", function() {
		var puzzle = new pzpr.Puzzle().open("fourwindswithparks/3/3");
		var board = puzzle.board;
		board.getc(1, 1).setQnum(0);
		board.getc(3, 1).setQdir(4);

		var reopened = new pzpr.Puzzle().open(puzzle.getURL());
		assert.equal(reopened.board.getc(1, 1).qnum, 0);
		assert.equal(reopened.board.getc(3, 1).qdir, 0);
	});

	it("enters arrows in play mode and rejects arrows on clue cells", function() {
		var puzzle = new pzpr.Puzzle().open("fourwindswithparks/2/2");
		var board = puzzle.board;
		board.getc(1, 1).setQnum(0);

		puzzle.setMode("play");
		puzzle.mouse.setInputMode("auto");
		puzzle.mouse.inputPath(3, 1, 3, 3);
		assert.equal(board.getc(3, 1).qdir, board.getc(3, 1).DN);

		// The input handler must never put an arrow over a numbered cell.
		puzzle.mouse.inputarrow_cell_main(board.getc(1, 1), board.getc(1, 1).RT);
		assert.equal(board.getc(1, 1).qdir, 0);
	});

	it("rejects arrows that do not begin next to a number", function() {
		var puzzle = new pzpr.Puzzle().open("fourwindswithparks/2/2");
		var board = puzzle.board;
		board.getc(1, 1).setQnum(1);
		board.getc(3, 1).setQdir(board.getc(3, 1).DN);
		assert.equal(puzzle.check().complete, false);
	});
});
