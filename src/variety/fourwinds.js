// Four Winds (with Parks)
// Numbered cells emit straight arrows in the four cardinal directions.  The
// number is the total length of the arrows starting at that cell; shaded cells
// are parks and cannot be occupied by an arrow.  This implementation follows
// the standard pzpr representation (cell qdir for an arrow, qans for parks).
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
			edit: ["number", "shade", "clear"],
			play: ["arrow", "clear"]
		},
		autoedit_func: "qnum",
		mouseinput_auto: function() {
			if (this.puzzle.editmode) {
				if (this.inputMode === "shade") {
					if (this.mousestart || this.mousemove) { this.inputshade(); }
				} else if (this.mousestart || this.mousemove) {
					this.inputqnum();
				}
			} else if (this.puzzle.playmode && (this.mousestart || this.mousemove)) {
				this.inputarrow_cell();
			}
		},
		inputarrow_cell_main: function(cell, dir) {
			if (!cell || cell.isnull || cell.qnum !== -1 || cell.ques === 1) {
				return;
			}
			cell.setQdir(cell.qdir === dir ? 0 : dir);
			cell.draw();
		}
	},
	KeyEvent: { enablemake: true },
	Cell: {
		minnum: 0,
		maxnum: function() { return this.board.cols * this.board.rows; },
			getArrow: function() { return this.qdir || 0; }
	},
	Board: { cols: 8, rows: 8, hasborder: 1 },
	Graphic: {
		gridcolor_type: "LIGHT",
		numbercolor_func: "qnum",
		paint: function() {
			this.drawBGCells();
			this.drawGrid();
			this.drawShadedCells();
			this.drawCellArrows(true);
			this.drawQuesNumbers();
			this.drawChassis();
			this.drawTarget();
		}
	},
	Encode: {
		decodePzpr: function() { this.decodeArrowNumber16(); },
		encodePzpr: function() { this.encodeArrowNumber16(); }
	},
	FileIO: {
		decodeData: function() {
			this.decodeCell(function(cell, ca) { if (ca === "#") { cell.ques = 1; } });
			this.decodeCellQnum();
		},
		encodeData: function() {
			this.encodeCell(function(cell) { return cell.ques === 1 ? "# " : ". "; });
			this.encodeCellQnum();
		}
	},
	AnsCheck: {
		checklist: ["checkFourWindsNumber", "checkArrowStarts", "checkEmptyRowsCols"],
		checkFourWindsNumber: function() {
			var dirs = [1, 2, 3, 4];
			this.checkAllCell(function(cell) {
				if (!cell.isValidNum()) {
					return false;
				}
				var total = 0;
				for (var i = 0; i < dirs.length; i++) {
					var pos = cell.getaddr();
					while (true) {
						var next = pos.movedir(dirs[i], 2), c = next.getc();
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
				if (!cell.qdir || cell.qnum !== -1) {
					return false;
				}
				var dir = cell.qdir, pos = cell.getaddr();
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
			for (var r = 1; r <= bd.rows; r++) {
				var empty = 0;
				for (var c = 1; c <= bd.cols; c++) {
					var cell = bd.getc(c, r);
					if (!cell.qdir && cell.qnum < 0 && cell.ques !== 1) {
						empty++;
					}
				}
				if (empty !== 1) {
					this.failcode.add("rowEmptyNe");
				}
			}
			for (var c2 = 1; c2 <= bd.cols; c2++) {
				var empty2 = 0;
				for (var r2 = 1; r2 <= bd.rows; r2++) {
					var cell2 = bd.getc(c2, r2);
					if (!cell2.qdir && cell2.qnum < 0 && cell2.ques !== 1) {
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
