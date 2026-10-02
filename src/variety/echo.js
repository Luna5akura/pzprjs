//
// パズル固有スクリプト部 Echo版 echo.js
//
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["echo"], {
	//---------------------------------------------------------
	// マウス入力系
	MouseEvent: {
		use: true,
		autoedit_func: "qnum",
		autoplay_func: "cell",

		inputModes: {
			edit: ["number", "clear", "info-blk"],
			play: ["shade", "unshade", "peke", "info-blk"]
		},

		mouseinput_clear: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				return;
			}

			cell.setQnums([]);
			cell.setQans(0);
			cell.setQsub(0);
			cell.draw();
			this.mouseCell = cell;
		},

		inputqnum: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				return;
			}

			if (cell !== this.cursor.getc()) {
				this.setcursor(cell);
			} else {
				this.inputqnum_echo_main(cell);
			}
			this.mouseCell = cell;
		},
		inputqnum_echo_main: function(cell) {
			var states = cell.qnum_states(),
				state = 0;
			for (var i = 0; i < states.length; i++) {
				if (this.puzzle.pzpr.util.sameArray(cell.qnums, states[i])) {
					state = i;
					break;
				}
			}

			var isinc =
				this.inputMode === "number" ||
				(this.inputMode === "auto" && this.btn === "left");
			if (isinc) {
				if (state < states.length - 1) {
					state++;
				} else {
					state = 0;
				}
			} else {
				if (state > 0) {
					state--;
				} else {
					state = states.length - 1;
				}
			}
			cell.setQnums(states[state]);
			cell.setQans(0);
			cell.setQsub(0);

			cell.draw();
		}
	},

	//---------------------------------------------------------
	// キーボード入力系
	KeyEvent: {
		enablemake: true,

		keyinput: function(ca) {
			this.key_inputqnums(ca);
		}
	},

	//---------------------------------------------------------
	// 盤面管理系
	Cell: {
		minnum: 1,
		maxnum: function() {
			return Math.max(this.board.cols, this.board.rows);
		},
		distinctQnums: true,
		numberRemainsUnshaded: true,

		// マウスの数字入力で循環する状態: 空 -> ? -> 1..maxnum
		qnum_states: function() {
			var states = [[], [-2]],
				max = this.getmaxnum();
			for (var n = 1; n <= max; n++) {
				states.push([n]);
			}
			return states;
		},

		// URLエンコード用の正順序: ?を先頭に、数字は昇順
		sortEchoQnums: function(nums) {
			return nums.slice().sort(function(a, b) {
				if (a === b) {
					return 0;
				}
				return a === -2 ? -1 : b === -2 ? 1 : a - b;
			});
		},

		isValidQnums: function(val) {
			if (val.length === 0) {
				return true;
			}
			if (val.length > 4) {
				return false;
			}
			var seen = {};
			for (var i = 0; i < val.length; i++) {
				var n = val[i];
				if (n === -2) {
					continue;
				}
				if (n < 1 || n > this.getmaxnum()) {
					return false;
				}
				if (seen[n]) {
					return false;
				}
				seen[n] = true;
			}
			return true;
		},

		allowShade: function() {
			return this.qnums.length === 0;
		},
		allowUnshade: function() {
			return this.qnums.length === 0;
		},

		// 4方向それぞれについて、最も近い黒マスまでの距離を返す
		// (その方向に黒マスがなければ null)
		getEchoDistances: function() {
			var result = [];
			var dirs = ["top", "bottom", "left", "right"];
			for (var i = 0; i < dirs.length; i++) {
				var target = this;
				var dist = 0;
				while (true) {
					target = target.adjacent[dirs[i]];
					if (target.isnull) {
						result.push(null);
						break;
					}
					dist++;
					if (target.isShade()) {
						result.push(dist);
						break;
					}
				}
			}
			return result;
		}
	},

	Board: {
		cols: 9,
		rows: 9,
		hasborder: 1
	},

	AreaShadeGraph: {
		enabled: true,
		coloring: true
	},

	//---------------------------------------------------------
	// 画像表示系
	Graphic: {
		irowakeblk: true,
		qanscolor: "black",

		paint: function() {
			this.drawBGCells();
			this.drawShadedCells();
			this.drawDotCells();
			this.drawGrid();

			this.drawTapaNumbers();

			this.drawChassis();

			this.drawPekes();

			this.drawTarget();
		}
	},

	//---------------------------------------------------------
	// URLエンコード/デコード処理
	Encode: {
		decodePzpr: function(type) {
			this.decodeNumber_echo();
		},
		encodePzpr: function(type) {
			this.encodeNumber_echo();
		},

		// 数字1個分のエンコード: 1..15 は16進1桁、16..255 は "-xx"、
		// 256..4095 は "+xxx"、? は "."
		readEntry16: function(bstr, i) {
			var ca = bstr.charAt(i);
			if (ca === ".") {
				return [-2, 1];
			} else if (ca === "-") {
				return [parseInt(bstr.substr(i + 1, 2), 16), 3];
			} else if (ca === "+") {
				return [parseInt(bstr.substr(i + 1, 3), 16), 4];
			} else {
				return [parseInt(ca, 16), 1];
			}
		},
		writeEntry16: function(num) {
			if (num === -2) {
				return ".";
			} else if (num >= 1 && num < 16) {
				return num.toString(16);
			} else if (num >= 16 && num < 256) {
				return "-" + num.toString(16).padStart(2, "0");
			} else if (num >= 256 && num < 4096) {
				return "+" + num.toString(16).padStart(3, "0");
			}
			return "";
		},

		decodeNumber_echo: function() {
			var c = 0,
				i = 0,
				bstr = this.outbstr,
				bd = this.board;
			while (i < bstr.length && c < bd.cell.length) {
				var ca = bstr.charAt(i);
				if (ca >= "g" && ca <= "z") {
					c += parseInt(ca, 36) - 15;
					i++;
					continue;
				}
				if (ca === "0") {
					/* 空のヒントマス(通常は現れない) */
					i++;
					c++;
					continue;
				}
				var nums = [];
				while (i < bstr.length) {
					var ch = bstr.charAt(i);
					if (ch === "0") {
						i++;
						break;
					}
					var res = this.readEntry16(bstr, i);
					nums.push(res[0]);
					i += res[1];
				}
				bd.cell[c].setQnums(bd.cell[c].sortEchoQnums(nums));
				c++;
			}
			this.outbstr = bstr.substr(i);
		},
		encodeNumber_echo: function() {
			var count = 0,
				cm = "",
				bd = this.board;
			for (var c = 0; c < bd.cell.length; c++) {
				var pstr = "",
					nums = bd.cell[c].qnums;

				if (nums.length > 0) {
					nums = bd.cell[c].sortEchoQnums(nums);
					for (var k = 0; k < nums.length; k++) {
						pstr += this.writeEntry16(nums[k]);
					}
					pstr += "0";
				} else {
					count++;
				}

				if (count === 0) {
					cm += pstr;
				} else if (pstr || count === 20) {
					cm += (15 + count).toString(36) + pstr;
					count = 0;
				}
			}
			if (count > 0) {
				cm += (15 + count).toString(36);
			}

			this.outbstr += cm;
		}
	},
	//---------------------------------------------------------
	FileIO: {
		decodeData: function() {
			this.decodeCellQnumAns_echo();
			this.decodeBorderLine();
		},
		encodeData: function() {
			this.encodeCellQnumAns_echo();
			this.encodeBorderLineIfPresent();
		},

		decodeCellQnumAns_echo: function() {
			this.decodeCell(function(cell, ca) {
				if (ca === "#") {
					cell.qans = 1;
				} else if (ca === "+") {
					cell.qsub = 1;
				} else if (ca !== ".") {
					var nums = [];
					var array = ca.split(/,/);
					for (var i = 0; i < array.length; i++) {
						nums.push(array[i] !== "-" ? +array[i] : -2);
					}
					cell.setQnums(cell.sortEchoQnums(nums));
				}
			});
		},
		encodeCellQnumAns_echo: function() {
			this.encodeCell(function(cell) {
				if (cell.qnums.length > 0) {
					var array = [];
					for (var i = 0; i < cell.qnums.length; i++) {
						array.push(cell.qnums[i] >= 0 ? "" + cell.qnums[i] : "-");
					}
					return array.join(",") + " ";
				} else if (cell.qans === 1) {
					return "# ";
				} else if (cell.qsub === 1) {
					return "+ ";
				} else {
					return ". ";
				}
			});
		}
	},

	//---------------------------------------------------------
	// 正解判定処理実行部
	AnsCheck: {
		checklist: [
			"checkShadeCellExist+",
			"check2x2ShadeCell",
			"checkConnectShade+",
			"checkEchoClue",
			"doneShadingDecided"
		],

		checkEchoClue: function() {
			this.checkAllCell(function(cell) {
				if (cell.qnums.length === 0) {
					return false;
				}

				/* 4方向の距離(重複は集合として1回だけ数える) */
				var dists = cell.getEchoDistances().filter(function(d) {
					return d !== null;
				});
				var distSet = [];
				for (var i = 0; i < dists.length; i++) {
					if (distSet.indexOf(dists[i]) < 0) {
						distSet.push(dists[i]);
					}
				}

				var nums = [],
					wildcardCount = 0;
				for (var k = 0; k < cell.qnums.length; k++) {
					if (cell.qnums[k] === -2) {
						wildcardCount++;
					} else {
						nums.push(cell.qnums[k]);
					}
				}

				/* 書かれた数字はそれぞれどこかの方向で実現される */
				for (var n = 0; n < nums.length; n++) {
					if (distSet.indexOf(nums[n]) < 0) {
						return true;
					}
				}

				/* 書かれた数字以外の距離は、各?が表す値と一対一に
				   対応する(互いに異なり、数字とも異なるため) */
				var nonPrinted = 0;
				for (var d = 0; d < distSet.length; d++) {
					if (nums.indexOf(distSet[d]) < 0) {
						nonPrinted++;
					}
				}
				return nonPrinted !== wildcardCount;
			}, "ceEchoNe");
		}
	}
});
