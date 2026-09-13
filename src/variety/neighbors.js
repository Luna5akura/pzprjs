// Neighbors (WPF Puzzle GP 2015 Round 4)
//
// Every cell contains one of 1, 2, and 3.  Each number occurs exactly three
// times in every row and column.  An ordinary (white) cell must touch an
// orthogonally adjacent cell with the same number, while an outlined (gray)
// cell must not touch one.
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["neighbors"], {
	//---------------------------------------------------------
	// Mouse input
	MouseEvent: {
		inputModes: {
			edit: ["number", "gray", "clear"],
			play: ["number", "clear"]
		},

		// The number toolbar calls this handler directly (it does not go
		// through mouseinput_auto).  Keep it equivalent to a left click so
		// both the toolbar and the default auto mode edit the same cell.
		mouseinput_number: function() {
			if (this.mousestart) {
				this.inputqnum();
			}
		},

		// In the editor a left click enters a clue and a right click toggles
		// the outlined-cell mark.  In play mode the right button clears an
		// answer.  Keeping this in auto mode makes the usual pzpr controls work
		// without requiring a special toolbar button.
		mouseinput_auto: function() {
			if (this.puzzle.editmode) {
				if (this.btn === "right") {
					if (this.mousestart || this.mousemove) {
						this.inputGray();
					}
				} else if (this.mousestart) {
					this.inputqnum();
				}
			} else if (this.mousestart) {
				if (this.btn === "right") {
					this.inputclean_cell();
				} else {
					this.inputqnum();
				}
			}
		},

		mouseinput_other: function() {
			if (this.inputMode === "gray" && (this.mousestart || this.mousemove)) {
				this.inputGray();
			}
		},

		inputGray: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				return;
			}

			// A drag applies the state selected by the first cell to all cells
			// under the pointer, just like the standard shade/unshade tools.
			if (this.inputData === null) {
				this.inputData = cell.isGray() ? 0 : 1;
			}
			cell.setGray(this.inputData === 1);
			cell.draw();
			this.mouseCell = cell;
		}
	},

	//---------------------------------------------------------
	// Keyboard input
	KeyEvent: {
		enablemake: true,
		enableplay: true,

		keyinput: function(ca) {
			// `g` is a convenient keyboard equivalent of the gray-cell tool in
			// editor mode.  Other keys use the normal pzpr number editor.
			if (this.puzzle.editmode && ca === "g") {
				var cell = this.cursor.getc();
				if (!cell.isnull) {
					cell.setGray(!cell.isGray());
					cell.draw();
				}
				this.cancelDefault = true;
				return;
			}
			this.key_inputqnum(ca);
		}
	},

	//---------------------------------------------------------
	// Board and cells
	Cell: {
		disInputHatena: true,
		supportQnumAnum: true,
		maxnum: 3,
		minnum: 1,

		isGray: function() {
			return this.ques === 1;
		},
		setGray: function(value) {
			this.setQues(value ? 1 : 0);
		},

		// A clue (qnum) is immutable while solving; an empty cell stores its
		// answer in anum.  Unlike the common implementation, this deliberately
		// leaves ques untouched so that clearing/entering an answer never loses
		// the outlined-cell information.
		getNum: function() {
			return this.qnum !== -1 ? this.qnum : this.anum;
		},
		setNum: function(val) {
			if (val === 0) {
				return;
			}
			if (this.puzzle.editmode) {
				if (val !== -1 && (val < this.getminnum() || val > this.getmaxnum())) {
					return;
				}
				this.setQnum(val);
				this.setAnum(-1);
				this.clrSnum();
			} else if (this.qnum === -1 && !this.disableAnum) {
				if (val >= this.getminnum() && val <= this.getmaxnum()) {
					this.setAnum(val);
				} else if (val === -1) {
					this.setAnum(-1);
				}
				this.clrSnum();
			}
		},
		isNum: function() {
			var num = this.getNum();
			return !this.isnull && num >= 1 && num <= 3;
		},
		noNum: function() {
			return !this.isnull && !this.isNum();
		},
		isValidNum: function() {
			return this.isNum();
		}
	},

	Board: {
		cols: 9,
		rows: 9,
		hasborder: 1,

		// Neighbors is intentionally a fixed-size 9x9 puzzle.  The URL still
		// carries the usual width/height fields, but malformed sizes are
		// normalized here instead of creating a partially initialized board.
		initBoardSize: function(col, row) {
			this.common.initBoardSize.call(this, 9, 9);
		}
	},
	BoardExec: {
		// Expanding or reducing would violate the fixed-size rule. Rotation and
		// reflection remain useful editor operations because the board is square.
		allowedOperations: function(isplaymode) {
			return this.TURNFLIP;
		},
		isBoardOp: function(name) {
			var operation = this.boardtype[name];
			return !!operation && !!(operation[1] & this.TURNFLIP);
		}
	},

	//---------------------------------------------------------
	// Graphic
	Graphic: {
		gridcolor_type: "LIGHT",
		numbercolor_func: "qnum",
		// Use the common number typography (same as Nurikabe).
		textoption: { ratio: 0.8, position: 1 },
		graycellcolor: "rgb(192,192,192)",

		paint: function() {
			this.drawBGCells();
			this.drawGrid();
			this.drawNeighborGrayCells();

			this.drawAnsNumbers();
			this.drawQuesNumbers();

			this.drawChassis();
			this.drawTarget();
		},

		drawNeighborGrayCells: function() {
			var g = this.vinc("neighbor_gray", "crispEdges", true);
			var clist = this.range.cells;
			var lineWidth = Math.max(1, (this.cw * 0.055) | 0);
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				g.vid = "neighbor_gray_" + cell.id;
				if (cell.isGray()) {
					var px = cell.bx * this.bw;
					var py = cell.by * this.bh;
					var color =
						cell.error === 1 ? this.errcolor1 : "rgb(112,112,112)";
					g.lineWidth = lineWidth;
					g.fillStyle = cell.error === 1 ? this.errbcolor1 : this.graycellcolor;
					g.strokeStyle = color;
					// strokeRectCenter() takes the half-size of the rectangle.  Keep
					// the mark inside the cell (the old cw*0.78 value made it wider
					// than a cell and caused neighbouring outlines to overlap).
					g.shapeRectCenter(px, py, this.bw * 0.84, this.bh * 0.84);
				} else {
					g.vhide();
				}
			}
		}
	},

	//---------------------------------------------------------
	// URL encoding/decoding
	Encode: {
		decodePzpr: function(type) {
			var parts = (this.outbstr || "").split("/");
			var givens = parts.shift() || "";
			var gray = parts.shift() || "";
			// Also accept a compact 162-character payload for imported links.
			if (!gray && givens.length >= 162) {
				gray = givens.substr(81);
				givens = givens.substr(0, 81);
			}

			var cells = this.board.cell;
			for (var i = 0; i < cells.length; i++) {
				var cell = cells[i];
				var q = givens.charAt(i);
				cell.qnum = q >= "1" && q <= "3" ? +q : -1;
				var mark = gray.charAt(i);
				cell.ques =
					mark === "1" ||
					mark === "#" ||
					mark === "g" ||
					mark === "G" ||
					mark === "x" ||
					mark === "X";
				cell.ques = cell.ques ? 1 : 0;
				cell.anum = -1;
			}
			this.outbstr = parts.join("/");
		},
		encodePzpr: function(type) {
			var givens = "";
			var gray = "";
			var cells = this.board.cell;
			for (var i = 0; i < cells.length; i++) {
				var cell = cells[i];
				givens += cell.qnum >= 1 && cell.qnum <= 3 ? cell.qnum : ".";
				gray += cell.isGray() ? "1" : "0";
			}
			this.outbstr += givens + "/" + gray;
		}
	},

	//---------------------------------------------------------
	// pzpr file format
	FileIO: {
		decodeData: function() {
			this.decodeCellQnumNeighbor();
			this.decodeCellGrayNeighbor();
			this.decodeCellAnumNeighbor();
		},
		encodeData: function() {
			this.encodeCellQnumNeighbor();
			this.encodeCellGrayNeighbor();
			this.encodeCellAnumNeighbor();
		},

		decodeCellQnumNeighbor: function() {
			this.decodeCell(function(cell, ca) {
				var num = +ca;
				cell.qnum = num >= 1 && num <= 3 ? num : -1;
			});
		},
		encodeCellQnumNeighbor: function() {
			this.encodeCell(function(cell) {
				return (cell.qnum >= 1 && cell.qnum <= 3 ? cell.qnum : ".") + " ";
			});
		},
		decodeCellGrayNeighbor: function() {
			this.decodeCell(function(cell, ca) {
				cell.ques =
					ca === "1" ||
					ca === "#" ||
					ca === "g" ||
					ca === "G" ||
					ca === "x" ||
					ca === "X"
						? 1
						: 0;
			});
		},
		encodeCellGrayNeighbor: function() {
			this.encodeCell(function(cell) {
				return (cell.isGray() ? "1" : "0") + " ";
			});
		},
		decodeCellAnumNeighbor: function() {
			this.decodeCell(function(cell, ca) {
				var num = +ca;
				cell.anum = num >= 1 && num <= 3 ? num : -1;
			});
		},
		encodeCellAnumNeighbor: function() {
			this.encodeCell(function(cell) {
				return (cell.anum >= 1 && cell.anum <= 3 ? cell.anum : ".") + " ";
			});
		}
	},

	//---------------------------------------------------------
	// Answer checking
	AnsCheck: {
		checklist: [
			"checkNoNumCellNeighbor",
			"checkFixedNumbersNeighbor",
			"checkRowColumnCountsNeighbor",
			"checkNeighborRules"
		],

		checkNoNumCellNeighbor: function() {
			this.checkAllCell(function(cell) {
				return !cell.isNum();
			}, "ceNoNum");
		},

		checkFixedNumbersNeighbor: function() {
			this.checkAllCell(function(cell) {
				return (
					cell.qnum >= 1 &&
					cell.qnum <= 3 &&
					cell.anum !== -1 &&
					cell.anum !== cell.qnum
				);
			}, "nmFixed");
		},

		checkRowColumnCountsNeighbor: function() {
			var bd = this.board;
			var valid = true;
			for (var y = 0; y < bd.rows; y++) {
				var row = bd.cellinside(1, 2 * y + 1, 2 * bd.cols - 1, 2 * y + 1);
				var counts = [0, 0, 0, 0];
				for (var i = 0; i < row.length; i++) {
					var n = row[i].getNum();
					if (n >= 1 && n <= 3) {
						counts[n]++;
					}
				}
				if (counts[1] !== 3 || counts[2] !== 3 || counts[3] !== 3) {
					valid = false;
					if (!this.checkOnly) {
						row.seterr(1);
					}
					if (this.checkOnly) {
						break;
					}
				}
			}
			if (valid) {
				for (var x = 0; x < bd.cols; x++) {
					var col = bd.cellinside(2 * x + 1, 1, 2 * x + 1, 2 * bd.rows - 1);
					var colcounts = [0, 0, 0, 0];
					for (var j = 0; j < col.length; j++) {
						var num = col[j].getNum();
						if (num >= 1 && num <= 3) {
							colcounts[num]++;
						}
					}
					if (colcounts[1] !== 3 || colcounts[2] !== 3 || colcounts[3] !== 3) {
						valid = false;
						if (!this.checkOnly) {
							col.seterr(1);
						}
						if (this.checkOnly) {
							break;
						}
					}
				}
			}
			if (!valid) {
				this.failcode.add("nmCount");
			}
		},

		checkNeighborRules: function() {
			var bd = this.board;
			var valid = true;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				var num = cell.getNum();
				if (num < 1 || num > 3) {
					continue;
				}
				var same = 0;
				var neighbors = cell.adjacent;
				[
					neighbors.top,
					neighbors.bottom,
					neighbors.left,
					neighbors.right
				].forEach(function(other) {
					if (!other.isnull && other.getNum() === num) {
						same++;
					}
				});
				var bad = cell.isGray() ? same > 0 : same === 0;
				if (!bad) {
					continue;
				}
				valid = false;
				if (!this.checkOnly) {
					cell.seterr(1);
					[
						neighbors.top,
						neighbors.bottom,
						neighbors.left,
						neighbors.right
					].forEach(function(other) {
						if (!other.isnull && other.getNum() === num) {
							other.seterr(1);
						}
					});
				}
				if (this.checkOnly) {
					break;
				}
			}
			if (!valid) {
				this.failcode.add("nmNeighbor");
			}
		}
	}
});
