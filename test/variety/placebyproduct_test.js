var assert = require("assert");
var pzpr = require("../../");

describe("Variety:placebyproduct", function() {
	it("accepts the place-by-product alias and uses an editable bank", function() {
		["placebyproduct", "place-by-product"].forEach(function(pid) {
			var puzzle = new pzpr.Puzzle().open(pid);
			assert.equal(puzzle.pid, "placebyproduct");
			assert.equal(puzzle.board.bank.allowAdd, true);
		});
	});

	it("uses the tetromino preset as the default bank", function() {
		var puzzle = new pzpr.Puzzle().open("placebyproduct/4/4");
		assert.deepEqual(
			puzzle.board.bank.pieces.map(function(piece) {
				return piece.serialize();
			}),
			["14u", "23bg", "22u", "23f", "23eg"]
		);
	});

	it("loads a bank preset from the URL", function() {
		var puzzle = new pzpr.Puzzle().open("placebyproduct/4/4///t");
		assert.equal(puzzle.board.bank.pieces.length, 5);
	});

	it("allows product clues 0-255 on the row and column clue cells", function() {
		var puzzle = new pzpr.Puzzle().open("placebyproduct/4/4");
		var top = puzzle.board.getex(1, -1);
		var left = puzzle.board.getex(-1, 1);
		top.setQnum(36);
		assert.equal(top.qnum, 36);
		left.setQnum(0);
		assert.equal(left.qnum, 0);
	});

	it("renders given piece parts as filled cells that count as pieces", function() {
		var puzzle = new pzpr.Puzzle().open("placebyproduct/4/4");
		var cell = puzzle.board.getc(1, 1);
		cell.setQnum(2);
		assert.equal(cell.isShade(), true);
		assert.equal(cell.isUnshade(), false);
		assert.equal(cell.allowUnshade(), false);

		// A given cell counts toward the piece blocks: with a domino bank,
		// shading the cell below completes a valid piece.
		var puzzle2 = new pzpr.Puzzle().open("placebyproduct/2/2/021100/1/12o");
		var given = puzzle2.board.getc(1, 1);
		given.setQnum(2);
		puzzle2.board.getc(1, 3).setQans(1);
		assert.equal(puzzle2.check(true).complete, true);
	});

	it("checks the product of the white group sizes in rows and columns", function() {
		var puzzle = new pzpr.Puzzle().open("placebyproduct/2/2/021100/1/12o");
		// A single vertical domino in the first column satisfies the clues:
		// columns: 0 (completely filled), 2 (one white group of size 2);
		// rows: 1 (one white cell in each row).
		puzzle.board.getc(1, 1).setQans(1);
		puzzle.board.getc(1, 3).setQans(1);
		assert.equal(puzzle.check(true).complete, true);

		// Shading the remaining cells breaks the row clues (product 0, not 1)
		// and leaves extra pieces on the board.
		puzzle.board.getc(3, 1).setQans(1);
		puzzle.board.getc(3, 3).setQans(1);
		assert.equal(puzzle.check(true).complete, false);
	});

	it("rejects pieces that touch diagonally", function() {
		var puzzle = new pzpr.Puzzle().open("placebyproduct/2/2/j00/2/11g/11g");
		// Two monominoes placed diagonally from each other are invalid.
		puzzle.board.getc(1, 1).setQans(1);
		puzzle.board.getc(3, 3).setQans(1);
		assert.equal(puzzle.check(true).complete, false);
	});
});
