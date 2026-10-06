var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

describe("Variety:hexmasyu", function() {
	function playPuzzle(url) {
		var puzzle = new pzpr.Puzzle().open(url || "hexmasyu/5/5");
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("line");
		return puzzle;
	}

	// 六角形セル (x, y) の中心をマウス入力座標 (raw board coords) に変換する。
	// ブラウザの実イベントと同じ値を作る: 描画座標 p に対する offsetX は
	// p + x0 (viewBox オフセット) なので、inputPoint には (offsetX - x0)/bw
	// すなわち p/bw をセットする。
	function toInput(puzzle, x, y) {
		var pc = puzzle.painter;
		pc.computeHexMetrics();
		var px = pc.hexOX + (x - y / 2) * pc.hexS;
		var py = pc.hexOY + y * pc.hexT;
		return [px / pc.bw, py / pc.bh];
	}

	function drawLine(puzzle, x1, y1, x2, y2) {
		var bd = puzzle.board;
		var c1 = bd.getHexCell(x1, y1),
			c2 = bd.getHexCell(x2, y2);
		var edge = bd.getHexEdgeByDir(c1, bd.getHexDirBetween(c1, c2));
		assert.ok(edge, "hex edge exists for (" + x1 + "," + y1 + ")-(" + x2 + "," + y2 + ")");
		edge.setLine();
		return edge;
	}

	it("creates a regular hexagonal board from the grid dimensions", function() {
		var puzzle = new pzpr.Puzzle().open("hexmasyu/5/5");
		var bd = puzzle.board;
		assert.deepEqual(bd.getHexSides(), { a: 3, b: 3 });
		assert.equal(bd.isHexRegular(), true);
		assert.equal(bd.cols, 5);
		assert.equal(bd.rows, 5);
		// 辺の数: (19*6 - 境界30) / 2 = 42
		assert.equal(bd.hexedges.length, 42);
		// 盤内のセルは 3n^2-3n+1 = 19
		assert.equal(bd.getHexInBoardCells().length, 19);
	});

	it("defines the hexagonal board region", function() {
		var puzzle = new pzpr.Puzzle().open("hexmasyu/5/5");
		var bd = puzzle.board;
		// 盤内
		assert.equal(bd.getHexCell(0, 0).isHexInBoard(), true);
		assert.equal(bd.getHexCell(4, 2).isHexInBoard(), true);
		assert.equal(bd.getHexCell(4, 4).isHexInBoard(), true);
		assert.equal(bd.getHexCell(2, 4).isHexInBoard(), true);
		assert.equal(bd.getHexCell(2, 0).isHexInBoard(), true);
		// 盤外 (矩形グリッドの角の三角形領域)
		assert.equal(bd.getHexCell(3, 0).isHexInBoard(), false);
		assert.equal(bd.getHexCell(4, 0).isHexInBoard(), false);
		assert.equal(bd.getHexCell(4, 1).isHexInBoard(), false);
		assert.equal(bd.getHexCell(0, 3).isHexInBoard(), false);
		assert.equal(bd.getHexCell(0, 4).isHexInBoard(), false);
		assert.equal(bd.getHexCell(1, 4).isHexInBoard(), false);

		// 変則盤面: 7x5 グリッド → a=4, b=3
		var puzzle2 = new pzpr.Puzzle().open("hexmasyu/7/5");
		var bd2 = puzzle2.board;
		assert.deepEqual(bd2.getHexSides(), { a: 4, b: 3 });
		assert.equal(bd2.isHexRegular(), false);
		assert.equal(bd2.getHexCell(0, 0).isHexInBoard(), true);
		assert.equal(bd2.getHexCell(6, 0).isHexInBoard(), false);
		assert.equal(bd2.getHexCell(0, 4).isHexInBoard(), false);
	});

	it("connects only cells inside the hexagon", function() {
		var puzzle = new pzpr.Puzzle().open("hexmasyu/5/5");
		var bd = puzzle.board;
		var c = bd.getHexCell(2, 2);
		assert.equal(c.getHexEdge("R").sideobj[1], bd.getHexCell(3, 2));
		assert.equal(c.getHexEdge("L").sideobj[0], bd.getHexCell(1, 2));
		assert.equal(c.getHexEdge("BL").sideobj[1], bd.getHexCell(2, 3));
		assert.equal(c.getHexEdge("BR").sideobj[1], bd.getHexCell(3, 3));
		assert.equal(c.getHexEdge("TR").sideobj[0], bd.getHexCell(2, 1));
		assert.equal(c.getHexEdge("TL").sideobj[0], bd.getHexCell(1, 1));

		// 六角形の頂点のセルは3辺だけ
		var corner = bd.getHexCell(0, 0);
		assert.equal(corner.getHexEdge("L"), null);
		assert.equal(corner.getHexEdge("TL"), null);
		assert.equal(corner.getHexEdge("TR"), null);
		assert.ok(corner.getHexEdge("R"));
		assert.ok(corner.getHexEdge("BL"));
		assert.ok(corner.getHexEdge("BR"));

		// 盤外のセルは辺を持たない
		var outside = bd.getHexCell(3, 0);
		assert.equal(outside.getHexEdge("R"), null);
		assert.equal(outside.getHexEdge("L"), null);
		assert.equal(outside.getHexEdge("BL"), null);
	});

	it("picks the cell under the mouse from hex geometry", function() {
		var puzzle = playPuzzle("hexmasyu/5/5");
		var bd = puzzle.board;
		var mouse = puzzle.mouse;

		var a = toInput(puzzle, 2, 2);
		mouse.inputPoint.init(a[0], a[1]);
		assert.equal(mouse.getcell(), bd.getHexCell(2, 2));

		// 盤外 (矩形グリッドではセルがあるが六角形の外) では emptycell
		var b = toInput(puzzle, 3, 0);
		mouse.inputPoint.init(b[0], b[1]);
		assert.equal(mouse.getcell().isnull, true);

		// 遠くの盤外でも emptycell
		var c = toInput(puzzle, 30, 0);
		mouse.inputPoint.init(c[0], c[1]);
		assert.equal(mouse.getcell().isnull, true);
	});

	it("picks the correct cell near the bottom of a large board", function() {
		// 回帰テスト: cube rounding の係数誤りで 9x9 以上の盤面の下側が
		// 1マスずれて拾われていた問題の再発防止
		var puzzle = playPuzzle("hexmasyu/9/9");
		var bd = puzzle.board;
		var mouse = puzzle.mouse;

		var cells = [[0, 0], [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [4, 4], [8, 4]];
		for (var i = 0; i < cells.length; i++) {
			var p = toInput(puzzle, cells[i][0], cells[i][1]);
			mouse.inputPoint.init(p[0], p[1]);
			assert.equal(
				mouse.getcell(),
				bd.getHexCell(cells[i][0], cells[i][1]),
				"cell (" + cells[i][0] + "," + cells[i][1] + ")"
			);
		}
	});

	it("draws a line by dragging from one hex center to another", function() {
		var puzzle = playPuzzle("hexmasyu/5/5");
		var bd = puzzle.board;
		var mouse = puzzle.mouse;

		var a = toInput(puzzle, 2, 2),
			b = toInput(puzzle, 3, 2);
		mouse.inputPath(a[0], a[1], b[0], b[1]);
		assert.equal(bd.getHexCell(2, 2).getHexEdge("R").isLine(), true);

		// 対角方向 (BR) のドラッグ
		var c = toInput(puzzle, 2, 2),
			d = toInput(puzzle, 3, 3);
		mouse.inputPath(c[0], c[1], d[0], d[1]);
		assert.equal(bd.getHexCell(2, 2).getHexEdge("BR").isLine(), true);

		// クリックしただけ (移動なし) では線は引かれない
		mouse.inputPath(a[0], a[1], a[0], a[1]);
		assert.equal(bd.getHexCell(2, 2).getHexEdge("L").isLine(), false);
	});

	it("toggles a peke on the edge nearest to the mouse", function() {
		var puzzle = playPuzzle("hexmasyu/5/5");
		puzzle.mouse.setInputMode("peke");
		var bd = puzzle.board;
		var mouse = puzzle.mouse;
		var pc = puzzle.painter;
		pc.computeHexMetrics();

		// (2,2)-(3,2) の辺の中点
		var mid = pc.getHexEdgeMidOffset("R");
		var mx = (pc.getHexCX(bd.getHexCell(2, 2)) + mid[0]) / pc.bw;
		var my = (pc.getHexCY(bd.getHexCell(2, 2)) + mid[1]) / pc.bh;
		mouse.inputPath(mx, my, mx, my);
		assert.equal(bd.getHexCell(2, 2).getHexEdge("R").qsub, 2);
	});

	it("places pearls with a single click (left=white, right=black)", function() {
		var puzzle = new pzpr.Puzzle().open("hexmasyu/5/5");
		puzzle.setMode("edit");
		puzzle.mouse.setInputMode("auto");
		var bd = puzzle.board;
		var mouse = puzzle.mouse;

		var a = toInput(puzzle, 2, 2);

		// 左クリック: 白丸
		mouse.inputPath(a[0], a[1], a[0], a[1]);
		assert.equal(bd.getHexCell(2, 2).qnum, 1);

		// 右クリック: 黒丸
		mouse.inputPath("right", a[0], a[1], a[0], a[1]);
		assert.equal(bd.getHexCell(2, 2).qnum, 2);

		// 右クリック (既に黒丸): 消去
		mouse.inputPath("right", a[0], a[1], a[0], a[1]);
		assert.equal(bd.getHexCell(2, 2).qnum, -1);

		// 左クリック (既に白丸なら消去): 白丸を置いてから再クリック
		mouse.inputPath(a[0], a[1], a[0], a[1]);
		assert.equal(bd.getHexCell(2, 2).qnum, 1);
		mouse.inputPath(a[0], a[1], a[0], a[1]);
		assert.equal(bd.getHexCell(2, 2).qnum, -1);
	});

	it("accepts a valid answer", function() {
		var puzzle = playPuzzle("hexmasyu/5/5");
		var bd = puzzle.board;
		bd.getHexCell(1, 0).setQnum(1); // 白丸 (0,1)
		bd.getHexCell(0, 1).setQnum(1); // 白丸 (1,0)
		bd.getHexCell(0, 0).setQnum(2); // 黒丸 (0,0)

		// (0,2)-(0,1)-(0,0)-(1,0)-(2,0)-(2,1)-(1,1)-(1,2)-(0,2)
		drawLine(puzzle, 0, 2, 0, 1);
		drawLine(puzzle, 0, 1, 0, 0);
		drawLine(puzzle, 0, 0, 1, 0);
		drawLine(puzzle, 1, 0, 2, 0);
		drawLine(puzzle, 2, 0, 2, 1);
		drawLine(puzzle, 2, 1, 1, 1);
		drawLine(puzzle, 1, 1, 1, 2);
		drawLine(puzzle, 1, 2, 0, 2);

		assert.equal(puzzle.check().complete, true);
	});

	it("rejects a line that turns on a white pearl", function() {
		var puzzle = playPuzzle("hexmasyu/3/3");
		var bd = puzzle.board;
		bd.getHexCell(0, 0).setQnum(1); // 白丸

		// 白丸 (0,0) で曲がる三角形ループ: (0,0)-(0,1)-(1,1)-(0,0)
		drawLine(puzzle, 0, 0, 0, 1);
		drawLine(puzzle, 0, 1, 1, 1);
		drawLine(puzzle, 1, 1, 0, 0);

		assert.equal(puzzle.check().complete, false);
		assert.equal(puzzle.check()[0], "mashuWCurve");
	});


	it("rejects multiple independent loops", function() {
		var puzzle = playPuzzle("hexmasyu/5/5");
		// 2つの独立した三角形ループ: (0,0)-(1,0)-(1,1) と (2,1)-(3,1)-(3,2)
		drawLine(puzzle, 0, 0, 1, 0);
		drawLine(puzzle, 1, 0, 1, 1);
		drawLine(puzzle, 1, 1, 0, 0);
		drawLine(puzzle, 2, 1, 3, 1);
		drawLine(puzzle, 3, 1, 3, 2);
		drawLine(puzzle, 3, 2, 2, 1);

		var result = puzzle.check();
		assert.equal(result.complete, false);
		assert.equal(result[0], "lnPlLoop");
	});
	it("encodes and decodes pearls in the URL", function() {
		var puzzle = new pzpr.Puzzle().open("hexmasyu/5/5");
		var bd = puzzle.board;
		bd.getHexCell(1, 0).setQnum(1);
		bd.getHexCell(2, 0).setQnum(2);
		bd.getHexCell(4, 2).setQnum(1);

		var url = puzzle.getURL().split("?")[1];
		assert.ok(url.indexOf("hexmasyu/5/5/") === 0);

		var puzzle2 = new pzpr.Puzzle().open(url);
		var bd2 = puzzle2.board;
		assert.deepEqual(bd2.getHexSides(), { a: 3, b: 3 });
		assert.equal(bd2.getHexCell(1, 0).qnum, 1);
		assert.equal(bd2.getHexCell(2, 0).qnum, 2);
		assert.equal(bd2.getHexCell(4, 2).qnum, 1);
		assert.equal(bd2.getHexCell(0, 0).qnum, -1);
	});

	it("round-trips lines through the file format", function() {
		var puzzle = playPuzzle("hexmasyu/5/5");
		var bd = puzzle.board;
		drawLine(puzzle, 2, 2, 3, 2);
		drawLine(puzzle, 2, 2, 2, 3);
		bd.getHexCell(2, 2).getHexEdge("BR").setPeke();

		var data = puzzle.getFileData();
		var puzzle2 = new pzpr.Puzzle().open(data);
		var bd2 = puzzle2.board;
		assert.deepEqual(bd2.getHexSides(), { a: 3, b: 3 });
		assert.equal(bd2.getHexCell(2, 2).getHexEdge("R").isLine(), true);
		assert.equal(bd2.getHexCell(2, 2).getHexEdge("BL").isLine(), true);
		assert.equal(bd2.getHexCell(2, 2).getHexEdge("BR").qsub, 2);
	});

	it("keeps the board a regular hexagon through every adjust button", function() {
		var puzzle = new pzpr.Puzzle().open("hexmasyu/5/5");
		var bd = puzzle.board;
		bd.getHexCell(1, 0).setQnum(1);
		bd.getHexCell(4, 2).setQnum(2);

		// どの方向の拡大ボタンでも、盤面全体が1周大きい正六角形になる
		bd.operate("expandup");
		assert.equal(bd.cols, 7);
		assert.equal(bd.rows, 7);
		assert.deepEqual(bd.getHexSides(), { a: 4, b: 4 });
		assert.equal(bd.isHexRegular(), true);
		assert.equal(bd.getHexCell(1, 0).qnum, 1);
		assert.equal(bd.getHexCell(4, 2).qnum, 2);

		bd.operate("expandlt");
		assert.equal(bd.cols, 9);
		assert.deepEqual(bd.getHexSides(), { a: 5, b: 5 });
		assert.equal(bd.isHexRegular(), true);
		assert.equal(bd.getHexCell(1, 0).qnum, 1);
		assert.equal(bd.getHexCell(4, 2).qnum, 2);

		bd.operate("expanddn");
		assert.equal(bd.cols, 11);
		assert.deepEqual(bd.getHexSides(), { a: 6, b: 6 });
		assert.equal(bd.isHexRegular(), true);

		bd.operate("expandrt");
		assert.equal(bd.cols, 13);
		assert.deepEqual(bd.getHexSides(), { a: 7, b: 7 });
		assert.equal(bd.isHexRegular(), true);

		// どの方向の縮小ボタンでも1周小さい正六角形になる
		bd.operate("reduceup");
		assert.equal(bd.cols, 11);
		assert.deepEqual(bd.getHexSides(), { a: 6, b: 6 });
		assert.equal(bd.isHexRegular(), true);
		assert.equal(bd.getHexCell(1, 0).qnum, 1);
		assert.equal(bd.getHexCell(4, 2).qnum, 2);

		bd.operate("reducelt");
		assert.equal(bd.cols, 9);
		assert.equal(bd.getHexCell(1, 0).qnum, 1);
		assert.equal(bd.getHexCell(4, 2).qnum, 2);

		bd.operate("reducedn");
		assert.equal(bd.cols, 7);
		bd.operate("reducert");
		assert.equal(bd.cols, 5);
		assert.deepEqual(bd.getHexSides(), { a: 3, b: 3 });
		assert.equal(bd.getHexCell(1, 0).qnum, 1);
		assert.equal(bd.getHexCell(4, 2).qnum, 2);

		// 1辺1まで縮小できるが、それ以上は縮小できない
		bd.operate("reduceup");
		bd.operate("reduceup");
		bd.operate("reduceup");
		assert.equal(bd.cols, 1);
		bd.operate("reduceup");
		assert.equal(bd.cols, 1);

		// undo で縮小前に戻る
		puzzle.opemgr.undo();
		assert.equal(bd.cols, 3);
		puzzle.opemgr.undo();
		assert.equal(bd.cols, 5);
		assert.equal(bd.getHexCell(1, 0).qnum, 1);
	});

	it("rotates and flips a regular hexagon along its symmetries", function() {
		var puzzle = new pzpr.Puzzle().open("hexmasyu/5/5");
		var bd = puzzle.board;
		// 3つの頂点に丸を置く
		bd.getHexCell(0, 0).setQnum(1); // 左上
		bd.getHexCell(2, 0).setQnum(2); // 右上
		bd.getHexCell(4, 4).setQnum(3); // 右下

		// turnr: 60度右回転 → 左上→右上→右下の頂点を巡回
		bd.operate("turnr");
		assert.equal(bd.getHexCell(2, 0).qnum, 1);
		assert.equal(bd.getHexCell(4, 2).qnum, 2);
		assert.equal(bd.getHexCell(2, 4).qnum, 3);
		assert.equal(bd.getHexCell(0, 0).qnum, -1);

		// turnl: 60度左回転 (元に戻る)
		bd.operate("turnl");
		assert.equal(bd.getHexCell(0, 0).qnum, 1);
		assert.equal(bd.getHexCell(2, 0).qnum, 2);
		assert.equal(bd.getHexCell(4, 4).qnum, 3);

		// flipx: 左右反転 → 左上と右上が入れ替わり、右下は下の頂点へ
		bd.operate("flipx");
		assert.equal(bd.getHexCell(2, 0).qnum, 1);
		assert.equal(bd.getHexCell(0, 0).qnum, 2);
		assert.equal(bd.getHexCell(2, 4).qnum, 3);

		// flipy: 上下反転 → 上の頂点は下の頂点へ、右下は右上へ
		bd.operate("flipy");
		assert.equal(bd.getHexCell(4, 4).qnum, 1);
		assert.equal(bd.getHexCell(2, 4).qnum, 2);
		assert.equal(bd.getHexCell(0, 0).qnum, 3);

		// undo で flipy 前に戻る
		puzzle.opemgr.undo();
		assert.equal(bd.getHexCell(2, 0).qnum, 1);
		assert.equal(bd.getHexCell(0, 0).qnum, 2);
		assert.equal(bd.getHexCell(2, 4).qnum, 3);
	});

	it("undoes line drawing", function() {
		var puzzle = playPuzzle("hexmasyu/5/5");
		var bd = puzzle.board;
		drawLine(puzzle, 2, 2, 3, 2);
		assert.equal(bd.getHexCell(2, 2).getHexEdge("R").isLine(), true);

		puzzle.opemgr.undo();
		assert.equal(bd.getHexCell(2, 2).getHexEdge("R").isLine(), false);

		puzzle.opemgr.redo();
		assert.equal(bd.getHexCell(2, 2).getHexEdge("R").isLine(), true);
	});
});
