// Four Winds
// Numbered cells emit straight arrows in the four cardinal directions.  The
// number is the total length of the arrows starting at that cell.  Every
// empty cell must be covered by exactly one arrow.
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
			edit: ["number", "clear"],
			play: ["arrow", "clear"]
		},
		autoedit_func: "qnum",
		mouseinput_auto: function() {
			if (this.puzzle.editmode) {
				if (this.mousestart || this.mousemove) {
					this.inputqnum();
				}
			} else if (this.puzzle.playmode && (this.mousestart || this.mousemove)) {
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
		decodePzpr: function() {
			this.decodeArrowNumber16();
			this.board.cell.each(function(cell) {
				if (cell.qnum === 4095 && cell.qdir >= 1 && cell.qdir <= 4) {
					cell.qnum = -1;
				}
			});
		},
		encodePzpr: function() {
			var bd = this.board, out = "", skipped = 0;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i], dir = cell.qdir || 0, num = cell.qnum;
				var encoded = "";
				if (dir >= 1 && dir <= 4 && num === -1) {
					// Keep an answer arrow on an empty cell round-trippable.
					encoded = "-" + dir.toString(16) + "fff";
				} else if (num === -3) {
					encoded = "+";
				} else if (num === -2) {
					encoded = dir.toString(16) + ".";
				} else if (num >= 0 && num < 16 && dir >= 0 && dir <= 4) {
					encoded = dir.toString(16) + num.toString(16);
				} else if (num >= 16 && num < 256 && dir >= 0 && dir <= 4) {
					encoded = (dir + 5).toString(16) + num.toString(16).padStart(2, "0");
				} else if (num >= 256 && num < 4096 && dir >= 0 && dir <= 4) {
					encoded = "-" + dir.toString(16) + num.toString(16).padStart(3, "0");
				}
				if (!encoded) {
					skipped++;
					continue;
				}
				while (skipped > 0) {
					var run = Math.min(skipped, 26);
					out += String.fromCharCode(96 + run);
					skipped -= run;
				}
				out += encoded;
			}
			while (skipped > 0) {
				var run = Math.min(skipped, 26);
				out += String.fromCharCode(96 + run);
				skipped -= run;
			}
			this.outbstr += out;
		}
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
		checklist: ["checkArrowLengthTotals", "checkArrowStarts", "checkEmptyCells"],
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
		checkEmptyCells: function() {
			this.checkAllCell(function(cell) {
				return cell.qnum === -1 && !cell.qdir;
			}, "arCoverNe");
		}
	}
});
