//
// パズル固有スクリプト部 Torch版 torch.js
//
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["torch"], {
	//---------------------------------------------------------
	// マウス入力系
	MouseEvent: {
		use: true,
		inputModes: {
			edit: ["number", "clear"],
			play: ["shade", "unshade", "clear"]
		},
		autoedit_func: "",
		autoplay_func: "cell",

		mouseinput_auto: function() {
			if (this.puzzle.playmode) {
				// 左クリック/ドラッグで黒マス、右クリック/ドラッグで白マス
				if (this.mousestart || this.mousemove) {
					this.inputShade();
				}
			} else if (this.puzzle.editmode) {
				// クリックで黒マス(数字なし)の置き/消し
				if (this.mousestart) {
					this.inputTorchBlack();
				}
			}
		},

		inputTorchBlack: function() {
			var cell = this.getcell();
			if (cell.isnull) {
				return;
			}
			cell.setQnum(cell.qnum === -2 ? -1 : -2);
			cell.draw();
			this.setcursor(cell);
		},

		mouseinput_clear: function() {
			var cell = this.getcell();
			if (cell.isnull) {
				return;
			}
			cell.setQnum(-1);
			cell.setQans(0);
			cell.draw();
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
		maxnum: function() {
			return this.puzzle.board.rows * this.puzzle.board.cols;
		},
		minnum: 0,

		// 黒マス = 回答の黒マス(qans=1) または問題の黒マス(qnum=-2/数字)
		isShade: function() {
			return (
				!this.isnull && (this.qans === 1 || this.qnum === -2 || this.qnum >= 0)
			);
		},
		isUnshade: function() {
			return !this.isnull && !this.isShade();
		},

		allowShade: function() {
			return this.qnum < 0 && this.qnum !== -2;
		},
		allowUnshade: function() {
			return this.qnum < 0 && this.qnum !== -2;
		}
	},

	Board: {
		hasborder: 0
	},

	AreaShadeGraph: {
		enabled: true,
		relation: { "cell.qans": "node", "cell.qnum": "node" }
	},

	//---------------------------------------------------------
	// 画像表示系
	Graphic: {
		hideHatena: true,
		fgcellcolor_func: "qnum",
		bgcellcolor_func: "qsub1",
		enablebcolor: true,

		paint: function() {
			this.drawBGCells();
			this.drawGrid();

			this.drawQuesCells();
			this.drawShadedCells();
			this.drawQuesNumbers();

			this.drawChassis();

			this.drawTarget();
		},

		// 数字は黒マスの上に書かれるため白で表示する
		getQuesNumberColor: function(cell) {
			return cell.qcmp === 1 ? this.qcmpcolor : this.fontShadecolor;
		}
	},

	//---------------------------------------------------------
	// URLエンコード/デコード処理
	Encode: {
		decodePzpr: function(type) {
			this.decodeCellNumber16();
		},
		encodePzpr: function(type) {
			this.encodeCellNumber16();
		},

		decodeCellNumber16: function() {
			this.genericDecodeNumber16(
				this.board.cell.length,
				function(c, val) {
					var cell = this.board.cell[c];
					if (val === -2) {
						cell.setQnum(-2);
					} else if (val >= 0) {
						cell.setQnum(val);
					}
				}.bind(this)
			);
		},
		encodeCellNumber16: function() {
			this.genericEncodeNumber16(
				this.board.cell.length,
				function(c) {
					return this.board.cell[c].qnum;
				}.bind(this)
			);
		}
	},

	//---------------------------------------------------------
	FileIO: {
		decodeData: function() {
			this.decodeCellQnumAns();
		},
		encodeData: function() {
			this.encodeCellQnumAns();
		}
	},

	//---------------------------------------------------------
	// 正解判定処理実行部
	AnsCheck: {
		checklist: [
			"checkShadeConnect",
			"check2x2ShadeCell",
			"checkTorchTree",
			"checkTorchDistance"
		],

		checkShadeConnect: function() {
			this.checkOneArea(this.board.sblkmgr, "csDivide");
		},

		// 黒マスが輪っかを作らない: 辺の数 = 黒マスの数 - 1
		checkTorchTree: function() {
			var bd = this.board,
				nodes = 0,
				edges = 0;
			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c];
				if (!cell.isShade()) {
					continue;
				}
				nodes++;
				var adc = cell.adjacent;
				if (!adc.right.isnull && adc.right.isShade()) {
					edges++;
				}
				if (!adc.bottom.isnull && adc.bottom.isShade()) {
					edges++;
				}
			}
			if (edges === nodes - 1) {
				return;
			}
			this.failcode.add("csLoop");
			if (!this.checkOnly) {
				for (var c2 = 0; c2 < bd.cell.length; c2++) {
					if (bd.cell[c2].isShade()) {
						bd.cell[c2].seterr(1);
					}
				}
			}
		},

		// 数字: 最も近い端点(黒マスに1つだけ隣接する黒マス)までの距離
		checkTorchDistance: function() {
			var bd = this.board,
				deg = {},
				dist = {},
				queue = [],
				qhead = 0;

			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c];
				if (!cell.isShade()) {
					continue;
				}
				var d = 0,
					adc = cell.adjacent;
				for (var dir in adc) {
					if (!adc[dir].isnull && adc[dir].isShade()) {
						d++;
					}
				}
				deg[cell.id] = d;
				if (d === 1) {
					dist[cell.id] = 0;
					queue.push(cell);
				}
			}

			while (qhead < queue.length) {
				var cell2 = queue[qhead++],
					adc2 = cell2.adjacent;
				for (var dir2 in adc2) {
					var nb = adc2[dir2];
					if (
						nb.isnull ||
						!nb.isShade() ||
						dist[nb.id] !== void 0
					) {
						continue;
					}
					dist[nb.id] = dist[cell2.id] + 1;
					queue.push(nb);
				}
			}

			var result = true;
			for (var c3 = 0; c3 < bd.cell.length; c3++) {
				var cell3 = bd.cell[c3];
				if (!(cell3.qnum >= 0)) {
					continue;
				}
				if (dist[cell3.id] === cell3.qnum) {
					continue;
				}
				result = false;
				if (this.checkOnly) {
					break;
				}
				this.failcode.add("nmTorchNe");
				cell3.seterr(1);
			}
			return result;
		}
	}
});
