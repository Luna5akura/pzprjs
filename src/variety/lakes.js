//
// Lakes
//
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["lakes"], {
	//---------------------------------------------------------
	// Mouse input
	MouseEvent: {
		use: true,
		inputModes: { edit: ["number", "clear"], play: ["shade", "unshade"] },
		autoedit_func: "qnum",
		autoplay_func: "cell"
	},

	//---------------------------------------------------------
	// Keyboard input
	KeyEvent: {
		enablemake: true
	},

	//---------------------------------------------------------
	// Board
	Cell: {
		numberRemainsUnshaded: true,
		minnum: 1,
		maxnum: function() {
			return this.board.cols * this.board.rows;
		}
	},

	AreaUnshadeGraph: {
		enabled: true
	},

	//---------------------------------------------------------
	// Graphic
	Graphic: {
		gridcolor_type: "DARK",

		enablebcolor: true,
		bgcellcolor_func: "qsub1",
		numbercolor_func: "qnum",

		paint: function() {
			this.drawBGCells();
			this.drawShadedCells();
			this.drawGrid();

			this.drawQuesNumbers();

			this.drawChassis();

			this.drawTarget();
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
			this.decodeCellAns();
		},
		encodeData: function() {
			this.encodeCellQnum();
			this.encodeCellAns();
		}
	},

	//---------------------------------------------------------
	// Answer check
	AnsCheck: {
		checklist: [
			"checkNoNumberInUnshade",
			"checkDoubleNumberInUnshade",
			"checkNumberAndUnshadeSize",
			"doneShadingDecided"
		],

		checkNoNumberInUnshade: function() {
			this.checkAllBlock(
				this.board.ublkmgr,
				function(cell) {
					return cell.isNum();
				},
				function(w, h, a, n) {
					return a !== 0;
				},
				"bkNoNum"
			);
		},

		checkDoubleNumberInUnshade: function() {
			this.checkAllBlock(
				this.board.ublkmgr,
				function(cell) {
					return cell.isNum();
				},
				function(w, h, a, n) {
					return a < 2;
				},
				"bkNumGe2"
			);
		},

		checkNumberAndUnshadeSize: function() {
			this.checkAllArea(
				this.board.ublkmgr,
				function(w, h, a, n) {
					return n <= 0 || n === a;
				},
				"bkSizeNe"
			);
		}
	}
});
