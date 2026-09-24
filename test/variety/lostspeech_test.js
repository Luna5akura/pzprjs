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

	it("uses a single square as the default bank and supports marker input", function() {
		var puzzle = new pzpr.Puzzle().open("lostspeech/4/4");
		assert.deepEqual(
			puzzle.board.bank.pieces.map(function(piece) {
				return piece.serialize();
			}),
			["22u"]
		);
		assert.equal(puzzle.mouse.getInputModeList("edit").length, 11);
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
		var puzzle = new pzpr.Puzzle().open("lostspeech/3/2/64i7/2/21o/12o");
		assert.equal(puzzle.board.getc(1, 1).qnum, 6);
		assert.equal(puzzle.board.getc(3, 1).qnum, 4);
		assert.equal(puzzle.board.getc(5, 3).qnum, 7);
		assert.deepEqual(
			puzzle.board.bank.pieces.map(function(piece) {
				return piece.serialize();
			}),
			["21o", "12o"]
		);

		var url = puzzle.getURL();
		var reopened = new pzpr.Puzzle().open(url);
		assert.equal(reopened.board.getc(3, 1).qnum, 4);
		assert.equal(reopened.board.bank.pieces.length, 2);
	});

	it("only allows shapes on dotted cells or start cells", function() {
		// placement is blocked on an unmarked cell
		var p = new pzpr.Puzzle().open("lostspeech/2/2/j/1/12o");
		p.setMode("play");
		p.mouse.setInputMode("auto");
		p.mouse.activepiece = 0;
		p.mouse.inputPath("left", 3, 1);
		assert.equal(p.board.getc(3, 1).qans, 0);

		// a covered unmarked cell fails the check
		p.board.getc(1, 1).setQnum(6);
		p.board.getc(1, 3).setQnum(2);
		p.board.getc(1, 1).setQans(1);
		p.board.getc(1, 3).setQans(1);
		var r1 = p.check(true);
		assert.equal(r1.complete, true);

		p.board.getc(1, 3).setQnum(-1);
		var r2 = p.check(true);
		var codes = [];
		for (var i = 0; i < r2.length; i++) {
			codes.push(r2[i]);
		}
		assert.equal(codes[0], "nmNoDotNe");
	});

	it("checks the red dot rule", function() {
		// red dot: exactly one red shape, no blue shape
		var ok = checkResult(
			new pzpr.Puzzle().open("lostspeech/2/2/j/2/12o/12o"),
			function(p) {
				p.board.getc(1, 1).setQnum(6);
				p.board.getc(1, 3).setQnum(2);
				p.board.getc(3, 1).setQnum(7);
				p.board.getc(3, 3).setQnum(8);
				p.board.getc(1, 1).setQans(1);
				p.board.getc(1, 3).setQans(1);
				p.board.getc(3, 1).setAnum(1);
				p.board.getc(3, 3).setAnum(1);
			}
		);
		assert.equal(ok.complete, true);

		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/2/2/j/2/12o/12o"),
			function(p) {
				p.board.getc(1, 1).setQnum(6);
				p.board.getc(1, 3).setQnum(2);
				p.board.getc(3, 1).setQnum(7);
				p.board.getc(3, 3).setQnum(8);
				p.board.getc(1, 1).setQans(1);
				p.board.getc(1, 3).setQans(1);
				p.board.getc(3, 3).setQans(2); // blue covers the red dot
				p.board.getc(3, 1).setAnum(1);
			}
		);
		assert.equal(r.codes[0], "nmDotNe");
	});

	it("only allows shapes to extend the chain from the start cell", function() {
		var p = new pzpr.Puzzle().open("lostspeech/3/2/l/1/21o");
		p.setMode("play");
		var mouse = p.mouse;
		mouse.setInputMode("auto");
		mouse.activepiece = 0;
		p.board.getc(1, 1).setQnum(6);
		p.board.getc(3, 1).setQnum(2);
		p.board.getc(5, 1).setQnum(2);

		// 最初の形状が起点マスを覆わない配置は禁止
		mouse.inputPath("left", 3, 1);
		assert.equal(p.board.getc(3, 1).qans, 0);

		// 最初の形状は起点マスを覆う
		mouse.inputPath("left", 1, 1);
		assert.equal(p.board.getc(1, 1).qans, 1);
		assert.equal(p.board.getc(3, 1).qans, 1);

		// 2つ目の形状は既存の形状と隣接していない配置は禁止
		var p2 = new pzpr.Puzzle().open("lostspeech/6/1/l/1/21o");
		p2.setMode("play");
		p2.mouse.setInputMode("auto");
		p2.mouse.activepiece = 0;
		for (var bx2 = 1; bx2 <= 11; bx2 += 2) {
			p2.board.getc(bx2, 1).setQnum(2);
		}
		p2.board.getc(1, 1).setQnum(6);
		p2.mouse.inputPath("left", 1, 1);
		p2.mouse.inputPath("left", 7, 1);
		assert.equal(p2.board.getc(7, 1).qans, 0);

		// 隣接していれば配置できる (重複しないよう (5,1) から)
		p2.mouse.inputPath("left", 5, 1);
		assert.equal(p2.board.getc(5, 1).qans, 2);
		assert.equal(p2.board.getc(7, 1).qans, 2);
	});

	it("rejects a branching chain with no Hamiltonian path", function() {
		// 単格5つ: 起点(3,7), 黒点(5,3)(5,5)(7,5), 青点(3,5)
		// T字形に分岐しており、一筆書きの順序が存在しない
		var p = new pzpr.Puzzle().open(
			"lostspeech/8/8/p1l311k6zx0000000000000/1/11g"
		);
		// マーク位置: 黒点(5,3), 青点(3,5), 黒点(5,5), 黒点(7,5), 起点(3,7)
		// 各マスがそれぞれ1つの形状
		p.board.getc(5, 3).setQans(1);
		p.board.getc(3, 5).setQans(2);
		p.board.getc(5, 5).setQans(3);
		p.board.getc(7, 5).setQans(4);
		p.board.getc(3, 7).setQans(5);
		var r = p.check(true);
		var codes = [];
		for (var i = 0; i < r.length; i++) {
			codes.push(r[i]);
		}
		assert.equal(codes[0], "csNoConn");
	});

	it("only allows the next shape adjacent to the immediately previous one", function() {
		// 単格3つ: 3つ目は直前の2つ目と隣接していないと置けない
		var p = new pzpr.Puzzle().open("lostspeech/3/3/o/1/11g");
		p.setMode("play");
		p.mouse.setInputMode("auto");
		p.mouse.activepiece = 0;
		p.board.getc(3, 1).setQnum(6); // 青起点
		p.board.getc(3, 3).setQnum(2); // 起点の下
		p.board.getc(1, 1).setQnum(2); // 1つ目と隣接 (2つ目とは隣接しない)
		p.board.getc(5, 3).setQnum(2); // 2つ目と隣接

		// 1つ目: 起点を覆う
		p.mouse.inputPath("left", 3, 1);
		assert.equal(p.board.getc(3, 1).qans, 1);
		// 2つ目: 1つ目と隣接
		p.mouse.inputPath("left", 3, 3);
		assert.equal(p.board.getc(3, 3).qans, 2);
		// 3つ目: 直前(2つ目)と隣接しない配置は禁止
		// (1つ目とは隣接しているが、それだけでは置けない)
		p.mouse.inputPath("left", 1, 1);
		assert.equal(p.board.getc(1, 1).qans, 0);
		// 直前の形状と隣接する配置は許可
		p.mouse.inputPath("left", 5, 3);
		assert.equal(p.board.getc(5, 3).qans, 3);
	});

	it("checks dot coverage rules", function() {
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/2/2/j/1/12o"),
			function(p) {
				p.board.getc(1, 1).setQnum(6);
				p.board.getc(3, 1).setQnum(1);
				p.board.getc(1, 1).setQans(1);
				p.board.getc(1, 3).setQans(1);
			}
		);
		assert.equal(r.complete, false);
		assert.equal(r.codes[0], "nmDotNe");
	});

	it("requires the start cell to be covered by its own color", function() {
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/2/2/j/1/12o"),
			function(p) {
				p.board.getc(1, 1).setQnum(6);
				p.board.getc(3, 1).setQnum(2);
				p.board.getc(3, 3).setQnum(2);
				p.board.getc(3, 1).setQans(1);
				p.board.getc(3, 3).setQans(1);
			}
		);
		assert.equal(r.complete, false);
		assert.equal(r.codes[0], "nmStartNe");
	});

	it("rejects shapes that do not match the bank", function() {
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/2/2/j/1/12o"),
			function(p) {
				p.board.getc(1, 1).setQnum(6);
				p.board.getc(1, 1).setQans(1);
			}
		);
		assert.equal(r.codes[0], "bankInvalid");
	});

	it("rejects shapes of the same color that are not connected", function() {
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/5/2/p/1/21o"),
			function(p) {
				p.board.getc(1, 1).setQnum(6);
				p.board.getc(3, 1).setQnum(2);
				p.board.getc(7, 1).setQnum(2);
				p.board.getc(9, 1).setQnum(2);
				p.board.getc(1, 1).setQans(1);
				p.board.getc(3, 1).setQans(1);
				p.board.getc(7, 1).setQans(2);
				p.board.getc(9, 1).setQans(2);
			}
		);
		assert.equal(r.codes[0], "csNoConn");
	});

	it("treats triangle cells as non-connecting", function() {
		var ok = checkResult(
			new pzpr.Puzzle().open("lostspeech/5/1/k/1/21o"),
			function(p) {
				p.board.getc(1, 1).setQnum(6);
				p.board.getc(3, 1).setQnum(2);
				p.board.getc(5, 1).setQnum(2);
				p.board.getc(7, 1).setQnum(2);
				p.board.getc(1, 1).setQans(1);
				p.board.getc(3, 1).setQans(1);
				p.board.getc(5, 1).setQans(2);
				p.board.getc(7, 1).setQans(2);
			}
		);
		assert.equal(ok.complete, true);

		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/5/1/g5i/1/21o"),
			function(p) {
				p.board.getc(1, 1).setQnum(6);
				p.board.getc(5, 1).setQnum(2);
				p.board.getc(7, 1).setQnum(2);
				p.board.getc(1, 1).setQans(1);
				p.board.getc(3, 1).setQans(1);
				p.board.getc(5, 1).setQans(2);
				p.board.getc(7, 1).setQans(2);
			}
		);
		assert.equal(r.codes[0], "csNoConn");
	});

	it("forbids a shape contained in a shape of the other color", function() {
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/3/2/l/2/12o/22u"),
			function(p) {
				p.board.getc(1, 1).setQnum(6);
				p.board.getc(1, 3).setQnum(4);
				p.board.getc(3, 1).setQnum(2);
				p.board.getc(3, 3).setQnum(7);
				p.board.getc(1, 1).setQans(1);
				p.board.getc(1, 3).setQans(1);
				p.board.getc(1, 1).setAnum(1);
				p.board.getc(3, 1).setAnum(1);
				p.board.getc(1, 3).setAnum(1);
				p.board.getc(3, 3).setAnum(1);
			}
		);
		assert.equal(r.codes[0], "csContained");
	});

	it("accepts a complete two-color solution with a double dot", function() {
		var r = checkResult(
			new pzpr.Puzzle().open("lostspeech/3/2/64i7/2/21o/12o"),
			function(p) {
				p.board.getc(3, 3).setQnum(2);
				p.board.getc(5, 1).setQnum(2);
				p.board.getc(1, 1).setQans(1);
				p.board.getc(3, 1).setQans(1);
				p.board.getc(3, 1).setAnum(1);
				p.board.getc(3, 3).setAnum(1);
				p.board.getc(5, 1).setAnum(2);
				p.board.getc(5, 3).setAnum(2);
			}
		);
		assert.equal(r.complete, true);
	});

	it("deletes red shapes and supports a four-piece alternating bank", function() {
		var puzzle = new pzpr.Puzzle().open("lostspeech/2/2/j/2/12o/12o");
		puzzle.setMode("play");
		var mouse = puzzle.mouse;
		mouse.setInputMode("auto");
		puzzle.board.getc(1, 1).setQnum(2);
		puzzle.board.getc(1, 3).setQnum(7);

		// 赤の形状を置いて削除できる
		mouse.activepiece = 1;
		mouse.inputPath("left", 1, 1);
		assert.equal(puzzle.board.getc(1, 1).anum, 1);
		mouse.inputPath("right", 1, 1);
		assert.equal(puzzle.board.getc(1, 1).anum, -1);
		assert.equal(puzzle.board.getc(1, 3).anum, -1);

		// 3番目(青)・4番目(赤)の形状はインデックスの偶奇で色が決まる
		var p2 = new pzpr.Puzzle().open("lostspeech/2/2/j/4/12o/12o/12o/12o");
		assert.equal(p2.board.bank.allowAdd(), false);
		p2.board.getc(1, 1).setQnum(6);
		p2.board.getc(1, 3).setQnum(2);
		p2.board.getc(3, 1).setQnum(7);
		p2.board.getc(3, 3).setQnum(2);
		p2.setMode("play");
		p2.mouse.activepiece = 2;
		p2.mouse.inputPath("left", 1, 1);
		assert.equal(p2.board.getc(1, 1).qans, 1);
		p2.mouse.activepiece = 3;
		p2.mouse.inputPath("left", 3, 1);
		assert.equal(p2.board.getc(3, 1).qans, 0);
		assert.equal(p2.board.getc(3, 1).anum, 1);
	});

	it("places, rotates and removes shapes with the mouse and keyboard", function() {
		var puzzle = new pzpr.Puzzle().open("lostspeech/4/2/n/1/21o");
		puzzle.setMode("play");
		var mouse = puzzle.mouse;
		mouse.setInputMode("auto");
		mouse.activepiece = 0;
		for (var bx = 1; bx <= 7; bx += 2) {
			for (var by = 1; by <= 3; by += 2) {
				puzzle.board.getc(bx, by).setQnum(2);
			}
		}
		puzzle.board.getc(1, 1).setQnum(6);

		mouse.inputPath("left", 1, 1);
		assert.equal(puzzle.board.getc(1, 1).qans, 1);
		assert.equal(puzzle.board.getc(3, 1).qans, 1);

		puzzle.key.inputKeys("r");
		mouse.inputPath("left", 5, 1);
		assert.equal(puzzle.board.getc(5, 1).qans, 2);
		assert.equal(puzzle.board.getc(5, 3).qans, 2);

		mouse.inputPath("right", 5, 1);
		assert.equal(puzzle.board.getc(5, 1).qans, 0);
		assert.equal(puzzle.board.getc(5, 3).qans, 0);
	});
});
