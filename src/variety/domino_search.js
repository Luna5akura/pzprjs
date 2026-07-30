//
// Domino Search
//
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["domino-search"], {
	//---------------------------------------------------------
	// Mouse input
	MouseEvent: {
		inputModes: { edit: ["number", "clear"], play: ["border", "subline"] },
		autoedit_func: "qnum",
		autoplay_func: "border"
	},

	//---------------------------------------------------------
	// Keyboard input
	KeyEvent: {
		enablemake: true
	},

	//---------------------------------------------------------
	// Board
	Cell: {
		minnum: 0,
		maxnum: 99,
		disInputHatena: true
	},

	Board: {
		hasborder: 1
	},

	AreaRoomGraph: {
		enabled: true,
		relation: {
			"cell.ques": "node",
			"cell.qnum": "node",
			"border.ques": "separator",
			"border.qans": "separator"
		},
		isnodevalid: function(cell) {
			return cell.qnum >= 0;
		}
	},

	//---------------------------------------------------------
	// Graphic
	Graphic: {
		gridcolor_type: "DLIGHT",

		bordercolor_func: "qans",
		numbercolor_func: "qnum",

		paint: function() {
			this.drawBGCells();
			this.drawDashedGrid();
			this.drawBorders();

			this.drawQuesNumbers();
			this.drawBorderQsubs();

			this.drawChassis();

			this.drawTarget();
		},

		getBGCellColor: function(cell) {
			if (cell.error === 1 || cell.qinfo === 1) {
				return this.errbcolor1;
			}
			return cell.qnum < 0 ? this.quescolor : null;
		}
	},

	//---------------------------------------------------------
	// URL encoding
	Encode: {
		decodePzpr: function() {
			this.decodeNumber16();
		},
		encodePzpr: function() {
			this.encodeNumber16();
		}
	},

	//---------------------------------------------------------
	// File I/O
	FileIO: {
		decodeData: function() {
			this.decodeCellQnum();
			this.decodeBorderAns();
		},
		encodeData: function() {
			this.encodeCellQnum();
			this.encodeBorderAns();
		}
	},

	//---------------------------------------------------------
	// Answer check
	AnsCheck: {
		checklist: [
			"checkNoNumCellDominoSearch",
			"checkOverTwoCells",
			"checkLessTwoCells",
			"checkDuplicateDominoPair",
			"checkMissingDominoPair"
		],

		checkNoNumCellDominoSearch: function() {
			this.checkAllCell(function(cell) {
				return cell.qnum === -2;
			}, "ceNoNum");
		},

		checkOverTwoCells: function() {
			this.checkAllArea(
				this.board.roommgr,
				function(w, h, a, n) {
					return a <= 2;
				},
				"bkSizeGt2"
			);
		},

		checkLessTwoCells: function() {
			this.checkAllArea(
				this.board.roommgr,
				function(w, h, a, n) {
					return a >= 2;
				},
				"bkSizeLt2"
			);
		},

		checkDuplicateDominoPair: function() {
			var info = this.getDominoPairInfo();
			if (!info) {
				return;
			}

			for (var key in info.duplicates) {
				this.failcode.add("bkPairGt");
				if (this.checkOnly) {
					return;
				}
				info.duplicates[key].seterr(1);
			}
		},

		checkMissingDominoPair: function() {
			var info = this.getDominoPairInfo();
			if (!info) {
				return;
			}

			for (var a = info.min; a <= info.max; a++) {
				for (var b = a; b <= info.max; b++) {
					if (info.counts[this.getDominoPairKey(a, b)] !== 1) {
						this.failcode.add("bkPairLt");
						return;
					}
				}
			}
		},

		getDominoPairInfo: function() {
			var rooms = this.board.roommgr.components;
			var counts = {};
			var duplicates = {};
			var min = null;
			var max = null;

			for (var c = 0; c < this.board.cell.length; c++) {
				var cell = this.board.cell[c];
				if (cell.qnum < 0) {
					continue;
				}
				min = min === null ? cell.qnum : Math.min(min, cell.qnum);
				max = max === null ? cell.qnum : Math.max(max, cell.qnum);
			}
			if (min === null) {
				return null;
			}

			for (var r = 0; r < rooms.length; r++) {
				var clist = rooms[r].clist;
				if (clist.length !== 2) {
					return null;
				}

				var key = this.getDominoPairKey(clist[0].qnum, clist[1].qnum);
				counts[key] = (counts[key] || 0) + 1;
				if (counts[key] === 2) {
					duplicates[key] = new this.klass.CellList();
				}
				if (counts[key] >= 2) {
					for (var i = 0; i < clist.length; i++) {
						duplicates[key].add(clist[i]);
					}
				}
			}

			return {
				min: min,
				max: max,
				counts: counts,
				duplicates: duplicates
			};
		},

		getDominoPairKey: function(a, b) {
			return a <= b ? a + "," + b : b + "," + a;
		}
	}
});
