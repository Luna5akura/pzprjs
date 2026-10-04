var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

describe("Variety:tridbchoco", function() {
	// 9x4 の盤面: apex=4, rows=4 の正三角形 (16セル)
	// 手で構成した正解:
	//   B1: 灰 {(4,0),(5,1),(4,1)} + 白 {(3,1),(3,2),(2,2)}
	//   B2: 灰 {(1,3),(2,3),(3,3)} + 白 {(4,2),(4,3),(5,3)}
	//   B3: {(5,2)灰,(6,2)白}  B4: {(6,3)灰,(7,3)白}
	var GREYS = [
		[4, 0],
		[5, 1],
		[4, 1],
		[1, 3],
		[2, 3],
		[3, 3],
		[5, 2],
		[6, 3]
	];
	var WALLS = [
		[11, 4], // (5,1)-(5,2)
		[5, 6], // (2,2)-(2,3)
		[8, 5], // (3,2)-(4,2)
		[10, 5], // (4,2)-(5,2)
		[13, 6], // (6,2)-(6,3)
		[12, 7] // (5,3)-(6,3)
	];

	function playPuzzle(url) {
		var puzzle = new pzpr.Puzzle().open(url || "tridbchoco/9/4");
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("border");
		return puzzle;
	}

	function setSolvedAnswer(bd) {
		GREYS.forEach(function(p) {
			bd.getc(p[0] * 2 + 1, p[1] * 2 + 1).setQues(6);
		});
		WALLS.forEach(function(p) {
			bd.getb(p[0], p[1]).setQans(1);
		});
	}

	it("uses triangular adjacency (up/down by parity)", function() {
		var puzzle = new pzpr.Puzzle().open("tridbchoco/9/4");
		var bd = puzzle.board;

		// (4,0) は△: 左右と下に隣接
		var up = bd.getc(9, 1);
		assert.equal(up.isTriUp(), true);
		assert.equal(up.isTriAdjacentTo(bd.getc(11, 1)), true); // (5,0)
		assert.equal(up.isTriAdjacentTo(bd.getc(9, 3)), true); // (4,1)

		// (4,1) は▽: 左右と上に隣接
		var dn = bd.getc(9, 3);
		assert.equal(dn.isTriUp(), false);
		assert.equal(dn.isTriAdjacentTo(bd.getc(9, 5)), false); // (4,2) 下は隣接しない
		assert.equal(dn.isTriAdjacentTo(bd.getc(9, 1)), true); // (4,0) 上
	});

	it("defines the board region as an upward equilateral triangle", function() {
		var puzzle = new pzpr.Puzzle().open("tridbchoco/9/4");
		var bd = puzzle.board;
		assert.deepEqual(bd.getTriRegion(), { apex: 4, rows: 4 });

		assert.equal(bd.getc(9, 1).isTriInBoard(), true); // (4,0) 頂点
		assert.equal(bd.getc(9, 3).isTriInBoard(), true); // (4,1)
		assert.equal(bd.getc(3, 7).isTriInBoard(), true); // (1,3) 底辺左端
		assert.equal(bd.getc(15, 7).isTriInBoard(), true); // (7,3) 底辺右端
		assert.equal(bd.getc(7, 1).isTriInBoard(), false); // (3,0) 盤外
		assert.equal(bd.getc(1, 7).isTriInBoard(), false); // (0,3) 盤外
		assert.equal(bd.getc(5, 7).isTriInBoard(), true); // (2,3) 盤内
	});

	it("rounds the apex to even and rows to even", function() {
		var puzzle = new pzpr.Puzzle().open("tridbchoco/9/5");
		assert.deepEqual(puzzle.board.getTriRegion(), { apex: 4, rows: 4 });
	});

	it("shares exact vertices between adjacent triangles (no gaps)", function() {
		var puzzle = new pzpr.Puzzle().open("tridbchoco/9/4");
		var bd = puzzle.board;
		var pc = puzzle.painter;
		pc.computeTriMetrics();

		// (4,0)△ の右辺 = (5,0)▽ の左辺
		var up = pc.getTriVertices(bd.getc(9, 1));
		var right = pc.getTriVertices(bd.getc(11, 1));
		assert.deepEqual(up[0], right[0]);
		assert.deepEqual(up[2], right[2]);

		// (4,0)△ の底辺 = (4,1)▽ の上辺
		var below = pc.getTriVertices(bd.getc(9, 3));
		assert.deepEqual(up[1], below[0]);
		assert.deepEqual(up[2], below[1]);

		// (4,1)▽ の右辺 = (5,1)△ の左辺
		var up51 = pc.getTriVertices(bd.getc(11, 3));
		assert.deepEqual(below[1], up51[0]);
		assert.deepEqual(below[2], up51[1]);
	});

	it("picks the cell under the mouse from triangle geometry", function() {
		var puzzle = playPuzzle();
		var bd = puzzle.board;
		var pc = puzzle.painter;
		pc.computeTriMetrics();
		var mouse = puzzle.mouse;

		// (4,0) の重心 (ローカル座標 (3, 2/3) in S/H units)
		var cx = (3 * pc.triS + pc.triOX - pc.x0) / pc.bw;
		var cy = ((2 / 3) * pc.triH + pc.triOY - pc.y0) / pc.bh;
		mouse.inputPoint.init(cx, cy);
		assert.equal(mouse.getTriCell().id, bd.getc(9, 1).id);

		// (4,1)▽ の重心 (ローカル座標 (3, 1 + 1/3))
		var cx2 = (3 * pc.triS + pc.triOX - pc.x0) / pc.bw;
		var cy2 = ((1 + 1 / 3) * pc.triH + pc.triOY - pc.y0) / pc.bh;
		mouse.inputPoint.init(cx2, cy2);
		assert.equal(mouse.getTriCell().id, bd.getc(9, 3).id);

		// 盤外 (頂点より上) はセルなし
		var cx3 = (3 * pc.triS + pc.triOX - pc.x0) / pc.bw;
		var cy3 = ((-0.4) * pc.triH + pc.triOY - pc.y0) / pc.bh;
		mouse.inputPoint.init(cx3, cy3);
		assert.equal(mouse.getTriCell(), null);
	});

	it("snaps to grid vertices and picks the edge between them", function() {
		var puzzle = playPuzzle();
		var bd = puzzle.board;
		var pc = puzzle.painter;
		pc.computeTriMetrics();
		var mouse = puzzle.mouse;

		// 頂点 (3,0) [三角形の頂点] にスナップする
		var vx = (3 * pc.triS + pc.triOX - pc.x0) / pc.bw;
		var vy = (0 * pc.triH + pc.triOY - pc.y0) / pc.bh;
		mouse.inputPoint.init(vx, vy);
		assert.deepEqual(mouse.getTriVertex(), [3, 0]);

		// 半整数の頂点 (3.5,1) にスナップする
		var wx = (3.5 * pc.triS + pc.triOX - pc.x0) / pc.bw;
		var wy = (1 * pc.triH + pc.triOY - pc.y0) / pc.bh;
		mouse.inputPoint.init(wx, wy);
		assert.deepEqual(mouse.getTriVertex(), [3.5, 1]);

		// 頂点でない位置 (3,1) は最寄りの頂点 (2.5,1) に寄る
		var ux = (3 * pc.triS + pc.triOX - pc.x0) / pc.bw;
		var uy = (1 * pc.triH + pc.triOY - pc.y0) / pc.bh;
		mouse.inputPoint.init(ux, uy);
		assert.deepEqual(mouse.getTriVertex(), [2.5, 1]);

		// 隣接する頂点対 (2.5,1)-(3,2) の辺 = (3,1)-(4,1) の境界線
		assert.equal(mouse.getTriBorderAt([2.5, 1], [3, 2]).id, bd.getb(8, 3).id);
		// 向きが逆でも同じ
		assert.equal(mouse.getTriBorderAt([3, 2], [2.5, 1]).id, bd.getb(8, 3).id);

		// 外枠上の辺 (3,0)-(3.5,1) には境界線がない
		assert.equal(mouse.getTriBorderAt([3, 0], [3.5, 1]).isnull, true);

		// 盤外の位置は頂点なし
		var ox = (2 * pc.triS + pc.triOX - pc.x0) / pc.bw;
		var oy = (1 * pc.triH + pc.triOY - pc.y0) / pc.bh;
		mouse.inputPoint.init(ox, oy);
		assert.equal(mouse.getTriVertex(), null);
	});

	it("draws a border by dragging from one vertex to another", function() {
		var puzzle = playPuzzle();
		var bd = puzzle.board;
		var pc = puzzle.painter;
		pc.computeTriMetrics();
		var mouse = puzzle.mouse;

		function toInput(x, y) {
			return [
				(x * pc.triS + pc.triOX - pc.x0) / pc.bw,
				(y * pc.triH + pc.triOY - pc.y0) / pc.bh
			];
		}
		// 頂点 (2.5,1) から (3,2) へドラッグ → (3,1)-(4,1) の辺が引かれる
		var a = toInput(2.5, 1),
			b = toInput(3, 2);
		mouse.inputPath(a[0], a[1], b[0], b[1]);
		assert.equal(bd.getb(8, 3).qans, 1);

		// 外枠上の辺 (3,0)→(3.5,1) のドラッグでは何も引かれない
		var c = toInput(3, 0),
			d = toInput(3.5, 1);
		mouse.inputPath(c[0], c[1], d[0], d[1]);
		assert.equal(bd.getb(10, 1).qans, 0);
		assert.equal(bd.getb(8, 3).qans, 1); // 引いた線はそのまま

		// クリックしただけ (移動なし) では何も引かれない
		mouse.inputPath(b[0], b[1], b[0], b[1]);
		assert.equal(bd.getb(9, 2).qans, 0);
	});

	it("accepts a hand-constructed valid answer", function() {
		var puzzle = playPuzzle();
		setSolvedAnswer(puzzle.board);

		var info = puzzle.check(true);
		assert.equal(info.complete, true);
		assert.equal(info.lastcode, null);
	});

	it("accepts a published answer with free-ending borders", function() {
		// 実際の解答例 (17x5, 灰8マス, 境界線4本)。
		// 境界線の端点が盤面内部で途切れていても正しい分割と判定する。
		var url =
			"pzprv3/tridbchoco/5/17/.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20/.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20/.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20-%20.%20.%20.%20.%20.%20.%20/.%20.%20.%20.%20.%20-%20-%20-%20-%20-%20-%20-%20.%20.%20.%20.%20.%20/.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20.%20/0%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%20/0%200%200%200%200%200%200%200%201%200%200%200%200%200%200%200%20/0%200%200%200%200%200%200%201%200%200%200%200%200%200%200%200%20/0%200%200%200%200%200%200%200%200%201%200%200%200%200%200%200%20/0%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%20/0%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%20/0%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%20/0%200%200%200%200%200%200%200%201%200%200%200%200%200%200%200%200%20/0%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%200%20/";
		var puzzle = new pzpr.Puzzle().open(decodeURIComponent(url));
		puzzle.setMode("play");
		var info = puzzle.check(true);
		assert.equal(info.complete, true);
		assert.equal(info.lastcode, null);
	});

	it("rejects a block with differently sized regions (bkDifferentShape)", function() {
		var puzzle = playPuzzle();
		var bd = puzzle.board;

		// 2マスだけ灰色: 全体が1ブロックになり、
		// 灰のカタマリ(2マス)と白のカタマリ(14マス)の形が異なる
		bd.getc(9, 1).setQues(6); // (4,0) 灰
		bd.getc(9, 3).setQues(6); // (4,1) 灰

		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "bkDifferentShape");
	});

	it("rejects a block with a single region (bkSubLt2)", function() {
		var puzzle = playPuzzle();

		// 何も入力しない: 全体が白だけの1ブロック
		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "bkSubLt2");
	});

	it("rejects a wrong block size for a number", function() {
		var puzzle = playPuzzle();
		var bd = puzzle.board;

		// (4,1) の灰色カタマリは1マスなのに数字3 → 小さすぎ
		bd.getc(9, 3).setQues(6);
		bd.getc(9, 3).setQnum(3);
		var info = puzzle.check(true);
		assert.equal(info.complete, false);
		assert.equal(info.lastcode, "bkSizeLt");
	});

	it("roundtrips shading and borders in a pzprv3 URL", function() {
		var puzzle = playPuzzle();
		setSolvedAnswer(puzzle.board);

		var restored = new pzpr.Puzzle().open(puzzle.getFileData());
		GREYS.forEach(function(p) {
			assert.equal(restored.board.getc(p[0] * 2 + 1, p[1] * 2 + 1).ques, 6);
		});
		WALLS.forEach(function(p) {
			assert.equal(restored.board.getb(p[0], p[1]).qans, 1);
		});
	});
});
