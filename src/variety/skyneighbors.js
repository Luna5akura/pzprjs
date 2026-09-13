// Sky Neighbors (WPF Puzzle GP 2015 Round 4)
//
// Sky Neighbors is the fixed 9x9 Neighbors puzzle with one row of answer
// cells outside each side of the board.  The outside cells are ordinary
// answer cells too: their values are the number of visible buildings from
// that side.
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})([
	"skyneighbors",
	"sky-neighbors",
	"skyneighbour",
	"skyneighbours",
	"sky-neighbour",
	"sky-neighbours"
], {
	//---------------------------------------------------------
	// Mouse input
	MouseEvent: {
		inputModes: {
			edit: ["number", "gray", "clear"],
			play: ["number", "clear"]
		},

		mouseinput_number: function() {
			if (this.mousestart) {
				this.inputqnum_excell_sky();
			}
		},

		mouseinput_clear: function() {
			this.inputclean_skyneighbor();
		},

		mouseinput_auto: function() {
			var piece = this.getcell_excell();
			if (piece.isnull) {
				return;
			}
			if (this.puzzle.editmode) {
				if (this.btn === "right") {
					if (this.mousestart || this.mousemove) {
						this.inputGraySkyNeighbor();
					}
				} else if (this.mousestart) {
					this.inputqnum_excell_sky();
				}
			} else if (this.mousestart) {
				if (this.btn === "right") {
					this.inputclean_skyneighbor();
				} else {
					this.inputqnum_excell_sky();
				}
			}
		},

		mouseinput_other: function() {
			if (this.inputMode === "gray" && (this.mousestart || this.mousemove)) {
				this.inputGraySkyNeighbor();
			}
		},

		inputqnum_excell_sky: function() {
			var piece = this.getcell_excell();
			if (piece.isnull) {
				return;
			}
			if (piece !== this.cursor.getobj()) {
				this.setcursor(piece);
			} else {
				this.inputqnum_main(piece);
			}
			this.mouseCell = piece;
		},

		inputclean_skyneighbor: function() {
			var piece = this.getcell_excell();
			if (piece.isnull || piece === this.mouseCell) {
				return;
			}
			this.mouseCell = piece;
			if (this.puzzle.playmode) {
				piece.setAnum(-1);
			} else {
				piece.setQnum(-1);
				piece.setAnum(-1);
				piece.setQues(0);
			}
			piece.draw();
		},

		inputGraySkyNeighbor: function() {
			var piece = this.getcell_excell();
			if (piece.isnull || piece === this.mouseCell) {
				return;
			}
			if (this.inputData === null) {
				this.inputData = piece.isGray() ? 0 : 1;
			}
			piece.setGray(this.inputData === 1);
			piece.draw();
			this.mouseCell = piece;
		}
	},

	//---------------------------------------------------------
	// Keyboard input
	KeyEvent: {
		enablemake: true,
		enableplay: true,

		moveTarget: function(ca) {
			var cursor = this.cursor;
			var old = cursor.getaddr();
			var bx = cursor.bx;
			var by = cursor.by;
			var nextx = bx;
			var nexty = by;

			// Valid answer positions are the odd-coordinate cells in the 9x9
			// grid and the odd-coordinate cells in the four outside rows.  The
			// four corner positions are deliberately empty, so a move that would
			// enter one of them is ignored.
			function isValidPosition(x, y) {
				var inner = x >= 1 && x <= 17 && y >= 1 && y <= 17;
				if (x & 1 && y & 1 && inner) {
					return true;
				}
				return (
					(x >= 1 && x <= 17 && x & 1 && (y === -1 || y === 19)) ||
					(y >= 1 && y <= 17 && y & 1 && (x === -1 || x === 19))
				);
			}

			switch (ca) {
				case "up":
					nexty -= 2;
					break;
				case "down":
					nexty += 2;
					break;
				case "left":
					nextx -= 2;
					break;
				case "right":
					nextx += 2;
					break;
				default:
					return false;
			}

			if (!isValidPosition(nextx, nexty)) {
				return false;
			}
			cursor.init(nextx, nexty);
			old.draw();
			cursor.draw();
			return true;
		},

		keyinput: function(ca) {
			var piece = this.cursor.getobj();
			if (this.puzzle.editmode && ca === "g") {
				if (
					!piece.isnull &&
					(piece.group === "cell" || piece.group === "excell")
				) {
					piece.setGray(!piece.isGray());
					piece.draw();
				}
				this.cancelDefault = true;
				return;
			}
			if (!piece.isnull && piece.group === "excell") {
				this.key_inputqnum_main(piece, ca);
			} else {
				this.key_inputqnum(ca);
			}
		}
	},

	// The answer area includes the four rows of ExCells around the 9x9
	// grid.  The common cursor movement only knows about ordinary cells and
	// would therefore stop at (or land on) the even-coordinate grid lines.
	// Use the ExCell-aware movement routine so the keyboard can visit every
	// outside clue/answer cell as well as the inner cells.
	TargetCursor: {
		initCursor: function() {
			// The four geometric corners of the outside frame are intentionally
			// empty (there is no ExCell there).  Starting at a corner would leave
			// the keyboard target on a null object, so use the first playable cell.
			this.init(1, 1);
			this.adjust_init();
		}
	},

	//---------------------------------------------------------
	// Board and pieces
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

		getNum: function() {
			return this.qnum !== -1 ? this.qnum : this.anum;
		},
		setNum: function(val) {
			if (val === 0) {
				return;
			}
			if (this.puzzle.editmode) {
				if (val !== -1 && (val < 1 || val > 3)) {
					return;
				}
				this.setQnum(val);
				this.setAnum(-1);
				this.clrSnum();
			} else if (this.qnum === -1 && !this.disableAnum) {
				if (val >= 1 && val <= 3) {
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

	ExCell: {
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
		getNum: function() {
			return this.qnum !== -1 ? this.qnum : this.anum;
		},
		setNum: function(val) {
			if (val === 0) {
				return;
			}
			if (this.puzzle.editmode) {
				if (val !== -1 && (val < 1 || val > 3)) {
					return;
				}
				this.setQnum(val);
				this.setAnum(-1);
			} else if (this.qnum === -1 && !this.disableAnum) {
				if (val >= 1 && val <= 3) {
					this.setAnum(val);
				} else if (val === -1) {
					this.setAnum(-1);
				}
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
		hasborder: 2,
		hasexcell: 2,

		initBoardSize: function(col, row) {
			this.common.initBoardSize.call(this, 9, 9);
		}
	},

	BoardExec: {
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
		// Keep clue digits consistent with Nurikabe's default typography.
		textoption: { ratio: 0.8, position: 1 },
		graycellcolor: "rgb(192,192,192)",

		paint: function() {
			this.drawBGCells();
			this.drawBGExCells();
			// The common grid painter deliberately lets grid lines extend through
			// the ExCell area.  That is useful for varieties whose outside cells
			// are just clue positions, but Sky Neighbors has four real rows of
			// cells.  Draw the inner grid separately so those lines stop at the
			// thick 9x9 frame.
			this.drawSkyGrid();
			this.drawSkyOuterGrid();
			this.drawSkyGrayPieces();
			this.drawAnsNumbers();
			this.drawQuesNumbers();
			this.drawSkyExNumbers();
			this.drawChassis();
			this.drawTarget();
		},

		drawSkyGrid: function() {
			var g = this.vinc("grid", "crispEdges", true);
			var bd = this.board;
			g.lineWidth = this.gw;
			g.strokeStyle = this.gridcolor;

			// Cell coordinates are odd and the 9x9 board spans virtual
			// coordinates 0..18.  Keeping each line inside that range prevents
			// the common drawGrid() endpoint logic from leaking into the outside
			// clue rows.
			for (var x = 0; x <= 2 * bd.cols; x += 2) {
				g.vid = "bdy_" + x;
				g.strokeLine(x * this.bw, 0, x * this.bw, 2 * bd.rows * this.bh);
			}
			for (var y = 0; y <= 2 * bd.rows; y += 2) {
				g.vid = "bdx_" + y;
				g.strokeLine(0, y * this.bh, 2 * bd.cols * this.bw, y * this.bh);
			}
		},

		drawSkyOuterGrid: function() {
			var g = this.vinc("sky_outer_grid", "crispEdges", true);
			var bd = this.board;
			g.lineWidth = this.gw;
			g.strokeStyle = this.gridcolor;

			function line(g, bw, bh, id, x1, y1, x2, y2) {
				// Keep a stable vector id.  Without one, every repaint appends a
				// fresh SVG path to the layer (and the layer grows indefinitely).
				g.vid = id;
				g.strokeLine(x1 * bw, y1 * bh, x2 * bw, y2 * bh);
			}
			// The four corners are intentionally empty.  Draw each outside band
			// as one-cell-wide rectangles.  Shared edges are emitted only once;
			// this avoids darker/doubled lines where adjacent ExCells meet.
			var maxx = 2 * bd.cols;
			var maxy = 2 * bd.rows;
			line(g, this.bw, this.bh, "top_outer", 0, -2, maxx, -2);
			line(g, this.bw, this.bh, "top_inner", 0, 0, maxx, 0);
			line(g, this.bw, this.bh, "bottom_inner", 0, maxy, maxx, maxy);
			line(g, this.bw, this.bh, "bottom_outer", 0, maxy + 2, maxx, maxy + 2);
			for (var i = 0; i <= bd.cols; i++) {
				var x = 2 * i;
				line(g, this.bw, this.bh, "top_v_" + i, x, -2, x, 0);
				line(g, this.bw, this.bh, "bottom_v_" + i, x, maxy, x, maxy + 2);
			}

			line(g, this.bw, this.bh, "left_outer", -2, 0, -2, maxy);
			line(g, this.bw, this.bh, "left_inner", 0, 0, 0, maxy);
			line(g, this.bw, this.bh, "right_inner", maxx, 0, maxx, maxy);
			line(g, this.bw, this.bh, "right_outer", maxx + 2, 0, maxx + 2, maxy);
			for (var j = 0; j <= bd.rows; j++) {
				var y = 2 * j;
				line(g, this.bw, this.bh, "left_h_" + j, -2, y, 0, y);
				line(g, this.bw, this.bh, "right_h_" + j, maxx, y, maxx + 2, y);
			}
		},

		drawSkyGrayPieces: function() {
			var g = this.vinc("sky_gray", "crispEdges", true);
			var groups = [this.range.cells, this.range.excells];
			var lineWidth = Math.max(1, (this.cw * 0.055) | 0);
			for (var k = 0; k < groups.length; k++) {
				var list = groups[k];
				for (var i = 0; i < list.length; i++) {
					var piece = list[i];
					g.vid = "sky_gray_" + piece.group + "_" + piece.id;
					if (piece.isGray()) {
						var color =
							piece.error === 1 ? this.errcolor1 : "rgb(112,112,112)";
						g.lineWidth = lineWidth;
						g.fillStyle =
							piece.error === 1 ? this.errbcolor1 : this.graycellcolor;
						g.strokeStyle = color;
						// Keep the outlined mark within its one-cell ExCell/Cell box.
						g.shapeRectCenter(
							piece.bx * this.bw,
							piece.by * this.bh,
							this.bw * 0.84,
							this.bh * 0.84
						);
					} else {
						g.vhide();
					}
				}
			}
		},

		drawSkyExNumbers: function() {
			var g = this.vinc("sky_ex_number", "auto");
			var exlist = this.range.excells;
			for (var i = 0; i < exlist.length; i++) {
				var excell = exlist[i];
				var qtext = this.getNumberText(excell, excell.qnum);
				var atext =
					excell.qnum === -1 ? this.getNumberText(excell, excell.anum) : "";
				var px = excell.bx * this.bw;
				var py = excell.by * this.bh;
				g.vid = "sky_ex_qnum_" + excell.id;
				if (qtext) {
					g.fillStyle = this.getQuesNumberColor(excell);
					this.disptext(qtext, px, py, this.textoption);
				} else {
					g.vhide();
				}
				g.vid = "sky_ex_anum_" + excell.id;
				if (atext) {
					g.fillStyle = this.getAnsNumberColor(excell);
					this.disptext(atext, px, py, this.textoption);
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
			// A Sky-neighbor URL often uses semicolons between the nine gray
			// rows.  When the URL is copied through a browser those semicolons
			// may arrive percent-encoded (`%3B`).  Decode the payload before
			// splitting it so browser navigation and direct parser calls behave
			// identically.  Keep malformed escapes literal; the normal layer
			// validation below will reject any resulting invalid characters.
			var encoded = this.outbstr || "";
			var decoded = encoded;
			try {
				decoded = decodeURIComponent(encoded);
			} catch (e) {}
			var parts = decoded.split("/");
			var inner = parts.shift() || "";
			var outer = parts.shift() || "";
			var innerGray = parts.shift() || "";
			var outerGray = parts.shift() || "";

			/*
			 * In addition to the compact four-layer form emitted below, accept
			 * the six/ten-layer form used by the paper-puzzle importer:
			 *
			 *   inner / inner-gray / top / bottom / left / right
			 *   [ / top-gray / bottom-gray / left-gray / right-gray ]
			 *
			 * The side numbers are outside ExCell givens in that form.  A gray
			 * layer may contain semicolon-separated rows; the board itself stores
			 * the same information as a flat 81-character mask.
			 */
			var compact = function(value) {
				return (value || "").replace(/[\s;,|]/g, "");
			};
			var referenceParts = [inner, outer, innerGray, outerGray].concat(parts);
			var isReference =
				referenceParts.length >= 6 &&
				compact(referenceParts[0]).length === 81 &&
				compact(referenceParts[1]).length === 81 &&
				compact(referenceParts[2]).length === 9 &&
				compact(referenceParts[3]).length === 9 &&
				compact(referenceParts[4]).length === 9 &&
				compact(referenceParts[5]).length === 9;
			if (isReference) {
				inner = compact(referenceParts[0]);
				innerGray = compact(referenceParts[1]);
				outer =
					compact(referenceParts[2]) +
					compact(referenceParts[3]) +
					compact(referenceParts[4]) +
					compact(referenceParts[5]);
				if (referenceParts.length >= 10) {
					outerGray =
						compact(referenceParts[6]) +
						compact(referenceParts[7]) +
						compact(referenceParts[8]) +
						compact(referenceParts[9]);
				} else {
					outerGray = "";
				}
				parts = [];
			}
			var cells = this.board.cell;
			var excells = this.board.excell;
			for (var i = 0; i < cells.length; i++) {
				var q = inner.charAt(i);
				cells[i].qnum = q >= "1" && q <= "3" ? +q : -1;
				var gray = innerGray.charAt(i);
				cells[i].ques =
					gray === "1" || gray === "#" || gray === "g" || gray === "G" ? 1 : 0;
				cells[i].anum = -1;
			}
			for (var j = 0; j < excells.length; j++) {
				var eq = outer.charAt(j);
				excells[j].qnum = eq >= "1" && eq <= "3" ? +eq : -1;
				var egray = outerGray.charAt(j);
				excells[j].ques =
					egray === "1" || egray === "#" || egray === "g" || egray === "G"
						? 1
						: 0;
				excells[j].anum = -1;
			}
			this.outbstr = parts.join("/");
		},
		encodePzpr: function(type) {
			var inner = "";
			var innerGray = "";
			var outer = ["", "", "", ""];
			var outerGray = ["", "", "", ""];
			for (var i = 0; i < this.board.cell.length; i++) {
				var cell = this.board.cell[i];
				inner += cell.qnum >= 1 && cell.qnum <= 3 ? cell.qnum : ".";
				innerGray += cell.isGray() ? "G" : ".";
			}
			// The reference format stores the four outside sides separately:
			// top, bottom, left, right.  ExCells themselves are kept in exactly
			// that order by Board.setposExCells (0..8, 9..17, 18..26, 27..35).
			for (var j = 0; j < this.board.excell.length; j++) {
				var excell = this.board.excell[j];
				var side = (j / 9) | 0;
				outer[side] += excell.qnum >= 1 && excell.qnum <= 3 ? excell.qnum : ".";
				outerGray[side] += excell.isGray() ? "1" : "0";
			}
			var innerGrayRows = [];
			for (var r = 0; r < 9; r++) {
				innerGrayRows.push(innerGray.substr(r * 9, 9));
			}
			this.outbstr +=
				inner +
				"/" +
				innerGrayRows.join(";") +
				"/" +
				outer.join("/") +
				"/" +
				outerGray.join("/");
		}
	},

	//---------------------------------------------------------
	// pzpr file format.  Each layer is an 11x11 odd-coordinate grid;
	// the four corners are represented by a dot because they are empty.
	FileIO: {
		decodeData: function() {
			this.decodeSkyLayer("qnum");
			this.decodeSkyLayer("gray");
			this.decodeSkyLayer("anum");
		},
		encodeData: function() {
			this.encodeSkyLayer("qnum");
			this.encodeSkyLayer("gray");
			this.encodeSkyLayer("anum");
		},
		decodeSkyLayer: function(layer) {
			this.decodeCellExCell(function(obj, ca) {
				if (obj.isnull) {
					return;
				}
				if (layer === "gray") {
					obj.ques =
						ca === "1" || ca === "#" || ca === "g" || ca === "G" ? 1 : 0;
				} else {
					var num = +ca;
					obj[layer] = num >= 1 && num <= 3 ? num : -1;
				}
			});
		},
		encodeSkyLayer: function(layer) {
			this.encodeCellExCell(function(obj) {
				if (obj.isnull) {
					return ". ";
				}
				if (layer === "gray") {
					return (obj.isGray() ? "1" : "0") + " ";
				}
				return (obj[layer] >= 1 && obj[layer] <= 3 ? obj[layer] : ".") + " ";
			});
		}
	},

	//---------------------------------------------------------
	// Answer checking
	AnsCheck: {
		checklist: [
			"checkNoNumPieceSkyNeighbor",
			"checkFixedNumbersSkyNeighbor",
			"checkRowColumnCountsSkyNeighbor",
			"checkNeighborRulesSkyNeighbor",
			"checkSkyVisibility"
		],

		checkNoNumPieceSkyNeighbor: function() {
			var bd = this.board;
			var valid = true;
			var groups = [bd.cell, bd.excell];
			for (var g = 0; g < groups.length; g++) {
				for (var i = 0; i < groups[g].length; i++) {
					var piece = groups[g][i];
					if (!piece.isnull && piece.noNum()) {
						valid = false;
						if (!this.checkOnly) {
							piece.seterr(1);
						}
						if (this.checkOnly) {
							break;
						}
					}
				}
				if (this.checkOnly && !valid) {
					break;
				}
			}
			if (!valid) {
				this.failcode.add("ceNoNum");
			}
		},

		checkFixedNumbersSkyNeighbor: function() {
			var bd = this.board;
			var valid = true;
			var groups = [bd.cell, bd.excell];
			for (var g = 0; g < groups.length; g++) {
				for (var i = 0; i < groups[g].length; i++) {
					var piece = groups[g][i];
					if (
						!piece.isnull &&
						piece.qnum >= 1 &&
						piece.qnum <= 3 &&
						piece.anum !== -1 &&
						piece.anum !== piece.qnum
					) {
						valid = false;
						if (!this.checkOnly) {
							piece.seterr(1);
						}
						if (this.checkOnly) {
							break;
						}
					}
				}
				if (this.checkOnly && !valid) {
					break;
				}
			}
			if (!valid) {
				this.failcode.add("nmFixed");
			}
		},

		checkRowColumnCountsSkyNeighbor: function() {
			var bd = this.board;
			var valid = true;
			for (var y = 0; y < bd.rows; y++) {
				var counts = [0, 0, 0, 0];
				for (var x = 0; x < bd.cols; x++) {
					var n = bd.cell[y * bd.cols + x].getNum();
					if (n >= 1 && n <= 3) {
						counts[n]++;
					}
				}
				if (counts[1] !== 3 || counts[2] !== 3 || counts[3] !== 3) {
					valid = false;
					if (!this.checkOnly) {
						bd.cellinside(1, 2 * y + 1, 2 * bd.cols - 1, 2 * y + 1).seterr(1);
					}
					if (this.checkOnly) {
						break;
					}
				}
			}
			if (valid) {
				for (var x2 = 0; x2 < bd.cols; x2++) {
					var colcounts = [0, 0, 0, 0];
					for (var y2 = 0; y2 < bd.rows; y2++) {
						var num = bd.cell[y2 * bd.cols + x2].getNum();
						if (num >= 1 && num <= 3) {
							colcounts[num]++;
						}
					}
					if (colcounts[1] !== 3 || colcounts[2] !== 3 || colcounts[3] !== 3) {
						valid = false;
						if (!this.checkOnly) {
							bd.cellinside(2 * x2 + 1, 1, 2 * x2 + 1, 2 * bd.rows - 1).seterr(
								1
							);
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

		checkNeighborRulesSkyNeighbor: function() {
			var bd = this.board;
			var groups = [bd.cell, bd.excell];
			var valid = true;
			for (var g = 0; g < groups.length; g++) {
				for (var i = 0; i < groups[g].length; i++) {
					var piece = groups[g][i];
					if (piece.isnull || !piece.isNum()) {
						continue;
					}
					var same = [];
					/*
					 * BoardPiece.initAdjacent() is intentionally cell-oriented in
					 * pzpr: an edge cell's outside neighbour is returned as the
					 * empty Cell, and an ExCell's side neighbours are not linked at
					 * all.  Sky Neighbors treats the outside ring as real cells, so
					 * resolve all four positions through getobj(), which knows how
					 * to return either a Cell or an ExCell at an odd/odd position.
					 */
					var adjacent = [
						bd.getobj(piece.bx, piece.by - 2),
						bd.getobj(piece.bx, piece.by + 2),
						bd.getobj(piece.bx - 2, piece.by),
						bd.getobj(piece.bx + 2, piece.by)
					];
					adjacent.forEach(function(other) {
						if (
							!other.isnull &&
							(other.group === "cell" || other.group === "excell") &&
							other.getNum() === piece.getNum()
						) {
							same.push(other);
						}
					});
					var bad = piece.isGray() ? same.length > 0 : same.length === 0;
					if (!bad) {
						continue;
					}
					valid = false;
					if (!this.checkOnly) {
						piece.seterr(1);
						for (var s = 0; s < same.length; s++) {
							same[s].seterr(1);
						}
					}
					if (this.checkOnly) {
						break;
					}
				}
				if (this.checkOnly && !valid) {
					break;
				}
			}
			if (!valid) {
				this.failcode.add("nmNeighbor");
			}
		},

		checkSkyVisibility: function() {
			var bd = this.board;
			var valid = true;
			for (var side = 0; side < 4; side++) {
				for (var pos = 0; pos < 9; pos++) {
					var values = [];
					for (var p = 0; p < 9; p++) {
						var y = side === 0 ? p : side === 1 ? 8 - p : pos;
						var x = side === 2 ? p : side === 3 ? 8 - p : pos;
						values.push(bd.cell[y * bd.cols + x].getNum());
					}
					if (
						values.some(function(n) {
							return n < 1 || n > 3;
						})
					) {
						continue;
					}
					var seen = 0;
					var tallest = 0;
					for (var v = 0; v < values.length; v++) {
						if (values[v] > tallest) {
							tallest = values[v];
							seen++;
						}
					}
					var outerIndex = side * 9 + pos;
					var clue = bd.excell[outerIndex];
					if (clue.getNum() !== seen) {
						valid = false;
						if (!this.checkOnly) {
							clue.seterr(1);
							for (var z = 0; z < 9; z++) {
								var ey = side === 0 ? z : side === 1 ? 8 - z : pos;
								var ex = side === 2 ? z : side === 3 ? 8 - z : pos;
								bd.cell[ey * bd.cols + ex].seterr(1);
							}
						}
						if (this.checkOnly) {
							break;
						}
					}
				}
				if (this.checkOnly && !valid) {
					break;
				}
			}
			if (!valid) {
				this.failcode.add("nmSky");
			}
		}
	}
});
