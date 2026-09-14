// Japanese Arrows
// Each cell contains a number.  An arrow in a cell points along a row,
// column (or, for the gray-dot clues, a diagonal); the number is the count
// of distinct numbers visible in that direction, excluding the clue cell.
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["japanese_arrows"], {
	MouseEvent: {
		inputModes: { edit: ["number", "direc", "clear"], play: ["number", "clear"] },
		mouseinput_auto: function() {
			if (this.puzzle.editmode) {
				if (this.mousestart || this.mousemove) {this.inputdirec();}
				else if (this.mouseend && this.notInputted()) {this.inputqnum();}
			} else if (this.mousestart) {
				this.inputqnum();
			}
		}
	},
	KeyEvent: {
		enablemake: true,
		enableplay: true,
		moveTarget: function(ca) { return ca.match(/shift/) ? false : this.moveTCell(ca); },
		keyinput: function(ca) {
			if (this.puzzle.editmode && this.key_inputdirec(ca)) {return;}
			this.key_inputqnum(ca);
		}
	},
	Cell: {
		minnum: 1,
		maxnum: function() { return Math.max(this.board.cols, this.board.rows); },
		getNum: function() { return this.anum !== -1 ? this.anum : this.qnum; },
		setNum: function(val) { this.setAnum(val > 0 ? val : -1); }
	},
	BoardExec: {
		adjustBoardData: function(key, d) { this.adjustNumberArrow(key, d); }
	},
	Graphic: {
		qanscolor: "#000000",
		numbercolor_func: "qnum",
		getCellArrowColor: function(cell) { return cell.qdir ? this.qanscolor : null; },
		paint: function() {
			this.drawBGCells();
			this.drawGrid();
			this.drawCellArrows();
			this.drawArrowNumbers();
			this.drawAnsNumbers();
			this.drawTarget();
		}
	},
	Encode: {
		decodePzpr: function() { this.decodeArrowNumber16(); },
		encodePzpr: function() { this.encodeArrowNumber16(); }
	},
	FileIO: {
		decodeData: function() { this.decodeCellDirecQnum(); this.decodeCellAns(); },
		encodeData: function() { this.encodeCellDirecQnum(); this.encodeCellAns(); }
	},
	AnsCheck: {
		checklist: ["checkNoNumCell+", "checkArrowNumber"],
		checkArrowNumber: function() {
			var bd = this.board;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i], val = cell.getNum();
				if (!cell.qdir || val < 1) {continue;}
				var pos = cell.getaddr(), seen = {}, list = [], dir = cell.qdir;
				while (1) {
					if (dir <= 4) {
						pos.movedir(dir, 2);
					} else {
						var dx = dir === 5 || dir === 7 ? -2 : 2;
						var dy = dir === 5 || dir === 6 ? -2 : 2;
						pos.move(dx, dy);
					}
					var c2 = pos.getc();
					if (c2.isnull) {break;}
					var n = c2.getNum();
					if (n < 1) { list = null; break; }
					if (!seen[n]) { seen[n] = true; list.push(n); }
				}
				if (list && list.length !== val) {
					this.failcode.add("anNumberNe");
					if (this.checkOnly) {break;}
					cell.seterr(1);
				}
			}
		}
	}
});
