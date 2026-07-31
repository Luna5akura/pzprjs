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

	it("draws solver bold walls as rotated gravel borders", function() {
		var puzzle = new pzpr.Puzzle({ type: "player" });
		puzzle.open("gravel/7/7/06000000000000000j2zzj");

		var painter = puzzle.painter;
		var border = puzzle.board.border[0];
		border._solverState = { color: "green", item: "boldWall" };
		painter.range = { borders: [border] };
		painter.bw = 20;
		painter.bh = 20;
		painter.lm = 2;

		var called = false;
		var originalVinc = painter.vinc;
		var originalDraw = painter.drawGravelSolverBorderLine;
		painter.vinc = function() {
			return {
				vhide: function() {},
				strokeLine: function() {}
			};
		};
		painter.drawGravelSolverBorderLine = function() {
			called = true;
		};

		try {
			painter.drawSolverOverlayLines();
		} finally {
			painter.vinc = originalVinc;
			painter.drawGravelSolverBorderLine = originalDraw;
			border._solverState = null;
		}

		assert.equal(called, true);
	});

	it("keeps solver cell overlays below clues", function() {
		var puzzle = new pzpr.Puzzle({ type: "player" });
		puzzle.open("gravel/7/7/00000000000000000i2q4s4y");

		var painter = puzzle.painter;
		var calls = [];
		var names = [
			"drawBGCells",
			"drawShadedCells",
			"drawSolverOverlayCells",
			"drawValidDashedGrid",
			"drawCircles",
			"drawQuesNumbers",
			"drawQansBorders",
			"drawShadeBorders",
			"drawQuesBorders",
			"drawBorderQsubs",
			"drawInvalidIndicators",
			"drawTarget",
			"drawTrialStarts",
			"drawSolverOverlayLines",
			"drawSolverOverlayPekes"
		];
		var originals = {};

		names.forEach(function(name) {
			originals[name] = painter[name];
			painter[name] = function() {
				calls.push(name);
			};
		});

		try {
			painter.paint();
			assert.ok(
				calls.indexOf("drawValidDashedGrid") <
					calls.indexOf("drawSolverOverlayCells")
			);
			assert.ok(
				calls.indexOf("drawSolverOverlayCells") <
					calls.indexOf("drawQuesNumbers")
			);

			calls = [];
			painter.paintPost();
			assert.equal(calls.indexOf("drawSolverOverlayCells"), -1);
			assert.ok(calls.indexOf("drawSolverOverlayLines") >= 0);
			assert.ok(calls.indexOf("drawSolverOverlayPekes") >= 0);
		} finally {
			names.forEach(function(name) {
				painter[name] = originals[name];
			});
		}
	});

	it("offsets solver dots on numbered gravel clues", function() {
		var puzzle = new pzpr.Puzzle({ type: "player" });
		puzzle.open("gravel/7/7/00000000000000000i2q4s4y");

		var painter = puzzle.painter;
		var clue = puzzle.board.cell[3];
		painter.bw = 20;
		painter.bh = 20;
		painter.cw = 40;

		var drawn = null;
		var g = {
			fillCircle: function(px, py, r) {
				drawn = { px: px, py: py, r: r };
			}
		};
		var centerY =
			clue.by * painter.bh + painter.getCellVerticalOffset(clue);

		assert.equal(painter.drawGravelSolverCellEntry(g, clue, "dot"), true);
		assert.ok(drawn);
		assert.notEqual(drawn.py, centerY);
	});
});
