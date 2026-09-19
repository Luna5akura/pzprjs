//
// パズル固有スクリプト部 ピルズ版 pills.js
//
// Place the given set of 1x3/3x1 pills in the grid.  Cells contain dots
// (0-4).  Every pill has a different value, equal to the number of dots it
// covers; the values are always 1..N.  Row/column clues give the number of
// dots covered by pills in that row/column.
//
// The pill fleet is displayed in a bank under the grid (like Battleships).
// The answer shades the cells of every pill, which are drawn as hollow
// capsules.  If two pills touch orthogonally, drag with the right mouse
// button (in any play-mode tool) to draw a border between them so the pills
// remain separate components.
//
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["pills"], {
	//---------------------------------------------------------
	// マウス入力系
	MouseEvent: {
		use: true,
		inputModes: {
			edit: ["number", "clear"],
			play: ["shade", "unshade", "border", "clear"]
		},

		mouseinput_auto: function() {
			if (this.puzzle.playmode) {
				if (this.mousestart || this.mousemove) {
					this.inputcell();
				}
			} else if (this.puzzle.editmode && this.mousestart) {
				if (!this.inputqnum_excell()) {
					this.inputqnum();
				}
			}
		},

		/* 遊びモードでは、どのツールを選んでいても右ボタンのドラッグは
		   ピル同士を分ける境界線の入力にする */
		mouseinput: function() {
			if (
				this.puzzle.playmode &&
				this.btn === "right" &&
				this.inputMode !== "border"
			) {
				this.inputborder();
				return;
			}
			this.common.mouseinput.call(this);
		},

		inputqnum_excell: function() {
			var excell = this.getcell_excell();
			if (excell.isnull || excell.group !== "excell") {
				return false;
			}
			if (excell !== this.cursor.getex()) {
				this.setcursor(excell);
			} else {
				this.inputqnum_main(excell);
			}
			return true;
		}
	},

	//---------------------------------------------------------
	// キーボード入力系
	KeyEvent: {
		enablemake: true,
		enableplay: true,

		keyinput: function(ca) {
			if (!this.puzzle.editmode) {
				return;
			}
			if (!this.cursor.getex().isnull) {
				this.key_inputexcell(ca);
			} else {
				this.key_inputqnum(ca);
			}
		}
	},

	//---------------------------------------------------------
	// 盤面管理系
	Cell: {
		minnum: 0,
		maxnum: 4,

		/* 問題データはドット数 */
		getNum: function() {
			return Math.max(this.qnum, 0);
		},
		setNum: function(val) {
			this.setQnum(val >= 0 && val <= 4 ? val : -1);
			this.setQans(0);
		},

		noNum: function() {
			return !this.isnull && this.qnum < 0;
		},

		/* 周囲の配置が変わるとこのマス自身のカプセル形状も変わるので、
		   自分と隣接マスをまとめて再描画する (battleshipsと同じ) */
		posthook: {
			qans: function() {
				this.drawaround();
			}
		}
	},

	Border: {
		/* 境界線が引かれると両側のカプセル形状が変わる */
		posthook: {
			qans: function() {
				this.drawaround();
			}
		}
	},

	ExCell: {
		minnum: 0,
		maxnum: 200,
		disInputHatena: true,

		/* 盤面端のセルから見た隣接ExCellはピルに含まれない */
		isShade: function() {
			return false;
		},

		posthook: {
			qnum: function() {
				this.board.updatePillBank();
			}
		}
	},

	Board: {
		cols: 10,
		rows: 10,
		hasborder: 1,
		hasexcell: 1,

		UP: 1,
		DN: 2,
		LT: 3,
		RT: 4,
		CENTER: 5,
		SINGLE: 6,
		UPLT: 7,
		UPRT: 8,
		DNLT: 9,
		DNRT: 10,

		/* ピルの値は常に1..N。Nはヒントの合計(三角数)から求める */
		getPillCount: function() {
			var sum = 0;
			for (var c = 0; c < this.cols; c++) {
				var ex = this.getex(c * 2 + 1, -1);
				if (ex.qnum >= 0) {
					sum += ex.qnum;
				}
			}
			var n = Math.floor((Math.sqrt(1 + 8 * sum) - 1) / 2);
			return (n * (n + 1)) / 2 === sum ? n : 0;
		},

		updatePillBank: function() {
			if (!this.bank) {
				return;
			}
			var n = this.getPillCount();
			var preset = [];
			for (var i = 0; i < n; i++) {
				preset.push("31s");
			}
			var current = this.bank.pieces.map(function(piece) {
				return piece.serialize();
			});
			if (this.puzzle.pzpr.util.sameArray(preset, current)) {
				return;
			}
			this.bank.initialize(preset);
			if (this.puzzle.painter) {
				this.bank.draw();
			}
		},

		getBankPiecesInGrid: function() {
			var ret = [];
			var shapes = this.sblkmgr.components;
			for (var r = 0; r < shapes.length; r++) {
				var block = shapes[r];
				ret.push([block.clist.getBlockShapes().canon, block.clist]);
			}
			return ret;
		},

		/* 黒マス(ピルの一部)の周囲との接続状況から部品形状を求める */
		getShape: function(top, bottom, left, right) {
			if ((top && bottom) || (left && right)) {
				return this.CENTER;
			} else if (top) {
				if (left) {
					return this.DNRT;
				}
				if (right) {
					return this.DNLT;
				}
				return this.DN;
			} else if (bottom) {
				if (left) {
					return this.UPRT;
				}
				if (right) {
					return this.UPLT;
				}
				return this.UP;
			} else if (left) {
				return this.RT;
			} else if (right) {
				return this.LT;
			} else {
				return this.SINGLE;
			}
		}
	},

	/* 黒マス(qans)の連結成分が1つのピルを構成する。
	   ピルどうしが接する場合は境界線で分ける */
	AreaShadeGraph: {
		enabled: true,
		relation: { "cell.qans": "node", "border.qans": "separator" },
		isedgevalidbylinkobj: function(border) {
			return !border.isBorder();
		}
	},

	//---------------------------------------------------------
	// ピルの艦隊(バンク)
	Bank: {
		enabled: true,

		/* ピルはすべて1x3のカプセル。個数はヒントの合計から決まり、
		   Board.updatePillBank() が内容を再構築する */
		defaultPreset: function() {
			return [];
		}
	},

	BankPiece: {
		canon: null,
		compressed: null,

		deserializeRaw: function(str) {
			var tokens = str.split(":");
			this.w = +tokens[0];
			this.str = tokens[1];
			this.h = this.str.length / this.w;
		},

		deserialize: function(str) {
			this.canon = null;
			this.compressed = null;

			if (!str) {
				this.w = this.h = 1;
				this.str = "0";
				return;
			}

			if (str.indexOf(":") !== -1) {
				this.deserializeRaw(str);
				return;
			}

			if (str.length < 3) {
				throw new Error("Invalid piece");
			}

			this.w = parseInt(str[0], 36);
			this.h = parseInt(str[1], 36);
			var len = this.w * this.h;

			var bits = "";
			for (var i = 2; i < str.length; i++) {
				bits += parseInt(str[i], 32)
					.toString(2)
					.padStart(5, "0");
			}

			this.str = bits.substring(0, len).padEnd(len, "0");
		},

		canonize: function() {
			if (this.canon) {
				return this.canon;
			}

			var data = [this.str, "", "", "", "", "", "", ""];

			for (var y = 0; y < this.h; y++) {
				for (var x = 0; x < this.w; x++) {
					data[1] += this.str[(this.h - y - 1) * this.w + x];
				}
			}
			for (var x = 0; x < this.w; x++) {
				for (var y = 0; y < this.h; y++) {
					data[4] += this.str[y * this.w + x];
					data[5] += this.str[(this.h - y - 1) * this.w + x];
				}
			}
			data[2] = data[1]
				.split("")
				.reverse()
				.join("");
			data[3] = data[0]
				.split("")
				.reverse()
				.join("");
			data[6] = data[5]
				.split("")
				.reverse()
				.join("");
			data[7] = data[4]
				.split("")
				.reverse()
				.join("");

			for (var i = 0; i < 8; i++) {
				data[i] = (i < 4 ? this.w : this.h) + ":" + data[i];
			}

			data.sort();
			return (this.canon = data[0]);
		},

		serialize: function() {
			if (this.compressed) {
				return this.compressed;
			}

			var ret = this.w.toString(36) + this.h.toString(36);

			for (var i = 0; i < this.str.length; i += 5) {
				var sub = this.str.substr(i, 5).padEnd(5, "0");
				ret += parseInt(sub, 2).toString(32);
			}

			while (ret.lastIndexOf("0") === ret.length - 1) {
				ret = ret.substring(0, ret.length - 1);
			}

			return (this.compressed = ret);
		}
	},

	//---------------------------------------------------------
	// 画像表示系
	Graphic: {
		hideHatena: true,
		margin: 1,

		paint: function() {
			this.drawBGCells();
			this.drawGrid();
			this.drawPillDots();
			this.drawBoardPills();
			this.drawBorders();
			this.drawNumbersExCell();
			this.drawChassis();
			this.drawBank();
			this.drawTarget();
		},

		/* ピルを分ける境界線はカプセルと同じ色で描く */
		getBorderColor: function(border) {
			if (border.qans) {
				return this.quescolor;
			}
			return null;
		},

		/* セルのドット(0～4個)をサイコロの目の配置で描く */
		drawPillDots: function() {
			var g = this.vinc("pill_dot", "auto", true);
			var bw = this.bw,
				bh = this.bh;
			var dsize = Math.max(Math.min(bw, bh) * 0.085, 1.5);
			var positions = [
				[],
				[[0.5, 0.5]],
				[
					[0.32, 0.32],
					[0.68, 0.68]
				],
				[
					[0.32, 0.32],
					[0.5, 0.5],
					[0.68, 0.68]
				],
				[
					[0.32, 0.32],
					[0.68, 0.32],
					[0.32, 0.68],
					[0.68, 0.68]
				]
			];
			var clist = this.range.cells;
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				g.vid = "pill_dot_" + cell.id;
				var n = Math.max(cell.qnum, 0);
				if (n === 0 || n > 4) {
					g.vhide();
					continue;
				}
				g.fillStyle = cell.error === 1 ? this.errcolor1 : this.quescolor;
				var dots = positions[n];
				for (var j = 0; j < dots.length; j++) {
					g.fillCircle(
						cell.bx * bw + (dots[j][0] - 0.5) * bw,
						cell.by * bh + (dots[j][1] - 0.5) * bh,
						dsize
					);
				}
			}
		},

		/* 盤面上のピルを中空のカプセルとして描く */
		drawBoardPills: function() {
			var g = this.vinc("cell_pill", "auto");
			var clist = this.range.cells;

			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				var px = cell.bx * this.bw;
				var py = cell.by * this.bh;
				var r = this.bw;
				var color = cell.qans
					? cell.error === 1
						? this.errcolor1
						: this.quescolor
					: null;
				var shape = cell.qans
					? this.board.getShape(
							this.isPillConnected(cell, "top"),
							this.isPillConnected(cell, "bottom"),
							this.isPillConnected(cell, "left"),
							this.isPillConnected(cell, "right")
						)
					: null;

				this.drawSinglePill(g, "c_pill_" + cell.id, px, py, r, shape, color);
			}
		},

		/* 同じピル(連結成分)のマスが隣接しているかどうか。カプセルの端は
		   ピルの端でのみ丸くなり、途中の辺や境界線で区切られた側は直角になる */
		isPillConnected: function(cell, dir) {
			var nb = cell.adjacent[dir];
			return (
				!!cell.sblk &&
				!!nb &&
				!nb.isnull &&
				nb.sblk === cell.sblk
			);
		},

		drawSinglePill: function(g, vid, px, py, r, shape, color) {
			g.vid = vid;
			this.drawSinglePillPath(g, px, py, r, shape, color);
		},

		drawSinglePillPath: function(g, px, py, r, shape, color) {
			var linewidth = Math.max((1 + this.cw / 40) | 0, 1);
			if (!!color && shape !== null) {
				g.lineWidth = linewidth;
				r -= linewidth;
				g.beginPath();
				g.moveTo(px + r, py);

				if (
					shape === this.board.DN ||
					shape === this.board.RT ||
					shape === this.board.DNRT ||
					shape === this.board.SINGLE
				) {
					g.arc(px, py, r, 0, 0.5 * Math.PI, false);
				} else {
					g.lineTo(px + r, py + r);
				}
				g.lineTo(px, py + r);

				if (
					shape === this.board.DN ||
					shape === this.board.LT ||
					shape === this.board.DNLT ||
					shape === this.board.SINGLE
				) {
					g.arc(px, py, r, 0.5 * Math.PI, Math.PI, false);
				} else {
					g.lineTo(px - r, py + r);
				}
				g.lineTo(px - r, py);

				if (
					shape === this.board.UP ||
					shape === this.board.LT ||
					shape === this.board.UPLT ||
					shape === this.board.SINGLE
				) {
					g.arc(px, py, r, Math.PI, 1.5 * Math.PI, false);
				} else {
					g.lineTo(px - r, py - r);
				}
				g.lineTo(px, py - r);

				if (
					shape === this.board.UP ||
					shape === this.board.RT ||
					shape === this.board.UPRT ||
					shape === this.board.SINGLE
				) {
					g.arc(px, py, r, 1.5 * Math.PI, 2 * Math.PI, false);
				} else {
					g.lineTo(px + r, py - r);
				}
				g.lineTo(px + r, py);
				g.strokeStyle = color;
				g.stroke();
				return true;
			} else {
				g.vhide();
				return false;
			}
		},

		/* バンクの各ピルを、盤面と同じ1マスずつのカプセル部品で描く
		   (battleshipsのdrawBankPieceと同様のセル単位の描画) */
		drawBankPiece: function(g, piece, idx) {
			var br = this.bankratio;
			var cell = this.cw * br;
			var r = cell * 0.5 - 1;

			for (var i = 0; i < 3; i++) {
				var vid = "pb_piece_" + idx + "_" + i;
				if (piece) {
					var px = cell * (piece.x + 0.25 + i) + r;
					var py = cell * (piece.y + 0.25) + r;
					py += (this.board.rows + 0.5) * this.ch + 1;
					var shape = this.board.getShape(false, false, i > 0, i < 2);
					this.drawSinglePill(g, vid, px, py, r, shape, this.quescolor);
				} else {
					this.drawSinglePill(g, vid, 0, 0, r, null, null);
				}
			}
		},

		/* solverの解答表示: 数字ではなく、プレイヤーが描くのと同じ中空の
		   カプセルを描く。バックエンドは各マスにピルの値(text)を返すので、
		   同じ値のマス同士を1つのカプセルとして描画する */
		drawSolverOverlayCellEntry: function(g, cell, entry) {
			var kind = this.getSolverOverlayEntryKind(entry);
			var item = typeof entry === "string" ? null : entry && entry.item;
			if (
				kind !== "text" ||
				!item ||
				typeof item.data === "undefined" ||
				isNaN(+item.data)
			) {
				return this.common.drawSolverOverlayCellEntry.call(this, g, cell, entry);
			}

			var px = cell.bx * this.bw;
			var py = cell.by * this.bh;
			var r = this.bw;
			var shape = this.board.getShape(
				this.isSolverPillConnected(cell, "top"),
				this.isSolverPillConnected(cell, "bottom"),
				this.isSolverPillConnected(cell, "left"),
				this.isSolverPillConnected(cell, "right")
			);
			return this.drawSinglePillPath(g, px, py, r, shape, this.quescolor);
		},

		getSolverPillValue: function(cell) {
			var state = cell && cell._solverState;
			var entries = state instanceof Array ? state : state ? [state] : [];
			for (var i = 0; i < entries.length; i++) {
				var item = entries[i] && entries[i].item;
				if (
					item &&
					item.kind === "text" &&
					typeof item.data !== "undefined" &&
					!isNaN(+item.data)
				) {
					return +item.data;
				}
			}
			return null;
		},

		isSolverPillConnected: function(cell, dir) {
			var nb = cell.adjacent[dir];
			if (!nb || nb.isnull) {
				return false;
			}
			var value = this.getSolverPillValue(cell);
			return value !== null && this.getSolverPillValue(nb) === value;
		},

		/* 接している別のピル同士の間に、プレイヤーが引く境界線と同じ
		   黒い仕切り線を引く */
		drawSolverOverlayLines: function() {
			var g = this.vinc("solver_line", "crispEdges");
			var blist = this.range.borders;
			var lm = Math.max(this.lm * 0.72, 1);

			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];
				g.vid = "b_solver_line_" + border.id;

				var cell1 = border.sidecell[0],
					cell2 = border.sidecell[1];
				var value1 = this.getSolverPillValue(cell1);
				var value2 = this.getSolverPillValue(cell2);
				if (
					value1 !== null &&
					value2 !== null &&
					value1 !== value2 &&
					!this.hasAnswerLineState(border)
				) {
					var px = border.bx * this.bw;
					var py = border.by * this.bh;
					g.fillStyle = this.quescolor;
					if (border.isVert()) {
						g.fillRectCenter(px, py, lm, this.bh + lm);
					} else {
						g.fillRectCenter(px, py, this.bw + lm, lm);
					}
				} else {
					g.vhide();
				}

				g.vid = "b_solver_line2_" + border.id;
				g.vhide();
			}
		}
	},

	//---------------------------------------------------------
	// URLエンコード/デコード処理
	Encode: {
		decodePzpr: function() {
			this.decodeNumber16();
			this.decodeNumber16ExCell();
			this.board.updatePillBank();
		},
		encodePzpr: function() {
			this.encodeNumber16();
			this.encodeNumber16ExCell();
		}
	},

	//---------------------------------------------------------
	// FileIO
	FileIO: {
		decodeData: function() {
			this.decodeCellQnum();
			this.decodeCellAns();
		},
		encodeData: function() {
			this.encodeCellQnum();
			this.encodeCellAns();
		}
	},

	//---------------------------------------------------------
	// 正解判定処理実行部
	AnsCheck: {
		checklist: [
			"checkBankPiecesAvailable",
			"checkBankPiecesInvalid",
			"checkBankPiecesUsed",
			"checkPillValues",
			"checkPillClues"
		],

		checkPillValues: function() {
			var comps = this.board.sblkmgr.components;
			var seen = {};
			for (var i = 0; i < comps.length; i++) {
				var clist = comps[i].clist;
				var sum = 0;
				for (var j = 0; j < clist.length; j++) {
					sum += Math.max(clist[j].qnum, 0);
				}
				if (sum < 1 || sum > comps.length || seen[sum]) {
					clist.seterr(1);
					this.failcode.add("nmPillSet");
				}
				seen[sum] = 1;
			}
		},

		checkPillClues: function() {
			var bd = this.board;
			var r, c, cell, sum, ex;

			for (r = 0; r < bd.rows; r++) {
				ex = bd.getex(-1, r * 2 + 1);
				if (ex.qnum < 0) {
					continue;
				}
				sum = 0;
				for (c = 0; c < bd.cols; c++) {
					cell = bd.getc(c * 2 + 1, r * 2 + 1);
					if (cell.qans) {
						sum += Math.max(cell.qnum, 0);
					}
				}
				if (sum !== ex.qnum) {
					ex.seterr(1);
					this.failcode.add("nmPillClue");
				}
			}

			for (c = 0; c < bd.cols; c++) {
				ex = bd.getex(c * 2 + 1, -1);
				if (ex.qnum < 0) {
					continue;
				}
				sum = 0;
				for (r = 0; r < bd.rows; r++) {
					cell = bd.getc(c * 2 + 1, r * 2 + 1);
					if (cell.qans) {
						sum += Math.max(cell.qnum, 0);
					}
				}
				if (sum !== ex.qnum) {
					ex.seterr(1);
					this.failcode.add("nmPillClue");
				}
			}
		}
	}
});
