var assert = require("assert");
var pzpr = require("../../");

describe("Variety:lostspeech", function() {
	function checkResult(puzzle, setup) {
		setup(puzzle);
		var result = puzzle.check(true);
		var codes = [];
		for (var i = 0; i < result.length; i++) {
			codes.push(result[i]);
		}
		return { complete: result.complete, codes: codes };
	}

	it("uses four squares as the default bank and supports marker input", function() {
		var puzzle = new pzpr.Puzzle().open("lostspeech/4/4");
		assert.deepEqual(
			puzzle.board.bank.pieces.map(function(piece) {
				return piece.serialize();
			}),
			["22u", "22u", "22u", "22u"]
		);
		assert.equal(puzzle.mouse.getInputModeList("edit").length, 13);
		assert.equal(puzzle.mouse.getInputModeList("play").length, 4);

		var cell = puzzle.board.getc(1, 1);
		cell.setQnum(1);
		assert.equal(cell.qnum, 1);
		cell.setQnum(6);
		assert.equal(cell.qnum, 6);
		cell.setQues(7);
		assert.equal(cell.isValid(), false);
	});

	it("encodes markers and the bank in the URL", function() {
		var puzzle = new pzpr.Puzzle().open(
			"lostspeech/2/2/61170/4/12o/12o/21o/21o"
		);
		assert.equal(puzzle.board.getc(1, 1).qnum, 6);
		assert.equal(puzzle.board.getc(1, 3).qnum, 1);
		assert.equal(puzzle.board.getc(3, 1).qnum, 1);
		assert.equal(puzzle.board.getc(3, 3).qnum, 7);
		assert.deepEqual(
			puzzle.board.bank.pieces.map(function(piece) {
				return piece.serialize();
			}),
			["12o", "12o", "21o", "21o"]
		);

		var url = puzzle.getURL();
		var reopened = new pzpr.Puzzle().open(url);
		assert.equal(reopened.board.getc(1, 1).qnum, 6);
		assert.equal(reopened.board.getc(3, 3).qnum, 7);
		assert.deepEqual(
			reopened.board.bank.pieces.map(function(piece) {
				return piece.serialize();
			}),
			["12o", "12o", "21o", "21o"]
		);
	});

	it("aligns the second bank below the second board without an add button", function() {
		var puzzle = new pzpr.Puzzle().open(
			"lostspeech/2/2/61170/4/12o/12o/12o/12o"
		);
		var bank = puzzle.board.bank;
		var r = puzzle.painter.bankratio;
		// 右盤面のグリッド左端 (セル座標 cols+1) をバンク座標に換算
		var off = (puzzle.board.cols + 1) / r;

		assert.equal(bank.pieces[0].x, 0);
		assert.equal(bank.pieces[1].x, bank.pieces[0].w + 1);
		assert.equal(bank.pieces[2].x, off);
		assert.equal(bank.pieces[3].x, off + bank.pieces[2].w + 1);

		// 形状の追加操作は無効
		assert.equal(bank.allowAdd, false);
		assert.equal(bank.addButton.index, null);
	});

	it("shares cells between the two boards (synced editing)", function() {
		var puzzle = new pzpr.Puzzle().open("lostspeech/2/2");
		puzzle.setMode("edit");
		var mouse = puzzle.mouse;
		var off = puzzle.board.cols * 2 + 2; // 6

		// 左盤面の座標で起点を入力
		mouse.setInputMode("start-blue");
		mouse.inputPath("left", 1, 1);
		assert.equal(puzzle.board.getc(1, 1).qnum, 6);

		// 右盤面の座標で入力しても同じセルに反映される (同期編集)
		mouse.setInputMode("start-red");
		mouse.inputPath("left", off + 1, 3);
		assert.equal(puzzle.board.getc(1, 3).qnum, 7);

		// 起点は各色1つだけ: 新しい青起点を置くと古い起点が消える
		mouse.setInputMode("start-blue");
		mouse.inputPath("left", off + 3, 3);
		assert.equal(puzzle.board.getc(1, 1).qnum, -1);
		assert.equal(puzzle.board.getc(3, 3).qnum, 6);
	});

	it("places, chains and cascade-removes shapes on both boards", function() {
		// 赤起点なし (赤の図形は置かない)。マーカー: (0,0)青起点, 他は空心点
		var puzzle = new pzpr.Puzzle().open(
			"lostspeech/2/2/62220/4/12o/12o/12o/12o"
		);
		puzzle.setMode("play");
		var mouse = puzzle.mouse;
		mouse.setInputMode("auto");
		var off = puzzle.board.cols * 2 + 2; // 6

		// 盤面1: 青1 (ピース0, 縦ドミノ) を起点(0,0)に配置 → (0,0),(1,0) を覆う
		mouse.activepiece = 0;
		mouse.inputPath("left", 1, 1);
		assert.equal(puzzle.board.getc(1, 1).qans, 1);
		assert.equal(puzzle.board.getc(1, 3).qans, 1);

		// 盤面2: 青2 (ピース2) を右盤面の座標で配置 → qans2に反映
		mouse.activepiece = 2;
		mouse.inputPath("left", off + 1, 1);
		assert.equal(puzzle.board.getc(1, 1).qans2, 1);
		assert.equal(puzzle.board.getc(1, 3).qans2, 1);

		// 鎖: 2つ目の形状は直前の形状と隣接していないと置けない
		mouse.activepiece = 0;
		mouse.inputPath("left", 3, 1); // (1,0)-(1,1): 1つ目の(0,0)と隣接
		assert.equal(puzzle.board.getc(3, 1).qans, 2);
		assert.equal(puzzle.board.getc(3, 3).qans, 2);
		assert.equal(puzzle.board.getc(1, 1).qans, 1); // 1つ目は残る

		// 右クリックで2つ目のみ削除
		mouse.inputPath("right", 3, 1);
		assert.equal(puzzle.board.getc(3, 1).qans, 0);
		assert.equal(puzzle.board.getc(3, 3).qans, 0);
		assert.equal(puzzle.board.getc(1, 1).qans, 1); // 1つ目は残る

		// 右クリックで1つ目を削除すると、以降の形状もまとめて消える
		mouse.inputPath("left", 3, 1);
		mouse.inputPath("right", 1, 1);
		assert.equal(puzzle.board.getc(1, 1).qans, 0);
		assert.equal(puzzle.board.getc(1, 3).qans, 0);
		assert.equal(puzzle.board.getc(3, 1).qans, 0);
		assert.equal(puzzle.board.getc(3, 3).qans, 0);

		// 盤面2の形状も右クリックで削除できる
		mouse.inputPath("right", off + 1, 1);
		assert.equal(puzzle.board.getc(1, 1).qans2, 0);
		assert.equal(puzzle.board.getc(1, 3).qans2, 0);
	});

	it("restricts each bank to its own board", function() {
		var puzzle = new pzpr.Puzzle().open(
			"lostspeech/2/2/61170/4/12o/12o/12o/12o"
		);
		puzzle.setMode("play");
		var mouse = puzzle.mouse;
		mouse.setInputMode("auto");
		var off = puzzle.board.cols * 2 + 2;

		// 盤面1のピースは盤面2に置けない
		mouse.activepiece = 0;
		mouse.inputPath("left", off + 1, 1);
		assert.equal(puzzle.board.getc(1, 1).qans, 0);
		assert.equal(puzzle.board.getc(1, 3).qans, 0);

		// 盤面2のピースは盤面1に置けない
		mouse.activepiece = 2;
		mouse.inputPath("left", 1, 1);
		assert.equal(puzzle.board.getc(1, 1).qans2, 0);
		assert.equal(puzzle.board.getc(1, 3).qans2, 0);

		// 正しい盤面なら置ける
		mouse.activepiece = 2;
		mouse.inputPath("left", off + 1, 1);
		assert.equal(puzzle.board.getc(1, 1).qans2, 1);
		assert.equal(puzzle.board.getc(1, 3).qans2, 1);
	});

	it("requires the first shape to cover the start cell", function() {
		var puzzle = new pzpr.Puzzle().open(
			"lostspeech/2/2/61170/4/12o/12o/12o/12o"
		);
		puzzle.setMode("play");
		var mouse = puzzle.mouse;
		mouse.setInputMode("auto");
		mouse.activepiece = 0;

		// 起点を覆わない配置は禁止
		mouse.inputPath("left", 1, 3); // 縦: 起点(0,0)を覆わない
		assert.equal(puzzle.board.getc(1, 3).qans, 0);
		assert.equal(puzzle.board.getc(3, 3).qans, 0);
	});

	it("checks dot coverage on each board", function() {
		// 盤面2で黒点が2つの形状に覆われている → nmDotNe
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/2/2/61170/4/12o/12o/12o/12o"),
			function(p) {
				// 盤面1: 縦ドミノ2枚 (正しい)
				p.board.getc(1, 1).setQans(1);
				p.board.getc(1, 3).setQans(1);
				p.board.getc(3, 1).setAnum(1);
				p.board.getc(3, 3).setAnum(1);
				// 盤面2: 青の横ドミノ + 赤の縦ドミノで黒点(0,1)が2重に覆われる
				p.board.getc(1, 1).setQans2(1);
				p.board.getc(3, 1).setQans2(1);
				p.board.getc(3, 1).setAnum2(1);
				p.board.getc(3, 3).setAnum2(1);
			}
		);
		assert.equal(r.complete, false);
		assert.equal(r.codes[0], "nmDotNe");

		// 黒点を覆わない場合も nmDotNe (黒点はちょうど1つ覆われる)
		var sparse = checkResult(
			new pzpr.Puzzle().open("lostspeech/2/2/61170/4/12o/12o/12o/12o"),
			function(p) {
				// 盤面1: 青の縦ドミノのみ (黒点(0,1)が覆われない)
				p.board.getc(1, 1).setQans(1);
				p.board.getc(1, 3).setQans(1);
				p.board.getc(3, 1).setAnum(1);
				p.board.getc(3, 3).setAnum(1);
				// 盤面2: 青の縦ドミノのみ
				p.board.getc(1, 1).setQans2(1);
				p.board.getc(1, 3).setQans2(1);
			}
		);
		assert.equal(sparse.complete, false);
		assert.equal(sparse.codes[0], "nmDotNe");

		// 両方の盤面が正しければ complete (跨盤包含も満たす4x4の配置)
		var ok = checkResult(
			new pzpr.Puzzle().open("lostspeech/4/4/622g222gh22g2270000/4/22u/22u/32t0/23eg"),
			function(p) {
				// 盤面1: 2x2正方形2枚
				for (var r = 0; r < 2; r++) {
					for (var c = 0; c < 2; c++) {
						p.board.getc(2 * c + 1, 2 * r + 1).setQans(1);
					}
				}
				for (var r = 2; r < 4; r++) {
					for (var c = 2; c < 4; c++) {
						p.board.getc(2 * c + 1, 2 * r + 1).setAnum(1);
					}
				}
				// 盤面2: Tテトリミノ2枚
				// 青T: (0,0),(0,1),(0,2),(1,1)
				p.board.getc(1, 1).setQans2(1);
				p.board.getc(3, 1).setQans2(1);
				p.board.getc(5, 1).setQans2(1);
				p.board.getc(3, 3).setQans2(1);
				// 赤T: (2,2),(3,1),(3,2),(3,3)
				p.board.getc(5, 5).setAnum2(1);
				p.board.getc(3, 7).setAnum2(1);
				p.board.getc(5, 7).setAnum2(1);
				p.board.getc(7, 7).setAnum2(1);
			}
		);
		assert.equal(ok.complete, true);
	});

	it("checks hollow colored dots: uncovered is fine, other colors are not", function() {
		// 4x2盤: (0,0)青起点 (1,0)空心 (2,0)青空心点 (3,0)空心
		//        (0,1)空心 (1,1)赤空心点 (2,1)空心 (3,1)赤起点
		// バンクは4枚とも横ドミノ
		var base = "lostspeech/4/2/62922a2700/4/21o/21o/21o/21o";

		// 正解: 青は(0,0)-(1,0)と(2,0)-(3,0)の2枚 (青空心点を青が覆う)、
		// 赤は(2,1)-(3,1)の1枚 (赤空心点は覆わない)。両盤面とも同じ配置。
		var ok = checkResult(new pzpr.Puzzle().open(base), function(p) {
			p.board.getc(1, 1).setQans(1);
			p.board.getc(3, 1).setQans(1);
			p.board.getc(5, 1).setQans(2);
			p.board.getc(7, 1).setQans(2);
			p.board.getc(5, 3).setAnum(1);
			p.board.getc(7, 3).setAnum(1);
			p.board.getc(1, 1).setQans2(1);
			p.board.getc(3, 1).setQans2(1);
			p.board.getc(5, 1).setQans2(2);
			p.board.getc(7, 1).setQans2(2);
			p.board.getc(5, 3).setAnum2(1);
			p.board.getc(7, 3).setAnum2(1);
		});
		assert.equal(ok.complete, true);

		// 青空心点を覆わない場合も正しい (高々1つ: 0個でもよい)
		var uncovered = checkResult(new pzpr.Puzzle().open(base), function(p) {
			p.board.getc(1, 1).setQans(1);
			p.board.getc(3, 1).setQans(1);
			p.board.getc(5, 3).setAnum(1);
			p.board.getc(7, 3).setAnum(1);
			p.board.getc(1, 1).setQans2(1);
			p.board.getc(3, 1).setQans2(1);
			p.board.getc(5, 3).setAnum2(1);
			p.board.getc(7, 3).setAnum2(1);
		});
		assert.equal(uncovered.complete, true);

		// 盤面1で青空心点を赤が覆う → nmDotNe
		var wrongColor = checkResult(new pzpr.Puzzle().open(base), function(p) {
			p.board.getc(1, 1).setQans(1);
			p.board.getc(3, 1).setQans(1);
			p.board.getc(5, 3).setAnum(1);
			p.board.getc(7, 3).setAnum(1);
			p.board.getc(5, 1).setAnum(2);
			p.board.getc(7, 1).setAnum(2);
			p.board.getc(1, 1).setQans2(1);
			p.board.getc(3, 1).setQans2(1);
			p.board.getc(5, 1).setQans2(2);
			p.board.getc(7, 1).setQans2(2);
			p.board.getc(5, 3).setAnum2(1);
			p.board.getc(7, 3).setAnum2(1);
		});
		assert.equal(wrongColor.complete, false);
		assert.equal(wrongColor.codes[0], "nmDotNe");

		// 盤面1で赤空心点を青が覆う → nmDotNe
		var wrongColor2 = checkResult(new pzpr.Puzzle().open(base), function(p) {
			p.board.getc(1, 1).setQans(1);
			p.board.getc(3, 1).setQans(1);
			p.board.getc(1, 3).setQans(2);
			p.board.getc(3, 3).setQans(2);
			p.board.getc(5, 3).setAnum(1);
			p.board.getc(7, 3).setAnum(1);
			p.board.getc(1, 1).setQans2(1);
			p.board.getc(3, 1).setQans2(1);
			p.board.getc(5, 1).setQans2(2);
			p.board.getc(7, 1).setQans2(2);
			p.board.getc(5, 3).setAnum2(1);
			p.board.getc(7, 3).setAnum2(1);
		});
		assert.equal(wrongColor2.complete, false);
		assert.equal(wrongColor2.codes[0], "nmDotNe");
	});

	it("forbids shapes from covering the other color's start cell", function() {
		// 2x6盤: (0,0)青起点 (0,5)赤起点、その他は空心点。バンクはドミノ。
		var base = "lostspeech/2/6/622222222272000/4/12o/12o/12o/12o";

		// 正解: 青の鎖は赤起点の手前で止まる
		var ok = checkResult(new pzpr.Puzzle().open(base), function(p) {
			p.board.getc(1, 1).setQans(1);
			p.board.getc(1, 3).setQans(1);
			p.board.getc(1, 5).setQans(2);
			p.board.getc(1, 7).setQans(2);
			p.board.getc(1, 9).setAnum(1);
			p.board.getc(1, 11).setAnum(1);
			p.board.getc(1, 1).setQans2(1);
			p.board.getc(1, 3).setQans2(1);
			p.board.getc(1, 5).setQans2(2);
			p.board.getc(1, 7).setQans2(2);
			p.board.getc(1, 9).setAnum2(1);
			p.board.getc(1, 11).setAnum2(1);
		});
		assert.equal(ok.complete, true);

		// 盤面1で青が赤起点を覆う → nmStartCross
		var badBlue = checkResult(new pzpr.Puzzle().open(base), function(p) {
			p.board.getc(1, 1).setQans(1);
			p.board.getc(1, 3).setQans(1);
			p.board.getc(1, 5).setQans(2);
			p.board.getc(1, 7).setQans(2);
			p.board.getc(1, 9).setQans(3);
			p.board.getc(1, 11).setQans(3);
			p.board.getc(1, 11).setAnum(1);
			p.board.getc(3, 11).setAnum(1);
			p.board.getc(1, 1).setQans2(1);
			p.board.getc(1, 3).setQans2(1);
			p.board.getc(1, 5).setQans2(2);
			p.board.getc(1, 7).setQans2(2);
			p.board.getc(1, 9).setAnum2(1);
			p.board.getc(1, 11).setAnum2(1);
		});
		assert.equal(badBlue.complete, false);
		assert.equal(badBlue.codes[0], "nmStartCross");

		// 盤面1で赤の鎖が青起点まで伸びる → nmStartCross
		var badRed = checkResult(new pzpr.Puzzle().open(base), function(p) {
			p.board.getc(1, 1).setQans(1);
			p.board.getc(3, 1).setQans(1);
			p.board.getc(1, 9).setAnum(1);
			p.board.getc(1, 11).setAnum(1);
			p.board.getc(3, 9).setAnum(2);
			p.board.getc(3, 11).setAnum(2);
			p.board.getc(3, 5).setAnum(3);
			p.board.getc(3, 7).setAnum(3);
			p.board.getc(1, 5).setAnum(4);
			p.board.getc(1, 7).setAnum(4);
			p.board.getc(1, 1).setAnum(5);
			p.board.getc(1, 3).setAnum(5);
			p.board.getc(1, 1).setQans2(1);
			p.board.getc(3, 1).setQans2(1);
			p.board.getc(1, 9).setAnum2(1);
			p.board.getc(1, 11).setAnum2(1);
		});
		assert.equal(badRed.complete, false);
		assert.equal(badRed.codes[0], "nmStartCross");
	});

	it("requires a blue start, and makes the red shape optional", function() {
		// 青起点がない → nmStartNe
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/2/2/61170/4/12o/12o/12o/12o"),
			function(p) {
				p.board.getc(1, 1).setQnum(-1);
				p.board.getc(1, 3).setQans(1);
				p.board.getc(3, 1).setQans(1);
				p.board.getc(3, 3).setAnum(1);
				p.board.getc(1, 3).setQans2(1);
				p.board.getc(3, 1).setQans2(1);
				p.board.getc(3, 3).setAnum2(1);
			}
		);
		assert.equal(r.complete, false);
		assert.equal(r.codes[0], "nmStartNe");

		// 盤面1の青が起点(0,0)を覆っていない → nmStartNe
		var r2 = checkResult(
			new pzpr.Puzzle().open("lostspeech/2/2/61170/4/12o/12o/12o/12o"),
			function(p) {
				// 盤面1の青は横ドミノを(1,0)-(1,1)に置いた
				p.board.getc(1, 3).setQans(1);
				p.board.getc(3, 3).setQans(1);
				p.board.getc(3, 1).setAnum(1);
				p.board.getc(3, 3).setAnum(1);
				// 盤面2: 横ドミノ2枚 (正しい)
				p.board.getc(1, 1).setQans2(1);
				p.board.getc(3, 1).setQans2(1);
				p.board.getc(1, 3).setAnum2(1);
				p.board.getc(3, 3).setAnum2(1);
			}
		);
		assert.equal(r2.complete, false);
		assert.equal(r2.codes[0], "nmStartNe");

		// 赤起点が無いのに赤の図形を置いた → nmStartNe
		var r3 = checkResult(
			new pzpr.Puzzle().open("lostspeech/2/2/62220/4/12o/21o/12o/22u"),
			function(p) {
				p.board.getc(1, 1).setQans(1);
				p.board.getc(1, 3).setQans(1);
				p.board.getc(1, 1).setQans2(1);
				p.board.getc(3, 1).setQans2(1);
				p.board.getc(3, 3).setAnum(1); // 赤起点がないのに赤を置いた
			}
		);
		assert.equal(r3.complete, false);
		assert.equal(r3.codes[0], "nmStartNe");

		// 赤起点が無い盤面で青のみ配置すれば complete
		var ok = checkResult(
			new pzpr.Puzzle().open("lostspeech/2/2/62220/4/12o/21o/12o/22u"),
			function(p) {
				// 盤面1: 縦ドミノ ((0,0),(1,0))
				p.board.getc(1, 1).setQans(1);
				p.board.getc(1, 3).setQans(1);
				// 盤面2: 横ドミノ ((0,0),(0,1))
				p.board.getc(1, 1).setQans2(1);
				p.board.getc(3, 1).setQans2(1);
			}
		);
		assert.equal(ok.complete, true);
	});

	it("rejects shapes that do not match the bank", function() {
		// 2x3: 青起点(0,0), 赤起点(1,2)。バンクは青=2x2正方形, 赤=単セル。
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/2/3/62222700/4/22u/11g/22u/11g"),
			function(p) {
				// 盤面1にバンクと異なる形状 (横ドミノ) を置く
				p.board.getc(1, 1).setQans(1);
				p.board.getc(3, 1).setQans(1);
				p.board.getc(3, 5).setAnum(1);
				// 盤面2: 正しい形状 (赤起点を避けた2x2正方形)
				p.board.getc(1, 1).setQans2(1);
				p.board.getc(1, 3).setQans2(1);
				p.board.getc(3, 1).setQans2(1);
				p.board.getc(3, 3).setQans2(1);
				p.board.getc(3, 5).setAnum2(1);
			}
		);
		assert.equal(r.complete, false);
		assert.equal(r.codes[0], "bankInvalid");
	});

	it("rejects disconnected chains on each board", function() {
		// 5x1: 青起点(0,0) + 空心点4つ。盤面1の青の鎖が分断されている → csNoConn
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/5/1/622220/4/12o/12o/12o/12o"),
			function(p) {
				// 盤面1: ドミノ2枚が離れている
				p.board.getc(1, 1).setQans(1);
				p.board.getc(3, 1).setQans(1);
				p.board.getc(7, 1).setQans(2);
				p.board.getc(9, 1).setQans(2);
				// 盤面2: 起点を覆うドミノ1枚 (正しい)
				p.board.getc(1, 1).setQans2(1);
				p.board.getc(3, 1).setQans2(1);
			}
		);
		assert.equal(r.complete, false);
		assert.equal(r.codes[0], "csNoConn");
	});

	it("allows shapes contained in other shapes on the same board", function() {
		// 3x3: 青起点(0,0), 赤起点(1,1), 空心点(0,1),(1,0), 青赤点(0,2),(1,2)。
		// 起点を含まない2つ目の形状どうし {(0,2),(1,2)} は同一セル集合だが、
		// 同じ盤面内の青と赤の包含は許される。
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/3/3/624274i00/4/12o/12o/12o/12o"),
			function(p) {
				// 盤面1: 青の鎖 {(0,0),(0,1)} + {(0,2),(1,2)}
				p.board.getc(1, 1).setQans(1);
				p.board.getc(3, 1).setQans(1);
				p.board.getc(5, 1).setQans(2);
				p.board.getc(5, 3).setQans(2);
				// 盤面1: 赤の鎖 {(1,0),(1,1)} + {(0,2),(1,2)}
				p.board.getc(1, 3).setAnum(1);
				p.board.getc(3, 3).setAnum(1);
				p.board.getc(5, 1).setAnum(2);
				p.board.getc(5, 3).setAnum(2);
				// 盤面2: 同じ配置
				p.board.getc(1, 1).setQans2(1);
				p.board.getc(3, 1).setQans2(1);
				p.board.getc(5, 1).setQans2(2);
				p.board.getc(5, 3).setQans2(2);
				p.board.getc(1, 3).setAnum2(1);
				p.board.getc(3, 3).setAnum2(1);
				p.board.getc(5, 1).setAnum2(2);
				p.board.getc(5, 3).setAnum2(2);
			}
		);
		assert.equal(r.complete, true);
	});

	it("allows shapes contained in other shapes that share a cell", function() {
		// 3x3: 青起点(0,0), 青赤点(0,1), 赤起点(0,2)。バンクは青=2x2正方形, 赤=単セル。
		// 赤の単セル(0,1)が青の2x2正方形に完全に含まれるが、
		// 同じ盤面内の青と赤の包含は許される。
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/3/3/62242272200/4/22u/11g/22u/11g"),
			function(p) {
				// 盤面1: 青=2x2正方形, 赤=単セル(0,2)と(0,1) (青の正方形に包含)
				p.board.getc(1, 1).setQans(1);
				p.board.getc(1, 3).setQans(1);
				p.board.getc(3, 1).setQans(1);
				p.board.getc(3, 3).setQans(1);
				p.board.getc(1, 5).setAnum(1);
				p.board.getc(1, 3).setAnum(2);
				// 盤面2: 青=2x2正方形, 赤=単セル(0,2)と(0,1)
				p.board.getc(1, 1).setQans2(1);
				p.board.getc(1, 3).setQans2(1);
				p.board.getc(3, 1).setQans2(1);
				p.board.getc(3, 3).setQans2(1);
				p.board.getc(1, 5).setAnum2(1);
				p.board.getc(1, 3).setAnum2(2);
			}
		);
		assert.equal(r.complete, true);
	});

	it("rejects shapes contained in shapes of the other solution with the variant rule", function() {
		// 3x3: 青起点(0,0), 赤起点(1,1), 空心点(0,1),(0,2),(1,0),(1,2)。
		// variantルール有効時、起点を含まない2つ目の形状 {(0,2),(1,2)} が
		// 両盤面で同一のため跨盤包含 (csCrossContained) になる。
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/3/3/622272i00/4/12o/12o/12o/12o"),
			function(p) {
				p.setConfig("variant", true);
				// 盤面1: 青の鎖 {(0,0),(0,1)} + {(0,2),(1,2)}、赤 {(1,0),(1,1)}
				p.board.getc(1, 1).setQans(1);
				p.board.getc(3, 1).setQans(1);
				p.board.getc(5, 1).setQans(2);
				p.board.getc(5, 3).setQans(2);
				p.board.getc(1, 3).setAnum(1);
				p.board.getc(3, 3).setAnum(1);
				// 盤面2: 同じ配置
				p.board.getc(1, 1).setQans2(1);
				p.board.getc(3, 1).setQans2(1);
				p.board.getc(5, 1).setQans2(2);
				p.board.getc(5, 3).setQans2(2);
				p.board.getc(1, 3).setAnum2(1);
				p.board.getc(3, 3).setAnum2(1);
			}
		);
		assert.equal(r.complete, false);
		assert.equal(r.codes.indexOf("csCrossContained") >= 0, true);
	});

	it("allows contained shapes across boards without the variant rule", function() {
		// variantルール無効時は跨盤包含を検査しない (各盤面内のルールのみ)
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/3/3/622272i00/4/12o/12o/12o/12o"),
			function(p) {
				// 盤面1: 青の鎖 {(0,0),(0,1)} + {(0,2),(1,2)}、赤 {(1,0),(1,1)}
				p.board.getc(1, 1).setQans(1);
				p.board.getc(3, 1).setQans(1);
				p.board.getc(5, 1).setQans(2);
				p.board.getc(5, 3).setQans(2);
				p.board.getc(1, 3).setAnum(1);
				p.board.getc(3, 3).setAnum(1);
				// 盤面2: 同じ配置 (跨盤包含だがvariant無効なので不問)
				p.board.getc(1, 1).setQans2(1);
				p.board.getc(3, 1).setQans2(1);
				p.board.getc(5, 1).setQans2(2);
				p.board.getc(5, 3).setQans2(2);
				p.board.getc(1, 3).setAnum2(1);
				p.board.getc(3, 3).setAnum2(1);
			}
		);
		assert.equal(r.complete, true);
	});

	it("round-trips board 2 answers through the file data", function() {
		var puzzle = new pzpr.Puzzle().open(
			"lostspeech/2/2/61170/4/12o/12o/12o/12o"
		);
		puzzle.board.getc(1, 1).setQans(1);
		puzzle.board.getc(3, 1).setQans(1);
		puzzle.board.getc(1, 3).setAnum(1);
		puzzle.board.getc(3, 3).setAnum(1);
		puzzle.board.getc(1, 1).setQans2(2);
		puzzle.board.getc(1, 3).setQans2(2);
		puzzle.board.getc(3, 1).setAnum2(2);
		puzzle.board.getc(3, 3).setAnum2(2);

		var file = puzzle.getFileData();
		var reopened = new pzpr.Puzzle().open(file);
		assert.equal(reopened.board.getc(1, 1).qans, 1);
		assert.equal(reopened.board.getc(3, 3).anum, 1);
		assert.equal(reopened.board.getc(1, 1).qans2, 2);
		assert.equal(reopened.board.getc(1, 3).qans2, 2);
		assert.equal(reopened.board.getc(3, 1).anum2, 2);
		assert.equal(reopened.board.getc(3, 3).anum2, 2);
	});
});
