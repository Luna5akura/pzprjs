// Four Winds
// Numbered cells emit straight arrows in the four cardinal directions.  The
// number is the total length of the arrows starting at that cell.  Every
// empty cell must be covered by exactly one arrow.
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["fourwinds", "four-winds"], {
	MouseEvent: {
		use: true,
		inputModes: {
			edit: ["number", "clear"],
			play: ["arrow", "clear"]
		},
		autoedit_func: "qnum",

		mouseinput_auto: function() {
			if (this.puzzle.editmode) {
				if (this.mousestart || this.mousemove) {
					this.inputqnum();
				}
			} else if (this.puzzle.playmode) {
				this.inputfourwinds();
			}
		},

		/* "arrow"入力モード時も同じ操作にする */
		inputarrow_cell: function() {
			this.inputfourwinds();
		},

		/* 線分入力操作:
		 *  - 左ドラッグ: 始点セルからドラッグ先セルまで、一直線の線分全体を
		 *    連続した矢印として置く (矢じりは線分の末端にだけ描かれる)
		 *  - 左クリック(ドラッグなし): セルの矢印線分全体/×印を消す
		 *  - 右クリック: 矢印があれば消し、なければ×印をトグルする */
		inputfourwinds: function() {
			var cell = this.getcell();

			if (this.mousestart) {
				this.arrowStartCell = cell;
			}

			if ((this.mousestart || this.mousemove) && this.btn === "right") {
				this.inputcross_toggle();
				return;
			}

			if ((this.mousestart || this.mousemove) && this.btn === "left") {
				this.inputline_drag();
				return;
			}

			if (this.mouseend && this.btn === "left" && this.notInputted()) {
				this.inputline_clear();
			}
		},

		/* 始点セルから現在のセルまで、同一直線上のマスに矢印を置く。
		 * ドラッグに合わせて線分が伸び縮みする。 */
		inputline_drag: function() {
			var start = this.arrowStartCell,
				cell = this.getcell();
			if (!start || !cell || start.isnull || cell.isnull) {
				return;
			}

			var dir = 0;
			if (start.bx === cell.bx) {
				if (cell.by > start.by) {
					dir = start.DN;
				} else if (cell.by < start.by) {
					dir = start.UP;
				}
			} else if (start.by === cell.by) {
				if (cell.bx > start.bx) {
					dir = start.RT;
				} else if (cell.bx < start.bx) {
					dir = start.LT;
				}
			}
			if (!dir) {
				return;
			}

			/* 連続した setQdir は一度にまとめて再描画する */
			var pc = this.puzzle.painter;
			pc.suspendAll();

			/* 始点の隣から、この方向に伸びていた古い線分を消す
			 * (始点が数字マスの場合もそこから伸びる線分を消す) */
			var pos = start.getaddr();
			pos.movedir(dir, 2);
			while (1) {
				var c = pos.getc();
				if (c.isnull || c.qdir !== dir) {
					break;
				}
				c.setQdir(0);
				pos.movedir(dir, 2);
			}

			/* 始点から現在のセルまで矢印を置く (数字のセルには置かない)。
			 * 数字マスからのドラッグでは数字マスの隣から線分が始まる */
			pos = start.getaddr();
			if (start.qnum !== -1) {
				pos.movedir(dir, 2);
			}
			while (1) {
				var c2 = pos.getc();
				if (c2.isnull || c2.qnum !== -1) {
					break;
				}
				if (c2.qdir !== dir) {
					c2.setQdir(dir);
				}
				if (pos.equals(cell.getaddr())) {
					break;
				}
				pos.movedir(dir, 2);
			}

			pc.unsuspend();
		},

		inputcross_toggle: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell || cell.qnum !== -1) {
				return;
			}

			if (cell.qdir) {
				cell.setQdir(0);
			} else {
				cell.setQsub(cell.qsub ? 0 : 1);
			}
			cell.draw();

			this.mouseCell = cell;
		},

		/* クリックしたセルの矢印線分全体を消す (×印も一緒に消す) */
		inputline_clear: function() {
			var cell = this.getcell();
			if (cell.isnull || cell.qnum !== -1) {
				return;
			}
			if (!cell.qdir) {
				if (cell.qsub) {
					cell.setQsub(0);
					cell.draw();
				}
				return;
			}

			var dir = cell.qdir,
				opp = [0, 2, 1, 4, 3],
				pos = cell.getaddr();

			/* 連続した setQdir は一度にまとめて再描画する */
			var pc = this.puzzle.painter;
			pc.suspendAll();

			while (1) {
				pos.movedir(opp[dir], 2);
				var c = pos.getc();
				if (c.isnull || c.qdir !== dir) {
					break;
				}
				c.setQdir(0);
			}
			pos = cell.getaddr();
			while (1) {
				pos.movedir(dir, 2);
				var c2 = pos.getc();
				if (c2.isnull || c2.qdir !== dir) {
					break;
				}
				c2.setQdir(0);
			}
			cell.setQdir(0);
			cell.setQsub(0);
			pc.unsuspend();
		},

		/* 矢印の直接入力(互換用): 数字のセルには置けない */
		inputarrow_cell_main: function(cell, dir) {
			if (
				!cell ||
				cell.isnull ||
				cell.qnum !== -1 ||
				dir < cell.UP ||
				dir > cell.RT
			) {
				return;
			}
			cell.setQdir(dir);
			cell.setQsub(0);
			cell.draw();
		}
	},
	KeyEvent: { enablemake: true },
	Cell: {
		disInputHatena: true,
		minnum: 0,
		maxnum: function() {
			return this.board.cols * this.board.rows;
		},
		getArrow: function() {
			return this.qdir || 0;
		},

		/* 矢印の描画は線分全体の構造 (隣のセルの矢印や長さバッジ) に依存する
		 * ので、qdir が変わったら盤面全体を再描画して残像を防ぐ */
		posthook: {
			qdir: function() {
				this.puzzle.redraw();
			}
		}
	},
	Board: { cols: 8, rows: 8, hasborder: 1 },
	Graphic: {
		gridcolor_type: "LIGHT",
		numbercolor_func: "qnum",

		paint: function() {
			this.drawBGCells();
			this.drawGrid();
			this.drawArrowRays();
			this.drawPekes();
			this.drawQuesNumbers();
			this.drawChassis();
			this.drawTarget();
		},

		/* penpuz方式の表示: 矢印を数字セルの辺から矢じりまで続く光線として描く。
		 * 矢印の開始セル(数字に隣接)には長さのバッジを表示する。
		 * 注意: Candle は 1 回の描画呼び出しごとに vid を消費するため、
		 * 矢柄の線と矢じりは別々の vid に分ける (同じ vid に2回描くと
		 * 2つ目の要素がキャッシュされず残像が増殖する)。 */
		drawArrowRays: function() {
			var g = this.vinc("cell_arrow", "auto");
			var clist = this.range.cells;
			/* pzprではbw/bhがセル半幅(仮想座標2単位分) */
			var hw = this.bw,
				hh = this.bh;
			var inset = this.cw * 0.07,
				apex = this.cw * 0.33,
				halfw = this.cw * 0.16;

			g.lineWidth = Math.max(this.cw * 0.08, 1.5);

			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				var dir = cell.getArrow();
				g.vid = "c_arrow_ray_" + cell.id;
				if (!dir || cell.qnum !== -1) {
					g.vhide();
					g.vid = "c_arrow_head_" + cell.id;
					g.vhide();
					continue;
				}

				var px = cell.bx * this.bw,
					py = cell.by * this.bh;
				var next = cell
					.getaddr()
					.movedir(dir, 2)
					.getc();
				var isShaft = !next.isnull && next.qnum === -1 && next.qdir === dir;

				g.strokeStyle = g.fillStyle = cell.trial
					? this.trialcolor
					: this.qanscolor;

				if (dir === cell.UP) {
					g.strokeLine(px, py + hh, px, isShaft ? py - hh : py - inset);
				} else if (dir === cell.DN) {
					g.strokeLine(px, py - hh, px, isShaft ? py + hh : py + inset);
				} else if (dir === cell.LT) {
					g.strokeLine(px + hw, py, isShaft ? px - hw : px - inset, py);
				} else if (dir === cell.RT) {
					g.strokeLine(px - hw, py, isShaft ? px + hw : px + inset, py);
				}

				/* 矢じりは線分の末端 (isShaft でないセル) にだけ描く */
				g.vid = "c_arrow_head_" + cell.id;
				if (isShaft) {
					g.vhide();
				} else {
					g.beginPath();
					if (dir === cell.UP) {
						g.moveTo(px, py - apex);
						g.lineTo(px - halfw, py - inset);
						g.lineTo(px + halfw, py - inset);
					} else if (dir === cell.DN) {
						g.moveTo(px, py + apex);
						g.lineTo(px - halfw, py + inset);
						g.lineTo(px + halfw, py + inset);
					} else if (dir === cell.LT) {
						g.moveTo(px - apex, py);
						g.lineTo(px - inset, py - halfw);
						g.lineTo(px - inset, py + halfw);
					} else if (dir === cell.RT) {
						g.moveTo(px + apex, py);
						g.lineTo(px + inset, py - halfw);
						g.lineTo(px + inset, py + halfw);
					}
					g.fill();
				}
			}

			this.drawArrowBadges();
		},

		drawArrowBadges: function() {
			var g = this.vinc("cell_arrowbadge", "auto");
			var clist = this.range.cells;
			var opp = [0, 2, 1, 4, 3];

			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				var dir = cell.getArrow();
				g.vid = "c_arrow_badge_" + cell.id;
				if (!dir || cell.qnum !== -1) {
					g.vhide();
					g.vid = "c_arrow_badge_num_" + cell.id;
					g.vhide();
					continue;
				}

				var prev = cell
					.getaddr()
					.movedir(opp[dir], 2)
					.getc();
				if (!prev.isnull && prev.qdir === dir) {
					g.vhide();
					g.vid = "c_arrow_badge_num_" + cell.id;
					g.vhide();
					continue;
				}

				var len = 0,
					c = cell;
				while (!c.isnull && c.qnum === -1 && c.qdir === dir) {
					len++;
					c = c
						.getaddr()
						.movedir(dir, 2)
						.getc();
				}
				if (len <= 1) {
					g.vhide();
					g.vid = "c_arrow_badge_num_" + cell.id;
					g.vhide();
					continue;
				}

				var px = cell.bx * this.bw,
					py = cell.by * this.bh;
				g.vid = "c_arrow_badge_" + cell.id;
				g.fillStyle = this.bgcolor;
				g.strokeStyle = cell.trial ? this.trialcolor : this.qanscolor;
				g.lineWidth = Math.max(this.cw * 0.04, 1);
				g.shapeCircle(px, py, this.cw * 0.26);
				g.vid = "c_arrow_badge_num_" + cell.id;
				g.fillStyle = cell.trial ? this.trialcolor : this.qanscolor;
				this.disptext("" + len, px, py, { ratio: 0.3 });
			}
		}
	},

	// 矢印のない空白セルは自動的に黒マス(カベ)として描画する
	"Graphic@windkabe": {
		getBGCellColor: function(cell) {
			var info = cell.error || cell.qinfo;
			if (cell.qnum === -1 && !cell.qdir) {
				if (info === 1) {
					return this.errcolor1;
				} else if (cell.trial) {
					return this.trialcolor;
				}
				return this.shadecolor;
			} else if (info === 1) {
				return this.errbcolor1;
			}
			return null;
		}
	},

	Encode: {
		decodePzpr: function() {
			this.decodeArrowNumber16();
			this.board.cell.each(function(cell) {
				if (cell.qnum === 4095 && cell.qdir >= 1 && cell.qdir <= 4) {
					cell.qnum = -1;
				}
			});
		},
		encodePzpr: function() {
			var bd = this.board,
				out = "",
				skipped = 0;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i],
					dir = cell.qdir || 0,
					num = cell.qnum;
				var encoded = "";
				if (dir >= 1 && dir <= 4 && num === -1) {
					// Keep an answer arrow on an empty cell round-trippable.
					encoded = "-" + dir.toString(16) + "fff";
				} else if (num === -3) {
					encoded = "+";
				} else if (num === -2) {
					encoded = dir.toString(16) + ".";
				} else if (num >= 0 && num < 16 && dir >= 0 && dir <= 4) {
					encoded = dir.toString(16) + num.toString(16);
				} else if (num >= 16 && num < 256 && dir >= 0 && dir <= 4) {
					encoded = (dir + 5).toString(16) + num.toString(16).padStart(2, "0");
				} else if (num >= 256 && num < 4096 && dir >= 0 && dir <= 4) {
					encoded = "-" + dir.toString(16) + num.toString(16).padStart(3, "0");
				}
				if (!encoded) {
					skipped++;
					continue;
				}
				while (skipped > 0) {
					var run = Math.min(skipped, 26);
					out += String.fromCharCode(96 + run);
					skipped -= run;
				}
				out += encoded;
			}
			while (skipped > 0) {
				var run = Math.min(skipped, 26);
				out += String.fromCharCode(96 + run);
				skipped -= run;
			}
			this.outbstr += out;
		}
	},
	FileIO: {
		decodeData: function() {
			this.decodeCellQnum();
			this.decodeCell(function(cell, ca) {
				var dir = +ca;
				if (dir >= cell.UP && dir <= cell.RT) {
					cell.qdir = dir;
				}
			});
		},
		encodeData: function() {
			this.encodeCellQnum();
			this.encodeCell(function(cell) {
				return cell.qdir >= cell.UP && cell.qdir <= cell.RT
					? cell.qdir + " "
					: ". ";
			});
		}
	},
	AnsCheck: {
		checklist: [
			"checkArrowLengthTotals",
			"checkArrowStarts",
			"checkEmptyCells"
		],
		checkArrowLengthTotals: function() {
			var dirs = [1, 2, 3, 4];
			this.checkAllCell(function(cell) {
				if (!cell.isValidNum()) {
					return false;
				}
				var total = 0;
				for (var i = 0; i < dirs.length; i++) {
					var pos = cell.getaddr();
					while (true) {
						var next = pos.movedir(dirs[i], 2),
							c = next.getc();
						if (c.isnull || c.qnum !== -1 || c.qdir !== dirs[i]) {
							break;
						}
						total++;
						pos = next;
					}
				}
				return total !== cell.qnum;
			}, "nmArrowNe");
		},
		checkArrowStarts: function() {
			var opp = [0, 2, 1, 4, 3];
			this.checkAllCell(function(cell) {
				if (!cell.qdir) {
					return false;
				}
				// Arrows may only occupy cells without a number clue.
				if (cell.qnum !== -1) {
					return true;
				}
				if (cell.qdir < cell.UP || cell.qdir > cell.RT) {
					return true;
				}
				var dir = cell.qdir,
					pos = cell.getaddr();
				while (true) {
					var prev = pos.movedir(opp[dir], 2).getc();
					if (prev.isnull || prev.qdir !== dir) {
						return prev.isnull || !prev.isValidNum();
					}
					pos = prev.getaddr();
				}
			}, "arStartNe");
		},
		checkEmptyCells: function() {
			this.checkAllCell(function(cell) {
				return cell.qnum === -1 && !cell.qdir;
			}, "arCoverNe");
		}
	}
});
