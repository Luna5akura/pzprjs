//
// Magic Snail
//
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["magic-snail"], {
	//---------------------------------------------------------
	// Mouse input
	MouseEvent: {
		inputModes: {
			edit: ["number", "mark-cross", "clear"],
			play: ["number", "numexist", "numblank", "clear"]
		},
		mouseinput: function() {
			if (
				this.inputMode === "mark-cross" ||
				this.inputMode === "subcross" ||
				this.inputMode === "numblank"
			) {
				this.inputCrossCell();
			} else {
				this.common.mouseinput.call(this);
			}
		},
		mouseinput_number: function() {
			if (this.mousestart) {
				if (!this.puzzle.editmode || !this.inputqnum_excell()) {
					this.inputqnum();
				}
			}
		},
		mouseinput_auto: function() {
			if (this.puzzle.playmode) {
				if (this.btn === "right") {
					if (this.mousestart || this.mousemove) {
						this.inputCrossCell();
					}
				} else if (this.mousestart) {
					var piece = this.getcell_excell();
					if (!piece.isnull && piece.group === "cell") {
						this.inputqnum();
					}
				}
			} else if (this.puzzle.editmode) {
				this.mouseinput_number();
			}
		},
		inputCrossCell: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				return;
			}

			if (this.puzzle.editmode) {
				if (this.inputData === null) {
					this.inputData = cell.qnum === -2 ? -1 : -2;
				}
				cell.setQnum(this.inputData);
				cell.setAnum(-1);
				cell.setQsub(0);
				cell.clrSnum();
				cell.draw();
				this.mouseCell = cell;
				return;
			}

			if (cell.qnum !== -1) {
				return;
			}
			if (this.inputData === null) {
				this.inputData = cell.qsub === 2 ? 0 : 2;
			}
			if (this.inputData === 2) {
				cell.setAnum(-1);
				cell.setQsub(2);
				cell.clrSnum();
			} else {
				cell.setQsub(0);
			}
			cell.draw();
			this.mouseCell = cell;
		},

		inputqnum_excell: function() {
			var excell = this.getpos(0).getex();
			if (excell.isnull) {
				return;
			}

			if (excell !== this.cursor.getex()) {
				this.setcursor(this.getpos(0));
			} else {
				if (excell.group === "excell") {
					this.inputqnum_main(excell);
				} else {
					var indicator = this.board.indicator;
					var val = this.getNewNumber(indicator, indicator.count);
					if (val === null) {
						return;
					} else if (val <= 0) {
						val =
							this.btn === "left"
								? indicator.getminnum()
								: indicator.getmaxnum();
					}
					indicator.set(val);
				}
			}
		}
	},

	//---------------------------------------------------------
	// Keyboard input
	KeyEvent: {
		enablemake: true,
		enableplay: true,
		keyinput: function(ca) {
			if (this.puzzle.playmode) {
				var isSnum = this.cursor.targetdir !== 0;
				if (isSnum) {
				} else if (ca === "1") {
					ca = "s1";
				} else if (ca === "2" || ca === "x") {
					ca = "s2";
				} else if (ca === "3") {
					ca = "BS";
				}
				this.key_inputqnum(ca);
				if (!isSnum && ca === " ") {
					this.cursor.getc().clrSnum();
				}
			} else {
				if (this.cursor.by >= this.board.minby) {
					var excell = this.cursor.getex();
					if (!excell.isnull) {
						this.key_inputqnum_main(excell, ca);
					} else {
						this.key_inputqnum(ca);
					}
				} else {
					this.key_inputqnum_indicator(ca);
				}
			}
		},
		key_inputqnum_indicator: function(ca) {
			var bd = this.puzzle.board;
			var val = this.getNewNumber(bd.indicator, ca, bd.indicator.count);
			if (val === null) {
				return;
			}
			bd.indicator.set(val);
			this.prev = bd.indicator;
		}
	},

	TargetCursor: {
		draw: function() {
			if (this.by >= this.board.minby) {
				this.common.draw.call(this);
			} else {
				this.board.indicator.draw();
			}
		},

		initCursor: function() {
			this.init(-1, -1);
			this.adjust_init();
		},
		setminmax_customize: function() {
			if (this.puzzle.editmode) {
				return;
			}
			this.minx += 2;
			this.miny += 2;
			this.maxx -= 2;
			this.maxy -= 2;
		}
	},

	//---------------------------------------------------------
	// Board
	Cell: {
		enableSubNumberArray: true,
		numberWithMB: true,
		minnum: 1,

		maxnum: function() {
			return this.board.indicator.count;
		}
	},

	ExCell: {
		disInputHatena: true,
		minnum: 1,

		maxnum: function() {
			return this.board.indicator.count;
		}
	},

	Board: {
		cols: 5,
		rows: 5,
		hasexcell: 2,

		indicator: null,

		createExtraObject: function() {
			this.indicator = new this.klass.Indicator();
		},
		initExtraObject: function(col, row) {
			this.indicator.init();
			this.indicator.count = this.klass.Indicator.prototype.count;
		},
		getex: function(bx, by) {
			if (by > this.minby) {
				return this.common.getex.call(this, bx, by);
			} else if (by === -3) {
				return this.indicator;
			}
			return this.emptyexcell;
		},

		searchSight: function(startexcell, seterror) {
			var pos = startexcell.getaddr(),
				dir = 0,
				cell = this.emptycell;
			if (pos.by === this.minby + 1) {
				dir = 2;
			} else if (pos.by === this.maxby - 1) {
				dir = 1;
			} else if (pos.bx === this.minbx + 1) {
				dir = 4;
			} else if (pos.bx === this.maxbx - 1) {
				dir = 3;
			}

			while (dir !== 0) {
				pos.movedir(dir, 2);
				var cell2 = pos.getc();
				if (cell2.isnull) {
					break;
				}

				if (cell2.getNum() < 1) {
					continue;
				}
				cell = cell2;
				break;
			}

			if (!!seterror) {
				startexcell.error = 1;
				cell.error = 1;
			}

			return { dest: cell };
		},

		getMagicSnailCells: function() {
			var ret = [];
			var top = 0,
				bottom = this.rows - 1,
				left = 0,
				right = this.cols - 1;

			while (top <= bottom && left <= right) {
				for (var x = left; x <= right; x++) {
					ret.push(this.getc(x * 2 + 1, top * 2 + 1));
				}
				top++;
				if (top > bottom) {
					break;
				}

				for (var y = top; y <= bottom; y++) {
					ret.push(this.getc(right * 2 + 1, y * 2 + 1));
				}
				right--;
				if (left > right) {
					break;
				}

				for (var x = right; x >= left; x--) {
					ret.push(this.getc(x * 2 + 1, bottom * 2 + 1));
				}
				bottom--;
				if (top > bottom) {
					break;
				}

				for (var y = bottom; y >= top; y--) {
					ret.push(this.getc(left * 2 + 1, y * 2 + 1));
				}
				left++;
			}

			return ret;
		},

		getMagicSnailWalls: function() {
			var cells = this.getMagicSnailCells(),
				order = [],
				ret = [];

			for (var y = 0; y < this.rows; y++) {
				order[y] = [];
			}
			for (var i = 0; i < cells.length; i++) {
				var cell = cells[i],
					x = (cell.bx - 1) >> 1,
					y = (cell.by - 1) >> 1;
				order[y][x] = i;
			}

			for (var y = 0; y < this.rows; y++) {
				for (var x = 0; x < this.cols - 1; x++) {
					if (Math.abs(order[y][x] - order[y][x + 1]) !== 1) {
						ret.push({ isVert: true, bx: (x + 1) * 2, by: y * 2 + 1 });
					}
				}
			}
			for (var y = 0; y < this.rows - 1; y++) {
				for (var x = 0; x < this.cols; x++) {
					if (Math.abs(order[y][x] - order[y + 1][x]) !== 1) {
						ret.push({ isVert: false, bx: x * 2 + 1, by: (y + 1) * 2 });
					}
				}
			}

			return ret;
		}
	},
	BoardExec: {
		adjustBoardData2: function(key, d) {
			this.board.indicator.init();
			this.board.indicator.count = this.board.indicator.normalize(
				this.board.indicator.count
			);
		}
	},
	Indicator: {
		count: 3,
		rect: null,
		qnum: -1,
		initialize: function(val) {
			if (!!val) {
				this.count = val;
			}
			this.rect = { bx1: -1, by1: -1, bx2: -1, by2: -1 };
		},
		init: function() {
			var bd = this.puzzle.board;
			this.rect = {
				bx1: bd.maxbx - 3.15,
				by1: -3.8,
				bx2: bd.maxbx - 0.15,
				by2: -2.2
			};
		},
		set: function(val) {
			val = this.normalize(val);
			if (this.count !== val) {
				this.addOpe(this.count, val);
				this.count = val;
				this.draw();
			}
		},
		normalize: function(val) {
			val = +val;
			if (!isFinite(val)) {
				val = this.getminnum();
			}
			return Math.max(
				this.getminnum(),
				Math.min(this.getmaxnum(), Math.floor(val))
			);
		},
		getmaxnum: function() {
			var bd = this.board;
			return Math.min(bd.rows, bd.cols);
		},
		getminnum: function() {
			return 1;
		},
		addOpe: function(old, num) {
			this.puzzle.opemgr.add(new this.klass.IndicatorOperation(old, num));
		},
		draw: function() {
			this.puzzle.painter.paintRange(
				this.board.minbx,
				-1,
				this.board.maxbx,
				-1
			);
		}
	},
	"IndicatorOperation:Operation": {
		type: "indicator",
		setData: function(old, num) {
			this.old = old;
			this.num = num;
		},
		decode: function(strs) {
			if (strs[0] !== "MS") {
				return false;
			}
			this.old = +strs[1];
			this.num = +strs[2];
			return true;
		},
		toString: function() {
			return ["MS", this.old, this.num].join(",");
		},
		undo: function() {
			this.exec(this.old);
		},
		redo: function() {
			this.exec(this.num);
		},
		exec: function(num) {
			this.board.indicator.set(num);
		}
	},
	OperationManager: {
		addExtraOperation: function() {
			this.operationlist.push(this.klass.IndicatorOperation);
		}
	},

	//---------------------------------------------------------
	// Graphic
	Graphic: {
		gridcolor_type: "LIGHT",

		paint: function() {
			this.drawBGCells();
			this.drawBGExCells();
			this.drawTargetSubNumber();

			this.drawGrid();
			this.drawMagicSnailGuide();
			this.drawBorders();

			this.drawMBs();
			this.drawMagicSnailQuesCrosses();
			this.drawSubNumbers();
			this.drawAnsNumbers();
			this.drawQuesNumbers();
			this.drawNumbersExCell();

			this.drawChassis();

			this.drawIndicator();
			this.drawCursor_magic_snail();
		},

		getCanvasRows: function() {
			return this.getBoardRows() + 2 * this.margin + 0.8;
		},
		getOffsetRows: function() {
			return 1.45;
		},
		setRangeObject: function(x1, y1, x2, y2) {
			this.common.setRangeObject.call(this, x1, y1, x2, y2);
			this.range.indicator = y1 < 0;
		},
		copyBufferData: function(g, g2, x1, y1, x2, y2) {
			this.common.copyBufferData.call(this, g, g2, x1, y1, x2, y2);
			if (g.use.canvas && this.range.indicator) {
				var bd = this.board;
				var sx1 = 0,
					sy1 = 0,
					sx2 = g2.child.width,
					sy2 = bd.minby * this.bh + this.y0;
				g.context.clearRect(sx1, sy1 - this.y0, sx2, sy2);
				g.drawImage(
					g2.child,
					sx1,
					sy1,
					sx2 - sx1,
					sy2 - sy1,
					sx1 - this.x0,
					sy1 - this.y0,
					sx2 - sx1,
					sy2 - sy1
				);
			}
		},

		drawMagicSnailGuide: function() {
			var g = this.vinc("magic_snail_guide", "auto", true),
				walls = this.board.getMagicSnailWalls(),
				lm = this.lm,
				oldCount = this._magicSnailGuideCount || 0;

			g.fillStyle = this.quescolor;

			for (var i = 0; i < walls.length; i++) {
				var wall = walls[i],
					px = wall.bx * this.bw,
					py = wall.by * this.bh;

				g.vid = "ms_wall_" + i;
				if (wall.isVert) {
					g.fillRectCenter(px, py, lm, this.bh + lm);
				} else {
					g.fillRectCenter(px, py, this.bw + lm, lm);
				}
			}

			for (var j = walls.length; j < oldCount; j++) {
				g.vid = "ms_wall_" + j;
				g.vhide();
			}
			this._magicSnailGuideCount = walls.length;
		},
		drawIndicator: function() {
			var g = this.vinc("indicator", "auto", true),
				bd = this.board;
			if (!this.range.indicator) {
				return;
			}

			if (g.use.canvas) {
				g.context.clearRect(
					0,
					-this.y0,
					g.child.width,
					bd.minby * this.bh + this.y0
				);
			}

			g.fillStyle = this.quescolor;

			g.vid = "bd_indicator";
			g.font = ((this.ch * 0.66) | 0) + "px " + this.fontfamily;
			g.textAlign = "right";
			g.textBaseline = "middle";
			g.fillText(
				"(1-" + bd.indicator.count + ")",
				(bd.maxbx - 0.2) * this.bw,
				-3 * this.bh
			);
		},
		drawCursor_magic_snail: function() {
			var isOnBoard = this.puzzle.board.minby <= this.puzzle.cursor.by;
			var isOnIndicator = !isOnBoard;
			this.drawCursor(true, isOnBoard);
			this.drawCursorOnIndicator(isOnIndicator);
		},
		drawCursorOnIndicator: function(isdraw) {
			var g = this.vinc("target_cursor_indicator", "crispEdges", true),
				bd = this.board;
			if (!this.range.indicator) {
				return;
			}

			var isdraw =
				isdraw &&
				this.puzzle.editmode &&
				this.puzzle.getConfig("cursor") &&
				!this.outputImage;
			g.vid = "ti";
			if (isdraw) {
				var rect = bd.indicator.rect;
				g.strokeStyle = this.targetColorEdit;
				g.lineWidth = Math.max(this.cw / 16, 2) | 0;
				g.strokeRect(
					rect.bx1 * this.bw,
					rect.by1 * this.bh,
					(rect.bx2 - rect.bx1) * this.bw,
					(rect.by2 - rect.by1) * this.bh
				);
			} else {
				g.vhide();
			}
		},
		drawMagicSnailQuesCrosses: function() {
			var g = this.vinc("magic_snail_qcross", "auto", true),
				clist = this.range.cells,
				rsize = this.cw * 0.35;

			g.lineWidth = 1;
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				g.vid = "c_qcross_" + cell.id;
				if (cell.qnum === -2) {
					g.strokeStyle = cell.error === 1 ? this.errcolor1 : this.quescolor;
					g.strokeCross(cell.bx * this.bw, cell.by * this.bh, rsize);
				} else {
					g.vhide();
				}
			}
		},
		getQuesNumberText: function(cell) {
			return cell.qnum === -2 ? "" : this.common.getQuesNumberText.call(this, cell);
		}
	},

	//---------------------------------------------------------
	// URL encoding
	Encode: {
		decodePzpr: function(type) {
			this.decodeIndicator();
			this.decodeNumber16ExCell();
			this.decodeNumber16();
		},
		encodePzpr: function(type) {
			this.encodeIndicator();
			this.encodeNumber16ExCell();
			if (
				this.board.cell.some(function(b) {
					return b.qnum !== -1;
				})
			) {
				this.encodeNumber16();
			}
		},

		decodeIndicator: function() {
			var barray = this.outbstr.split("/"),
				bd = this.board;
			if (barray[0] !== "") {
				bd.indicator.count = bd.indicator.normalize(+barray[0]);
			} else {
				bd.indicator.count = bd.indicator.normalize(bd.indicator.count);
			}
			this.outbstr = !!barray[1] ? barray[1] : "";
		},
		encodeIndicator: function() {
			this.outbstr = this.board.indicator.count + "/";
		}
	},

	//---------------------------------------------------------
	// File I/O
	FileIO: {
		decodeData: function() {
			this.decodeIndicator();
			this.decodeCellExCellQnumAnumsub();
		},
		encodeData: function() {
			this.encodeIndicator();
			this.encodeCellExCellQnumAnumsub();
		},

		decodeIndicator: function() {
			this.board.indicator.count = this.board.indicator.normalize(+this.readLine());
		},
		encodeIndicator: function() {
			this.writeLine(this.board.indicator.count);
		},

		decodeCellExCellQnumAnumsub: function() {
			this.decodeCellExCell(function(obj, ca) {
				if (ca === ".") {
					return;
				} else if (obj.group === "excell") {
					obj.qnum = +ca;
				} else if (obj.group === "cell") {
					if (ca[0] === "q") {
						obj.qnum = +ca.substr(1);
						return;
					}
					if (ca.indexOf("[") >= 0) {
						ca = this.setCellSnum(obj, ca);
					}
					if (ca === "+") {
						obj.qsub = 1;
					} else if (ca === "-") {
						obj.qsub = 2;
					} else if (ca !== ".") {
						obj.anum = +ca;
					}
				}
			});
		},
		encodeCellExCellQnumAnumsub: function() {
			this.encodeCellExCell(function(obj) {
				if (obj.group === "excell") {
					if (obj.qnum !== -1) {
						return "" + obj.qnum + " ";
					}
				} else if (obj.group === "cell") {
					if (obj.qnum !== -1) {
						return "q" + obj.qnum + " ";
					}
					var ca = ".";
					if (obj.anum !== -1) {
						ca = "" + obj.anum;
					} else if (obj.qsub === 1) {
						ca = "+";
					} else if (obj.qsub === 2) {
						ca = "-";
					}
					if (obj.anum === -1) {
						ca += this.getCellSnum(obj);
					}
					return ca + " ";
				}
				return ". ";
			});
		}
	},

	//---------------------------------------------------------
	// Answer check
	AnsCheck: {
		checklist: [
			"checkDifferentNumberInLine",
			"checkSight+",
			"checkMagicSnailSequence",
			"checkNumberSaturatedInLine"
		],

		checkNumberSaturatedInLine: function() {
			this.checkRowsCols(this.isNumberSaturatedInClist, "nmMissRow");
		},
		isNumberSaturatedInClist: function(clist) {
			if (clist.length <= 0) {
				return true;
			}
			var result = true,
				d = [];
			var max = this.board.indicator.count,
				bottom = 1;
			for (var n = bottom; n <= max; n++) {
				d[n] = 0;
			}
			for (var i = 0; i < clist.length; i++) {
				var num = clist[i].getNum();
				if (num >= bottom) {
					d[num]++;
				}
			}
			for (var n = bottom; n <= max; n++) {
				if (d[n] === 0) {
					result = false;
					break;
				}
			}

			if (!result) {
				clist.seterr(1);
			}
			return result;
		},

		checkSight: function() {
			var bd = this.board,
				result = true;
			for (var ec = 0; ec < bd.excell.length; ec++) {
				var excell = bd.excell[ec];
				if (excell.qnum === -1) {
					continue;
				}
				var cell = bd.searchSight(excell, false).dest;
				if (cell.isnull || excell.qnum === cell.getNum() || cell.qsub === 1) {
					continue;
				}

				result = false;
				if (this.checkOnly) {
					break;
				}

				excell.seterr(1);
				bd.searchSight(excell, true);
			}
			if (!result) {
				this.failcode.add("nmSightNe");
			}
		},

		checkMagicSnailSequence: function() {
			var bd = this.board,
				cells = bd.getMagicSnailCells(),
				expected = 1,
				max = bd.indicator.count;

			for (var i = 0; i < cells.length; i++) {
				var cell = cells[i],
					num = cell.getNum();
				if (num < 1) {
					continue;
				}
				if (num === expected) {
					expected = (expected % max) + 1;
					continue;
				}

				this.failcode.add("nmSnailNe");
				if (this.checkOnly) {
					break;
				}
				cell.seterr(1);
			}
		}
	}
});
