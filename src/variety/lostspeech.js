//
// lostspeech.js
// Lost Speech (ツイン盤面)
//
// 2つの同一盤面が左右に並び、マーカー (点・三角・起点・灰色) は共有される。
// 各盤面には青と赤の形状が1つずつ割り当てられ、その形状を起点マスを覆う
// ように1回だけ配置する。点は各盤面の覆われ方を制約する:
//   黒点      : ちょうど1つの形状
//   黒空心点  : 高々1つの形状
//   青点      : ちょうど1つの青の形状 (赤なし)
//   青赤点    : ちょうど1つの青と1つの赤
//   赤点      : ちょうど1つの赤の形状 (青なし)
//   青空心点  : 高々1つの形状 (青のみ)
//   赤空心点  : 高々1つの形状 (赤のみ)
// 同じ盤面内の青と赤は重なってもよい (互いに完全に含まれてもよい)。
// 「this puzzle uses variant rule」が有効な場合のみ、2つの解 (各盤面の形状)
// の間で、どの形状も他の解のどの形状にも完全に含まれてはならない。
//

(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
		// 形状エディタ(statuepark-aux)を同期的に利用できるよう、
		// statuepark.jsのクラスを先読みしておく
		pzpr.classmgr.includeCustomFile("statuepark-aux");
	}
})(["lostspeech"], {
	//---------------------------------------------------------
	// マウス入力系
	MouseEvent: {
		use: true,

		inputModes: {
			edit: [
				"dot-black",
				"dot-white",
				"dot-blue",
				"dot-blue-white",
				"dot-double",
				"dot-red",
				"dot-red-white",
				"triangle",
				"start-blue",
				"start-red",
				"empty",
				"clear"
			],
			play: ["shade", "unshade", "clear"]
		},

		// 選択中のbankピース (0:青1 1:赤1 2:青2 3:赤2)
		activepiece: 0,

		// ピースごとの向き(0-7: 0-3は回転, 4-7は反転+回転)
		orient: [0, 0, 0, 0],
		// プレビュー中のセル
		previewcell: null,

		// 右側の盤面のxオフセット (仮想座標)
		getTwinOffset: function() {
			return this.board.cols * 2 + 2;
		},

		// 選択中のピースが属する盤面(0/1)と色に応じたプロパティを返す
		getPieceProp: function(index) {
			var board = index >= 2 ? 1 : 0;
			var prop = index % 2 === 0 ? "qans" : "anum";
			return board ? prop + "2" : prop;
		},

		// ツイン盤面: 右側の盤面のセルは左側のセルと共有のため、
		// 座標を折り返してセルを取得する
		getcell: function() {
			var pos = this.getpos(0);
			var off = this.getTwinOffset();
			if (pos.bx >= off) {
				pos.bx -= off;
			}
			return pos.getc();
		},

		// ボタン状態に関わらず、ホバー位置でプレビューを更新する
		// (btnは前回のクリックの値が残っているため、ボタン状態では判定しない)
		e_mousemove: function(e) {
			this.common.e_mousemove.call(this, e);

			var addr = this.getBoardAddress(e);
			if (!isNaN(addr.bx) && !isNaN(addr.by)) {
				this.inputPoint.init(addr.bx, addr.by);
				this.updatePreview();
			}
		},

		mousereset: function() {
			var pc = this.previewcell;
			this.common.mousereset.call(this);
			this.previewcell = null;
			if (!!pc) {
				this.puzzle.redraw();
			}
		},

		mouseinput: function() {
			switch (this.inputMode) {
				case "shade":
					return this.inputplace();
				case "unshade":
					return this.inputremove();
				default:
					return this.common.mouseinput.call(this);
			}
		},

		mouseinput_auto: function() {
			if (this.puzzle.playmode) {
				if (this.mousestart) {
					var piece = this.getbank();
					if (!!piece) {
						this.activepiece = piece.index;
						this.mousereset();
						// 選択状態(調光・マーカー)をすぐに反映する
						this.puzzle.redraw();
						return;
					}
					if (this.btn === "left") {
						this.inputplace();
					} else if (this.btn === "right") {
						this.inputremove();
					}
				} else if (this.mousemove) {
					this.updatePreview();
				}
			} else if (this.puzzle.editmode) {
				if (this.mousestart) {
					if (!!this.getbank()) {
						if (this.btn === "left") {
							this.inputpiece();
						}
					} else {
						this.inputqnum();
					}
				}
			}
		},

		mouseinput_other: function() {
			var markers = {
				"dot-black": 1,
				"dot-white": 2,
				"dot-blue": 3,
				"dot-blue-white": 9,
				"dot-double": 4,
				"dot-red": 8,
				"dot-red-white": 10,
				triangle: 5,
				"start-blue": 6,
				"start-red": 7
			};
			var num = markers[this.inputMode];
			if (!!num && this.mousestart) {
				this.inputMarker(num);
			}
		},

		mouseinput_clear: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				return;
			}

			if (this.puzzle.editmode) {
				cell.setQnum(-1);
				cell.setQues(0);
				cell.setQans(0);
				cell.setAnum(-1);
				cell.setdata("qans2", 0);
				cell.setdata("anum2", -1);
				cell.draw();
			} else {
				var off = this.getTwinOffset();
				var isboard2 = this.inputPoint.bx >= off;
				var props = isboard2 ? ["qans2", "anum2"] : ["qans", "anum"];
				for (var p = 0; p < 2; p++) {
					var id = cell[props[p]];
					if (id > 0) {
						this.removeShape(props[p], id);
					}
				}
			}
			this.mouseCell = cell;
		},

		inputqnum: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell || cell.ques === 7) {
				return;
			}
			this.common.inputqnum.call(this);
		},

		// 指定した数字(qnum)のマーカーを入力する
		inputMarker: function(num) {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				return;
			}

			if (cell.qnum === num) {
				cell.setQnum(-1);
			} else {
				cell.setQnum(num);
				cell.setQues(0);
				// 起点は各色1つだけ: 新しく置いた起点以外の同色起点を消す
				if (num === 6 || num === 7) {
					var cells = this.board.cell;
					for (var i = 0; i < cells.length; i++) {
						if (cells[i] !== cell && cells[i].qnum === num) {
							cells[i].setQnum(-1);
						}
					}
				}
			}
			cell.draw();
			this.mouseCell = cell;
		},

		// 選択中のピースをクリックしたセルを左上として配置する
		inputplace: function() {
			var cell = this.getcell();
			if (cell.isnull || cell.ques === 7 || cell === this.mouseCell) {
				return;
			}

			var piece = this.board.bank.pieces[this.activepiece];
			if (!piece) {
				return;
			}

			// ピースは自分の盤面にしか置けない
			var isboard2 = this.inputPoint.bx >= this.getTwinOffset();
			if ((this.activepiece >= 2) !== isboard2) {
				return;
			}

			var shape = this.getShapeOffsets(piece, this.orient[this.activepiece]);
			var prop = this.getPieceProp(this.activepiece);
			if (!this.isPlaceable(cell, shape.offsets, prop)) {
				return;
			}

			var cells = [];
			var bd = this.board;
			for (var i = 0; i < shape.offsets.length; i++) {
				var o = shape.offsets[i];
				cells.push(bd.getc(cell.bx + 2 * o.x, cell.by + 2 * o.y));
			}

			var id = this.getNewShapeId(prop);
			for (var j = 0; j < cells.length; j++) {
				cells[j].setdata(prop, id);
			}
			var clist = new this.klass.CellList(cells);
			clist.draw();
			this.mouseCell = cell;
		},

		// クリックしたセルを含む形状を削除する (クリックした盤面の色を優先)
		inputremove: function() {
			var cell = this.getcell();
			if (cell.isnull || cell.ques === 7 || cell === this.mouseCell) {
				return;
			}

			var off = this.getTwinOffset();
			var isboard2 = this.inputPoint.bx >= off;

			// クリックした盤面の形状のみを削除する
			var props = isboard2 ? ["qans2", "anum2"] : ["qans", "anum"];
			var prop = null,
				id = 0;
			for (var p = 0; p < props.length; p++) {
				if (cell[props[p]] > 0) {
					prop = props[p];
					id = cell[props[p]];
					break;
				}
			}
			if (!prop) {
				return;
			}

			// クリックした形状と、同じ色でそれ以降に置いた形状をまとめて削除する
			// (鎖の後半を巻き戻せるように)
			this.removeShapeFrom(prop, id);
			this.mouseCell = cell;
		},

		removeShape: function(prop, id) {
			var bd = this.board;
			var clist = new this.klass.CellList();
			var empty = prop === "anum" || prop === "anum2" ? -1 : 0;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				if (cell[prop] !== id) {
					continue;
				}
				cell.setdata(prop, empty);
				clist.add(cell);
			}
			clist.draw();
		},

		// 指定した形状と、同じ色でそれ以降(より大きいID)に置いた形状を
		// まとめて削除する (IDは配置順に増加するため)
		removeShapeFrom: function(prop, id) {
			var bd = this.board;
			var clist = new this.klass.CellList();
			var empty = prop === "anum" || prop === "anum2" ? -1 : 0;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				if (cell[prop] < id) {
					continue;
				}
				cell.setdata(prop, empty);
				clist.add(cell);
			}
			clist.draw();
		},

		// マウス移動時のプレビューを更新する
		updatePreview: function() {
			var cell = this.getcell();
			if (cell.isnull) {
				cell = null;
			}
			if (this.previewcell === cell) {
				return;
			}
			this.previewcell = cell;
			this.puzzle.painter.paintAll();
		},

		// ピースを回転する
		rotatepiece: function() {
			var o = this.orient[this.activepiece];
			// Rキーは時計回りに90度回転させる
			this.orient[this.activepiece] = (((o % 4) + 3) % 4) + (o >= 4 ? 4 : 0);
			this.puzzle.redraw();
		},

		// ピースを反転する
		flippiece: function() {
			var o = this.orient[this.activepiece];
			this.orient[this.activepiece] = o < 4 ? o + 4 : o - 4;
			this.puzzle.redraw();
		},

		// ピースの8向きのオフセット一覧を返す (左上を基準に正規化)
		getShapeOffsets: function(piece, orient) {
			var w = piece.w,
				h = piece.h,
				str = piece.str;
			var rot = orient % 4,
				flip = (orient / 4) | 0;
			var offsets = [];
			var minx = 999,
				miny = 999,
				cw = w,
				ch = h;

			for (var y = 0; y < h; y++) {
				for (var x = 0; x < w; x++) {
					if (str[y * w + x] !== "1") {
						continue;
					}
					cw = w;
					ch = h;
					var cx = x,
						cy = y;
					if (!!flip) {
						cx = cw - 1 - cx;
					}
					for (var r = 0; r < rot; r++) {
						var nx = cy,
							ny = cw - 1 - cx;
						cx = nx;
						cy = ny;
						var t = cw;
						cw = ch;
						ch = t;
					}
					offsets.push({ x: cx, y: cy });
					if (cx < minx) {
						minx = cx;
					}
					if (cy < miny) {
						miny = cy;
					}
				}
			}

			for (var i = 0; i < offsets.length; i++) {
				offsets[i].x -= minx;
				offsets[i].y -= miny;
			}
			return { offsets: offsets, w: cw, h: ch };
		},

		// 指定した位置にピースを置けるか判定する
		isPlaceable: function(cell, offsets, prop) {
			var bd = this.board;
			for (var i = 0; i < offsets.length; i++) {
				var o = offsets[i];
				var c = bd.getc(cell.bx + 2 * o.x, cell.by + 2 * o.y);
				// 形状のすべてのマスは「点」のあるマスでなければならない
				// (点: 1黒点 2空心点 3青点 4青赤点 8赤点 9青空心点 10赤空心点。
				//  起点マス6/7は除く。三角マーク5は点ではないので覆えない)
				if (
					c.isnull ||
					c.ques === 7 ||
					(c.qnum !== 1 &&
						c.qnum !== 2 &&
						c.qnum !== 3 &&
						c.qnum !== 4 &&
						c.qnum !== 6 &&
						c.qnum !== 7 &&
						c.qnum !== 8 &&
						c.qnum !== 9 &&
						c.qnum !== 10) ||
					c[prop] > 0 ||
					// 起点マスはもう一方の色の図形で覆えない
					(c.qnum === 6 && prop !== "qans" && prop !== "qans2") ||
					(c.qnum === 7 && prop !== "anum" && prop !== "anum2")
				) {
					return false;
				}
			}

			// 同じ色の形状は、起点から順番に鎖状に配置する。
			// 最初の形状は起点マスを覆い、以降の形状は
			// 「直前に置いた形状」(最大のIDを持つ形状) の
			// 非三角マスと辺で隣接していなければならない。
			var isBlue = prop === "qans" || prop === "qans2";
			var startMarker = isBlue ? 6 : 7;
			var hasStart = false,
				lastshape = 0;
			for (var y = 0; y < bd.cell.length; y++) {
				var cc = bd.cell[y];
				if (cc.qnum === startMarker) {
					hasStart = true;
				}
				if (cc[prop] > lastshape) {
					lastshape = cc[prop];
				}
			}
			if (!hasStart) {
				return false;
			}

			var coversStart = false,
				adjacent = false;
			var dirs = [
				[2, 0],
				[-2, 0],
				[0, 2],
				[0, -2]
			];
			for (var j = 0; j < offsets.length; j++) {
				var o = offsets[j];
				var c = bd.getc(cell.bx + 2 * o.x, cell.by + 2 * o.y);
				if (c.qnum === startMarker) {
					coversStart = true;
				}
				for (var d = 0; d < dirs.length; d++) {
					var nb = c.relcell(dirs[d][0], dirs[d][1]);
					// 三角格は連結判定に参加しないため、
					// 新形状側・直前の形状側の両方とも非三角格でなければならない
					if (
						!nb.isnull &&
						nb[prop] === lastshape &&
						nb.qnum !== 5 &&
						c.qnum !== 5
					) {
						adjacent = true;
					}
				}
			}

			if (lastshape === 0) {
				return coversStart;
			}
			return adjacent;
		},

		// 次の形状IDを採番する
		getNewShapeId: function(prop) {
			var max = 0;
			var cells = this.board.cell;
			for (var i = 0; i < cells.length; i++) {
				if (cells[i][prop] > max) {
					max = cells[i][prop];
				}
			}
			return max + 1;
		},

		inputpiece: function() {
			var piece = this.getbank();
			if (!piece || piece.index === null) {
				return false;
			}

			this.puzzle.emit("request-aux-editor");

			if (piece.index === null) {
				return false;
			}

			var pos0 = this.cursor.getaddr();
			this.cursor.bankpiece = piece.index;
			pos0.draw();

			var s = Math.max(this.puzzle.board.cols, this.puzzle.board.rows);
			var data = [s, s, piece.serialize()];

			var thiz = this;
			var args = {
				pid: "statuepark-aux",
				key: piece.index,
				url: data.join("/")
			};

			this.puzzle.emit("request-aux-editor", args, function(auxpuzzle) {
				var shape = auxpuzzle.board.getShape();
				if (!shape) {
					thiz.cursor.bankpiece = null;
				}
				thiz.board.bank.setPiece(shape, piece.index);
			});
			return true;
		}
	},

	//---------------------------------------------------------
	// キーボード入力系
	KeyEvent: {
		enablemake: true,
		enableplay: true,

		keyinput: function(ca) {
			if (ca === "r" || ca === "shift+r") {
				this.puzzle.mouse.rotatepiece();
			} else if (ca === "f" || ca === "shift+f") {
				this.puzzle.mouse.flippiece();
			} else {
				this.key_inputqnum(ca);
			}
		}
	},

	//---------------------------------------------------------
	// 盤面管理系
	Board: {
		cols: 8,
		rows: 8,
		hasborder: 2,

		setminmax: function() {
			// ツイン盤面: 右側の盤面 (オフセット 2*cols+2) までカーソルを動かせる
			this.minbx = 0;
			this.minby = 0;
			this.maxbx = 4 * this.cols + 2;
			this.maxby = 2 * this.rows;

			this.puzzle.cursor.setminmax();
		},

		initBoardSize: function(col, row) {
			this.common.initBoardSize.call(this, col, row);

			// バンクは左右2つの盤面分の横幅を確保
			if (this.bank) {
				this.bank.width =
					(2 * this.cols + 1) / this.puzzle.painter.bankratio;
				this.bank.performLayout();
			}
		}
	},

	Bank: {
		enabled: true,
		allowAdd: false,

		// 2つの盤面それぞれに青・赤が1つずつ: [青1, 赤1, 青2, 赤2]
		performLayout: function() {
			if (!this.pieces || !this.width) {
				return;
			}

			// 右盤面のグリッド左端の位置 (バンク座標)。
			// バンクは bankratio 倍の縮尺で描画されるため、
			// 盤面のセル座標 (cols+1) を bankratio で割って換算する。
			// initialize時はまだbankにboardが紐付いていないことがある
			var cols = !!this.board ? this.board.cols : this.puzzle.board.cols;
			var r = this.puzzle.painter.bankratio;
			var off = (cols + 1) / r;
			var x = 0,
				y = 0,
				nexty = 0;
			var len = this.pieces.length;

			for (var i = 0; i < len; i++) {
				var p = this.pieces[i];
				if (i === 2) {
					// 右盤面のバンクは右盤面の直下に揃える
					// (左盤面のバンクと重ならない位置まで後退)
					x = Math.max(off, x + 1);
				}
				p.x = x;
				p.y = y;
				nexty = Math.max(nexty, y + p.h + 1);
				p.index = i;
				x += p.w + 1;
			}

			// 形状の追加操作は行わない
			this.addButton.index = null;

			this.height = nexty;
		},

		defaultPreset: function() {
			return ["22u", "22u", "22u", "22u"];
		},

		presets: [
			{
				name: "preset.square",
				shortkey: "s",
				constant: ["22u", "22u", "22u", "22u"]
			},
			{
				name: "preset.domino",
				shortkey: "d",
				constant: ["12o", "12o", "12o", "12o"]
			},
			{ name: "preset.zero", shortkey: "z", constant: [] }
		]
	},

	Cell: {
		numberAsObject: true,
		disInputHatena: true,
		minnum: 1,
		maxnum: 10,
		// 右側の盤面の回答状態
		qans2: 0,
		anum2: -1,
		propans: ["qans", "anum", "qans2", "anum2"],

		setQans2: function(val) {
			this.setdata("qans2", val);
		},
		setAnum2: function(val) {
			this.setdata("anum2", val);
		}
	},

	// セルの履歴操作で qans2/anum2 を扱えるようにする
	"ObjectOperation:Operation": {
		STRPROP: {
			U: "ques",
			N: "qnum",
			Z: "qnum2",
			C: "qchar",
			M: "anum",
			D: "qdir",
			A: "qans",
			S: "qsub",
			K: "qcmp",
			B: "snum",
			L: "line",
			E: "qans2",
			F: "anum2"
		}
	},

	BankPiece: {
		canon: null,
		compressed: null,

		deserializeRaw: function(str) {
			var tokens = str.split(":");
			this.w = +tokens[0];
			this.str = tokens[1];
			this.h = this.str.length / this.w;
		},

		deserialize: function(str) {
			this.canon = null;
			this.compressed = null;

			if (!str) {
				this.w = this.h = 1;
				this.str = "0";
				return;
			}

			if (str.indexOf(":") !== -1) {
				this.deserializeRaw(str);
				return;
			}

			if (str.length < 3) {
				throw new Error("Invalid piece");
			}

			this.w = parseInt(str[0], 36);
			this.h = parseInt(str[1], 36);
			var len = this.w * this.h;

			var bits = "";
			for (var i = 2; i < str.length; i++) {
				bits += parseInt(str[i], 32)
					.toString(2)
					.padStart(5, "0");
			}

			this.str = bits.substring(0, len).padEnd(len, "0");
		},

		canonize: function() {
			if (this.canon) {
				return this.canon;
			}

			var data = [this.str, "", "", "", "", "", "", ""];

			for (var y = 0; y < this.h; y++) {
				for (var x = 0; x < this.w; x++) {
					data[1] += this.str[(this.h - y - 1) * this.w + x];
				}
			}
			for (var x = 0; x < this.w; x++) {
				for (var y = 0; y < this.h; y++) {
					data[4] += this.str[y * this.w + x];
					data[5] += this.str[(this.h - y - 1) * this.w + x];
				}
			}
			data[2] = data[1]
				.split("")
				.reverse()
				.join("");
			data[3] = data[0]
				.split("")
				.reverse()
				.join("");
			data[6] = data[5]
				.split("")
				.reverse()
				.join("");
			data[7] = data[4]
				.split("")
				.reverse()
				.join("");

			for (var i = 0; i < 8; i++) {
				data[i] = (i < 4 ? this.w : this.h) + ":" + data[i];
			}

			data.sort();
			return (this.canon = data[0]);
		},

		serialize: function() {
			if (this.compressed) {
				return this.compressed;
			}

			var ret = this.w.toString(36) + this.h.toString(36);

			for (var i = 0; i < this.str.length; i += 5) {
				var sub = this.str.substr(i, 5).padEnd(5, "0");
				ret += parseInt(sub, 2).toString(32);
			}

			while (ret.lastIndexOf("0") === ret.length - 1) {
				ret = ret.substring(0, ret.length - 1);
			}

			return (this.compressed = ret);
		}
	},

	//---------------------------------------------------------
	// 画像表示系
	Graphic: {
		BLUECOLOR: "rgb(51, 102, 255)",
		REDCOLOR: "rgb(255, 51, 51)",
		BLUEFILL: "rgba(51, 102, 255, 0.35)",
		REDFILL: "rgba(255, 51, 51, 0.35)",
		BOTHFILL: "rgba(153, 51, 255, 0.45)",
		STARTBLUECOLOR: "rgb(210, 225, 255)",
		STARTREDCOLOR: "rgb(255, 214, 214)",
		INVALIDCOLOR: "rgb(150, 150, 150)",

		getTwinOffset: function() {
			return this.board.cols * 2 + 2;
		},

		paint: function() {
			this.drawBGCells();
			this.drawShapeFills();
			this.drawGrid();
			this.drawShapeEdges();
			this.drawMarkers();
			this.drawPreview();
			this.drawChassis();
			this.drawBank();
			this.drawTarget();
		},

		paintPost: function() {
			// 共通処理 (trialマーカー + 左盤面のソルバー表示)
			this.common.paintPost.call(this);
			// 右盤面のソルバー表示
			this.drawSolverOverlayCells2();
			this.drawSolverOverlayLines2();
		},

		getBGCellColor: function(cell) {
			if (cell.ques === 7) {
				return this.INVALIDCOLOR;
			}
			if (cell.qnum === 6) {
				return this.STARTBLUECOLOR;
			}
			if (cell.qnum === 7) {
				return this.STARTREDCOLOR;
			}
			return null;
		},

		// 盤面背景を左右両方に描く (マーカーは共有のため同じ内容)
		drawBGCells: function() {
			var off = this.getTwinOffset();
			var cells = this.range.cells;

			this.vinc("bg_cells", "crispEdges", true);
			this.drawCells_common("c_bg_", this.getBGCellColor);

			this.vinc("bg_cells2", "crispEdges", true);
			for (var i = 0; i < cells.length; i++) {
				cells[i].bx += off;
			}
			this.drawCells_common("c2_bg_", this.getBGCellColor);
			for (var i = 0; i < cells.length; i++) {
				cells[i].bx -= off;
			}
		},

		getShapeFillColor: function(cell, blueprop, redprop) {
			if (cell.isnull || cell.ques === 7) {
				return null;
			}
			var blue = cell[blueprop] > 0,
				red = cell[redprop] > 0;
			if (blue && red) {
				return this.BOTHFILL;
			}
			if (blue) {
				return this.BLUEFILL;
			}
			if (red) {
				return this.REDFILL;
			}
			return null;
		},

		// 形状の塗りを盤面ごとに描く
		drawShapeFills: function() {
			var off = this.getTwinOffset();
			var cells = this.range.cells;
			var thiz = this;

			this.vinc("cell_shapes", "crispEdges", true);
			this.drawCells_common("c_shape_", function(cell) {
				return thiz.getShapeFillColor(cell, "qans", "anum");
			});

			this.vinc("cell_shapes2", "crispEdges", true);
			for (var i = 0; i < cells.length; i++) {
				cells[i].bx += off;
			}
			this.drawCells_common("c2_shape_", function(cell) {
				return thiz.getShapeFillColor(cell, "qans2", "anum2");
			});
			for (var i = 0; i < cells.length; i++) {
				cells[i].bx -= off;
			}
		},

		// 格子線を左右の盤面それぞれに描く
		drawGrid: function() {
			var g = this.vinc("grid", "crispEdges", true);
			var bd = this.board;
			var off = this.getTwinOffset();

			g.lineWidth = this.gw;
			g.strokeStyle = this.gridcolor;

			for (var i = 0; i <= 2 * bd.cols; i += 2) {
				g.vid = "bdy_" + i;
				g.strokeLine(i * this.bw, 0, i * this.bw, 2 * bd.rows * this.bh);
				g.vid = "bdy2_" + i;
				g.strokeLine(
					(i + off) * this.bw,
					0,
					(i + off) * this.bw,
					2 * bd.rows * this.bh
				);
			}
			for (var j = 0; j <= 2 * bd.rows; j += 2) {
				g.vid = "bdx_" + j;
				g.strokeLine(0, j * this.bh, 2 * bd.cols * this.bw, j * this.bh);
				g.vid = "bdx2_" + j;
				g.strokeLine(
					off * this.bw,
					j * this.bh,
					(off + 2 * bd.cols) * this.bw,
					j * this.bh
				);
			}
		},

		// 形状の外枠を両盤面分描画する
		drawShapeEdges: function() {
			var g = this.vinc("cell_shapeedges", "auto", true);
			var clist = this.range.cells;
			var off = this.getTwinOffset();

			g.lineWidth = Math.max(this.cw * 0.08, 2);
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				if (cell.isnull || cell.ques === 7) {
					continue;
				}

				var top = cell.relcell(0, -2),
					bottom = cell.relcell(0, 2),
					left = cell.relcell(-2, 0),
					right = cell.relcell(2, 0);

				var colors = [this.BLUECOLOR, this.REDCOLOR];
				var propsets = [
					["qans", "anum", 0],
					["qans2", "anum2", off]
				];
				var dirs = ["_t_", "_r_", "_d_", "_l_"];

				for (var bi = 0; bi < 2; bi++) {
					var xshift = propsets[bi][2] * this.bw;
					var px = cell.bx * this.bw + xshift,
						py = cell.by * this.bh;

					for (var ci = 0; ci < 2; ci++) {
						var prop = propsets[bi][ci];
						var id = cell[prop];
						var prefix = "c_se_" + (ci === 0 ? "b" : "r") + (bi + 1);
						var color = colors[ci];
						var has = id > 0;

						var edges = [
							[
								has && (top.isnull || top.ques === 7 || top[prop] !== id),
								px - this.bw,
								py - this.bh,
								px + this.bw,
								py - this.bh
							],
							[
								has &&
									(right.isnull ||
										right.ques === 7 ||
										right[prop] !== id),
								px + this.bw,
								py - this.bh,
								px + this.bw,
								py + this.bh
							],
							[
								has &&
									(bottom.isnull ||
										bottom.ques === 7 ||
										bottom[prop] !== id),
								px - this.bw,
								py + this.bh,
								px + this.bw,
								py + this.bh
							],
							[
								has && (left.isnull || left.ques === 7 || left[prop] !== id),
								px - this.bw,
								py - this.bh,
								px - this.bw,
								py + this.bh
							]
						];

						for (var e = 0; e < edges.length; e++) {
							var edge = edges[e];
							g.vid = prefix + dirs[e] + cell.id;
							if (edge[0]) {
								g.strokeStyle = color;
								g.strokeLine(edge[1], edge[2], edge[3], edge[4]);
							} else {
								g.vhide();
							}
						}
					}
				}
			}
		},

		// マーカーを左右両方の盤面に描く (マーカーは共有)
		drawMarkers: function() {
			this.drawMarkersPass("cell_markers", "c_mark_", 0);
			this.drawMarkersPass("cell_markers2", "c2_mark_", this.getTwinOffset());
		},

		drawMarkersPass: function(layer, prefix, xoff) {
			var g = this.vinc(layer, "auto", true);
			var clist = this.range.cells;
			var rdot = this.cw * 0.12;
			var pxoff = xoff * this.bw;

			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				if (cell.isnull || cell.ques === 7) {
					continue;
				}

				var px = cell.bx * this.bw + pxoff,
					py = cell.by * this.bh;

				// ダブル点は2つの円を描くため、それぞれ別のvidを使う
				g.vid = prefix + "b_" + cell.id;
				g.vhide();
				g.vid = prefix + "r_" + cell.id;
				g.vhide();

				g.vid = prefix + cell.id;
				switch (cell.qnum) {
					case 1: // 黒点
						g.fillStyle = "black";
						g.fillCircle(px, py, rdot);
						break;
					case 2: // 黒空心点
						g.strokeStyle = "black";
						g.lineWidth = Math.max(this.cw * 0.06, 1);
						g.strokeCircle(px, py, rdot);
						break;
					case 3: // 青点
						g.fillStyle = this.BLUECOLOR;
						g.fillCircle(px, py, rdot);
						break;
					case 4: // 青赤ダブル点
						g.vhide();
						g.vid = prefix + "b_" + cell.id;
						g.fillStyle = this.BLUECOLOR;
						g.fillCircle(px - rdot * 0.55, py, rdot * 0.7);
						g.vid = prefix + "r_" + cell.id;
						g.fillStyle = this.REDCOLOR;
						g.fillCircle(px + rdot * 0.55, py, rdot * 0.7);
						break;
					case 8: // 赤点
						g.fillStyle = this.REDCOLOR;
						g.fillCircle(px, py, rdot);
						break;
					case 9: // 青空心点
						g.strokeStyle = this.BLUECOLOR;
						g.lineWidth = Math.max(this.cw * 0.06, 1);
						g.strokeCircle(px, py, rdot);
						break;
					case 10: // 赤空心点
						g.strokeStyle = this.REDCOLOR;
						g.lineWidth = Math.max(this.cw * 0.06, 1);
						g.strokeCircle(px, py, rdot);
						break;
					case 5: // 三角
						g.fillStyle = "black";
						g.setOffsetLinePath(
							px,
							py - this.cw * 0.16,
							-this.cw * 0.16,
							this.cw * 0.28,
							this.cw * 0.32,
							0,
							true
						);
						g.fill();
						break;
					default:
						g.vhide();
						break;
				}
			}
		},

		maxpreviewcount: 0,
		drawPreview: function() {
			var puzzle = this.puzzle;
			var g = this.vinc("cell_preview", "auto");
			var mouse = puzzle.mouse;

			var cell = mouse.previewcell;
			var piece =
				!!cell && !!puzzle.playmode
					? this.board.bank.pieces[mouse.activepiece]
					: null;

			var offsets = !!piece
				? mouse.getShapeOffsets(piece, mouse.orient[mouse.activepiece]).offsets
				: [];
			var prop = mouse.getPieceProp(mouse.activepiece);
			var onright =
				!!mouse.inputPoint && mouse.inputPoint.bx >= this.getTwinOffset();
			var boardok = (mouse.activepiece >= 2) === onright;
			var valid =
				!!piece &&
				!cell.isnull &&
				cell.ques !== 7 &&
				boardok &&
				mouse.isPlaceable(cell, offsets, prop);

			// 右側の盤面を指している場合はプレビューも右側に描く
			var pxoff =
				!!mouse.inputPoint && mouse.inputPoint.bx >= this.getTwinOffset()
					? this.getTwinOffset() * this.bw
					: 0;

			this.maxpreviewcount = Math.max(offsets.length, this.maxpreviewcount);
			for (var i = 0; i < this.maxpreviewcount; i++) {
				g.vid = "c_prev_" + i;
				if (!piece || i >= offsets.length) {
					g.vhide();
					continue;
				}

				var o = offsets[i];
				var c = this.board.getc(cell.bx + 2 * o.x, cell.by + 2 * o.y);
				var color = !!valid
					? mouse.activepiece % 2 === 0
						? this.BLUEFILL
						: this.REDFILL
					: "rgba(255, 255, 0, 0.4)";
				if (!c.isnull) {
					g.fillStyle = color;
					g.fillRect(
						c.bx * this.bw + pxoff - this.bw + 0.5,
						c.by * this.bh - this.bh + 0.5,
						this.cw - 1,
						this.ch - 1
					);
				} else {
					g.vhide();
				}
			}
		},

		// 外枠を左右の盤面それぞれに描く
		drawChassis: function() {
			var g = this.vinc("chassis", "crispEdges", true);
			var bd = this.board;
			var off = this.getTwinOffset();

			var boardWidth = bd.cols * this.cw,
				boardHeight = bd.rows * this.ch;
			var lw = this.lw,
				lm = this.lm;
			g.fillStyle = this.quescolor;

			for (var b = 0; b < 2; b++) {
				var xoff = b * off * this.bw;
				g.vid = "chs1_" + b;
				g.fillRect(xoff - lm, -lm, lw, boardHeight + lw);
				g.vid = "chs2_" + b;
				g.fillRect(xoff + boardWidth - lm, -lm, lw, boardHeight + lw);
				g.vid = "chs3_" + b;
				g.fillRect(xoff - lm, -lm, boardWidth + lw, lw);
				g.vid = "chs4_" + b;
				g.fillRect(xoff - lm, boardHeight - lm, boardWidth + lw, lw);
			}
		},

		// カーソルを描画する (右盤面ホバー時は位置をずらす)
		drawTarget: function() {
			var cursor = this.puzzle.cursor;
			var off = this.getTwinOffset();
			var mp = this.puzzle.mouse.inputPoint;

			if (!!mp && mp.bx >= off && cursor.bx < off) {
				cursor.bx += off;
				this.drawCursor(true, this.puzzle.editmode);
				cursor.bx -= off;
			} else {
				this.drawCursor(true, this.puzzle.editmode);
			}
		},

		//----- 右盤面のソルバー表示 -----

		getSolverOverlayEntries2: function(piece) {
			var state = piece && piece._lostSpeechSolverState2;
			if (!state) {
				return [];
			}
			return state instanceof Array ? state : [state];
		},

		hasAnswerCellState2: function(cell) {
			return (
				!!cell && !cell.isnull && (cell.qans2 !== 0 || cell.anum2 !== -1)
			);
		},

		drawSolverOverlayCells2: function() {
			var off = this.getTwinOffset();
			var g = this.vinc("solver_cell2", "auto", true);
			var clist = this.range.cells;

			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				var entries = this.getSolverOverlayEntries2(cell);
				var visible =
					entries.length > 0 && !this.hasAnswerCellState2(cell)
						? Math.min(entries.length, this.solverCellOverlaySlots)
						: 0;
				var j = 0;

				for (; j < visible; j++) {
					g.vid = "c2_solver_" + cell.id + "_" + j;
					// 右盤面の位置に描画するため一時的に座標をずらす
					var origbx = cell.bx;
					cell.bx += off;
					if (!this.drawSolverOverlayCellEntry(g, cell, entries[j])) {
						g.vhide();
					}
					cell.bx = origbx;
				}
				for (; j < this.solverCellOverlaySlots; j++) {
					g.vid = "c2_solver_" + cell.id + "_" + j;
					g.vhide();
				}
			}
		},

		drawSolverOverlayLines2: function() {
			var off = this.getTwinOffset();
			var g = this.vinc("solver_line2", "crispEdges");
			var blist = this.range.borders;
			var lm = Math.max(this.lm * 0.72, 1);

			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];
				var entries = this.getSolverOverlayEntries2(border);
				var entry = entries.length > 0 ? entries[0] : null;
				g.vid = "b2_solver_line_" + border.id;
				if (entry) {
					var px = (border.bx + off) * this.bw;
					var py = border.by * this.bh;
					var kind = this.getSolverOverlayBorderKind(entry);
					var isvert = border.isVert();
					g.fillStyle = this.getSolverOverlayEntryColor(
						entry,
						this.solverLineColor
					);
					if (kind === "doubleLine" && isvert) {
						var offset = Math.max(lm * 0.8, 2);
						g.fillRectCenter(px - offset, py, lm * 0.7, this.bh + lm);
						g.vid = "b2_solver_line2_" + border.id;
						g.fillRectCenter(px + offset, py, lm * 0.7, this.bh + lm);
					} else if (kind === "doubleLine") {
						var offset2 = Math.max(lm * 0.8, 2);
						g.fillRectCenter(px, py - offset2, this.bw + lm, lm * 0.7);
						g.vid = "b2_solver_line2_" + border.id;
						g.fillRectCenter(px, py + offset2, this.bw + lm, lm * 0.7);
					} else if (isvert) {
						g.fillRectCenter(px, py, lm, this.bh + lm);
						g.vid = "b2_solver_line2_" + border.id;
						g.vhide();
					} else {
						g.fillRectCenter(px, py, this.bw + lm, lm);
						g.vid = "b2_solver_line2_" + border.id;
						g.vhide();
					}
				} else {
					g.vhide();
					g.vid = "b2_solver_line2_" + border.id;
					g.vhide();
				}
			}
		},

		maxpiececount: 0,
		drawBankPiece: function(g, piece, idx) {
			var r = this.bankratio;
			var offsets = [],
				shapew = 1,
				shapeh = 1;

			if (!!piece) {
				// 現在の向き(回転・反転)を反映して表示する
				var orient = this.puzzle.mouse.orient[idx] || 0;
				var shape = this.puzzle.mouse.getShapeOffsets(piece, orient);
				offsets = shape.offsets;
				shapew = shape.w;
				shapeh = shape.h;
			}

			this.maxpiececount = Math.max(
				piece ? piece.str.length : 0,
				this.maxpiececount
			);
			// 回転後の図形をバンクのスロット中央に配置する
			var sx = piece ? (piece.w - shapew) / 2 : 0;
			var sy = piece ? (piece.h - shapeh) / 2 : 0;

			// 選択中のピース以外は半透明にして、選択状態をわかりやすくする
			var isActive =
				!this.puzzle.playmode || this.puzzle.mouse.activepiece === idx;
			var baseColor = idx % 2 === 0 ? this.BLUECOLOR : this.REDCOLOR;
			var dimColor =
				idx % 2 === 0 ? "rgba(51, 102, 255, 0.3)" : "rgba(255, 51, 51, 0.3)";

			for (var i = 0; i < this.maxpiececount; i++) {
				g.vid = "pb_piece_" + idx + "_" + i;
				if (!!piece && i < offsets.length) {
					var x = offsets[i].x,
						y = offsets[i].y;
					var px = this.cw * r * (piece.x + 0.25 + sx + x) + 1;
					var py = this.ch * r * (piece.y + 0.25 + sy + y) + 1;
					py += (this.board.rows + this.bankVerticalOffset) * this.ch;

					g.fillStyle = !!isActive ? baseColor : dimColor;
					g.fillRect(px + 1, py + 1, this.cw * r - 2, this.ch * r - 2);
				} else {
					g.vhide();
				}
			}

			// 選択中のピースの下に色付きのマーカーを表示する
			g.vid = "pb_active_mark_" + idx;
			if (!!piece && !!isActive && this.puzzle.playmode) {
				var mx = this.cw * r * (piece.x + 0.25 + piece.w / 2);
				var my =
					this.ch * r * (piece.y + piece.h + 0.6) +
					(this.board.rows + this.bankVerticalOffset) * this.ch;
				g.fillStyle = baseColor;
				g.setOffsetLinePath(
					mx,
					my,
					-this.cw * r * 0.45,
					0,
					this.cw * r * 0.9,
					0,
					this.cw * r * 0.45,
					this.cw * r * 0.45,
					true
				);
				g.fill();
			} else {
				g.vhide();
			}
		}
	},

	//---------------------------------------------------------
	// URLエンコード/デコード処理
	Encode: {
		decodePzpr: function(type) {
			if (this.outbstr[0] !== "/") {
				this.decodeNumber16();
			}
			if (this.outbstr[0] !== "/") {
				this.decodeBinary("ques", 7);
			}
			this.decodePieceBank();
		},
		encodePzpr: function(type) {
			this.encodeNumber16();
			this.encodeBinary("ques", 7);
			this.encodePieceBank();
		}
	},

	//---------------------------------------------------------
	// ファイル入出力処理
	FileIO: {
		decodeData: function() {
			this.decodePieceBank();
			this.decodeCell(function(cell, ca) {
				if (ca === "x") {
					cell.ques = 7;
				} else if (ca !== ".") {
					cell.qnum = +ca;
				}
			});
			// 盤面1の回答 (qans/anum)
			this.decodeCell(function(cell, ca) {
				if (!ca || ca === ".") {
					return;
				}
				var m = ca.match(/^b(\d+)(r(\d+))?$/);
				if (m) {
					cell.qans = +m[1];
					if (m[3] !== void 0) {
						cell.anum = +m[3];
					}
				} else {
					var m2 = ca.match(/^r(\d+)$/);
					if (m2) {
						cell.anum = +m2[1];
					}
				}
			});
			// 盤面2の回答 (qans2/anum2)
			this.decodeCell(function(cell, ca) {
				if (!ca || ca === ".") {
					return;
				}
				var m = ca.match(/^b(\d+)(r(\d+))?$/);
				if (m) {
					cell.qans2 = +m[1];
					if (m[3] !== void 0) {
						cell.anum2 = +m[3];
					}
				} else {
					var m2 = ca.match(/^r(\d+)$/);
					if (m2) {
						cell.anum2 = +m2[1];
					}
				}
			});
		},
		encodeData: function() {
			this.encodePieceBank();
			this.encodeCell(function(cell) {
				if (cell.ques === 7) {
					return "x ";
				}
				if (cell.qnum !== -1) {
					return cell.qnum + " ";
				}
				return ". ";
			});
			this.encodeCell(function(cell) {
				var ca = "";
				if (cell.qans > 0) {
					ca += "b" + cell.qans;
				}
				if (cell.anum > 0) {
					ca += "r" + cell.anum;
				}
				return !!ca ? ca + " " : ". ";
			});
			this.encodeCell(function(cell) {
				var ca = "";
				if (cell.qans2 > 0) {
					ca += "b" + cell.qans2;
				}
				if (cell.anum2 > 0) {
					ca += "r" + cell.anum2;
				}
				return !!ca ? ca + " " : ". ";
			});
		}
	},

	//---------------------------------------------------------
	// 正解判定処理実行部
	AnsCheck: {
		checklist: [
			"checkMarkers",
			"checkNoDotNe",
			"checkStarts",
			"checkShapesMatchBank",
			"checkConnectivity",
			"checkNoContainment"
		],

		// 指定したプロパティ(qans/anum/qans2/anum2)の形状IDごとのセル一覧を返す
		getShapeMap: function(prop) {
			var map = {};
			var bd = this.board;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				var id = cell[prop];
				if (id > 0) {
					if (!map[id]) {
						map[id] = new this.klass.CellList();
					}
					map[id].add(cell);
				}
			}
			return map;
		},

		checkMarkers: function() {
			this.checkAllCell(function(cell) {
				var blue = cell.qans > 0 ? 1 : 0,
					red = cell.anum > 0 ? 1 : 0;
				var total = blue + red;
				switch (cell.qnum) {
					case 1:
						return total !== 1;
					case 2:
						return total > 1;
					case 3:
						// 青点: ちょうど1つの青の図形 (赤なし)
						return blue !== 1 || red > 0;
					case 4:
						return blue !== 1 || red !== 1;
					case 8:
						// 赤点: ちょうど1つの赤の図形 (青なし)
						return red !== 1 || blue > 0;
					case 9:
						// 青空心点: 高々1つの図形 (青のみ)
						return total > 1 || red > 0;
					case 10:
						// 赤空心点: 高々1つの図形 (赤のみ)
						return total > 1 || blue > 0;
				}
				return false;
			}, "nmDotNe");

			if (this.checkOnly && this.failcode.length > 0) {
				return;
			}

			this.checkAllCell(function(cell) {
				var blue = cell.qans2 > 0 ? 1 : 0,
					red = cell.anum2 > 0 ? 1 : 0;
				var total = blue + red;
				switch (cell.qnum) {
					case 1:
						return total !== 1;
					case 2:
						return total > 1;
					case 3:
						// 青点: ちょうど1つの青の図形 (赤なし)
						return blue !== 1 || red > 0;
					case 4:
						return blue !== 1 || red !== 1;
					case 8:
						// 赤点: ちょうど1つの赤の図形 (青なし)
						return red !== 1 || blue > 0;
					case 9:
						// 青空心点: 高々1つの図形 (青のみ)
						return total > 1 || red > 0;
					case 10:
						// 赤空心点: 高々1つの図形 (赤のみ)
						return total > 1 || blue > 0;
				}
				return false;
			}, "nmDotNe");
		},

		checkNoDotNe: function() {
			this.checkAllCell(function(cell) {
				var covered =
					cell.qans > 0 || cell.anum > 0 || cell.qans2 > 0 || cell.anum2 > 0;
				// 点のないマス (無印・三角マーク) を図形が覆ってはいけない
				return covered && (cell.qnum < 1 || cell.qnum === 5);
			}, "nmNoDotNe");
		},

		checkStarts: function() {
			var bd = this.board;
			var blueStarts = 0,
				redStarts = 0,
				hasRed = false;

			for (var i = 0; i < bd.cell.length; i++) {
				if (bd.cell[i].qnum === 6) {
					blueStarts++;
				} else if (bd.cell[i].qnum === 7) {
					redStarts++;
				}
				if (bd.cell[i].anum > 0 || bd.cell[i].anum2 > 0) {
					hasRed = true;
				}
			}

			// 青起点はちょうど1つ。赤起点は任意で、
			// 赤起点が無い場合は赤の図形を置かない
			if (blueStarts !== 1 || redStarts > 1 || (redStarts === 0 && hasRed)) {
				this.failcode.add("nmStartNe");
				if (this.checkOnly) {
					return;
				}
				bd.cell.seterr(1);
				return;
			}

			// 各起点マスは両方の盤面で自分の色の図形に覆われている
			this.checkAllCell(function(cell) {
				if (cell.qnum === 6) {
					return cell.qans <= 0 || cell.qans2 <= 0;
				}
				if (cell.qnum === 7) {
					return cell.anum <= 0 || cell.anum2 <= 0;
				}
				return false;
			}, "nmStartNe");

			// 起点マスはもう一方の色の図形に覆われてはいけない
			this.checkAllCell(function(cell) {
				if (cell.qnum === 6) {
					// 青起点に赤の図形は置けない
					return cell.anum > 0 || cell.anum2 > 0;
				}
				if (cell.qnum === 7) {
					// 赤起点に青の図形は置けない
					return cell.qans > 0 || cell.qans2 > 0;
				}
				return false;
			}, "nmStartCross");
		},

		checkShapesMatchBank: function() {
			var bank = this.board.bank;
			var boards = [
				{ blue: "qans", red: "anum", bluepiece: 0, redpiece: 1 },
				{ blue: "qans2", red: "anum2", bluepiece: 2, redpiece: 3 }
			];

			for (var b = 0; b < 2; b++) {
				if (!this.checkBoardShapesMatchBank(boards[b], bank)) {
					if (this.checkOnly) {
						return;
					}
				}
			}
		},

		checkBoardShapesMatchBank: function(board, bank) {
			var maps = [this.getShapeMap(board.blue), this.getShapeMap(board.red)];
			var pieces = [board.bluepiece, board.redpiece];
			var ok = true;

			for (var color = 0; color < 2; color++) {
				for (var id in maps[color]) {
					var clist = maps[color][id];
					var canon = clist.getBlockShapes().canon;

					var piece = bank.pieces[pieces[color]];
					if (!!piece && piece.canonize() === canon) {
						continue;
					}

					this.failcode.add("bankInvalid");
					ok = false;
					if (this.checkOnly) {
						return false;
					}
					clist.seterr(1);
				}
			}
			return ok;
		},

		checkConnectivity: function() {
			this.checkColorConnectivity("qans");
			if (this.checkOnly && this.failcode.length > 0) {
				return;
			}
			this.checkColorConnectivity("anum");
			if (this.checkOnly && this.failcode.length > 0) {
				return;
			}
			this.checkColorConnectivity("qans2");
			if (this.checkOnly && this.failcode.length > 0) {
				return;
			}
			this.checkColorConnectivity("anum2");
		},

		checkColorConnectivity: function(prop) {
			var bd = this.board;
			var map = this.getShapeMap(prop);
			var ids = Object.keys(map);
			if (ids.length <= 1) {
				return;
			}

			// 形状間の隣接グラフを作る (両側とも非三角マスで隣接している場合のみ)
			var adj = {};
			for (var i = 0; i < ids.length; i++) {
				adj[ids[i]] = {};
			}
			var dirs = [
				[2, 0],
				[-2, 0],
				[0, 2],
				[0, -2]
			];
			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c];
				if (cell[prop] <= 0 || cell.qnum === 5 || cell.ques === 7) {
					continue;
				}
				for (var d = 0; d < dirs.length; d++) {
					var nb = cell.relcell(dirs[d][0], dirs[d][1]);
					if (
						!nb.isnull &&
						nb[prop] > 0 &&
						nb[prop] !== cell[prop] &&
						nb.qnum !== 5
					) {
						adj[cell[prop]][nb[prop]] = true;
					}
				}
			}

			// 「次の形状は直前の形状の隣にしか置けない」ため、
			// 起点マスを覆う形状から出発して全形状を一筆書きで
			// 訪れる順序(ハミルトン路)が存在しなければならない
			var startMarker = prop === "qans" || prop === "qans2" ? 6 : 7;
			var startId = null;
			for (var s = 0; s < bd.cell.length; s++) {
				if (bd.cell[s].qnum === startMarker && bd.cell[s][prop] > 0) {
					startId = bd.cell[s][prop];
					break;
				}
			}
			if (startId === null) {
				return; // 起点が無い場合は checkStarts が担当
			}

			var visited = {};
			visited[startId] = true;
			var ok = false;

			// 現在地から到達できない未訪問の形状で、未訪問の隣接形状が
			// 無いものがあれば、これ以上進めない (枝刈り)
			var canContinue = function(cur) {
				for (var u = 0; u < ids.length; u++) {
					var id = ids[u];
					if (visited[id] || adj[cur][id]) {
						continue;
					}
					var hasUnvisitedNb = false;
					for (var nb in adj[id]) {
						if (!visited[nb]) {
							hasUnvisitedNb = true;
							break;
						}
					}
					if (!hasUnvisitedNb) {
						return false;
					}
				}
				return true;
			};

			var dfs = function(cur, count) {
				if (count === ids.length) {
					ok = true;
					return;
				}
				if (!canContinue(cur)) {
					return;
				}
				var nbs = adj[cur];
				for (var nb in nbs) {
					if (!visited[nb]) {
						visited[nb] = true;
						dfs(nb, count + 1);
						visited[nb] = false;
						if (ok) {
							return;
						}
					}
				}
			};
			dfs(startId, 1);

			if (!ok) {
				this.failcode.add("csNoConn");
				if (this.checkOnly) {
					return;
				}
				for (var j = 0; j < ids.length; j++) {
					map[ids[j]].seterr(1);
				}
			}
		},

		checkNoContainment: function() {
			var maps = {
				blue1: this.getShapeMap("qans"),
				red1: this.getShapeMap("anum"),
				blue2: this.getShapeMap("qans2"),
				red2: this.getShapeMap("anum2")
			};
			var props = {
				blue1: "qans",
				red1: "anum",
				blue2: "qans2",
				red2: "anum2"
			};
			// 同じ盤面内の青と赤は互いに完全に含まれてもよい。
			// 「this puzzle uses variant rule」が有効な場合のみ、
			// 左右の盤面をまたぐ4組の包含を禁止する
			var pairs = [];
			if (this.puzzle.getConfig("variant")) {
				pairs.push(
					["blue1", "blue2", "csCrossContained"],
					["blue1", "red2", "csCrossContained"],
					["red1", "blue2", "csCrossContained"],
					["red1", "red2", "csCrossContained"]
				);
			}

			for (var p = 0; p < pairs.length; p++) {
				var nameA = pairs[p][0],
					nameB = pairs[p][1],
					code = pairs[p][2];
				var mapA = maps[nameA],
					mapB = maps[nameB];
				var propA = props[nameA],
					propB = props[nameB];

				for (var a in mapA) {
					var cellsA = mapA[a];
					for (var b in mapB) {
						var cellsB = mapB[b];

						var containedAinB = true;
						for (var i = 0; i < cellsA.length; i++) {
							if (cellsA[i][propB] !== +b) {
								containedAinB = false;
								break;
							}
						}
						var containedBinA = true;
						for (var j = 0; j < cellsB.length; j++) {
							if (cellsB[j][propA] !== +a) {
								containedBinA = false;
								break;
							}
						}

						if (containedAinB || containedBinA) {
							this.failcode.add(code);
							if (this.checkOnly) {
								return;
							}
							cellsA.seterr(1);
							cellsB.seterr(1);
						}
					}
				}
			}
		}
	}
});
