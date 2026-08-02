var assert = require("assert");

var pzpr = require("../../");

var puzzle = new pzpr.Puzzle();

describe("Variety:slovak-sums", function() {
	it("decodes the PuzzLink format", function() {
		puzzle.open("slovak-sums/5/5/3/1n-28i-26g0m-1cg");

		assert.equal(puzzle.pid, "slovak-sums");
		assert.equal(puzzle.board.indicator.count, 3);
		assert.equal(puzzle.board.getc(1, 1).qnum, -2);
		assert.equal(puzzle.board.getc(1, 1).qnum2, 1);
		assert.equal(puzzle.board.getc(9, 3).qnum, 7);
		assert.equal(puzzle.board.getc(9, 3).qnum2, 0);
		assert.equal(puzzle.board.getc(7, 5).qnum, 6);
		assert.equal(puzzle.board.getc(7, 5).qnum2, 3);
		assert.equal(puzzle.board.getc(7, 9).qnum, 4);
		assert.equal(puzzle.board.getc(7, 9).qnum2, 3);
	});

	it("round-trips the PuzzLink format", function() {
		puzzle.open("slovak-sums/5/5/3/1n-28i-26g0m-1cg");

		assert.equal(
			puzzle.getURL(pzpr.parser.URL_PZPRV3).split("?")[1],
			"slovak-sums/5/5/3/1n-28i-26g0m-1cg"
		);
	});

	it("allows changing the number range in edit mode", function() {
		puzzle.open("slovak-sums/5/5");
		puzzle.setMode("edit");
		puzzle.cursor.init(1, 1);
		puzzle.key.inputKeys("up", "4");

		assert.equal(puzzle.board.indicator.count, 4);
		assert.equal(puzzle.cursor.by, -1);
	});

	it("allows changing the number range with the mouse", function() {
		puzzle.open("slovak-sums/5/5");
		puzzle.setMode("edit");
		puzzle.cursor.init(1, 1);
		puzzle.mouse.inputPath(1, -1);
		puzzle.mouse.inputPath(1, -1);

		assert.equal(puzzle.board.indicator.count, 4);
	});

	it("checks the sample solution", function() {
		puzzle.open(
			"pzprv3/slovak-sums/5/5/3/-2,1 . . . . /. . . . 7,0 /. . . 6,3 . /- . . . . /. . . 4,3 . /. . 1 3 2 /1 3 . 2 . /2 1 . . 3 /. 2 3 1 . /3 . 2 . 1 /"
		);
		assert.equal(puzzle.check(true).complete, true);
	});
});
