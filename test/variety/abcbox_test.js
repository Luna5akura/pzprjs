var assert = require("assert");

var pzpr = require("../../");

describe("Variety:abcbox", function() {
	it("reserves one outside clue cell per grid position", function() {
		var puzzle = new pzpr.Puzzle().open("abcbox/5/5");
		var board = puzzle.board;

		assert.equal(board.minbx, -10);
		assert.equal(board.minby, -10);
		assert.equal(board.excell.length, 50);
		assert.equal(board.excellinside(board.minbx, 1, -1, 1).length, 5);
		assert.equal(board.excellinside(1, board.minby, 1, -1).length, 5);
		assert.equal(puzzle.cursor.maxy, board.maxby - 1);
	});

	it("cycles symbolic clues and accepts numeric clues", function() {
		var puzzle = new pzpr.Puzzle().open("abcbox/5/5");
		var clue = puzzle.board.getex(-1, 1);
		puzzle.mouse.setInputMode("letter");

		puzzle.mouse.inputPath("left", -1, 1);
		assert.deepEqual([clue.qchar, clue.qnum], [1, -1]);
		puzzle.mouse.inputPath("left", -1, 1);
		assert.deepEqual([clue.qchar, clue.qnum], [2, -1]);
		puzzle.mouse.inputPath("left", -1, 1);
		assert.deepEqual([clue.qchar, clue.qnum], [3, -1]);
		puzzle.mouse.inputPath("left", -1, 1);
		assert.deepEqual([clue.qchar, clue.qnum], [0, -2]);
		puzzle.mouse.inputPath("left", -1, 1);
		assert.deepEqual([clue.qchar, clue.qnum], [0, -1]);

		clue.setQnum(2);
		assert.deepEqual([clue.qchar, clue.qnum], [0, 2]);
	});

	it("inputs numeric outside clues with the number tool", function() {
		var puzzle = new pzpr.Puzzle().open("abcbox/5/5");
		var clue = puzzle.board.getex(-1, 1);
		puzzle.mouse.setInputMode("number");
		puzzle.mouse.inputPath("left", -1, 1);
		assert.equal(clue.qnum, 1);
		puzzle.key.keyinput("2");
		assert.equal(clue.qnum, 2);
	});

	it("round-trips letter, question mark and numeric clues", function() {
		var puzzle = new pzpr.Puzzle().open("abcbox/5/5");
		puzzle.board.getex(-9, 1).setQchar(1);
		puzzle.board.getex(1, -9).setQnum(-2);
		puzzle.board.getex(-7, 1).setQnum(4);

		var fromFile = new pzpr.Puzzle().open(puzzle.getFileData());
		assert.equal(fromFile.board.getex(-9, 1).qchar, 1);
		assert.equal(fromFile.board.getex(1, -9).qnum, -2);
		assert.equal(fromFile.board.getex(-7, 1).qnum, 4);

		var fromUrl = new pzpr.Puzzle().open(puzzle.getURL());
		assert.equal(fromUrl.board.getex(-9, 1).qchar, 1);
		assert.equal(fromUrl.board.getex(1, -9).qnum, -2);
		assert.equal(fromUrl.board.getex(-7, 1).qnum, 4);
	});

	it("keeps outside clues fixed while playing", function() {
		var puzzle = new pzpr.Puzzle().open("abcbox/5/5");
		var clue = puzzle.board.getex(-1, 1);
		clue.setQchar(1);
		puzzle.setMode(puzzle.MODE_PLAYER);
		puzzle.mouse.setInputMode("number");
		puzzle.mouse.inputPath("left", -1, 1);
		assert.deepEqual([clue.qchar, clue.qnum], [1, -1]);
		puzzle.mouse.setInputMode("clear");
		puzzle.mouse.inputPath("left", -1, 1);
		assert.deepEqual([clue.qchar, clue.qnum], [1, -1]);
	});

	it("checks numeric clues as group lengths", function() {
		var puzzle = new pzpr.Puzzle().open("abcbox/2/2");
		var board = puzzle.board;
		var answer = [
			[1, 2],
			[2, 1]
		];
		for (var y = 0; y < 2; y++) {
			for (var x = 0; x < 2; x++) {
				board.getc(x * 2 + 1, y * 2 + 1).setAnum(answer[y][x]);
			}
		}

		for (var bx = 1; bx < board.maxbx; bx += 2) {
			var clues = board.excellinside(bx, board.minby, bx, -1);
			clues[0].setQnum(1);
			clues[1].setQnum(1);
		}
		assert.equal(puzzle.check().complete, true);

		board.getex(1, board.minby + 1).setQnum(2);
		assert.equal(puzzle.check()[0], "nmAbcBox");
	});

	it("draws auxiliary circle and cross marks like Slitherlink", function() {
		var puzzle = new pzpr.Puzzle().open("abcbox/1/1");
		var cell = puzzle.board.getc(1, 1);
		var painter = puzzle.painter;
		var calls = [];
		var g = {
			vid: "",
			lineWidth: 0,
			strokeStyle: null,
			fillStyle: null,
			vhide: function() {
				calls.push(["hide", this.vid]);
			},
			shapeCircle: function(x, y, radius) {
				calls.push(["circle", this.vid, x, y, radius, this.lineWidth]);
			},
			beginPath: function() {
				calls.push(["begin"]);
			},
			moveTo: function() {},
			lineTo: function() {},
			closePath: function() {},
			stroke: function() {
				calls.push(["stroke", this.lineWidth]);
			}
		};
		painter.context = g;
		painter.vinc = function() {
			return g;
		};
		painter.range = { cells: [cell] };
		painter.cw = 40;
		painter.bw = 20;
		painter.bh = 20;

		cell.setQsub(1);
		painter.drawSlitherlinkMarks();
		assert.deepEqual(calls[0], ["circle", "c_MB1_" + cell.id, 20, 20, 4, 2]);

		calls.length = 0;
		cell.setQsub(2);
		painter.drawSlitherlinkMarks();
		assert.deepEqual(calls, [
			["hide", "c_MB1_" + cell.id],
			["begin"],
			["stroke", 2]
		]);
	});
});
