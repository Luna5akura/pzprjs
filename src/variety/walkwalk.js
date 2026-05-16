//
// パズル固有スクリプト部 Walk Walk版 walkwalk.js
//
(function(classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [["walkwalk"], classbase];
	} else {
		pzpr.classmgr.makeCustom(["walkwalk"], classbase);
	}
})({
	MouseEvent: {
		inputModes: {
			edit: ["border", "number", "clear", "info-line"],
			play: ["line", "peke", "clear", "info-line"]
		},

		mouseinput_auto: function() {
			if (this.puzzle.playmode) {
				if (this.mousestart || this.mousemove) {
					if (this.btn === "left") {
						this.inputLine();
					} else if (this.btn === "right") {
						this.inputpeke();
					}
				} else if (this.mouseend && this.notInputted()) {
					this.inputpeke_ifborder();
				}
			} else if (this.puzzle.editmode) {
				if (this.mousestart || this.mousemove) {
					this.inputborder();
				} else if (this.mouseend && this.notInputted()) {
					this.inputqnum();
				}
			}
		}
	},

	KeyEvent: {
		enablemake: true
	},

	Cell: {
		minnum: 1,
		maxnum: function() {
			return Math.min(999, this.room.clist.length);
		}
	},
	Board: {
		hasborder: 1,
		addExtraInfo: function() {
			this.lineblkgraph = this.addInfoList(this.klass.LineBlockGraph);
		}
	},
	LineGraph: {
		enabled: true,
		makeClist: true
	},
	"LineBlockGraph:LineGraph": {
		enabled: true,
		relation: { "border.line": "link", "border.ques": "separator" },
		makeClist: true,
		coloring: false,

		setComponentRefs: function(obj, component) {
			obj.lpath = component;
		},
		getObjNodeList: function(nodeobj) {
			return nodeobj.lpathnodes;
		},
		resetObjNodeList: function(nodeobj) {
			nodeobj.lpathnodes = [];
		},

		incdecLineCount: null,
		isedgevalidbylinkobj: function(border) {
			return border.isLine() && !border.isBorder();
		},
		isedgeexistsbylinkobj: function(border) {
			return border.lpath !== null;
		},

		setEdgeByLinkObj: function(linkobj) {
			var isset = this.isedgevalidbylinkobj(linkobj);
			if (isset === this.isedgeexistsbylinkobj(linkobj)) {
				var cells = this.getSideObjByLinkObj(linkobj);
				for (var i = 0; i < cells.length; i++) {
					var cell = cells[i];
					if (this.isnodevalid(cell)) {
						this.createNodeIfEmpty(cell);
					} else {
						this.deleteNodeIfEmpty(cell);
					}
				}
				return;
			}

			if (isset) {
				this.addEdgeByLinkObj(linkobj);
			} else {
				this.removeEdgeByLinkObj(linkobj);
			}
		}
	},
	AreaRoomGraph: {
		enabled: true,
		hastop: false
	},

	Graphic: {
		irowake: true,
		numbercolor_func: "qnum",
		gridcolor_type: "LIGHT",

		getBGCellColor: function(cell) {
			if ((cell.error || cell.qinfo) === 1) {
				return this.errbcolor1;
			}
			if (cell._walkwalkSolverState === "passed") {
				return this.bcolor;
			}
			return null;
		},

		paint: function() {
			this.drawBGCells();
			this.drawDashedGrid();
			this.drawQuesNumbers();
			this.drawBorders();
			this.drawLines();
			this.drawPekes();
			this.drawChassis();
			this.drawTarget();
		}
	},

	Encode: {
		decodePzpr: function(type) {
			this.decodeBorder();
			this.decodeNumber16();
		},
		encodePzpr: function(type) {
			this.encodeBorder();
			this.encodeNumber16();
		}
	},
	FileIO: {
		decodeData: function() {
			if (this.filever >= 2) {
				this.decodeBorderQues();
			} else {
				this.decodeAreaRoom();
			}
			this.decodeCellQnum();
			this.decodeBorderLine();
		},
		encodeData: function() {
			this.filever = 2;
			this.encodeBorderQues();
			this.encodeCellQnum();
			this.encodeBorderLine();
		}
	},

	AnsCheck: {
		checklist: [
			"checkBranchLine",
			"checkCrossLine",
			"checkAllNumbersVisited",
			"checkSegmentLengths",
			"checkDeadendLine+",
			"checkOneLoop"
		],

		checkAllNumbersVisited: function() {
			this.checkAllCell(function(cell) {
				return cell.isNum() && cell.lcnt === 0;
			}, "numNoLine");
		},

		checkSegmentLengths: function() {
			var bd = this.board;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				if (!cell.isNum() || cell.lcnt === 0) {
					continue;
				}

				var lpath = cell.lpath;
				if (!lpath || lpath.clist.length === cell.qnum) {
					continue;
				}

				this.failcode.add("blLineNe");
				if (this.checkOnly) {
					break;
				}
				cell.seterr(1);
				lpath.clist.seterr(1);
			}
		}
	}
});
