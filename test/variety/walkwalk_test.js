var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

describe("Variety:walkwalk", function() {
	it("preserves multiple clues in the same room after room rebuild", function() {
		var puzzle = new pzpr.Puzzle();
		puzzle.open("walkwalk/3/3");

		var c11 = puzzle.board.getc(1, 1);
		var c13 = puzzle.board.getc(1, 3);
		c11.setQnum(2);
		c13.setQnum(2);

		puzzle.board.roommgr.rebuild();

		assert.equal(c11.qnum, 2);
		assert.equal(c13.qnum, 2);
	});

	it("roundtrips a URL with multiple clues in one room", function() {
		var puzzle = new pzpr.Puzzle();
		var file =
			"pzprv3/walkwalk/4/4/3/0 0 1 1 /0 0 1 1 /2 2 2 1 /2 2 2 1 /. 4 . . /4 . . . /. . . . /. . . . /1 0 0 /1 0 0 /0 0 0 /0 0 0 /1 1 0 0 /0 0 0 0 /0 0 0 0 /";

		puzzle.open(file);
		assert.equal(puzzle.check(true)[0], null);

		var url = puzzle.getURL();
		var reopened = new pzpr.Puzzle();
		reopened.open(url);

		assert.equal(reopened.board.getc(3, 1).qnum, 4);
		assert.equal(reopened.board.getc(1, 3).qnum, 4);
	});

	it("checks the solved sample with multiple clues in one room", function() {
		var puzzle = new pzpr.Puzzle();
		puzzle.open(
			"pzprv3/walkwalk/4/4/3/0 0 1 1 /0 0 1 1 /2 2 2 1 /2 2 2 1 /. 4 . . /4 . . . /. . . . /. . . . /1 0 0 /1 0 0 /0 0 0 /0 0 0 /1 1 0 0 /0 0 0 0 /0 0 0 0 /"
		);
		assert.equal(puzzle.check(true)[0], null);
	});
});
