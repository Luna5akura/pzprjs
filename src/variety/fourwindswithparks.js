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
		mouseinputAutoPlay: function() {
			if (this.mousestart || this.mousemove) {
				this.inputarrow_cell();
			}
		},
		inputarrow_cell_main: function(cell, dir) {
			if (!cell || cell.isnull || cell.qnum !== -1 || dir < cell.UP || dir > cell.RT) {
				return;
			}
			cell.setQdir(cell.qdir === dir ? 0 : dir);
			cell.draw();
		}
	},
	KeyEvent: { enablemake: true },
	Cell: {
		disInputHatena: true,
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
			this.drawCellArrows(true);
			this.drawQuesNumbers();
			this.drawChassis();
			this.drawTarget();
		}
	},
	Encode: {
		decodePzpr: function() { this.decodeNumber16(); },
		encodePzpr: function() { this.encodeNumber16(); }
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
				return cell.qdir >= cell.UP && cell.qdir <= cell.RT ? cell.qdir + " " : ". ";
			});
		}
	},
	AnsCheck: {
		checklist: ["checkArrowLengthTotals", "checkArrowStarts", "checkEmptyRowsCols"],
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
