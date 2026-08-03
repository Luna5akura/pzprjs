//
// Magic Summer
//
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["magic-summer", "magicsummer"], {
	//---------------------------------------------------------
	// Mouse input
	MouseEvent: {
		inputModes: {
			edit: ["number", "mark-cross", "clear"],
			play: ["number", "numblank", "clear"]
		},
		mouseinput: function() {
			if (
				this.inputMode === "mark-cross" ||
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
			} else {
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
				return false;
			}

			if (excell !== this.cursor.getex()) {
				this.setcursor(this.getpos(0));
			} else if (excell.group === "excell") {
				this.inputqnum_main(excell);
			} else {
				var indicator = this.board.indicator;
				var val = this.getNewNumber(indicator, indicator.count);
				if (val === null) {
					return false;
				}
				if (val <= 0) {
					val =
						this.btn === "left"
							? indicator.getminnum()
							: indicator.getmaxnum();
				}
				indicator.set(val);
			}
			return true;
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
				} else if (ca === "q" || ca === "a" || ca === "z") {
					ca = "s1";
				} else if (ca === "w" || ca === "s" || ca === "x") {
					ca = "s2";
				} else if (ca === "e" || ca === "d" || ca === "c" || ca === "-") {
					ca = " ";
				}
				this.key_inputqnum(ca);
				if (!isSnum && ca === " ") {
					this.cursor.getc().clrSnum();
				}
			} else if (this.cursor.by >= this.board.minby) {
				var excell = this.cursor.getex();
				if (!excell.isnull) {
					this.key_inputqnum_main(excell, ca);
				} else {
					this.key_inputqnum(ca);
				}
			} else {
				this.key_inputqnum_indicator(ca);
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
		},
		draw: function() {
			if (this.by >= this.board.minby) {
				this.common.draw.call(this);
			} else {
				this.board.indicator.draw();
			}
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
		},
		getNum: function() {
			if (this.qnum !== -1) {
				return this.qnum;
			}
			if (this.anum > 0) {
				return this.anum;
			}
			if (this.qsub > 0 || this.qans > 0) {
				return 0;
			}
			return -1;
		},
		noNum: function() {
			return this.getNum() < 0;
		},
		setNum: function(val) {
			if (this.puzzle.editmode) {
				this.setQnum(val);
				this.setAnum(-1);
				this.setQsub(0);
				this.setQans(0);
				this.clrSnum();
				return;
			}
			if (this.qnum !== -1) {
				return;
			}

			if (val > 0) {
				this.setAnum(val);
				this.setQsub(0);
				this.setQans(0);
			} else {
				this.setAnum(-1);
				this.setQsub(val === 0 ? 2 : 0);
				this.setQans(0);
			}
			this.clrSnum();
		}
	},

	ExCell: {
		disInputHatena: true,
		minnum: 0,
		maxnum: function() {
			var bd = this.board;
			var length =
				this.bx < bd.minbx || this.bx > bd.maxbx ? bd.cols : bd.rows;
			var max = 0;
			for (var i = 0; i < length; i++) {
				max = max * 10 + 9;
			}
			return max;
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
		initExtraObject: function() {
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
		getMagicSummerLine: function(excell) {
			var pos = excell.getaddr(),
				dir = 0;
			if (pos.by === this.minby + 1) {
				dir = 2;
			} else if (pos.by === this.maxby - 1) {
				dir = 1;
			} else if (pos.bx === this.minbx + 1) {
				dir = 4;
			} else if (pos.bx === this.maxbx - 1) {
				dir = 3;
			}

			var cells = [];
			while (dir !== 0) {
				pos.movedir(dir, 2);
				var cell = pos.getc();
				if (cell.isnull) {
					break;
				}
				cells.push(cell);
			}
			return cells;
		}
	},

	BoardExec: {
		adjustBoardData2: function() {
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
			if (val) {
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
			return Math.min(this.board.rows, this.board.cols, 9);
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
			if (strs[0] !== "MSU") {
				return false;
			}
			this.old = +strs[1];
			this.num = +strs[2];
			return true;
		},
		toString: function() {
			return ["MSU", this.old, this.num].join(",");
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
			this.drawBorders();
			this.drawMagicSummerQuesCrosses();
			this.drawSubNumbers();
			this.drawAnsNumbers();
			this.drawQuesNumbers();
			this.drawNumbersExCell();
			this.drawChassis();
			this.drawIndicator();
			this.drawCursor_magic_summer();
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
		drawIndicator: function() {
			var g = this.vinc("indicator", "auto", true),
				bd = this.board;
			if (!this.range.indicator) {
				return;
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
		drawCursor_magic_summer: function() {
			var isOnBoard = this.puzzle.board.minby <= this.puzzle.cursor.by;
			this.drawCursor(true, isOnBoard);
			this.drawCursorOnIndicator(!isOnBoard);
		},
		drawCursorOnIndicator: function(isdraw) {
			var g = this.vinc("target_cursor_indicator", "crispEdges", true),
				bd = this.board;
			if (!this.range.indicator) {
				return;
			}
			g.vid = "ti";
			if (
				isdraw &&
				this.puzzle.editmode &&
				this.puzzle.getConfig("cursor") &&
				!this.outputImage
			) {
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
		drawMagicSummerQuesCrosses: function() {
			var g = this.vinc("magic_summer_qcross", "auto", true),
				clist = this.range.cells,
				rsize = this.cw * 0.35;
			g.lineWidth = 1;
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				g.vid = "c_qcross_" + cell.id;
				if (cell.qnum === -2) {
					g.strokeStyle =
						cell.error === 1 ? this.errcolor1 : this.quescolor;
					g.strokeCross(cell.bx * this.bw, cell.by * this.bh, rsize);
				} else {
					g.vhide();
				}
			}
		},
		getQuesNumberText: function(cell) {
			return cell.qnum === -2
				? ""
				: this.common.getQuesNumberText.call(this, cell);
		}
	},

	//---------------------------------------------------------
	// URL encoding
	Encode: {
		decodePzpr: function() {
			this.decodeIndicator();
			this.decodeNumber16ExCell();
			this.decodeNumber16();
		},
		encodePzpr: function() {
			this.encodeIndicator();
			this.encodeNumber16ExCell();
			if (
				this.board.cell.some(function(cell) {
					return cell.qnum !== -1;
				})
			) {
				this.encodeNumber16();
			}
		},
		decodeIndicator: function() {
			var barray = this.outbstr.split("/"),
				bd = this.board;
			bd.indicator.count = bd.indicator.normalize(+barray[0]);
			this.outbstr = barray[1] || "";
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
			this.board.indicator.count = this.board.indicator.normalize(
				+this.readLine()
			);
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
					return obj.qnum !== -1 ? obj.qnum + " " : ". ";
				}
				if (obj.group === "cell") {
					if (obj.qnum !== -1) {
						return "q" + obj.qnum + " ";
					}
					var ca = ".";
					if (obj.anum !== -1) {
						ca = "" + obj.anum;
					} else if (obj.qsub === 2) {
						ca = "-";
					} else if (obj.qsub === 1) {
						ca = "+";
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
			"checkNumberSaturatedInLine",
			"checkMagicSummerSum"
		],
		checkNumberSaturatedInLine: function() {
			this.checkRowsCols(this.isNumberSaturatedInClist, "nmMissRow");
		},
		isNumberSaturatedInClist: function(clist) {
			if (clist.length <= 0) {
				return true;
			}
			var max = this.board.indicator.count,
				counts = [];
			for (var n = 1; n <= max; n++) {
				counts[n] = 0;
			}
			for (var i = 0; i < clist.length; i++) {
				var num = clist[i].getNum();
				if (num >= 1 && num <= max) {
					counts[num]++;
				}
			}
			for (var n = 1; n <= max; n++) {
				if (counts[n] !== 1) {
					clist.seterr(1);
					return false;
				}
			}
			return true;
		},
		checkMagicSummerSum: function() {
			var bd = this.board,
				result = true;
			for (var i = 0; i < bd.excell.length; i++) {
				var excell = bd.excell[i];
				if (excell.qnum < 0) {
					continue;
				}
				var cells = bd.getMagicSummerLine(excell),
					sum = 0,
					number = 0,
					unknown = false;
				for (var j = 0; j < cells.length; j++) {
					var cell = cells[j],
						num = cell.getNum();
					if (num <= 0) {
						if (cell.qnum === -1 && cell.anum === -1 && cell.qsub === 0) {
							unknown = true;
						}
						if (number > 0) {
							sum += number;
							number = 0;
						}
					} else if (num > 0) {
						number = number * 10 + num;
					}
				}
				if (number > 0) {
					sum += number;
				}
				if (unknown || sum === excell.qnum) {
					continue;
				}
				result = false;
				excell.seterr(1);
				for (var j = 0; j < cells.length; j++) {
					cells[j].seterr(1);
				}
				if (this.checkOnly) {
					break;
				}
			}
			if (!result) {
				this.failcode.add("nmSumNe");
			}
		}
	}
});
