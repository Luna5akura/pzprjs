//
// Travel Line / travelline.js
//
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["travelline"], {
	MouseEvent: {
		draggingSG: false,
		inputModes: {
			edit: [
				"arrow",
				"bar",
				"travel-sloop",
				"travel-order",
				"travel-ice",
				"travel-white",
				"travel-black",
				"travel-dotw",
				"travel-dotb",
				"travel-notouch",
				"travel-noadj",
					"travel-slither",
					"travel-div1",
					"travel-div2",
					"travel-div3",
					"travel-yajilin",
					"travel-cw",
					"country",
				"travel-required",
				"clear",
				"info-line"
			],
			play: ["line", "peke", "diraux", "info-line"]
		},

		mouseinput: function() {
			if (this.puzzle.editmode) {
				if (this.inputMode === "arrow") {
					this.inputarrow_line();
					return;
				}
				if (
					this.inputMode === "country" ||
					this.inputMode === "travel-required"
					) {
						this.inputCountry();
						return;
					}
					if (this.inputMode === "travel-order") {
						this.inputOrderClue();
						return;
					}
					if (this.isDirectedInputMode()) {
						this.inputDirectedClue();
						return;
					}
					if (this.isCrossInputMode()) {
						this.inputCrossClue();
						return;
				}
				if (this.inputMode === "clear") {
					this.inputClearClue();
					return;
				}
				if (this.mousestart) {
					this.inputClue();
				}
				return;
			}
			this.common.mouseinput.call(this);
		},

		mouseinput_other: function() {
			if (this.inputMode === "diraux") {
				if (this.mousestart || this.mousemove) {
					this.inputdiraux_mousemove();
				} else if (this.mouseend && this.notInputted()) {
					this.clickdiraux();
				}
			}
		},

		mouseinput_auto: function() {
			if (this.puzzle.playmode) {
				if (this.btn === "left") {
					if (this.mousestart || this.mousemove) {
						this.inputLine();
					} else if (this.mouseend && this.notInputted()) {
						this.clickdiraux();
					}
				} else if (this.btn === "right") {
					if (this.mousestart) {
						this.inputdiraux_mousedown();
					} else if (this.inputData === 2 || this.inputData === 3) {
						this.inputpeke();
					} else if (this.mousemove) {
						this.inputdiraux_mousemove();
					}
				}
				return;
			}

			if (this.inputMode === "arrow") {
				this.inputarrow_line();
			} else if (
				this.inputMode === "country" ||
				this.inputMode === "travel-required"
				) {
					this.inputCountry();
				} else if (this.inputMode === "travel-order") {
					this.inputOrderClue();
				} else if (this.isDirectedInputMode()) {
					this.inputDirectedClue();
				} else if (this.isCrossInputMode()) {
					this.inputCrossClue();
				} else if (this.inputMode === "clear") {
				this.inputClearClue();
			} else if (this.mousestart) {
				this.inputClue();
			}
			},
			isDirectedInputMode: function() {
				return (
					this.inputMode === "travel-yajilin" ||
					this.inputMode === "travel-cw"
				);
			},
			isCrossInputMode: function() {
			return (
				this.inputMode === "travel-slither" ||
				this.inputMode === "travel-div1" ||
				this.inputMode === "travel-div2" ||
				this.inputMode === "travel-div3"
			);
		},

		inputarrow_line: function() {
			var pos = this.getpos(0);
			if (this.prevPos.equals(pos)) {
				return;
			}

			var border = this.prevPos.getnb(pos);
			if (!border.isnull && !this.mousestart) {
				var dir = this.prevPos.getdir(pos, 2);
				if (!border.inside && this.inputData === null) {
					this.inputarrow_inout(border, dir);
				}
				border.draw();
			}
			this.prevPos = pos;
		},
		inputarrow_inout: function(border, dir) {
			var val = this.checkinout(border, dir);
			if (val > 0) {
				this.setEndpointByBorder(border, val);
				this.mousereset();
			}
		},
		checkinout: function(border, dir) {
			if (border.isnull) {
				return 0;
			}
			var bd = this.board;
			var bx = border.bx;
			var by = border.by;
			if (
				(bx === bd.minbx + 2 && dir === border.RT) ||
				(bx === bd.maxbx - 2 && dir === border.LT) ||
				(by === bd.minby + 2 && dir === border.DN) ||
				(by === bd.maxby - 2 && dir === border.UP)
			) {
				return 1;
			} else if (
				(bx === bd.minbx + 2 && dir === border.LT) ||
				(bx === bd.maxbx - 2 && dir === border.RT) ||
				(by === bd.minby + 2 && dir === border.UP) ||
				(by === bd.maxby - 2 && dir === border.DN)
			) {
				return 2;
			}
			return 0;
		},
		setEndpointByBorder: function(border, type) {
			if (type === 1) {
				this.board.arrowin.input(border);
			} else if (type === 2) {
				this.board.arrowout.input(border);
			}
		},

		inputClue: function() {
			var cell = this.getcell();
			if (cell.isnull) {
				return;
			}
			var clue = {
				bar: 1,
				"travel-sloop": 9,
				"travel-ice": 2,
				"travel-white": 3,
				"travel-black": 4,
				"travel-notouch": 5,
				"travel-noadj": 6,
				"travel-dotw": 7,
				"travel-dotb": 8
			}[this.inputMode];
			if (!clue) {
				return;
			}
			if (this.btn === "right") {
				cell.setQues(0);
				cell.setQdir(0);
				cell.setQnum(-1);
				cell.setQnum2(-1);
				cell.draw();
				this.mousereset();
				return;
			}
			cell.setQdir(0);
			cell.setQnum2(-1);
			cell.setQnum(cell.qnum !== clue ? clue : -1);
			cell.draw();
			this.mousereset();
		},
		inputOrderClue: function() {
			if (!this.mousestart) {
				return;
			}
			var cell = this.getcell();
			if (cell.isnull) {
				return;
			}
			if (this.btn === "right") {
				if (cell.qnum === 16 && cell.qnum2 > 0) {
					cell.setQnum2(cell.qnum2 - 1);
				} else {
					cell.setQnum(-1);
					cell.setQnum2(-1);
					cell.setQdir(0);
				}
			} else {
				if (cell.qnum !== 16) {
					cell.setQnum(16);
					cell.setQnum2(0);
					cell.setQdir(0);
				} else {
					cell.setQnum2(Math.min((cell.qnum2 >= 0 ? cell.qnum2 : 0) + 1, 51));
				}
			}
			cell.draw();
			this.mousereset();
		},
		inputDirectedClue: function() {
			if (this.mousestart || this.mousemove) {
				this.inputDirectedArrow();
				return;
			}
			if (this.mouseend && this.notInputted()) {
				this.inputDirectedNumber();
			}
		},
		inputDirectedArrow: function() {
			var pos = this.getpos(0);
			if (this.prevPos.equals(pos)) {
				return;
			}

			var type = this.inputMode === "travel-yajilin" ? 14 : 15;
			var cell = this.prevPos.getc();
			if (!cell.isnull && cell.qnum === type) {
				var dir = this.prevPos.getdir(pos, 2);
				if (dir !== cell.NDIR) {
					cell.setQdir(cell.qdir !== dir ? dir : 0);
					cell.draw();
				}
			}
			this.prevPos = pos;
		},
		inputDirectedNumber: function() {
			var cell = this.getcell();
			if (cell.isnull) {
				return;
			}
			var clueType = this.inputMode === "travel-yajilin" ? 14 : 15;
			if (this.btn === "right") {
				if (cell.qnum === clueType && cell.qnum2 >= 0) {
					if (cell.qnum2 > 0) {
						cell.setQnum2(cell.qnum2 - 1);
					} else {
						cell.setQnum(-1);
						cell.setQnum2(-1);
						cell.setQdir(0);
					}
				} else if (cell.qnum !== clueType) {
					return;
				} else {
					cell.setQnum2(cell.qnum2 - 1);
				}
			} else {
				if (cell.qnum !== clueType) {
					cell.setQnum(clueType);
					cell.setQnum2(0);
					cell.setQdir(cell.UP);
				} else {
					cell.setQnum2((cell.qnum2 >= 0 ? cell.qnum2 : 0) + 1);
				}
			}
			cell.draw();
			this.mousereset();
		},
		inputCrossClue: function() {
			if (!this.mousestart) {
				return;
			}
			var cross = this.getpos(0.25).getx();
			if (cross.isnull) {
				return;
			}

			if (this.inputMode === "travel-slither") {
				if (this.btn === "right") {
					cross.setQnum(cross.qnum >= 0 && cross.qnum <= 4 ? cross.qnum - 1 : -1);
				} else {
					cross.setQnum(cross.qnum >= 0 && cross.qnum < 4 ? cross.qnum + 1 : 0);
				}
			} else {
				var clue = {
					"travel-div1": 11,
					"travel-div2": 12,
					"travel-div3": 13
				}[this.inputMode];
				if (this.btn === "right") {
					cross.setQnum(-1);
				} else {
					cross.setQnum(cross.qnum !== clue ? clue : -1);
				}
			}
			cross.draw();
			this.mousereset();
		},

		inputCountry: function() {
			if (!this.mousestart) {
				return;
			}
			var border = this.getpos(0).getb();
			if (border.isnull || !border.inside) {
				return;
			}
			var ques = this.inputMode === "travel-required" ? 2 : 1;
			border.setQues(border.ques !== ques ? ques : 0);
			border.draw();
			this.mousereset();
		},

		inputClearClue: function() {
			if (!this.mousestart) {
				return;
			}
			var pos = this.getpos(0);
			var cell = pos.getc();
			if (!cell.isnull) {
				cell.setQnum(-1);
				cell.setQnum2(-1);
				cell.setQdir(0);
				cell.draw();
				this.mousereset();
				return;
			}
			var cross = pos.getx();
			if (!cross.isnull) {
				cross.setQnum(-1);
				cross.draw();
				this.mousereset();
				return;
			}
			var border = pos.getb();
			if (!border.isnull && border.inside) {
				border.setQues(0);
				border.draw();
				this.mousereset();
			}
		}
	},

	KeyEvent: {
		enablemake: true,
		keyinput: function(ca) {
			var cell = this.cursor.getc();
			if (cell.isnull) {
				return;
			}
			var qnum = null;
			switch (ca) {
				case "x":
					qnum = 1;
					break;
				case "i":
					qnum = 2;
					break;
				case "w":
					qnum = 3;
					break;
				case "b":
					qnum = 4;
					break;
				case "t":
					qnum = 5;
					break;
				case "a":
					qnum = 6;
					break;
				case "o":
					qnum = 7;
					break;
				case "p":
					qnum = 8;
					break;
					case "s":
						qnum = 9;
						break;
					case "y":
						qnum = 14;
						break;
					case "c":
						qnum = 15;
						break;
					case "r":
						qnum = 16;
						break;
					case " ":
				case "BS":
				case "-":
					qnum = -1;
					break;
			}
			if (qnum !== null) {
				cell.setQnum(qnum);
				if (qnum === 14 || qnum === 15) {
					cell.setQnum2(cell.qnum2 >= 0 ? cell.qnum2 : 0);
					cell.setQdir(cell.qdir || cell.UP);
				} else if (qnum === 16) {
					cell.setQnum2(cell.qnum2 >= 0 ? cell.qnum2 : 0);
					cell.setQdir(0);
				} else {
					cell.setQnum2(-1);
					cell.setQdir(0);
				}
				cell.draw();
			}
		}
	},

	Border: {
		enableLineNG: true,
		getArrow: function() {
			return this.qdir;
		},
		setArrow: function(val) {
			this.setQdir(val);
		},
		isArrow: function() {
			return this.qdir > 0;
		},
		isLineNG: function() {
			var obj1 = this.sidecell[0];
			var obj2 = this.sidecell[1];
			if (this.isVert()) {
				return (
					(obj1.group === "cell" && obj1.noLP(obj1.RT)) ||
					(obj2.group === "cell" && obj2.noLP(obj2.LT))
				);
			}
			return (
				(obj1.group === "cell" && obj1.noLP(obj1.DN)) ||
				(obj2.group === "cell" && obj2.noLP(obj2.UP))
			);
		}
	},
	Cross: {
		maxnum: 13,
		minnum: 0,
		isSlither: function() {
			return this.qnum >= 0 && this.qnum <= 4;
		},
		getDivideType: function() {
			return this.qnum >= 11 && this.qnum <= 13 ? this.qnum - 10 : 0;
		}
	},

	Cell: {
		maxnum: 16,
		minnum: 1,

		noLP: function() {
			return this.qnum === 1;
		},
		isOnBoardEdge: function() {
			var bd = this.board;
			return (
				this.bx === bd.minbx + 1 ||
				this.bx === bd.maxbx - 1 ||
				this.by === bd.minby + 1 ||
				this.by === bd.maxby - 1
			);
		},
		isBar: function() {
			return this.qnum === 1;
		},
		isIce: function() {
			return this.qnum === 2;
		},
		isWhitePearl: function() {
			return this.qnum === 3;
		},
		isBlackPearl: function() {
			return this.qnum === 4;
		},
		isNoTouch: function() {
			return this.qnum === 5;
		},
		isNoAdj: function() {
			return this.qnum === 6;
		},
		isDotWhite: function() {
			return this.qnum === 7;
		},
		isDotBlack: function() {
			return this.qnum === 8;
		},
		isSloop: function() {
			return this.qnum === 9;
		},
		isYajilin: function() {
			return this.qnum === 14;
		},
		isCw: function() {
			return this.qnum === 15;
		},
		isOrder: function() {
			return this.qnum === 16;
		},
		isLineStraightTravel: function() {
			return (
				(this.adjborder.top.isLine() && this.adjborder.bottom.isLine()) ||
				(this.adjborder.left.isLine() && this.adjborder.right.isLine())
			);
		},
		isLineCurveTravel: function() {
			return this.lcnt === 2 && !this.isLineStraightTravel();
		}
	},

	Board: {
		cols: 8,
		rows: 8,
		hasborder: 2,
		hasexcell: 2,
		hascross: 1,

		arrowin: null,
		arrowout: null,

		createExtraObject: function() {
			var classes = this.klass;
			this.arrowin = new classes.InAddress(2, 0);
			this.arrowout = new classes.OutAddress(4, 0);
			this.arrowin.partner = this.arrowout;
			this.arrowout.partner = this.arrowin;
		},
		initExtraObject: function(col, row) {
			this.disableInfo();
			if (col >= 3) {
				this.arrowin.init(1, 0);
				this.arrowout.init(5, 0);
			} else {
				this.arrowin.init(1, 0);
				this.arrowout.init(1, 2 * row);
			}
			this.enableInfo();
		},
		exchangeinout: function() {
			var oldin = this.arrowin.getb();
			var oldout = this.arrowout.getb();
			oldin.setArrow(0);
			oldout.setArrow(0);
			this.arrowin.set(oldout);
			this.arrowout.set(oldin);

			this.arrowin.draw();
			this.arrowout.draw();
		},
		getEntryCell: function(address) {
			var border = address.getb();
			return border.sidecell[0].isnull ? border.sidecell[1] : border.sidecell[0];
		},
		getStartCell: function() {
			return this.getEntryCell(this.arrowin);
		},
		getGoalCell: function() {
			return this.getEntryCell(this.arrowout);
		}
	},
	BoardExec: {
		adjustBoardData: function(key, d) {
			var bd = this.board;
			this.adjustBorderArrow(key, d);
			this.posinfo_in = this.getAfterPos(key, d, bd.arrowin.getb());
			this.posinfo_out = this.getAfterPos(key, d, bd.arrowout.getb());
		},
		adjustBoardData2: function() {
			var bd = this.board;
			bd.disableInfo();
			bd.arrowin.set(this.posinfo_in.pos);
			bd.arrowout.set(this.posinfo_out.pos);
			bd.enableInfo();
		}
	},
	OperationManager: {
		addExtraOperation: function() {
			this.operationlist.push(this.klass.InOutOperation);
		}
	},

	LineGraph: {
		enabled: true,
		makeClist: true,
		rebuild2: function() {
			var excells = this.board.excell;
			for (var c = 0; c < excells.length; c++) {
				this.setComponentRefs(excells[c], null);
				this.resetObjNodeList(excells[c]);
			}

			this.common.rebuild2.call(this);
		}
	},

	"InOutAddress:Address": {
		type: "",
		partner: null,

		init: function(bx, by) {
			this.bx = bx;
			this.by = by;
			if (!!this.board) {
				this.setarrow(this.getb());
			}
			return this;
		},

		getid: function() {
			return this.getb().id;
		},
		setid: function(id) {
			this.input(this.board.border[id]);
		},

		input: function(border) {
			if (!this.partner.equals(border)) {
				if (!this.equals(border)) {
					this.getb().setArrow(0);
					this.set(border);
				}
			} else {
				this.board.exchangeinout();
			}
		},
		set: function(pos) {
			var pos0 = this.getaddr();
			this.addOpe(pos.bx, pos.by);

			this.bx = pos.bx;
			this.by = pos.by;
			this.setarrow(this.getb());

			pos0.draw();
			this.draw();
		},

		addOpe: function(bx, by) {
			if (this.bx === bx && this.by === by) {
				return;
			}
			this.puzzle.opemgr.add(
				new this.klass.InOutOperation(this.type, this.bx, this.by, bx, by)
			);
		}
	},
	"InAddress:InOutAddress": {
		type: "in",

		setarrow: function(border) {
			var bd = this.board;
			if (border.by === bd.maxby - 2) {
				border.setArrow(border.UP);
			} else if (border.by === bd.minby + 2) {
				border.setArrow(border.DN);
			} else if (border.bx === bd.maxbx - 2) {
				border.setArrow(border.LT);
			} else if (border.bx === bd.minbx + 2) {
				border.setArrow(border.RT);
			}
		}
	},
	"OutAddress:InOutAddress": {
		type: "out",

		setarrow: function(border) {
			var bd = this.board;
			if (border.by === bd.minby + 2) {
				border.setArrow(border.UP);
			} else if (border.by === bd.maxby - 2) {
				border.setArrow(border.DN);
			} else if (border.bx === bd.minbx + 2) {
				border.setArrow(border.LT);
			} else if (border.bx === bd.maxbx - 2) {
				border.setArrow(border.RT);
			}
		}
	},
	"InOutOperation:Operation": {
		property: "",

		setData: function(property, x1, y1, x2, y2) {
			this.property = property;
			this.bx1 = x1;
			this.by1 = y1;
			this.bx2 = x2;
			this.by2 = y2;
		},
		decode: function(strs) {
			if (strs[0] !== "PI" && strs[0] !== "PO") {
				return false;
			}
			this.property = strs[0] === "PI" ? "in" : "out";
			this.bx1 = +strs[1];
			this.by1 = +strs[2];
			this.bx2 = +strs[3];
			this.by2 = +strs[4];
			return true;
		},
		toString: function() {
			return [
				this.property === "in" ? "PI" : "PO",
				this.bx1,
				this.by1,
				this.bx2,
				this.by2
			].join(",");
		},

		undo: function() {
			this.exec(this.bx1, this.by1);
		},
		redo: function() {
			this.exec(this.bx2, this.by2);
		},
		exec: function(bx, by) {
			var bd = this.board;
			var border = bd.getb(bx, by);
			if (this.property === "in") {
				bd.arrowin.set(border);
			} else if (this.property === "out") {
				bd.arrowout.set(border);
			}
		}
	},

	Graphic: {
		irowake: true,
		gridcolor_type: "LIGHT",
		icecolor: "rgb(163, 216, 255)",

		paint: function() {
			this.drawBGCells();
			this.drawGrid();
			this.drawBorders();
			this.drawArrowNumbers();
			this.drawLines();
			this.drawPekes();
			this.drawBorderAuxDir();
			this.drawCellClues();
			this.drawCrossClues();
			this.drawBorderArrows();
			this.drawChassis();
			this.drawBoxBorders(true);
			this.drawTarget();
			this.drawInOut();
		},

		getCanvasCols: function() {
			var bd = this.board;
			var cols = this.getBoardCols() + 2 * this.margin;
			if (this.puzzle.playeronly) {
				if (bd.arrowin.bx === bd.minbx + 2 || bd.arrowout.bx === bd.minbx + 2) {
					cols += 1.2;
				}
				if (bd.arrowin.bx === bd.maxbx - 2 || bd.arrowout.bx === bd.maxbx - 2) {
					cols += 1.2;
				}
			} else {
				cols += 1.4;
			}
			return cols;
		},
		getCanvasRows: function() {
			var bd = this.board;
			var rows = this.getBoardRows() + 2 * this.margin;
			if (this.puzzle.playeronly) {
				if (bd.arrowin.by === bd.minby + 2 || bd.arrowout.by === bd.minby + 2) {
					rows += 0.7;
				}
				if (bd.arrowin.by === bd.maxby - 2 || bd.arrowout.by === bd.maxby - 2) {
					rows += 0.7;
				}
			} else {
				rows += 1.4;
			}
			return rows;
		},
		getBoardCols: function() {
			var bd = this.board;
			return (bd.maxbx - bd.minbx) / 2 - 2;
		},
		getBoardRows: function() {
			var bd = this.board;
			return (bd.maxby - bd.minby) / 2 - 2;
		},
		getOffsetCols: function() {
			var bd = this.board;
			var cols = 0;
			if (this.puzzle.playeronly) {
				if (bd.arrowin.bx === bd.minbx + 2 || bd.arrowout.bx === bd.minbx + 2) {
					cols += 0.6;
				}
				if (bd.arrowin.bx === bd.maxbx - 2 || bd.arrowout.bx === bd.maxbx - 2) {
					cols -= 0.6;
				}
			}
			return cols;
		},
		getOffsetRows: function() {
			var bd = this.board;
			var rows = 0;
			if (this.puzzle.playeronly) {
				if (bd.arrowin.by === bd.minby + 2 || bd.arrowout.by === bd.minby + 2) {
					rows += 0.35;
				}
				if (bd.arrowin.by === bd.maxby - 2 || bd.arrowout.by === bd.maxby - 2) {
					rows -= 0.35;
				}
			}
			return rows;
		},

		getBGCellColor: function(cell) {
			var info = cell.error || cell.qinfo;
			if (cell.isBar()) {
				return info === 1 ? this.errcolor1 : this.shadecolor;
			}
			if (cell.isNoTouch()) {
				return info === 1 ? this.errbcolor1 : "rgb(246, 207, 207)";
			}
			if (cell.isNoAdj()) {
				return info === 1 ? this.errbcolor1 : "rgb(219, 240, 205)";
			}
			if (cell.isSloop()) {
				return info === 1 ? this.errbcolor1 : "rgb(210,255,210)";
			}
			if (cell.isIce()) {
				return info === 1 ? this.erricecolor : this.icecolor;
			}
			if (cell.isYajilin() || cell.isCw()) {
				return info === 1 ? this.errbcolor1 : "rgb(224,224,224)";
			}
			if (info === 1) {
				return this.errbcolor1;
			}
			return null;
		},

		getQuesNumberText: function(cell) {
			if (cell.isYajilin() || cell.isCw()) {
				return this.getNumberTextCore(Math.max(cell.qnum2, 0));
			}
			return "";
		},

		getQuesNumberColor: function(cell) {
			return (cell.error || cell.qinfo) === 1 ? this.errcolor1 : this.quescolor;
		},

		getBorderColor: function(border) {
			if (border.ques === 2) {
				return "#2f8f2f";
			}
			return border.ques ? this.quescolor : null;
		},

		drawCellClues: function() {
			var g = this.vinc("cell_clue", "auto", true);
			var clist = this.range.cells;
			var rsize = this.cw * 0.3;
			g.lineWidth = Math.max(this.cw / 24, 1.5);

			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				var px = cell.bx * this.bw;
				var py = cell.by * this.bh;
				var qn = cell.qnum;

				g.vid = "c_marker_" + cell.id;
				if (qn === 3 || qn === 4) {
					g.fillStyle = qn === 4 ? this.quescolor : "white";
					g.strokeStyle = this.quescolor;
					g.shapeCircle(px, py, rsize);
				} else if (qn === 7 || qn === 8) {
					g.fillStyle = qn === 8 ? this.quescolor : "white";
					g.strokeStyle = this.quescolor;
					g.shapeCircle(px, py, this.cw * 0.14);
				} else if (qn === 16) {
					g.fillStyle = this.getQuesNumberColor(cell);
					this.disptext(this.getNumberTextCore_letter(Math.max(cell.qnum2, 0) + 1), px, py, {
						ratio: 0.52
					});
					} else {
						g.vhide();
					}
			}
		},
		drawCrossClues: function() {
			var g = this.vinc("cross_clue", "auto", true);
			var clist = this.range.crosses;
			g.lineWidth = Math.max(this.cw / 24, 1.5);

			for (var i = 0; i < clist.length; i++) {
				var cross = clist[i];
				var px = cross.bx * this.bw;
				var py = cross.by * this.bh;
				var divideType = cross.getDivideType();

				g.vid = "x_marker_" + cross.id;
				if (cross.isSlither()) {
					g.fillStyle = this.quescolor;
					this.disptext("" + cross.qnum, px, py, { ratio: 0.45 });
				} else if (divideType > 0) {
					var colors = {
						1: "#d04a4a",
						2: "#3f8c4f",
						3: "#4d6fd0"
					};
					g.fillStyle = colors[divideType];
					g.strokeStyle = this.quescolor;
					g.shapeCircle(px, py, this.cw * 0.12);
				} else {
					g.vhide();
				}
			}
		},

		drawBorderArrows: function() {
			var g = this.vinc("border_arrow", "crispEdges", true);
			var ll = this.cw * 0.35;
			var lw = Math.max(this.cw / 36, 1);
			var lm = lw / 2;
			var blist = this.range.borders;

			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];
				var dir = border.getArrow();
				var px = border.bx * this.bw;
				var py = border.by * this.bh;

				g.fillStyle = this.quescolor;
				g.vid = "b_ar_" + border.id;
				if (dir === border.UP || dir === border.DN) {
					g.fillRectCenter(px, py, lm, ll);
				} else if (dir === border.LT || dir === border.RT) {
					g.fillRectCenter(px, py, ll, lm);
				} else {
					g.vhide();
				}

				g.vid = "b_tipa_" + border.id;
				if (dir === border.UP || dir === border.LT) {
					g.beginPath();
					if (dir === border.UP) {
						g.setOffsetLinePath(
							px,
							py,
							0,
							-ll,
							-ll / 2,
							-ll * 0.4,
							ll / 2,
							-ll * 0.4,
							true
						);
					} else {
						g.setOffsetLinePath(
							px,
							py,
							-ll,
							0,
							-ll * 0.4,
							-ll / 2,
							-ll * 0.4,
							ll / 2,
							true
						);
					}
					g.fill();
				} else {
					g.vhide();
				}

				g.vid = "b_tipb_" + border.id;
				if (dir === border.DN || dir === border.RT) {
					g.beginPath();
					if (dir === border.DN) {
						g.setOffsetLinePath(
							px,
							py,
							0,
							ll,
							-ll / 2,
							ll * 0.4,
							ll / 2,
							ll * 0.4,
							true
						);
					} else {
						g.setOffsetLinePath(
							px,
							py,
							ll,
							0,
							ll * 0.4,
							-ll / 2,
							ll * 0.4,
							ll / 2,
							true
						);
					}
					g.fill();
				} else {
					g.vhide();
				}
			}
		},

		drawInOut: function() {
			var g = this.context;
			var bd = this.board;
			var border;

			g.vid = "string_in";
			border = bd.arrowin.getb();
			if (!border.inside && border.id < bd.border.length) {
				var bx = border.bx;
				var by = border.by;
				var px = bx * this.bw;
				var py = by * this.bh;
				if (by === bd.minby + 2) {
					py -= 1.2 * this.bh;
				} else if (by === bd.maxby - 2) {
					py += 1.2 * this.bh;
				} else if (bx === bd.minbx + 2) {
					px -= this.bw;
					py -= 0.6 * this.bh;
				} else if (bx === bd.maxbx - 2) {
					px += this.bw;
					py -= 0.6 * this.bh;
				}
				g.fillStyle = border.error === 4 ? this.errcolor1 : this.quescolor;
				this.disptext("IN", px, py, { ratio: 0.55, width: [] });
			} else {
				g.vhide();
			}

			g.vid = "string_out";
			border = bd.arrowout.getb();
			if (!border.inside && border.id < bd.border.length) {
				var bx2 = border.bx;
				var by2 = border.by;
				var px2 = bx2 * this.bw;
				var py2 = by2 * this.bh;
				if (by2 === bd.minby + 2) {
					py2 -= 1.2 * this.bh;
				} else if (by2 === bd.maxby - 2) {
					py2 += 1.2 * this.bh;
				} else if (bx2 === bd.minbx + 2) {
					px2 -= 1.4 * this.bw;
					py2 -= 0.6 * this.bh;
				} else if (bx2 === bd.maxbx - 2) {
					px2 += 1.4 * this.bw;
					py2 -= 0.6 * this.bh;
				}
				g.fillStyle = border.error === 4 ? this.errcolor1 : this.quescolor;
				this.disptext("OUT", px2, py2, { ratio: 0.55, width: [] });
			} else {
				g.vhide();
			}
		},

		repaintParts: function(blist) {
			this.range.borders = blist;
			this.drawBorderArrows();
		}
	},

	Encode: {
			decodePzpr: function() {
				this.decodeBorder();
				this.decodeNumber16();
				this.decodeCrossExtras();
				this.decodeDirectedCellExtras();
				this.decodeInOut();
			},
			encodePzpr: function() {
				this.encodeBorder();
				this.encodeNumber16();
				this.encodeCrossExtras();
				this.encodeDirectedCellExtras();
				this.encodeInOut();
			},
		decodeCrossExtras: function() {
			var barray = this.outbstr.split("/");
			if (barray.length <= 3) {
				return;
			}
			var seg = barray[1] || "-";
			var bd = this.board;
			if (seg !== "-") {
				var items = seg.split("+");
				for (var i = 0; i < items.length; i++) {
					if (!items[i]) {
						continue;
					}
					var parts = items[i].split(".");
					var id = parseInt(parts[0], 36);
					if (!bd.cross[id]) {
						continue;
					}
					var code = parts[1];
					if (code === "a") {
						bd.cross[id].qnum = 11;
					} else if (code === "b") {
						bd.cross[id].qnum = 12;
					} else if (code === "c") {
						bd.cross[id].qnum = 13;
					} else {
						bd.cross[id].qnum = parseInt(code, 10);
					}
				}
			}
			this.outbstr = "/" + barray.slice(2).join("/");
		},
			encodeCrossExtras: function() {
			var list = [];
			for (var i = 0; i < this.board.cross.length; i++) {
				var qn = this.board.cross[i].qnum;
				if (qn === -1) {
					continue;
				}
				var code = "";
				if (qn >= 0 && qn <= 4) {
					code = "" + qn;
				} else if (qn === 11) {
					code = "a";
				} else if (qn === 12) {
					code = "b";
				} else if (qn === 13) {
					code = "c";
				} else {
					continue;
				}
				list.push(i.toString(36) + "." + code);
			}
				this.outbstr += "/" + (list.length ? list.join("+") : "-");
			},
			decodeDirectedCellExtras: function() {
				var barray = this.outbstr.split("/");
				if (barray.length <= 3) {
					return;
				}
				var seg = barray[1] || "-";
				var bd = this.board;
				if (seg !== "-") {
					var items = seg.split("+");
					for (var i = 0; i < items.length; i++) {
						if (!items[i]) {
							continue;
						}
						var parts = items[i].split(".");
						var id = parseInt(parts[0], 36);
						var cell = bd.cell[id];
						if (!cell) {
							continue;
						}
						if (parts[1] === "o") {
							cell.qnum = 16;
							cell.qdir = 0;
							cell.qnum2 = parseInt(parts[2], 36);
						} else {
							cell.qnum = parts[1] === "y" ? 14 : 15;
							cell.qdir = parseInt(parts[2], 10);
							cell.qnum2 = parseInt(parts[3], 36);
						}
					}
				}
				this.outbstr = "/" + barray.slice(2).join("/");
			},
			encodeDirectedCellExtras: function() {
				var list = [];
				for (var i = 0; i < this.board.cell.length; i++) {
					var cell = this.board.cell[i];
					if (cell.qnum !== 14 && cell.qnum !== 15 && cell.qnum !== 16) {
						continue;
					}
					if (cell.qnum === 16) {
						list.push(
							i.toString(36) +
								".o." +
								Math.max(cell.qnum2, 0).toString(36)
						);
					} else {
						list.push(
							i.toString(36) +
								"." +
								(cell.qnum === 14 ? "y" : "c") +
								"." +
								cell.qdir +
								"." +
								Math.max(cell.qnum2, 0).toString(36)
						);
					}
				}
				this.outbstr += "/" + (list.length ? list.join("+") : "-");
			},
			decodeInOut: function() {
			var barray = this.outbstr.split("/");
			var bd = this.board;
			var idoffset = 2 * bd.cols * bd.rows - bd.cols - bd.rows;

			bd.arrowin.setid((+barray[1] || 0) + idoffset);
			bd.arrowout.setid((+barray[2] || 0) + idoffset);

			this.outbstr = "";
		},
		encodeInOut: function() {
			var bd = this.board;
			var idoffset = 2 * bd.cols * bd.rows - bd.cols - bd.rows;
			this.outbstr +=
				"/" +
				(bd.arrowin.getid() - idoffset) +
				"/" +
				(bd.arrowout.getid() - idoffset);
		}
	},
		FileIO: {
			decodeData: function() {
				this.decodeInOut();
				this.decodeBorderQues();
				this.decodeCell(function(cell, ca) {
					if (ca === ".") {
						return;
					}
					var parts = ca.split(",");
					if (parts[0] === "Y") {
						cell.qnum = 14;
						cell.qdir = +parts[1];
						cell.qnum2 = +parts[2];
					} else if (parts[0] === "C") {
						cell.qnum = 15;
						cell.qdir = +parts[1];
						cell.qnum2 = +parts[2];
					} else if (parts[0] === "O") {
						cell.qnum = 16;
						cell.qdir = 0;
						cell.qnum2 = +parts[1];
					} else {
						cell.qnum = +parts[0];
					}
				});
				this.decodeCross(function(cross, ca) {
					if (ca !== ".") {
						cross.qnum = +ca;
					}
				});
				this.decodeBorderArrowAns();
			},
			encodeData: function() {
				this.filever = 1;
				this.encodeInOut();
				this.encodeBorderQues();
				this.encodeCell(function(cell) {
					if (cell.qnum === 14) {
						return "Y," + cell.qdir + "," + Math.max(cell.qnum2, 0) + " ";
					}
					if (cell.qnum === 15) {
						return "C," + cell.qdir + "," + Math.max(cell.qnum2, 0) + " ";
					}
					if (cell.qnum === 16) {
						return "O," + Math.max(cell.qnum2, 0) + " ";
					}
					return cell.qnum >= 0 ? cell.qnum + " " : ". ";
				});
				this.encodeCross(function(cross) {
					return cross.qnum !== -1 ? cross.qnum + " " : ". ";
				});
			this.encodeBorderArrowAns();
		},
		decodeInOut: function() {
			var bd = this.board;
			bd.arrowin.setid(+this.readLine());
			bd.arrowout.setid(+this.readLine());
		},
		encodeInOut: function() {
			var bd = this.board;
			this.writeLine(bd.arrowin.getid());
			this.writeLine(bd.arrowout.getid());
		}
	},

	AnsCheck: {
		checklist: [
			"checkBranchLine",
			"checkCrossLine",
			"checkStartGoalDegree",
			"checkNoDeadendExceptSG",
			"checkOneLine",
			"checkTravelPath",
			"checkSlitherClues",
			"checkDivideRegions",
			"checkYajilinClues",
			"checkCwClues",
			"checkOrderClues",
			"checkNoLineOnBar",
			"checkIceStraight",
			"checkDotWhite",
			"checkDotBlack",
			"checkWhitePearl",
			"checkBlackPearl",
			"checkNoTouchTiles",
			"checkNoAdjTiles",
			"checkSloopCoverage",
			"checkRequiredLine",
			"checkCountryBorders",
			"checkNoLine"
		],

		checkStartGoalDegree: function() {
			var start = this.board.arrowin.getb();
			var goal = this.board.arrowout.getb();
			if (!start.isLine()) {
				this.failcode.add("tlNoStartLine");
				if (!this.checkOnly) {
					start.seterr(4);
				}
				return;
			}
			if (!goal.isLine()) {
				this.failcode.add("tlNoGoalLine");
				if (!this.checkOnly) {
					goal.seterr(4);
				}
			}
		},

		checkNoDeadendExceptSG: function() {
			this.checkAllCell(function(cell) {
				return cell.lcnt === 1;
			}, "lnDeadEnd");
		},

		checkTravelPath: function() {
			var info = this.getTraceInfo();
			if (info.lastborder !== this.board.arrowout.getb()) {
				this.failcode.add("tlBadRoute");
				if (!this.checkOnly) {
					this.board.border.setnoerr();
					info.blist.seterr(1);
				}
			}
		},
		checkSlitherClues: function() {
			var bd = this.board;
			for (var i = 0; i < bd.cross.length; i++) {
				var cross = bd.cross[i];
				if (!cross.isSlither()) {
					continue;
				}
				var count = 0;
				if (cross.relbd(-1, 0).isLine()) {
					count++;
				}
				if (cross.relbd(1, 0).isLine()) {
					count++;
				}
				if (cross.relbd(0, -1).isLine()) {
					count++;
				}
				if (cross.relbd(0, 1).isLine()) {
					count++;
				}
				if (count !== cross.qnum) {
					this.failcode.add("tlSlither");
					if (!this.checkOnly) {
						cross.seterr(1);
					}
					return;
				}
			}
		},
		checkDivideRegions: function() {
			var bd = this.board;
			var visited = {};
			for (var i = 0; i < bd.cross.length; i++) {
				var start = bd.cross[i];
				if (start.isnull || visited[start.id]) {
					continue;
				}
				var queue = [start];
				var region = [];
				var types = {};
				visited[start.id] = true;

				while (queue.length) {
					var cross = queue.shift();
					region.push(cross);
					var divideType = cross.getDivideType();
					if (divideType > 0) {
						types[divideType] = true;
					}
					var nexts = [
						{ cross: cross.relcross(-2, 0), border: cross.relbd(-1, 0) },
						{ cross: cross.relcross(2, 0), border: cross.relbd(1, 0) },
						{ cross: cross.relcross(0, -2), border: cross.relbd(0, -1) },
						{ cross: cross.relcross(0, 2), border: cross.relbd(0, 1) }
					];
					for (var n = 0; n < nexts.length; n++) {
						if (
							nexts[n].cross.isnull ||
							nexts[n].border.isnull ||
							nexts[n].border.isLine() ||
							visited[nexts[n].cross.id]
						) {
							continue;
						}
						visited[nexts[n].cross.id] = true;
						queue.push(nexts[n].cross);
					}
				}

				if (Object.keys(types).length >= 2) {
					this.failcode.add("tlDivide");
					if (!this.checkOnly) {
						for (var r = 0; r < region.length; r++) {
							if (region[r].getDivideType() > 0) {
								region[r].seterr(1);
							}
						}
					}
					return;
				}
			}
		},
		checkYajilinClues: function() {
			var bd = this.board;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				if (!cell.isYajilin()) {
					continue;
				}
				var count = 0;
				var pos = cell.getaddr();
				while (true) {
					pos = pos.movedir(cell.qdir, 2);
					var next = pos.getc();
					if (next.isnull) {
						break;
					}
					if (!next.isBar() && next.lcnt === 0) {
						count++;
					}
				}
				if (count !== Math.max(cell.qnum2, 0)) {
					this.failcode.add("tlYajilin");
					if (!this.checkOnly) {
						cell.seterr(1);
					}
					return;
				}
			}
		},
		checkCwClues: function() {
			var bd = this.board;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				if (!cell.isCw()) {
					continue;
				}
				var count = 0;
				var pos = cell.getaddr();
				while (true) {
					var border = pos.reldirbd(cell.qdir, 1);
					if (border.isnull || !border.inside) {
						break;
					}
					if (border.isLine()) {
						count++;
					}
					pos = pos.movedir(cell.qdir, 2);
					if (pos.getc().isnull) {
						break;
					}
				}
				if (count !== Math.max(cell.qnum2, 0)) {
					this.failcode.add("tlCw");
					if (!this.checkOnly) {
						cell.seterr(1);
					}
					return;
				}
			}
		},
		checkOrderClues: function() {
			var bd = this.board;
			var required = {};
			var requiredCount = 0;
			for (var i = 0; i < bd.cell.length; i++) {
				var orderCell = bd.cell[i];
				if (orderCell.isOrder()) {
					required[orderCell.qnum2] = orderCell;
					requiredCount++;
				}
			}
			if (!requiredCount) {
				return;
			}

			var startBorder = bd.arrowin.getb();
			var prevBorder = startBorder;
			var cell = bd.getStartCell();
			var seen = {};
			var seenCount = 0;
			var last = -1;

			while (!cell.isnull && cell.lcnt > 0) {
				if (cell.isOrder()) {
					if (seen[cell.qnum2]) {
						this.failcode.add("tlOrder");
						if (!this.checkOnly) {
							cell.seterr(1);
						}
						return;
					}
					if (cell.qnum2 <= last) {
						this.failcode.add("tlOrder");
						if (!this.checkOnly) {
							cell.seterr(1);
						}
						return;
					}
					seen[cell.qnum2] = true;
					seenCount++;
					last = cell.qnum2;
				}

				var nextborder = this.getNextStep(prevBorder, cell);
				if (!nextborder || !nextborder.inside) {
					break;
				}
				cell =
					nextborder.sidecell[0] === cell
						? nextborder.sidecell[1]
						: nextborder.sidecell[0];
				prevBorder = nextborder;
			}

			if (cell.isOrder()) {
				if (seen[cell.qnum2] || cell.qnum2 <= last) {
					this.failcode.add("tlOrder");
					if (!this.checkOnly) {
						cell.seterr(1);
					}
					return;
				}
				seen[cell.qnum2] = true;
				seenCount++;
			}

			if (seenCount !== requiredCount) {
				this.failcode.add("tlOrder");
				if (!this.checkOnly) {
					for (var key in required) {
						if (!seen[key]) {
							required[key].seterr(1);
						}
					}
				}
			}
		},

		getTraceInfo: function() {
			var board = this.board;
			var startBorder = board.arrowin.getb();
			var goalBorder = board.arrowout.getb();
			var prevBorder = startBorder;
			var cell = board.getStartCell();
			var blist = new this.klass.BorderList();
			var lastborder = startBorder;
			var lastcell = board.emptycell;
			blist.add(startBorder);

			while (!cell.isnull && cell.lcnt > 0) {
				lastcell = cell;
				var nextborder = this.getNextStep(prevBorder, cell);
				if (!nextborder) {
					break;
				}
				blist.add(nextborder);
				lastborder = nextborder;
				if (nextborder === goalBorder || !nextborder.inside) {
					break;
				}
				cell =
					nextborder.sidecell[0] === cell
						? nextborder.sidecell[1]
						: nextborder.sidecell[0];
				prevBorder = nextborder;
				if (cell.isnull || cell.lcnt !== 2) {
					break;
				}
			}

			return { lastcell: lastcell, lastborder: lastborder, blist: blist };
		},

		getNextStep: function(prevBorder, cell) {
			var adb = cell.adjborder;
			var nexts = [adb.top, adb.bottom, adb.left, adb.right];
			for (var i = 0; i < nexts.length; i++) {
				if (nexts[i].isLine() && nexts[i] !== prevBorder) {
					return nexts[i];
				}
			}
			return null;
		},

		checkNoLineOnBar: function() {
			this.checkAllCell(function(cell) {
				return cell.isBar() && cell.lcnt > 0;
			}, "tlBarLine");
		},
		checkIceStraight: function() {
			this.checkAllCell(function(cell) {
				return cell.isIce() && cell.lcnt > 0 && !cell.isLineStraightTravel();
			}, "tlIceTurn");
		},
		checkDotWhite: function() {
			this.checkAllCell(function(cell) {
				return cell.isDotWhite() && (cell.lcnt !== 2 || !cell.isLineStraightTravel());
			}, "tlDotWhite");
		},
		checkDotBlack: function() {
			this.checkAllCell(function(cell) {
				return cell.isDotBlack() && (cell.lcnt !== 2 || !cell.isLineCurveTravel());
			}, "tlDotBlack");
		},
		checkWhitePearl: function() {
			this.checkAllCell(function(cell) {
				if (!cell.isWhitePearl()) {
					return false;
				}
				if (cell.lcnt !== 2 || !cell.isLineStraightTravel()) {
					return true;
				}
				if (cell.adjborder.top.isLine() && cell.adjborder.bottom.isLine()) {
					return !(
						cell.relcell(0, -2).isLineCurveTravel() ||
						cell.relcell(0, 2).isLineCurveTravel()
					);
				}
				return !(
					cell.relcell(-2, 0).isLineCurveTravel() ||
					cell.relcell(2, 0).isLineCurveTravel()
				);
			}, "tlWhitePearl");
		},
		checkBlackPearl: function() {
			this.checkAllCell(function(cell) {
				if (!cell.isBlackPearl()) {
					return false;
				}
				if (cell.lcnt !== 2 || !cell.isLineCurveTravel()) {
					return true;
				}
				var ok1 = false;
				var ok2 = false;
				if (cell.adjborder.top.isLine()) {
					ok1 = cell.relcell(0, -2).isLineStraightTravel();
				}
				if (cell.adjborder.bottom.isLine()) {
					if (ok1) {
						ok2 = cell.relcell(0, 2).isLineStraightTravel();
					} else {
						ok1 = cell.relcell(0, 2).isLineStraightTravel();
					}
				}
				if (cell.adjborder.left.isLine()) {
					if (ok1) {
						ok2 = cell.relcell(-2, 0).isLineStraightTravel();
					} else {
						ok1 = cell.relcell(-2, 0).isLineStraightTravel();
					}
				}
				if (cell.adjborder.right.isLine()) {
					if (ok1) {
						ok2 = cell.relcell(2, 0).isLineStraightTravel();
					} else {
						ok1 = cell.relcell(2, 0).isLineStraightTravel();
					}
				}
				return !(ok1 && ok2);
			}, "tlBlackPearl");
		},
		checkNoTouchTiles: function() {
			var bd = this.board;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				if (!cell.isNoTouch() || cell.lcnt === 0) {
					continue;
				}
				var right = cell.relcell(2, 0);
				var down = cell.relcell(0, 2);
				if (
					!right.isnull &&
					right.isNoTouch() &&
					right.lcnt > 0 &&
					!cell.adjborder.right.isLine()
				) {
					this.failcode.add("tlNoTouch");
					if (!this.checkOnly) {
						cell.seterr(1);
						right.seterr(1);
					}
					return;
				}
				if (
					!down.isnull &&
					down.isNoTouch() &&
					down.lcnt > 0 &&
					!cell.adjborder.bottom.isLine()
				) {
					this.failcode.add("tlNoTouch");
					if (!this.checkOnly) {
						cell.seterr(1);
						down.seterr(1);
					}
					return;
				}
			}
		},
		checkNoAdjTiles: function() {
			var bd = this.board;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				if (!cell.isNoAdj() || cell.lcnt !== 0) {
					continue;
				}
				var right = cell.relcell(2, 0);
				var down = cell.relcell(0, 2);
				if (!right.isnull && right.isNoAdj() && right.lcnt === 0) {
					this.failcode.add("tlNoAdj");
					if (!this.checkOnly) {
						cell.seterr(1);
						right.seterr(1);
					}
					return;
				}
				if (!down.isnull && down.isNoAdj() && down.lcnt === 0) {
					this.failcode.add("tlNoAdj");
					if (!this.checkOnly) {
						cell.seterr(1);
						down.seterr(1);
					}
					return;
				}
			}
		},
		checkSloopCoverage: function() {
			this.checkAllCell(function(cell) {
				return cell.isSloop() && cell.lcnt === 0;
			}, "tlSloop");
		},
		checkRequiredLine: function() {
			var bd = this.board;
			for (var i = 0; i < bd.border.length; i++) {
				var border = bd.border[i];
				if (border.inside && border.ques === 2 && !border.isLine()) {
					this.failcode.add("tlReqLine");
					if (!this.checkOnly) {
						border.seterr(1);
					}
					return;
				}
			}
		},
		checkCountryBorders: function() {
			var bd = this.board;
			for (var i = 0; i < bd.border.length; i++) {
				var border = bd.border[i];
				if (!border.inside || border.ques !== 1) {
					continue;
				}
				var c1 = border.sidecell[0];
				var c2 = border.sidecell[1];
				if ((c1.isnull || c1.lcnt === 0) && (c2.isnull || c2.lcnt === 0)) {
					this.failcode.add("tlCountry");
					if (!this.checkOnly) {
						border.seterr(1);
						if (!c1.isnull) {
							c1.seterr(1);
						}
						if (!c2.isnull) {
							c2.seterr(1);
						}
					}
					return;
				}
			}
		}
	},

	FailCode: {
		tlNoStartLine: ["入口セルから線が始まっていません。", "The path does not start from the IN cell."],
		tlNoGoalLine: ["出口セルまで線が届いていません。", "The path does not reach the OUT cell."],
		tlBadRoute: ["線が入口セルから出口セルまで一続きになっていません。", "The path does not connect the IN cell to the OUT cell."],
		tlBarLine: ["黒マスを線が通っています。", "A Bar clue cell is crossed by the path."],
		tlIceTurn: ["アイスのマスで線が曲がっています。", "The path turns on an Ice clue cell."],
		tlDotWhite: ["白ダイヤのマスは直進しなければなりません。", "A white dot clue cell must be passed straight."],
		tlDotBlack: ["黒ダイヤのマスは曲がらなければなりません。", "A black dot clue cell must turn."],
		tlWhitePearl: ["白丸の条件を満たしていません。", "A white pearl condition is violated."],
		tlBlackPearl: ["黒丸の条件を満たしていません。", "A black pearl condition is violated."],
		tlNoTouch: ["Notouch のマス同士が不正に接しています。", "Touched Notouch clue cells are not directly connected."],
		tlNoAdj: ["Noadj の未訪問マスが隣接しています。", "Unvisited Noadj clue cells are adjacent."],
		tlSloop: ["Sloop のマスが未訪問です。", "A Sloop clue cell is not visited."],
		tlSlither: ["Slither の数字条件を満たしていません。", "A Slither clue count is violated."],
		tlDivide: ["同じ Divide 領域に複数タイプがあります。", "A Divide region contains multiple Divide types."],
		tlYajilin: ["Yajilin の矢印数字条件を満たしていません。", "A Yajilin clue count is violated."],
		tlCw: ["CW の矢印数字条件を満たしていません。", "A CW clue count is violated."],
		tlOrder: ["Order の文字順条件を満たしていません。", "An Order clue sequence is violated."],
		tlReqLine: ["Required line が通っていません。", "A required line edge is not used."],
		tlCountry: ["Country の境界の両側が未訪問です。", "Neither side of a Country border is visited."]
	}
});
