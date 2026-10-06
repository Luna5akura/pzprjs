//
// パズル固有スクリプト部 アンバランスループ版 imbalanceloop.js
//
// ルール:
//   1. すべての白マスの中心を通る、枝分かれも交差もしないひとつの輪を引く。
//   2. 黒マスは通らない。
//   3. 矢印付き数字のマスでは、線は矢印と平行に直進する。数字は
//      (矢印方向の直線の長さ) − (反対方向の直線の長さ) を表し、
//      差は必ず1以上 (= 矢印は常に長い側を指す)。
//   4. 矢印のない数字は、そのマスから伸びる2方向の直線の長さの差を表す
//      (どちらが長くてもよい)。
//   5. ? は任意の正の数を表す (矢印付きなら方向は矢印に固定)。
//
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["imbalanceloop"], {
	//---------------------------------------------------------
	// マウス入力系
	MouseEvent: {
		inputModes: {
			edit: ["direc", "number", "shade", "clear", "info-line"],
			play: ["line", "peke", "info-line"]
		},

		mouseinput_auto: function() {
			if (this.puzzle.playmode) {
				if (this.mousestart || this.mousemove) {
					if (this.btn === "left") {
						this.inputLine();
					} else if (this.btn === "right") {
						this.inputpeke();
					}
				}
			} else if (this.puzzle.editmode) {
				if (this.mousestart || this.mousemove) {
					if (this.btn === "left") {
						this.inputdirec();
					}
					// 右ボタンはドラッグでは何もしない
					// (クリック判定は mouseend で行う)
				} else if (this.mouseend && this.notInputted()) {
					if (this.btn === "left") {
						this.inputqnum();
					} else if (this.btn === "right") {
						this.inputqnumDec();
					}
				} else if (this.mouseend) {
					console.log(
						"[ILDBG] mouseinput_auto mouseend but notInputted()=false (changeflag=" +
						this.puzzle.opemgr.changeflag + ")"
					);
				}
			}
		},

		//---------------------------------------------------------------------------
		// inputqnum() 左クリックで なし → 1 → 2 → … → max → ? → なし と巡回させる。
		//             黒マスの上では黒マスを消す。
		//---------------------------------------------------------------------------
		inputqnum: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				console.log(
					"[ILDBG] inputqnum SKIP (isnull=" + cell.isnull + " sameAsMouseCell=" + (cell === this.mouseCell) + ")"
				);
				return;
			}
			this.mouseCell = cell;
			var before = "qnum=" + cell.qnum + " qdir=" + cell.qdir + " qans=" + cell.qans;

			if (cell.qans === 1) {
				cell.setQans(0);
			} else if (cell.qnum === -1) {
				cell.setQnum(1);
			} else if (cell.qnum === -2) {
				cell.setQnum(-1);
			} else if (cell.qnum < cell.getmaxnum()) {
				cell.setQnum(cell.qnum + 1);
			} else {
				cell.setQnum(-2);
			}
			console.log(
				"[ILDBG] inputqnum cell(" + cell.bx + "," + cell.by + ") " + before +
				" -> qnum=" + cell.qnum + " qdir=" + cell.qdir + " qans=" + cell.qans
			);
			cell.draw();
		},

		//---------------------------------------------------------------------------
		// inputqnumDec() 右クリックで数字を減らす (なし → ? → max → … → 1 → なし)。
		//                数字のないマスでは黒マスを置き、黒マスの上では消す。
		//---------------------------------------------------------------------------
		inputqnumDec: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				console.log(
					"[ILDBG] inputqnumDec SKIP (isnull=" + cell.isnull + " sameAsMouseCell=" + (cell === this.mouseCell) + ")"
				);
				return;
			}
			this.mouseCell = cell;
			var before = "qnum=" + cell.qnum + " qdir=" + cell.qdir + " qans=" + cell.qans;

			if (cell.qans === 1) {
				cell.setQans(0);
			} else if (cell.qnum === -1) {
				cell.setQans(1);
			} else if (cell.qnum === -2) {
				cell.setQnum(cell.getmaxnum());
			} else if (cell.qnum > 1) {
				cell.setQnum(cell.qnum - 1);
			} else {
				cell.setQnum(-1);
			}
			console.log(
				"[ILDBG] inputqnumDec cell(" + cell.bx + "," + cell.by + ") " + before +
				" -> qnum=" + cell.qnum + " qdir=" + cell.qdir + " qans=" + cell.qans
			);
			cell.draw();
		},

		//---------------------------------------------------------------------------
		// inputdirec() ドラッグで矢印の方向を設定する (4方向のみ)。
		//               数字のないマスでは矢印は付けられない。
		//---------------------------------------------------------------------------
		inputdirec: function() {
			var pos = this.getpos(0);
			if (this.prevPos.equals(pos)) {
				return;
			}
			var cell = this.prevPos.getc();
			if (!cell.isnull && cell.qnum !== -1 && !cell.isShade()) {
				var dir = this.prevPos.getdir(pos, 2);
				if (dir === cell.UP || dir === cell.DN || dir === cell.LT || dir === cell.RT) {
					cell.setQdir(cell.qdir !== dir ? dir : 0);
					cell.draw();
				}
			}
			this.prevPos = pos;
		}
	},

	//---------------------------------------------------------
	// キーボード入力系
	KeyEvent: {
		enablemake: true,

		moveTarget: function(ca) {
			if (ca.match(/shift/)) {
				return false;
			}
			return this.moveTCell(ca);
		},

		keyinput: function(ca) {
			if (this.key_inputdirec(ca)) {
				return;
			}
			this.key_inputqnum(ca);
		}
	},

	//---------------------------------------------------------
	// 盤面管理系
	Cell: {
		counted: false,
		segdir1: 0, // 1本目の直線の方向
		segdir2: 0, // 2本目の直線の方向
		seglen1: 0, // 1本目の直線の長さ
		seglen2: 0, // 2本目の直線の長さ

		posthook: {
			qnum: function(num) {
				if (num === -1) {
					this.qdir = 0;
				} else {
					this.qans = 0;
				}
			},
			qans: function(val) {
				if (val === 1) {
					this.qnum = -1;
					this.qdir = 0;
				}
			}
		},

		maxnum: function() {
			return this.board.cols + this.board.rows - 2;
		},

		isClue: function() {
			return this.qnum !== -1;
		},

		getSegmentDir: function(dir) {
			var llist = new this.klass.PieceList();
			var pos = this.getaddr().movedir(dir, 1);
			while (1) {
				var border = pos.getb();
				if (!border || border.isnull) {
					break;
				}
				if (border.isLine()) {
					llist.add(border);
				} else {
					break;
				}
				pos.movedir(dir, 2);
			}
			return llist;
		},

		getAllSegments: function() {
			var llist = new this.klass.PieceList();
			for (var dir = 1; dir <= 4; dir++) {
				var l = this.getSegmentDir(dir);
				for (var i = 0; i < l.length; i++) {
					llist.add(l[i]);
				}
			}
			return llist;
		},

		recount: function() {
			if (this.counted || this.lcnt !== 2) {
				return;
			}

			var dirs = [],
				lens = [];
			for (var dir = 1; dir <= 4; dir++) {
				var l = this.getSegmentDir(dir).length;
				if (l > 0) {
					dirs.push(dir);
					lens.push(l);
				}
			}
			if (dirs.length === 2) {
				this.segdir1 = dirs[0];
				this.segdir2 = dirs[1];
				this.seglen1 = lens[0];
				this.seglen2 = lens[1];
			}
			this.counted = true;
		},

		// 2方向の直線が向かい合っているか (直進)
		isSegStraight: function() {
			var s = this.segdir1 + this.segdir2;
			return s === 3 || s === 7;
		},

		// 矢印方向の長さ − 反対方向の長さ
		getArrowDiff: function() {
			if (this.segdir1 === this.qdir) {
				return this.seglen1 - this.seglen2;
			}
			return this.seglen2 - this.seglen1;
		},

		invalidate: function() {
			this.counted = false;
		}
	},

	Border: {
		posthook: {
			line: function() {
				var c0 = this.sidecell[0];
				var l = new this.klass.CellList();
				if (this.isvert) {
					for (var i = 1; i <= this.board.maxbx; i = i + 2) {
						l.add(this.board.getc(i, c0.by));
					}
				} else {
					for (var i = 1; i <= this.board.maxby; i = i + 2) {
						l.add(this.board.getc(c0.bx, i));
					}
				}
				l.each(function(cell) {
					cell.invalidate();
				});
			}
		}
	},

	Board: {
		hasborder: 1,

		rebuildInfo: function() {
			this.cell.each(function(cell) {
				if (cell.counted) {
					cell.invalidate();
				}
			});
			this.common.rebuildInfo.call(this);
		}
	},

	LineGraph: {
		enabled: true
	},

	//---------------------------------------------------------
	// 画像表示系
	Graphic: {
		irowake: true,

		numbercolor_func: "qnum",
		gridcolor_type: "LIGHT",

		hideHatena: true,

		paint: function() {
			this.drawBGCells();
			this.drawDashedGrid();

			this.drawArrowNumbers();
			this.drawLines();

			this.drawPekes();

			this.drawChassis();
			this.drawTarget();
		}
	},

	// 黒マス (qans=1) は境界線の下の背景色として描画する (yajilin と同様)
	"Graphic@imbalanceloop": {
		getBGCellColor: function(cell) {
			var info = cell.error || cell.qinfo;
			if (cell.qans === 1) {
				if (info === 1) {
					return this.errcolor1;
				} else if (cell.trial) {
					return this.trialcolor;
				}
				return this.shadecolor;
			} else if (info === 1) {
				return this.errbcolor1;
			}
			return null;
		}
	},

	//---------------------------------------------------------
	// URLエンコード/デコード処理
	//   セルごとに「矢印付き数字16進数」方式 (yajilin と同形式) で記録する。
	//   "+" = 黒マス、dir(0-4) + 数字1桁/2桁/.(=?) 、a-z で空白スキップ。
	//---------------------------------------------------------------------------
	Encode: {
		decodePzpr: function(type) {
			this.decodeImbalanceCell();
		},
		encodePzpr: function(type) {
			this.encodeImbalanceCell();
		},

		decodeImbalanceCell: function() {
			var c = 0,
				i = 0,
				bstr = this.outbstr,
				bd = this.board;
			for (i = 0; i < bstr.length; i++) {
				var ca = bstr.charAt(i),
					cell = bd.cell[c];
				if (ca === "+") {
					cell.qans = 1;
				} else if (this.include(ca, "0", "4")) {
					var ca1 = bstr.charAt(i + 1);
					cell.qdir = parseInt(ca, 16);
					cell.qnum = ca1 !== "." ? parseInt(ca1, 16) : -2;
					i++;
				} else if (this.include(ca, "5", "9")) {
					cell.qdir = parseInt(ca, 16) - 5;
					cell.qnum = parseInt(bstr.substr(i + 1, 2), 16);
					i += 2;
				} else if (ca >= "a" && ca <= "z") {
					c += parseInt(ca, 36) - 10;
				}
				c++;
				if (!bd.cell[c]) {
					break;
				}
			}
			this.outbstr = bstr.substr(i + 1);
		},

		encodeImbalanceCell: function() {
			var cm = "",
				count = 0,
				bd = this.board;
			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c],
					pstr = "";
				if (cell.qans === 1) {
					pstr = "+";
				} else if (cell.qnum === -2) {
					pstr = cell.qdir + ".";
				} else if (cell.qnum >= 0 && cell.qnum < 16) {
					pstr = cell.qdir + cell.qnum.toString(16);
				} else if (cell.qnum >= 16 && cell.qnum < 256) {
					pstr = cell.qdir + 5 + cell.qnum.toString(16);
				} else {
					count++;
				}

				if (count === 0) {
					cm += pstr;
				} else if (pstr || count === 26) {
					cm += (count + 9).toString(36) + pstr;
					count = 0;
				}
			}
			if (count > 0) {
				cm += (count + 9).toString(36);
			}
			this.outbstr += cm;
		}
	},

	//---------------------------------------------------------
	FileIO: {
		decodeData: function() {
			this.decodeCell(function(cell, ca) {
				if (ca === "#") {
					cell.qans = 1;
				} else if (ca !== ".") {
					var inp = ca.split(",");
					cell.qans = +inp[0];
					cell.qdir = +inp[1] || 0;
					cell.qnum = inp[2] !== "-" ? +inp[2] : -2;
				}
			});
			this.decodeBorderLine();
		},
		encodeData: function() {
			this.encodeCell(function(cell) {
				if (cell.qans === 1) {
					return "# ";
				} else if (cell.qnum !== -1) {
					var ca1 = cell.qdir !== 0 ? "" + cell.qdir : "0";
					var ca2 = cell.qnum !== -2 ? "" + cell.qnum : "-";
					return [cell.qans, ",", ca1, ",", ca2, " "].join("");
				} else {
					return ". ";
				}
			});
			this.encodeBorderLine();
		}
	},

	//---------------------------------------------------------
	// 正解判定処理実行部
	AnsCheck: {
		checklist: [
			"checkBranchLine",
			"checkCrossLine",
			"checkDeadendLine+",
			"checkOneLoop",
			"checkEmptyWhiteCell",
			"checkLineOnBlackCell",
			"checkClueStraight",
			"checkClueDifference"
		],

		// 白マスはすべて線が通る
		checkEmptyWhiteCell: function() {
			this.checkAllCell(function(cell) {
				return cell.qans === 0 && cell.lcnt === 0;
			}, "ilNoLineWhite");
		},

		// 黒マスは線が通らない
		checkLineOnBlackCell: function() {
			this.checkAllCell(function(cell) {
				return cell.qans === 1 && cell.lcnt > 0;
			}, "ilLineOnBlack");
		},

		// 手がかりマスは直進し、矢印は直線と平行であること
		checkClueStraight: function() {
			this.checkAllCell(function(cell) {
				if (cell.qnum === -1 || cell.lcnt !== 2) {
					return false;
				}
				cell.recount();
				if (!cell.isSegStraight()) {
					cell.getAllSegments().seterr(1);
					return true;
				}
				if (
					cell.qdir !== cell.NDIR &&
					cell.segdir1 !== cell.qdir &&
					cell.segdir2 !== cell.qdir
				) {
					cell.getAllSegments().seterr(1);
					return true;
				}
				return false;
			}, "ilNotStraight");
		},

		// 数字と直線の長さの差が一致していること
		checkClueDifference: function() {
			this.checkAllCell(function(cell) {
				if (cell.qnum === -1 || cell.lcnt !== 2) {
					return false;
				}
				cell.recount();
				if (!cell.isSegStraight()) {
					return false;
				}

				var diff = Math.abs(cell.seglen1 - cell.seglen2);
				if (cell.qdir !== cell.NDIR) {
					if (cell.segdir1 !== cell.qdir && cell.segdir2 !== cell.qdir) {
						return false;
					}
					if (cell.qnum === -2) {
						if (cell.getArrowDiff() < 1) {
							cell.getAllSegments().seterr(1);
							return true;
						}
					} else if (cell.getArrowDiff() !== cell.qnum) {
						cell.getAllSegments().seterr(1);
						return true;
					}
				} else if (cell.qnum === -2) {
					if (diff < 1) {
						cell.getAllSegments().seterr(1);
						return true;
					}
				} else if (diff !== cell.qnum) {
					cell.getAllSegments().seterr(1);
					return true;
				}
				return false;
			}, "ilWrongDiff");
		}
	}
});
