var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

describe("Variety:japanese_arrows", function() {
	var exampleNumbers = [
		[3, 1, 2, 2],
		[2, 1, 1, 2],
		[1, 1, 2, 1],
		[3, 1, 2, 3]
	];
	var exampleDirections = [
		[8, 8, 3, 7],
		[8, 2, 2, 7],
		[2, 1, 1, 1],
		[1, 1, 3, 3]
	];

	it("uses the longest possible ray as the number limit", function() {
		var example = new pzpr.Puzzle().open("japanese_arrows/4/4");
		var puzzle = new pzpr.Puzzle().open("japanese_arrows/6/5");
		assert.equal(example.board.getc(1, 1).getmaxnum(), 3);
		assert.equal(puzzle.board.getc(1, 1).getmaxnum(), 5);
	});

	it("accepts clue numbers and arrows through mouse and keyboard input", function() {
		var puzzle = new pzpr.Puzzle().open("japanese_arrows/3/3");
		var cell = puzzle.board.getc(1, 1);

		puzzle.mouse.setInputMode("number");
		puzzle.mouse.inputPath(1, 1);
		assert.equal(cell.qnum, 1);

		puzzle.mouse.setInputMode("auto");
		puzzle.mouse.inputPath(1, 1, 3, 1);
		assert.equal(cell.qdir, cell.RT);

		puzzle.key.inputKeys("shift+up");
		assert.equal(cell.qdir, cell.UP);

		puzzle.mouse.setInputMode("clear");
		puzzle.mouse.inputPath(1, 1);
		assert.equal(cell.qnum, -1);
		assert.equal(cell.qdir, 0);
	});

	it("accepts answer numbers in play mode", function() {
		var puzzle = new pzpr.Puzzle().open("japanese_arrows/3/3");
		var cell = puzzle.board.getc(1, 1);

		puzzle.setMode("play");
		puzzle.cursor.init(1, 1);
		puzzle.key.inputKeys("2");
		assert.equal(cell.anum, 2);
	});

	it("supports diagonal arrows and arrows without a clue number", function() {
		var puzzle = new pzpr.Puzzle().open("japanese_arrows/3/3");
		var cell = puzzle.board.getc(1, 1);

		puzzle.key.inputKeys("shift+7");
		assert.equal(cell.qdir, 5);

		puzzle.setMode("play");
		puzzle.cursor.init(1, 1);
		puzzle.key.inputKeys("1");
		assert.equal(cell.anum, 1);
		assert.equal(cell.getNum(), 1);
	});

	it("round-trips diagonal arrows in the URL", function() {
		var puzzle = new pzpr.Puzzle().open("japanese_arrows/2/2");
		var cell = puzzle.board.getc(1, 1);
		cell.setQdir(8);
		var url = puzzle.getURL().split("?")[1];
		var restored = new pzpr.Puzzle().open(url);
		var restoredCell = restored.board.getc(1, 1);
		assert.equal(restoredCell.qdir, 8);
		assert.equal(restoredCell.qnum, -1);
	});

	it("matches the completed 4x4 example on the competition rules page", function() {
		var puzzle = new pzpr.Puzzle().open("japanese_arrows/4/4");
		for (var y = 0; y < 4; y++) {
			for (var x = 0; x < 4; x++) {
				var cell = puzzle.board.getc(x * 2 + 1, y * 2 + 1);
				cell.setQdir(exampleDirections[y][x]);
				cell.setQnum(exampleNumbers[y][x]);
			}
		}
		assert.equal(puzzle.check(true).complete, true);
	});

	it("requires the given arrow in every cell", function() {
		var puzzle = new pzpr.Puzzle().open("japanese_arrows/4/4");
		for (var y = 0; y < 4; y++) {
			for (var x = 0; x < 4; x++) {
				var cell = puzzle.board.getc(x * 2 + 1, y * 2 + 1);
				cell.setQdir(exampleDirections[y][x]);
				cell.setQnum(exampleNumbers[y][x]);
			}
		}
		puzzle.board.getc(1, 1).setQdir(0);
		assert.equal(puzzle.check(true)[0], "anNoArrow");
	});

	it("preserves entered answer numbers in the file format", function() {
		var puzzle = new pzpr.Puzzle().open("japanese_arrows/2/2");
		var directions = [[4, 2], [1, 3]];
		for (var y = 0; y < 2; y++) {
			for (var x = 0; x < 2; x++) {
				puzzle.board.getc(x * 2 + 1, y * 2 + 1).setQdir(directions[y][x]);
			}
		}
		puzzle.setMode("play");
		puzzle.board.cell.each(function(cell) { cell.setAnum(1); });

		var restored = new pzpr.Puzzle().open(
			puzzle.getFileData(pzpr.parser.FILE_PZPR)
		);
		restored.board.cell.each(function(cell) { assert.equal(cell.anum, 1); });
		assert.equal(restored.check(true).complete, true);
	});
});
