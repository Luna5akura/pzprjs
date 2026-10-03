// Four Winds with Parks
// Numbered cells emit straight arrows in the four cardinal directions.  The
// number is the total length of the arrows starting at that cell.  Cells with
// no number or arrow are the parks required by the row and column rule.
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["fourwindswithparks"], {
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

		/* penpuz方式の操作:
		 *  - 左ドラッグ: 始点セルからドラッグした方向の矢印を始点セルに置く
		 *  - 左クリック(ドラッグなし): セルの矢印/×印を消す
		 *  - 右クリック: 矢印があれば消し、なければ×印をトグルする */
		inputfourwinds: function() {
			var cell = this.getcell();

			if (this.mousestart) {
				this.arrowStartCell = cell;
				this.arrowDragDir = 0;
			}

			if ((this.mousestart || this.mousemove) && this.btn === "right") {
				this.inputcross_toggle();
				return;
			}

			if ((this.mousestart || this.mousemove) && this.btn === "left") {
				this.inputarrow_drag();
				return;
			}

			if (this.mouseend && this.btn === "left" && this.notInputted()) {
				this.inputarrow_clear();
			}
		},

		inputarrow_drag: function() {
			var start = this.arrowStartCell,
				cell = this.getcell();
			if (!start || !cell || start.isnull || cell.isnull || start.qnum !== -1) {
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

			if (start.qdir !== dir) {
				start.setQdir(dir);
				start.setQsub(0);
				start.draw();
			}
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

		inputarrow_clear: function() {
			var cell = this.getcell();
			if (cell.isnull || cell.qnum !== -1) {
				return;
			}
			if (cell.qdir || cell.qsub) {
				cell.setQdir(0);
				cell.setQsub(0);
				cell.draw();
			}
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
		 * 矢印の開始セル(数字に隣接)には長さのバッジを表示する。 */
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
				g.vid = "c_arrow_ray_" + cell.id;
				var dir = cell.getArrow();
				if (!dir || cell.qnum !== -1) {
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
					if (isShaft) {
						g.strokeLine(px, py + hh, px, py - hh);
					} else {
						g.strokeLine(px, py + hh, px, py - inset);
						g.beginPath();
						g.moveTo(px, py - apex);
						g.lineTo(px - halfw, py - inset);
						g.lineTo(px + halfw, py - inset);
						g.fill();
					}
				} else if (dir === cell.DN) {
					if (isShaft) {
						g.strokeLine(px, py - hh, px, py + hh);
					} else {
						g.strokeLine(px, py - hh, px, py + inset);
						g.beginPath();
						g.moveTo(px, py + apex);
						g.lineTo(px - halfw, py + inset);
						g.lineTo(px + halfw, py + inset);
						g.fill();
					}
				} else if (dir === cell.LT) {
					if (isShaft) {
						g.strokeLine(px + hw, py, px - hw, py);
					} else {
						g.strokeLine(px + hw, py, px - inset, py);
						g.beginPath();
						g.moveTo(px - apex, py);
						g.lineTo(px - inset, py - halfw);
						g.lineTo(px - inset, py + halfw);
						g.fill();
					}
				} else if (dir === cell.RT) {
					if (isShaft) {
						g.strokeLine(px - hw, py, px + hw, py);
					} else {
						g.strokeLine(px - hw, py, px + inset, py);
						g.beginPath();
						g.moveTo(px + apex, py);
						g.lineTo(px + inset, py - halfw);
						g.lineTo(px + inset, py + halfw);
						g.fill();
					}
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
				g.vid = "c_arrow_badge_" + cell.id;
				var dir = cell.getArrow();
				if (!dir || cell.qnum !== -1) {
					g.vhide();
					continue;
				}

				var prev = cell
					.getaddr()
					.movedir(opp[dir], 2)
					.getc();
				if (!prev.isnull && prev.qdir === dir) {
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
					continue;
				}

				var px = cell.bx * this.bw,
					py = cell.by * this.bh;
				g.fillStyle = this.bgcolor;
				g.strokeStyle = cell.trial ? this.trialcolor : this.qanscolor;
				g.lineWidth = Math.max(this.cw * 0.04, 1);
				g.shapeCircle(px, py, this.cw * 0.26);
				g.fillStyle = cell.trial ? this.trialcolor : this.qanscolor;
				this.disptext("" + len, px, py, { ratio: 0.3 });
			}
		}
	},
	Encode: {
		decodePzpr: function() {
			this.decodeNumber16();
		},
		encodePzpr: function() {
			this.encodeNumber16();
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
			"checkEmptyRowsCols"
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
		checkEmptyRowsCols: function() {
			var bd = this.board;
			for (var r = 1; r <= bd.maxby; r += 2) {
				var empty = 0;
				for (var c = 1; c <= bd.maxbx; c += 2) {
					var cell = bd.getc(c, r);
					if (!cell.qdir && cell.qnum === -1) {
						empty++;
					}
				}
				if (empty !== 1) {
					this.failcode.add("rowEmptyNe");
				}
			}
			for (var c2 = 1; c2 <= bd.maxbx; c2 += 2) {
				var empty2 = 0;
				for (var r2 = 1; r2 <= bd.maxby; r2 += 2) {
					var cell2 = bd.getc(c2, r2);
					if (!cell2.qdir && cell2.qnum === -1) {
						empty2++;
					}
				}
				if (empty2 !== 1) {
					this.failcode.add("colEmptyNe");
				}
			}
		}
	}
});
