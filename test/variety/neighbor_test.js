var assert = require("assert");

var pzpr = require("../../");

var url =
	"neighbor/9/9/............3.......2.......1...3.......2.......1...3.......2.......1............/111111101001110001011110001110111111110000101101111001100001111110101001000110000";
var answer = [
	[1, 3, 2, 1, 3, 2, 1, 2, 3],
	[2, 2, 1, 3, 1, 3, 3, 2, 1],
	[2, 3, 2, 1, 3, 1, 1, 2, 3],
	[3, 1, 3, 2, 1, 3, 2, 1, 2],
	[1, 2, 3, 3, 2, 2, 1, 3, 1],
	[2, 1, 2, 1, 3, 1, 3, 3, 2],
	[3, 1, 1, 2, 2, 3, 2, 1, 3],
	[1, 2, 1, 3, 2, 1, 3, 3, 2],
	[3, 3, 3, 2, 1, 2, 2, 1, 1]
];

describe("Variety:neighbor", function() {
	it("is always 9x9 and accepts spelling aliases", function() {
		["neighbor", "neighbors", "neighbour", "neighbours"].forEach(function(pid) {
			var puzzle = new pzpr.Puzzle().open(pid);
			assert.equal(puzzle.pid, "neighbor");
			assert.equal(puzzle.board.cols, 9);
			assert.equal(puzzle.board.rows, 9);
		});

		var malformedSize = new pzpr.Puzzle().open("neighbor/5/6");
		assert.equal(malformedSize.board.cols, 9);
		assert.equal(malformedSize.board.rows, 9);
	});

	it("disables resizing while retaining rotation and reflection", function() {
		var puzzle = new pzpr.Puzzle().open("neighbor");
		var board = puzzle.board;
		var exec = board.exec;

		assert.equal(exec.allowedOperations(false), exec.TURNFLIP);
		assert.equal(exec.isBoardOp("expandup"), false);
		assert.equal(exec.isBoardOp("reducelt"), false);
		assert.equal(exec.isBoardOp("turnr"), true);
		assert.equal(exec.isBoardOp("flipx"), true);
		board.operate("expandup");
		board.operate("reducelt");
		assert.equal(board.cols, 9);
		assert.equal(board.rows, 9);

		board.operate("turnr");
		board.operate("flipx");
		assert.equal(board.cols, 9);
		assert.equal(board.rows, 9);
	});

	it("round-trips clues and outlined cells in URLs and files", function() {
		var puzzle = new pzpr.Puzzle().open(url);
		var canonical = puzzle.getURL(pzpr.parser.URL_PZPRV3).split("?")[1];
		assert.equal(canonical, url);

		var file = puzzle.getFileData();
		var reopened = new pzpr.Puzzle().open(file);
		var frozen = puzzle.board.freezecopy();
		reopened.board.compareData(frozen, function(group, index, property) {
			assert.equal(
				frozen[group][index][property],
				reopened.board[group][index][property]
			);
		});
	});

	it("supports clue, outline, and answer input", function() {
		var puzzle = new pzpr.Puzzle().open("neighbor");
		var cell = puzzle.board.getc(1, 1);
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

		puzzle.setMode("play");
		puzzle.key.inputKeys("2");
		assert.equal(cell.anum, -1);

		var answerCell = puzzle.board.getc(3, 1);
		puzzle.cursor.init(3, 1);
		puzzle.key.inputKeys("2");
		assert.equal(answerCell.anum, 2);
		puzzle.mouse.inputPath("right", 3, 1);
		assert.equal(answerCell.anum, -1);
	});

	it("accepts the published sample solution", function() {
		var puzzle = new pzpr.Puzzle().open(url);
		for (var y = 0; y < 9; y++) {
			for (var x = 0; x < 9; x++) {
				puzzle.board.getc(x * 2 + 1, y * 2 + 1).setAnum(answer[y][x]);
			}
		}
		assert.equal(puzzle.check(true).complete, true);
	});
});
