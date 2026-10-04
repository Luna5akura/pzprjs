var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

describe("Variety:tridbchoco", function() {
	function playPuzzle(url) {
		var puzzle = new pzpr.Puzzle().open(url || "tridbchoco/2/2");
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("border");
		return puzzle;
	}

	it("uses triangular adjacency (up/down by parity)", function() {
		var puzzle = new pzpr.Puzzle().open("tridbchoco/4/4");
		var bd = puzzle.board;

		// (0,0) は△: 左右と下に隣接
		var up = bd.getc(1, 1);
		assert.equal(up.isTriUp(), true);
		assert.equal(up.isTriAdjacentTo(bd.getc(3, 1)), true); // (1,0)
		assert.equal(up.isTriAdjacentTo(bd.getc(1, 3)), true); // (0,1)
		assert.equal(up.isTriAdjacentTo(bd.getc(1, -1)), false); // 盤外

		// (0,1) は▽: 左右と上に隣接
		var dn = bd.getc(1, 3);
		assert.equal(dn.isTriUp(), false);
		assert.equal(dn.isTriAdjacentTo(bd.getc(1, 5)), false); // (0,2) 下は隣接しない
		assert.equal(dn.isTriAdjacentTo(bd.getc(1, 1)), true); // (0,0) 上
	});

	it("accepts a valid 2x2 answer", function() {
		var puzzle = playPuzzle();
		var bd = puzzle.board;

		bd.getc(1, 1).setQues(6); // shade (0,0)
		bd.getc(3, 3).setQues(6); // shade (1,1)
		bd.getb(1, 2).setQans(1); // (0,0)-(0,1)
		bd.getb(3, 2).setQans(1); // (1,0)-(1,1)

		var info = puzzle.check(true);
		assert.equal(info.complete, true);
		assert.equal(info.lastcode, null);
	});

	it("rejects a block with differently sized regions (bkDifferentShape)", function() {
		var puzzle = playPuzzle("tridbchoco/3/2");
		var bd = puzzle.board;

		bd.getc(1, 1).setQues(6); // shade (0,0)
		bd.getc(3, 1).setQues(6); // shade (1,0)
		// 全体が1ブロック: shade 2, white 4 -> 大きさが違う
		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "bkDifferentShape");
	});

	it("rejects a block with a single region (bkSubLt2)", function() {
		var puzzle = playPuzzle();
		var bd = puzzle.board;

		bd.getc(1, 1).setQues(6);
		bd.getc(3, 3).setQues(6);
		bd.getb(1, 2).setQans(1);
		bd.getb(3, 2).setQans(1);
		bd.getc(3, 1).setQues(6); // (1,0) も shade にする

		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "bkSubLt2");
	});

	it("rejects a wrong block size for a number", function() {
		var puzzle = playPuzzle("tridbchoco/3/2");
		var bd = puzzle.board;

		// (2,0) に数字5: 白のカタマリは4マスなので不一致
		bd.getc(5, 1).setQnum(5);
		bd.getc(1, 1).setQues(6);
		bd.getc(3, 1).setQues(6);
		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "bkSizeLt");
	});

	it("does not draw borders between non-adjacent triangles", function() {
		var puzzle = playPuzzle("tridbchoco/4/4");
		puzzle.mouse.inputPath(0, 4, 2, 4); // (0,1)-(0,2) は隣接しない
		assert.equal(puzzle.board.getb(1, 4).qans, 0);

		puzzle.mouse.inputPath(0, 2, 2, 2); // (0,0)-(0,1) は隣接する
		assert.equal(puzzle.board.getb(1, 2).qans, 1);
	});

	it("roundtrips shading and borders in a pzprv3 URL", function() {
		var puzzle = playPuzzle();
		var bd = puzzle.board;
		bd.getc(1, 1).setQues(6);
		bd.getc(3, 3).setQues(6);
		bd.getb(1, 2).setQans(1);
		bd.getb(3, 2).setQans(1);

		var restored = new pzpr.Puzzle().open(puzzle.getFileData());
		assert.equal(restored.board.getc(1, 1).ques, 6);
		assert.equal(restored.board.getc(3, 3).ques, 6);
		assert.equal(restored.board.getb(1, 2).qans, 1);
		assert.equal(restored.board.getb(3, 2).qans, 1);
	});
});
