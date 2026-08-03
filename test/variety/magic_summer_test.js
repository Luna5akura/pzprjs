var assert = require("assert");

var pzpr = require("../../");

var puzzle = new pzpr.Puzzle();

function setupMagicSummer() {
	puzzle.open("magic-summer/3/3/2");

	var clues = [12, 3, 12, 21, 3, 21, 12, 3, 12, 21, 3, 21];
	for (var i = 0; i < clues.length; i++) {
		puzzle.board.excell[i].setQnum(clues[i]);
	}

	var nums = [
		[1, 2, 0],
		[2, 0, 1],
		[0, 1, 2]
	];
	for (var y = 0; y < nums.length; y++) {
		for (var x = 0; x < nums[y].length; x++) {
			var cell = puzzle.board.getc(x * 2 + 1, y * 2 + 1);
			if (nums[y][x] > 0) {
				cell.setAnum(nums[y][x]);
			} else {
				cell.setQsub(2);
			}
		}
	}
	puzzle.board.rebuildInfo();
}

describe("Variety:magic-summer", function() {
	it("accepts a completed magic summer", function() {
		setupMagicSummer();
		assert.equal(puzzle.check(true).complete, true);
	});

	it("rejects an incorrect directional sum", function() {
		setupMagicSummer();
		puzzle.board.excell[0].setQnum(21);
		assert.equal(puzzle.check(true)[0], "nmSumNe");
	});

	it("rejects a row or column missing a number", function() {
		setupMagicSummer();
		var cell = puzzle.board.getc(1, 1);
		cell.setAnum(-1);
		cell.setQsub(2);
		puzzle.board.rebuildInfo();
		assert.equal(puzzle.check(true)[0], "nmMissRow");
	});

	it("supports fixed blank clues in edit mode", function() {
		puzzle.open("magic-summer/3/3/2");
		puzzle.setMode("edit");
		puzzle.mouse.setInputMode("mark-cross");
		var cell = puzzle.board.getc(1, 1);

		puzzle.mouse.inputPath("left", 1, 1);
		assert.equal(cell.qnum, -2);
		assert.equal(puzzle.painter.getQuesNumberText(cell), "");
	});

	it("round-trips multi-digit outside clues", function() {
		setupMagicSummer();
		var url = puzzle.getURL(pzpr.parser.URL_PZPRV3);
		var reopened = new pzpr.Puzzle();
		reopened.open(url);
		assert.equal(reopened.board.excell[0].qnum, 12);
		assert.equal(reopened.board.excell[3].qnum, 21);
	});

	it("allows changing the digit range from the editor", function() {
		var editable = new pzpr.Puzzle().open("magic-summer/5/5/3");
		editable.setMode("edit");
		editable.cursor.initCursor();
		editable.key.inputKeys("up");
		assert.equal(editable.cursor.by, -3);

		editable.key.inputKeys("5");
		assert.equal(editable.board.indicator.count, 5);
		assert.ok(editable.getURL(pzpr.parser.URL_PZPRV3).indexOf("/5/") >= 0);
	});
});
