var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

describe("Variety:pills", function() {
	it("exports and restores dots and clues in a puzzle URL", function() {
		var puzzle = new pzpr.Puzzle().open("pills/10/10");
		var board = puzzle.board;

		var dots = [
			[4, 4, 4, 2, 2, 2, 2, 4, 4, 4],
			[4, 2, 4, 1, 1, 1, 1, 4, 2, 4],
			[4, 4, 4, 1, 0, 0, 1, 4, 4, 4],
			[2, 1, 1, 1, 0, 0, 1, 1, 1, 2],
			[2, 1, 0, 0, 0, 0, 0, 0, 1, 2],
			[2, 1, 0, 0, 0, 0, 0, 0, 1, 2],
			[2, 1, 1, 1, 0, 0, 1, 1, 1, 2],
			[4, 4, 4, 1, 0, 0, 1, 4, 4, 4],
			[4, 2, 4, 1, 1, 1, 1, 4, 2, 4],
			[4, 4, 4, 2, 2, 2, 2, 4, 4, 4]
		];
		var rowClues = [8, 5, 4, 1, 3, 1, 4, 14, 13, 2];
		var colClues = [4, 8, 17, 1, 1, 2, 7, 5, 8, 2];

		for (var r = 0; r < 10; r++) {
			for (var c = 0; c < 10; c++) {
				board.getc(c * 2 + 1, r * 2 + 1).setQnum(dots[r][c]);
			}
			board.getex(-1, r * 2 + 1).setQnum(rowClues[r]);
			board.getex(r * 2 + 1, -1).setQnum(colClues[r]);
		}

		var url = puzzle.getURL(pzpr.parser.URL_PZPRV3);
		assert(url.indexOf("pills/10/10/") >= 0);

		var restored = new pzpr.Puzzle().open(url);
		for (var r2 = 0; r2 < 10; r2++) {
			for (var c2 = 0; c2 < 10; c2++) {
				assert.equal(restored.board.getc(c2 * 2 + 1, r2 * 2 + 1).qnum, dots[r2][c2]);
			}
			assert.equal(restored.board.getex(-1, r2 * 2 + 1).qnum, rowClues[r2]);
			assert.equal(restored.board.getex(r2 * 2 + 1, -1).qnum, colClues[r2]);
		}
	});

	it("accepts the published GP 2015 round 7 answer", function() {
		var puzzle = new pzpr.Puzzle().open(
			"http://pzv.jp/p.html?pills/10/10/444222244442411114244441001444211100111221000000122100000012211100111244410014444241111424444222244448-1111275828541314ed2"
		);
		var board = puzzle.board;
		var ans = [
			[0, 0, 0, 0, 0, 8, 8, 8, 0, 0],
			[0, 0, 9, 0, 1, 0, 0, 0, 0, 0],
			[0, 0, 9, 0, 1, 0, 0, 0, 0, 0],
			[0, 0, 9, 0, 1, 0, 0, 0, 0, 0],
			[0, 0, 0, 0, 0, 0, 0, 3, 3, 3],
			[0, 6, 0, 0, 0, 0, 0, 0, 0, 0],
			[0, 6, 0, 0, 0, 2, 2, 2, 7, 0],
			[0, 6, 5, 5, 5, 0, 4, 0, 7, 0],
			[10, 10, 10, 0, 0, 0, 4, 0, 7, 0],
			[0, 0, 0, 0, 0, 0, 4, 0, 0, 0]
		];
		for (var r = 0; r < 10; r++) {
			for (var c = 0; c < 10; c++) {
				if (ans[r][c] > 0) {
					board.getc(c * 2 + 1, r * 2 + 1).setQans(1);
				}
			}
		}
		// Some pills touch orthogonally; separate them with borders.
		[
			[13, 14],
			[16, 13],
			[3, 16],
			[4, 15],
			[5, 16]
		].forEach(function(b) {
			board.getb(b[0], b[1]).setQans(1);
		});
		assert.equal(puzzle.check().complete, true);
	});

	it("exports capsule outlines without close-path chords", function() {
		var puzzle = new pzpr.Puzzle();
		var svg = "";
		puzzle.open(
			"http://pzv.jp/p.html?pills/10/10/444222244442411114244441001444211100111221000000122100000012211100111244410014444241111424444222244448-1111275828541314ed2",
			function() {
				svg = puzzle.toBuffer("svg", 0, 30);
			}
		);
		// candle splits every arc into its own subpath; a closePath after the
		// last arc would draw a stray chord across the capsule.  Assert that
		// no stroked path mixes arcs with a close-path command.
		var re = /<path[^>]*fill="none"[^>]*d="([^"]*)"[^>]*>/g;
		var m;
		while ((m = re.exec(svg)) !== null) {
			assert.equal(/ z/.test(m[1]), false, m[1]);
		}
	});

	it("draws separator borders with a right-button drag in play mode", function() {
		var puzzle = new pzpr.Puzzle().open("http://pzv.jp/p.html?pills/8/3/zj1p");
		puzzle.setMode("play");
		var board = puzzle.board;

		puzzle.mouse.inputPath("left", 1, 1, 3, 1, 5, 1);
		assert.equal(board.getc(1, 1).qans, 1);
		assert.equal(board.getc(3, 1).qans, 1);
		assert.equal(board.getc(5, 1).qans, 1);

		puzzle.mouse.inputPath("right", 2, 1, 2, 3);
		assert.equal(board.getb(2, 1).qans, 1);
		assert.equal(board.getb(2, 3).qans, 1);

		// Dragging over an existing border erases it again.
		puzzle.mouse.inputPath("right", 2, 1, 2, 3);
		assert.equal(board.getb(2, 1).qans, 0);
		assert.equal(board.getb(2, 3).qans, 0);
	});

	it("repaints neighbours when a capsule outline changes", function() {
		var puzzle = new pzpr.Puzzle().open("http://pzv.jp/p.html?pills/6/3/zj1p");
		puzzle.setMode("play");
		var board = puzzle.board;
		var painter = puzzle.painter;
		var prepaints = 0;
		var ranges = [];
		var origPrepaint = painter.prepaint;
		var origSetRange = painter.setRange;
		painter.prepaint = function() {
			prepaints++;
			return origPrepaint.call(this);
		};
		painter.setRange = function(x1, y1, x2, y2) {
			ranges.push([x1, y1, x2, y2]);
			return origSetRange.call(this, x1, y1, x2, y2);
		};

		[1, 3].forEach(function(by) {
			board.getc(1, by).setQans(1);
		});

		prepaints = 0;
		ranges = [];
		board.getc(1, 5).setQans(1);
		assert.ok(prepaints >= 1);
		assert.ok(
			ranges.some(function(r) {
				return r[0] <= 1 && r[2] >= 3 && r[1] <= 3 && r[3] >= 3;
			})
		);

		prepaints = 0;
		ranges = [];
		board.getb(2, 3).setQans(1);
		assert.ok(prepaints >= 1);
		assert.ok(
			ranges.some(function(r) {
				return r[0] <= 1 && r[2] >= 3;
			})
		);
	});

	it("right-button borders also work with a specific tool selected", function() {
		var puzzle = new pzpr.Puzzle().open("http://pzv.jp/p.html?pills/8/3/zj1p");
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("shade");
		var board = puzzle.board;

		[1, 3].forEach(function(by) {
			board.getc(1, by).setQans(1);
			board.getc(3, by).setQans(1);
		});

		puzzle.mouse.inputPath("right", 2, 1, 2, 3);
		assert.equal(board.getb(2, 1).qans, 1);
		assert.equal(board.getb(2, 3).qans, 1);
		// The separator splits the two touching pills.
		assert.equal(board.sblkmgr.components.length, 2);
	});

	it("renders the solver overlay as hollow capsules instead of numbers", function() {
		var puzzle = new pzpr.Puzzle();
		var svg = "";
		puzzle.open("http://pzv.jp/p.html?pills/8/3/zj1p", function() {
			var bd = puzzle.board;
			// Mimic what the solver overlay does: one "text" entry per pill
			// cell, carrying the pill value as data.
			[
				[1, 1],
				[3, 1],
				[5, 1]
			].forEach(function(pos) {
				bd.getc(pos[0], pos[1])._solverState = [
					{ color: "green", item: { kind: "text", data: "1" } }
				];
			});
			svg = puzzle.toBuffer("svg", 0, 30);
		});

		// No pill-value numbers are written into the grid cells (outside
		// clues legitimately use positive x with negative y).
		assert.equal(/<text[^>]*x="[1-9][0-9.]*"[^>]*y="[1-9][0-9.]*"/.test(svg), false);
		// The three cells are outlined with capsule arcs.
		assert.ok((svg.match(/A [0-9]/g) || []).length >= 4);
	});
});
