//
// パズル固有スクリプト部 Star Gazing版 stargazing.js
//
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["stargazing"], {
	//---------------------------------------------------------
	// マウス入力系
	MouseEvent: {
		use: true,
		autoedit_func: "qnum",

		inputModes: {
			edit: ["number", "clear"],
			play: ["star", "unshade", "peke"]
		},

		mouseinput_other: function() {
			if (this.inputMode === "star" && this.mousestart) {
				this.inputcell_stargazing();
			}
		},
		mouseinput_auto: function() {
			if (this.puzzle.playmode) {
				if (this.mousestart || this.mousemove) {
					if (this.btn === "left") {
						this.inputcell_stargazing();
					} else if (this.btn === "right") {
						this.inputpeke();
					}
				}
			}
		},

		inputcell_stargazing: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				return;
			}
			if (this.inputData === null) {
				this.decIC(cell);
			}

			cell.setQans(this.inputData === 1 ? 1 : 0);
			cell.setQsub(this.inputData === 2 ? 1 : 0);
			cell.draw();

			this.mouseCell = cell;

			if (this.inputData === 1) {
				this.mousereset();
			}
		}
	},

	//---------------------------------------------------------
	// キーボード入力系
	KeyEvent: {
		enablemake: true
	},

	//---------------------------------------------------------
	// 盤面管理系
	Cell: {
		numberRemainsUnshaded: true,

		allowShade: function() {
			return this.qnum === -1;
		},
		allowUnshade: function() {
			return this.qnum === -1;
		},

		// このセルから上下左右に盤端まで見える星の数
		getStarViewCount: function() {
			var count = 0;
			var dirs = ["top", "bottom", "left", "right"];
			for (var i = 0; i < dirs.length; i++) {
				var target = this.adjacent[dirs[i]];
				while (!target.isnull) {
					if (target.qans === 1) {
						count++;
					}
					target = target.adjacent[dirs[i]];
				}
			}
			return count;
		}
	},

	Board: {
		hasborder: 1
	},

	//---------------------------------------------------------
	// 画像表示系
	Graphic: {
		qanscolor: "black",

		paint: function() {
			this.drawBGCells();
			this.drawGrid();

			this.drawStars();
			this.drawPekes();
			this.drawQuesNumbers();

			this.drawChassis();

			this.drawTarget();
		},

		drawStars: function() {
			var g = this.vinc("cell_star", "auto", true);
			var clist = this.range.cells;
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				g.vid = "c_star_" + cell.id;
				if (cell.qans === 1) {
					g.fillStyle = !cell.trial ? this.qanscolor : this.trialcolor;
					this.fillStar(
						g,
						cell.bx * this.bw,
						cell.by * this.bh,
						this.bw * 0.8,
						this.bh * 0.8
					);
				} else {
					g.vhide();
				}
			}
		}
	},

	//---------------------------------------------------------
	// URLエンコード/デコード処理
	Encode: {
		decodePzpr: function(type) {
			this.decodeNumber16();
		},
		encodePzpr: function(type) {
			this.encodeNumber16();
		}
	},
	//---------------------------------------------------------
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
	// 正解判定処理実行部
	AnsCheck: {
		checklist: ["checkAroundStars", "checkStarOnNumber", "checkStarViewCount"],

		checkAroundStars: function() {
			this.checkAroundCell(function(cell1, cell2) {
				return cell1.qans === 1 && cell2.qans === 1;
			}, "starAround");
		},

		checkStarOnNumber: function() {
			this.checkAllCell(function(cell) {
				return cell.isValidNum() && cell.qans === 1;
			}, "ceStarOnNum");
		},

		checkStarViewCount: function() {
			this.checkAllCell(function(cell) {
				if (!cell.isValidNum()) {
					return false;
				}
				return cell.getStarViewCount() !== cell.qnum;
			}, "nmStarViewNe");
		}
	}
});
