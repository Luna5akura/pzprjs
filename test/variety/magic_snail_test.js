var assert = require("assert");

var pzpr = require("../../");

var puzzle = new pzpr.Puzzle();

function setupMagicSnail(withSideClues) {
	puzzle.open("magic-snail/3/3");
	puzzle.board.indicator.set(2);

	if (withSideClues) {
		var clues = [1, 1, 2, 2, 2, 1, 1, 1, 2, 2, 2, 1];
		for (var i = 0; i < clues.length; i++) {
			puzzle.board.excell[i].setQnum(clues[i]);
		}
	}

	var nums = [
		[0, 1, 2],
		[1, 2, 0],
		[2, 0, 1]
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

describe("Variety:magic-snail", function() {
	it("accepts a completed magic snail", function() {
		setupMagicSnail(true);
		assert.equal(puzzle.check(true).complete, true);
	});

	it("rejects a wrong side clue", function() {
		setupMagicSnail(true);
		puzzle.board.excell[0].setQnum(2);
		assert.equal(puzzle.check(true)[0], "nmSightNe");
	});

	it("rejects a wrong spiral sequence", function() {
		puzzle.open("magic-snail/3/3");
		puzzle.board.indicator.set(2);

		var nums = [
			[1, 0, 2],
			[2, 1, 0],
			[0, 2, 1]
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
		assert.equal(puzzle.check(true)[0], "nmSnailNe");
	});

	it("rejects a row or column missing a number", function() {
		setupMagicSnail(false);
		var cell = puzzle.board.getc(3, 3);
		cell.setAnum(-1);
		cell.setQsub(2);
		puzzle.board.rebuildInfo();
		assert.equal(puzzle.check(true)[0], "nmMissRow");
	});

	it("uses a clockwise spiral path from the upper-left corner", function() {
		puzzle.open("magic-snail/4/3");
		var path = puzzle.board.getMagicSnailCells().map(function(cell) {
			return [(cell.bx - 1) / 2, (cell.by - 1) / 2];
		});

		assert.deepEqual(path, [
			[0, 0],
			[1, 0],
			[2, 0],
			[3, 0],
			[3, 1],
			[3, 2],
			[2, 2],
			[1, 2],
			[0, 2],
			[0, 1],
			[1, 1],
			[2, 1]
		]);
	});

	it("draws the spiral guide as cell-boundary walls", function() {
		puzzle.open("magic-snail/4/3");
		var walls = puzzle.board.getMagicSnailWalls();

		assert.deepEqual(walls, [
			{ isVert: true, bx: 6, by: 3 },
			{ isVert: false, bx: 1, by: 2 },
			{ isVert: false, bx: 3, by: 2 },
			{ isVert: false, bx: 5, by: 2 },
			{ isVert: false, bx: 3, by: 4 },
			{ isVert: false, bx: 5, by: 4 }
		]);
	});

	it("clamps the number range and exposes cross input", function() {
		puzzle.open("magic-snail/2/4/9");
		assert.equal(puzzle.board.indicator.count, 2);
		puzzle.board.indicator.set(3);
		assert.equal(puzzle.board.indicator.count, 2);
		assert.ok(puzzle.mouse.inputModes.edit.indexOf("mark-cross") >= 0);
		assert.ok(puzzle.mouse.inputModes.play.indexOf("numblank") >= 0);
	});

	it("can draw fixed crossed cells in edit mode", function() {
		puzzle.open("magic-snail/3/3");
		puzzle.setMode("edit");
		puzzle.mouse.setInputMode("mark-cross");
		var cell = puzzle.board.getc(1, 1);

		puzzle.mouse.inputPath("left", 1, 1);
		assert.equal(cell.qnum, -2);
		assert.equal(cell.anum, -1);
		assert.equal(cell.qsub, 0);
		assert.equal(puzzle.painter.getQuesNumberText(cell), "");

		puzzle.mouse.inputPath("left", 1, 1);
		assert.equal(cell.qnum, -1);
	});

	it("can draw crossed blank cells in play mode", function() {
		puzzle.open("magic-snail/3/3");
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("numblank");
		var cell = puzzle.board.getc(1, 1);

		puzzle.mouse.inputPath("left", 1, 1);
		assert.equal(cell.qsub, 2);
		assert.equal(cell.anum, -1);

		puzzle.mouse.inputPath("left", 1, 1);
		assert.equal(cell.qsub, 0);
	});

	it("can draw crossed blank cells with right-click auto input", function() {
		puzzle.open("magic-snail/3/3");
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("auto");
		var cell = puzzle.board.getc(1, 1);

		puzzle.mouse.inputPath("right", 1, 1);
		assert.equal(cell.qsub, 2);
		assert.equal(cell.anum, -1);
	});
});
