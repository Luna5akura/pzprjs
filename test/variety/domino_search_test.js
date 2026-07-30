var assert = require("assert");

var pzpr = require("../../");

var puzzle = new pzpr.Puzzle();

function setupDominoSearch() {
	puzzle.open("domino-search/4/3");
	var nums = [
		[0, 0, 0, 1],
		[1, 1, 0, 2],
		[1, 2, 2, 2]
	];
	for (var y = 0; y < nums.length; y++) {
		for (var x = 0; x < nums[y].length; x++) {
			puzzle.board.getc(x * 2 + 1, y * 2 + 1).setQnum(nums[y][x]);
		}
	}

	for (var bx = 1; bx <= 7; bx += 2) {
		puzzle.board.getb(bx, 2).setQans(1);
		puzzle.board.getb(bx, 4).setQans(1);
	}
	for (var by = 1; by <= 5; by += 2) {
		puzzle.board.getb(4, by).setQans(1);
	}
	puzzle.board.rebuildInfo();
}

describe("Variety:domino-search", function() {
	it("accepts a complete set of domino pairs", function() {
		setupDominoSearch();
		assert.equal(puzzle.check(true).complete, true);
	});

	it("rejects an area larger than a domino", function() {
		setupDominoSearch();
		puzzle.board.getb(4, 1).setQans(0);
		puzzle.board.rebuildInfo();
		assert.equal(puzzle.check(true)[0], "bkSizeGt2");
	});

	it("rejects duplicate domino pairs", function() {
		setupDominoSearch();
		puzzle.board.getc(7, 5).setQnum(1);
		assert.equal(puzzle.check(true)[0], "bkPairGt");
	});

	it("rejects missing domino pairs", function() {
		setupDominoSearch();
		puzzle.board.getc(7, 5).setQnum(3);
		assert.equal(puzzle.check(true)[0], "bkPairLt");
	});

	it("allows empty cells outside the domino set", function() {
		puzzle.open("domino-search/2/2");
		puzzle.board.getc(1, 1).setQnum(0);
		puzzle.board.getc(3, 1).setQnum(0);
		puzzle.board.rebuildInfo();

		assert.equal(puzzle.check(true).complete, true);
	});

	it("requires active cells to have known numbers", function() {
		setupDominoSearch();
		puzzle.board.getc(1, 1).setQnum(-2);
		puzzle.board.rebuildInfo();
		assert.equal(puzzle.check(true)[0], "ceNoNum");
	});
});
