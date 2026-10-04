//
// パズル固有スクリプト部 Yin-Yang Mines版 yinyangmines.js
//
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["yinyangmines"], {
	//---------------------------------------------------------
	// マウス入力系
	MouseEvent: {
		inputModes: {
			edit: ["circle-shade", "circle-unshade", "number", "clear"],
			play: [
				"copycircle",
				"circle-shade",
				"circle-unshade",
				"border",
				"subline",
				"clear"
			]
		},
		mouseinput_other: function() {
			if (this.inputMode === "copycircle") {
				this.dragmarks();
			} else if (this.inputMode === "number" && this.mousestart) {
				this.inputqnum_mines();
			}
		},
		mouseinput_auto: function() {
			if (this.puzzle.playmode && (this.mousestart || this.mousemove)) {
				// 左クリック/ドラッグで白丸、右クリック/ドラッグで黒丸
				if (this.btn === "left") {
					this.inputMinesCircle(1);
				} else if (this.btn === "right") {
					this.inputMinesCircle(2);
				}
			} else if (this.puzzle.editmode) {
				if (this.mousestart || this.mousemove) {
					this.dragmarks();
				} else if (this.mouseend && this.notInputted()) {
					this.inputqnum_mines();
				}
			}
		},

		/* 白丸(1)/黒丸(2)のトグル入力。数字入りしろまるは変更しない */
		inputMinesCircle: function(num) {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				return;
			}
			if (cell.qnum === 1 && cell.anum >= 0) {
				/* 数字入りのしろまる(問題のヒント)は変更しない */
				return;
			}
			var val = cell.getNum();
			if (this.inputData === null) {
				this.inputData = val === num ? -1 : num;
			}
			if (val !== num || this.inputData === -1) {
				cell.setNum(this.inputData);
				cell.draw();
			}
			this.mouseCell = cell;
		},

		dragmarks: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				return;
			}
			if (this.puzzle.playmode && cell.qnum !== -1) {
				/* 数字入りのしろまる等、問題で確定したセルは変更しない */
				return;
			}
			if (this.mouseCell.isnull) {
				this.inputData = cell.getNum();
				this.mouseCell = cell;
			} else if (cell.getNum() !== this.inputData) {
				cell.setNum(this.inputData);
				this.mouseCell = cell;
				cell.draw();
			}
		},

		/* 数字入力: しろまるにして地雷の個数を設定する */
		inputqnum_mines: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				return;
			}
			if (cell.qnum === 1 && cell.anum >= 0) {
				/* 数字入りしろまるをクリックしたら消す */
				cell.setQnum(-1);
				cell.setAnum(-1);
			} else if (cell.qnum === 2) {
				/* くろまるをクリックしたら数字0のしろまるにする */
				cell.setQnum(1);
				cell.setAnum(0);
			} else {
				var n = cell.qnum === 1 ? cell.anum : -1;
				cell.setQnum(1);
				cell.setAnum(n >= 8 ? 0 : n + 1);
			}
			cell.draw();
			this.mouseCell = cell;
		}
	},

	//---------------------------------------------------------
	// キーボード入力系
	KeyEvent: {
		enablemake: true,

		keyinput: function(ca) {
			if (this.keydown && this.puzzle.editmode) {
				this.key_inputqnum_mines(ca);
			}
		},
		key_inputqnum_mines: function(ca) {
			var cell = this.cursor.getc(),
				max = 8;
			if (cell.isnull || cell.qnum === 2) {
				return;
			}
			var val = null;
			if ("0" <= ca && ca <= "9") {
				var num = +ca;
				var cur = this.prev === cell && cell.anum >= 0 ? cell.anum : -1;
				val =
					cur <= 0 || cur * 10 + num > max
						? num > max
							? null
							: num
						: cur * 10 + num;
			} else if (ca === "BS" || ca === " " || ca === "-") {
				cell.setQnum(-1);
				cell.setAnum(-1);
				this.prev = cell;
				cell.draw();
				return;
			} else {
				return;
			}
			if (val === null) {
				return;
			}
			cell.setQnum(1);
			cell.setAnum(val);
			this.prev = cell;
			cell.draw();
		}
	},

	//---------------------------------------------------------
	// 盤面管理系
	Cell: {
		numberAsObject: true,
		disInputHatena: true,

		maxnum: 2,
		minnum: 1
	},

	Board: {
		hasborder: 1,

		disable_subclear: true,

		addExtraInfo: function() {
			this.yingraph = this.addInfoList(this.klass.AreaYinGraph);
			this.yanggraph = this.addInfoList(this.klass.AreaYangGraph);
		}
	},

	"AreaYinGraph:AreaGraphBase": {
		enabled: true,
		relation: { "cell.qnum": "node", "cell.anum": "node" },
		setComponentRefs: function(obj, component) {
			obj.yin = component;
		},
		getObjNodeList: function(nodeobj) {
			return nodeobj.yinnodes;
		},
		resetObjNodeList: function(nodeobj) {
			nodeobj.yinnodes = [];
		},

		isnodevalid: function(cell) {
			return cell.getNum() === 2;
		}
	},

	"AreaYangGraph:AreaGraphBase": {
		enabled: true,
		relation: { "cell.qnum": "node", "cell.anum": "node" },
		setComponentRefs: function(obj, component) {
			obj.yang = component;
		},
		getObjNodeList: function(nodeobj) {
			return nodeobj.yangnodes;
		},
		resetObjNodeList: function(nodeobj) {
			nodeobj.yangnodes = [];
		},

		isnodevalid: function(cell) {
			return cell.getNum() === 1;
		}
	},

	//---------------------------------------------------------
	// 画像表示系
	Graphic: {
		bordercolor_func: "qans",

		paint: function() {
			this.drawBGCells();
			this.drawGrid();

			this.drawBorders();
			this.drawBorderQsubs();

			this.drawCircles();
			this.drawMineNumbers();

			this.drawChassis();

			this.drawTarget();
		},

		drawMineNumbers: function() {
			var g = this.vinc("cell_minenum", "auto");
			var clist = this.range.cells;
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				g.vid = "c_minenum_" + cell.id;
				if (cell.qnum === 1 && cell.anum >= 0) {
					g.fillStyle = cell.error === 1 ? this.errcolor1 : this.quescolor;
					this.disptext("" + cell.anum, cell.bx * this.bw, cell.by * this.bh, {
						ratio: 0.3
					});
				} else {
					g.vhide();
				}
			}
		},

		getBGCellColor_error1: function(cell) {
			if (cell.error === 1 || cell.qinfo === 1) {
				return this.errbcolor1;
			} else if (this.puzzle.execConfig("dispqnumbg") && cell.qnum !== -1) {
				return "silver";
			}
			return null;
		},
		getCircleStrokeColor: function(cell) {
			if (cell.qnum === 1 || cell.anum === 1) {
				if (cell.error === 1) {
					return this.errcolor1;
				} else if (cell.qnum === 1) {
					return this.quescolor;
				} else if (cell.trial) {
					return this.trialcolor;
				} else if (
					this.puzzle.editmode &&
					!this.puzzle.execConfig("dispqnumbg")
				) {
					return "silver";
				} else {
					return this.quescolor;
				}
			}
			return null;
		},
		getCircleFillColor: function(cell) {
			if (cell.qnum === 2 || cell.anum === 2) {
				if (cell.error === 1) {
					return this.errcolor1;
				} else if (cell.qnum === 2) {
					return this.quescolor;
				} else if (cell.trial) {
					return this.trialcolor;
				} else if (
					this.puzzle.editmode &&
					!this.puzzle.execConfig("dispqnumbg")
				) {
					return "silver";
				} else {
					return this.quescolor;
				}
			} else if (
				cell.qnum === 1 &&
				this.puzzle.execConfig("dispqnumbg") &&
				cell.error === 0
			) {
				return "white";
			}
			return null;
		}
	},

	//---------------------------------------------------------
	// URLエンコード/デコード処理
	Encode: {
		decodePzpr: function(type) {
			this.decodeMinesCircle();
		},
		encodePzpr: function(type) {
			this.encodeMinesCircle();
		},

		decodeMinesCircle: function() {
			var c = 0,
				bstr = this.outbstr,
				bd = this.board;
			for (var i = 0; i < bstr.length && c < bd.cell.length; i++) {
				var val = parseInt(bstr.charAt(i), 36);
				if (isNaN(val)) {
					continue;
				}
				var cell = bd.cell[c];
				if (val === 0) {
					cell.qnum = -1;
					cell.anum = -1;
				} else if (val === 1) {
					cell.qnum = 1;
					cell.anum = -1;
				} else if (val === 2) {
					cell.qnum = 2;
					cell.anum = -1;
				} else if (val <= 11) {
					cell.qnum = 1;
					cell.anum = val - 3;
				}
				c++;
			}
			this.outbstr = bstr.substr(i);
		},
		encodeMinesCircle: function() {
			var bd = this.board,
				out = "";
			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c],
					val = 0;
				if (cell.qnum === 1) {
					val = cell.anum >= 0 ? 3 + cell.anum : 1;
				} else if (cell.qnum === 2) {
					val = 2;
				}
				out += val.toString(36);
			}
			this.outbstr += out;
		}
	},
	//---------------------------------------------------------
	FileIO: {
		decodeData: function() {
			this.decodeCellQnum();
			this.decodeCell(function(cell, ca) {
				if (ca >= "0" && ca <= "8") {
					cell.anum = +ca;
				}
			});
		},
		encodeData: function() {
			this.encodeCellQnum();
			this.encodeCell(function(cell) {
				return cell.anum >= 0 ? cell.anum + " " : ". ";
			});
		}
	},

	//---------------------------------------------------------
	// 正解判定処理実行部
	AnsCheck: {
		checklist: [
			"check2x2ShadedCircle",
			"check2x2UnshadedCircle",
			"checkConnectShadedCircle",
			"checkConnectUnshadedCircle",
			"checkMineNumbers",
			"checkNoNumCell"
		],

		checkConnectShadedCircle: function() {
			this.checkOneArea(this.board.yingraph, "msDivide");
		},
		checkConnectUnshadedCircle: function() {
			this.checkOneArea(this.board.yanggraph, "muDivide");
		},

		check2x2ShadedCircle: function() {
			this.check2x2Block(function(cell) {
				return cell.getNum() === 2;
			}, "ms2x2");
		},
		check2x2UnshadedCircle: function() {
			this.check2x2Block(function(cell) {
				return cell.getNum() === 1;
			}, "mu2x2");
		},

		checkMineNumbers: function() {
			this.checkAllCell(function(cell) {
				if (!(cell.qnum === 1 && cell.anum >= 0)) {
					return false;
				}
				var count = 0;
				for (var dy = -1; dy <= 1; dy++) {
					for (var dx = -1; dx <= 1; dx++) {
						if (dy === 0 && dx === 0) {
							continue;
						}
						var target = cell.relcell(dx * 2, dy * 2);
						if (!target.isnull && target.getNum() === 2) {
							count++;
						}
					}
				}
				return count !== cell.anum;
			}, "ceMineNe");
		}
	}
});
