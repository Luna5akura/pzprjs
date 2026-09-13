var assert = require("assert");

var pzpr = require("../../");

var url =
	"sky-neighbor/9/9/..........1.............................2.............................3........../.G..GG.GG;GGGG.G...;.G.G...GG;.G..G..G.;.GG....G.;.G.G....G;.G.GGGG.G;GGG....GG;.G.G.GGGG/212221313/212223121/213211232/221223121/010001111/010001111/011100010/001001111";

var innerAnswer = [
	[2, 3, 2, 2, 1, 3, 1, 3, 1],
	[3, 1, 3, 1, 3, 2, 1, 2, 2],
	[1, 2, 1, 2, 3, 3, 2, 1, 3],
	[1, 3, 1, 3, 1, 2, 2, 3, 2],
	[3, 1, 2, 3, 2, 1, 3, 1, 2],
	[3, 2, 3, 1, 2, 1, 3, 2, 1],
	[2, 1, 3, 2, 1, 3, 1, 2, 3],
	[1, 2, 1, 3, 3, 2, 2, 3, 1],
	[2, 3, 2, 1, 2, 1, 3, 1, 3]
];
var outerAnswer = [
	[2, 1, 2, 2, 2, 1, 3, 1, 3],
	[2, 1, 2, 2, 2, 3, 1, 2, 1],
	[2, 1, 3, 2, 1, 1, 2, 3, 2],
	[2, 2, 1, 2, 2, 3, 1, 2, 1]
];

function setAnswer(puzzle) {
	for (var y = 0; y < 9; y++) {
		for (var x = 0; x < 9; x++) {
			puzzle.board.getc(x * 2 + 1, y * 2 + 1).setAnum(innerAnswer[y][x]);
		}
	}
	for (var side = 0; side < 4; side++) {
		for (var pos = 0; pos < 9; pos++) {
			var excell;
			if (side === 0) {
				excell = puzzle.board.getex(pos * 2 + 1, -1);
			} else if (side === 1) {
				excell = puzzle.board.getex(pos * 2 + 1, 19);
			} else if (side === 2) {
				excell = puzzle.board.getex(-1, pos * 2 + 1);
			} else {
				excell = puzzle.board.getex(19, pos * 2 + 1);
			}
			excell.setAnum(outerAnswer[side][pos]);
		}
	}
}

function oldCompactUrl() {
	var inner =
		"..........1.............................2.............................3..........";
	var gray = [
		".G..GG.GG",
		"GGGG.G...",
		".G.G...GG",
		".G..G..G.",
		".GG....G.",
		".G.G....G",
		".G.GGGG.G",
		"GGG....GG",
		".G.G.GGGG"
	].join("");
	return (
		"skyneighbor/9/9/" +
		inner +
		"/212221313212223121213211232221223121/" +
		gray +
		"/010001111010001111011100010001001111"
	);
}

describe("Variety:skyneighbor", function() {
	it("is fixed at 9x9 and accepts aliases", function() {
		[
			"skyneighbor",
			"skyneighbors",
			"sky-neighbor",
			"sky-neighbors",
			"skyneighbour",
			"skyneighbours",
			"sky-neighbour",
			"sky-neighbours"
		].forEach(
			function(pid) {
				var puzzle = new pzpr.Puzzle().open(pid);
				assert.equal(puzzle.pid, "skyneighbor");
				assert.equal(puzzle.board.cols, 9);
				assert.equal(puzzle.board.rows, 9);
				assert.equal(puzzle.board.excell.length, 36);
			}
		);
		var malformed = new pzpr.Puzzle().open("skyneighbor/4/7");
		assert.equal(malformed.board.cols, 9);
		assert.equal(malformed.board.rows, 9);
	});

	it("keeps the outside answer ring while disabling resize operations", function() {
		var puzzle = new pzpr.Puzzle().open("skyneighbor");
		var board = puzzle.board;
		var exec = board.exec;
		assert.equal(exec.allowedOperations(false), exec.TURNFLIP);
		assert.equal(exec.isBoardOp("expandup"), false);
		assert.equal(exec.isBoardOp("reducert"), false);
		assert.equal(exec.isBoardOp("turnr"), true);
		assert.equal(exec.isBoardOp("flipx"), true);
		board.operate("expandup");
		board.operate("reducert");
		assert.equal(board.cols, 9);
		assert.equal(board.rows, 9);
		assert.equal(board.excell.length, 36);
	});

	it("round-trips the published six/ten-layer URL", function() {
		var puzzle = new pzpr.Puzzle().open(url);
		var canonical = puzzle.getURL(pzpr.parser.URL_PZPRV3).split("?")[1];
		assert.equal(canonical, url.replace(/^sky-neighbor/, "skyneighbor"));
		assert.equal(
			puzzle.board.cell.filter(function(cell) {
				return cell.ques;
			}).length,
			40
		);
		assert.equal(
			puzzle.board.excell.filter(function(excell) {
				return excell.qnum !== -1;
			}).length,
			36
		);
	});

	it("accepts the legacy compact four-layer URL", function() {
		var puzzle = new pzpr.Puzzle().open(oldCompactUrl());
		assert.equal(
			puzzle.board.cell.filter(function(cell) {
				return cell.ques;
			}).length,
			40
		);
		assert.equal(
			puzzle.board.excell.filter(function(excell) {
				return excell.ques;
			}).length,
			19
		);
		assert.equal(
			puzzle.board.excell.filter(function(excell) {
				return excell.qnum !== -1;
			}).length,
			36
		);
	});

	it("supports inner and outside clue/answer input", function() {
		var puzzle = new pzpr.Puzzle().open("skyneighbor");
		var cell = puzzle.board.getc(1, 1);
		var top = puzzle.board.getex(1, -1);
		var left = puzzle.board.getex(-1, 1);
		puzzle.cursor.init(1, 1);
		assert.deepEqual(puzzle.mouse.getInputModeList("edit"), [
			"auto",
			"number",
			"number-",
			"gray",
			"clear"
		]);
		puzzle.key.inputKeys("1", "g");
		assert.equal(cell.qnum, 1);
		assert.equal(cell.ques, 1);
		puzzle.cursor.init(1, -1);
		puzzle.key.inputKeys("2", "g");
		assert.equal(top.qnum, 2);
		assert.equal(top.ques, 1);
		puzzle.cursor.init(-1, 1);
		puzzle.setMode("play");
		puzzle.key.inputKeys("3");
		assert.equal(left.anum, 3);
		puzzle.key.inputKeys(" ");
		assert.equal(left.anum, -1);
	});

	it("checks the complete published solution including the ring", function() {
		var puzzle = new pzpr.Puzzle().open(url);
		// The URL's outside values are givens; setAnum still records the answer
		// layer so fixed-number checking covers both kinds of cells.
		setAnswer(puzzle);
		assert.equal(puzzle.check(true).complete, true);
	});
});
