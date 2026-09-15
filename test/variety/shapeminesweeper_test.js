var assert = require("assert");
var pzpr = require("../../");

describe("Variety:shapeminesweeper", function() {
	it("accepts aliases and uses an editable tetromino bank", function() {
		["shapeminesweeper", "shape-minesweeper", "shape-minesweep"].forEach(
			function(pid) {
				var puzzle = new pzpr.Puzzle().open(pid);
				assert.equal(puzzle.pid, "shapeminesweeper");
				assert.equal(puzzle.board.bank.pieces.length, 5);
				assert.equal(puzzle.board.bank.allowAdd, true);
			}
		);
	});

	it("allows 0-8 clues and forbids shading clue cells", function() {
		var puzzle = new pzpr.Puzzle().open("shapeminesweeper/4/4");
		var cell = puzzle.board.getc(1, 1);
		cell.setQnum(8);
		assert.equal(cell.qnum, 8);
		assert.equal(cell.allowShade(), false);
		cell.setQnum(0);
		assert.equal(cell.qnum, 0);
		assert.equal(cell.allowShade(), false);
	});

	it("loads the selected bank preset on a new-board URL", function() {
		var puzzle = new pzpr.Puzzle().open("shapeminesweeper/4/4///t");
		assert.equal(puzzle.board.bank.pieces.length, 5);
		assert.deepEqual(
			puzzle.board.bank.pieces.map(function(piece) { return piece.serialize(); }),
			["14u", "23bg", "22u", "23f", "23eg"]
		);
	});
});
