var assert = require("assert");

var pzpr = require("../../");

var url = "gravel/7/7/00000000000000000zzoos200431su";

describe("Variety:gravel", function() {
	it("calculates perimeter", function() {
		var puzzle = new pzpr.Puzzle({ type: "player" });
		puzzle.open(url);

		var bounds = puzzle.board.getPerimeters();
		assert.deepEqual(bounds, {
			bottom: 4,
			left: 1,
			right: 2,
			top: 2
		});
	});

	it("skips perimeter in editor", function() {
		var puzzle = new pzpr.Puzzle({ type: "editor" });
		puzzle.open(url);

		var bounds = puzzle.board.getPerimeters();
		assert.deepEqual(bounds, {
			bottom: 0,
			left: 0,
			right: 0,
			top: 0
		});
	});

	it("draws clue numbers at rotated cell positions", function() {
		var puzzle = new pzpr.Puzzle({ type: "player" });
		puzzle.open("gravel/7/7/00000000000006000n9i3zi4r0000004000");

		var clue = puzzle.board.cell[12];
		assert.equal(clue.qnum, 3);
		assert.equal(
			puzzle.painter.getNumberVerticalOffset(clue),
			puzzle.painter.getCellVerticalOffset(clue)
		);
	});

	it("insets solver block fills and keeps marker colors consistent", function() {
		var puzzle = new pzpr.Puzzle({ type: "player" });
		puzzle.open("gravel/6/6/200000000000h3zs");

		var painter = puzzle.painter;
		painter.bw = 20;
		painter.bh = 20;
		painter.cw = 40;
		painter.lm = 2;

		assert.equal(painter.solverLineColor, painter.solverPekeColor);
		assert.equal(painter.solverLineColor, painter.solverCellMarkColor);

		var drawn = null;
		var original = painter.drawDiamondCell;
		painter.drawDiamondCell = function(g, px, py, rw, rh, close) {
			drawn = { rw: rw, rh: rh, close: close };
		};

		try {
			assert.equal(
				painter.drawGravelSolverCellEntry({}, puzzle.board.cell[0], "block"),
				true
			);
		} finally {
			painter.drawDiamondCell = original;
		}

		assert.ok(drawn);
		assert.ok(drawn.rw < painter.bw);
		assert.ok(drawn.rh < painter.bh);
		assert.equal(drawn.close, true);
	});
});
