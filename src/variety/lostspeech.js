//
// lostspeech.js
// Lost Speech
//
// Place the shape assigned to each start cell (blue or red) repeatedly from
// that start cell. Every newly placed shape must be edge-adjacent to the
// previously placed shape of the same color, but connections through
// triangle-marked cells do not count. Dots constrain how many shapes cover
// each cell:
//   black dot      : exactly one shape
//   hollow dot     : at most one shape
//   blue dot       : exactly one blue shape (no red)
//   blue-red dot   : exactly one blue and one red shape
// Shapes of the same color never overlap; shapes of different colors may
// overlap anywhere, but no shape may be completely contained in a shape of
// the other color.
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
				"dot-double",
				"dot-red",
				"triangle",
				"start-blue",
				"start-red",
				"empty",
				"clear"
			],
			play: ["shade", "unshade", "clear"]
		},

		// 選択中のbankピース(偶数:青 奇数:赤)
		activepiece: 0,

		// 選択中のピースの色に応じたプロパティ(qans:青 anum:赤)を返す
		getPieceProp: function(index) {
			return index % 2 === 0 ? "qans" : "anum";
		},
		// ピースごとの向き(0-7: 0-3は回転, 4-7は反転+回転)
		orient: [0, 0, 0, 0],
		// プレビュー中のセル
		previewcell: null,

		// ボタンを押していないマウス移動でもプレビューを更新する
		e_mousemove: function(e) {
			this.common.e_mousemove.call(this, e);

			if (!this.btn) {
				var addr = this.getBoardAddress(e);
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
					} else if (!this.inputbankadd()) {
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
				"dot-double": 4,
				"dot-red": 8,
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
				cell.draw();
			} else {
				var blue = cell.qans > 0,
					red = cell.anum > 0;
				if (!!blue) {
					this.removeShape("qans", blue);
				}
				if (!!red) {
					this.removeShape("anum", red);
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

			var shape = this.getShapeOffsets(piece, this.orient[this.activepiece]);
			var prop = this.getPieceProp(this.activepiece);
			var cells = [];
			var bd = this.board;

			for (var i = 0; i < shape.offsets.length; i++) {
				var o = shape.offsets[i];
				var c = bd.getc(cell.bx + 2 * o.x, cell.by + 2 * o.y);
				if (c.isnull || c.ques === 7 || c.qnum < 1 || c[prop] > 0) {
					return;
				}
				cells.push(c);
			}

			var id = this.getNewShapeId(prop);
			for (var j = 0; j < cells.length; j++) {
				if (prop === "qans") {
					cells[j].setQans(id);
				} else {
					cells[j].setAnum(id);
				}
			}
			var clist = new this.klass.CellList(cells);
			clist.draw();
			this.mouseCell = cell;
		},

		// クリックしたセルを含む形状(選択中の色優先)を削除する
		inputremove: function() {
			var cell = this.getcell();
			if (cell.isnull || cell.ques === 7 || cell === this.mouseCell) {
				return;
			}

			var prop = this.getPieceProp(this.activepiece);
			var id = cell[prop];
			if (!id) {
				prop = prop === "qans" ? "anum" : "qans";
				id = cell[prop];
			}
			if (!id) {
				return;
			}

			this.removeShape(prop, id);
			this.mouseCell = cell;
		},

		removeShape: function(prop, id) {
			var bd = this.board;
			var clist = new this.klass.CellList();
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				if (cell[prop] !== id) {
					continue;
				}
				if (prop === "qans") {
					cell.setQans(0);
				} else {
					// anumはminnum>0のため0が設定できないので-1(空)に戻す
					cell.setAnum(-1);
				}
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
				if (c.isnull || c.ques === 7 || c.qnum < 1 || c[prop] > 0) {
					return false;
				}
			}
			return true;
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

		// ピース追加ボタンのクリックを処理する
		inputbankadd: function() {
			var bank = this.board.bank;
			var r = this.puzzle.painter.bankratio;
			var bx = this.inputPoint.bx / (r * 2);
			var by = (this.inputPoint.by - (this.board.maxby + 1)) / (r * 2);
			var btn = bank.addButton;

			if (
				bx >= btn.x - 0.25 &&
				by >= btn.y - 0.25 &&
				bx < btn.x + btn.w + 0.75 &&
				by < btn.y + btn.h + 0.75
			) {
				var piece = new this.klass.BankPiece();
				piece.deserialize("22u");
				bank.setPiece(piece, bank.pieces.length);
				return true;
			}
			return false;
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
		rows: 8
	},

	Bank: {
		enabled: true,
		allowAdd: function() {
			return this.pieces.length < 4;
		},

		defaultPreset: function() {
			return ["22u"];
		},

		presets: [
			{ name: "preset.square", shortkey: "s", constant: ["22u"] },
			{ name: "preset.domino", shortkey: "d", constant: ["12o"] },
			{ name: "preset.two_dominoes", shortkey: "w", constant: ["12o", "12o"] },
			{ name: "preset.two_squares", shortkey: "q", constant: ["22u", "22u"] },
			{ name: "preset.zero", shortkey: "z", constant: [] }
		]
	},

	Cell: {
		numberAsObject: true,
		disInputHatena: true,
		minnum: 1,
		maxnum: 8
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

		getShapeFillColor: function(cell) {
			if (cell.isnull || cell.ques === 7) {
				return null;
			}
			var blue = cell.qans > 0,
				red = cell.anum > 0;
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

		drawShapeFills: function() {
			this.vinc("cell_shapes", "crispEdges", true);
			this.drawCells_common("c_shape_", this.getShapeFillColor);
		},

		drawShapeEdges: function() {
			var g = this.vinc("cell_shapeedges", "auto", true);
			var clist = this.range.cells;

			g.lineWidth = Math.max(this.cw * 0.08, 2);
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				if (cell.isnull || cell.ques === 7) {
					continue;
				}

				var px = cell.bx * this.bw,
					py = cell.by * this.bh;
				var top = cell.relcell(0, -2),
					bottom = cell.relcell(0, 2),
					left = cell.relcell(-2, 0),
					right = cell.relcell(2, 0);

				// 形状の外枠を全周(上下左右)描画する
				var colors = [this.BLUECOLOR, this.REDCOLOR];
				var props = ["qans", "anum"];
				var names = ["c_se_b_", "c_se_r_"];
				var dirs = ["_t_", "_r_", "_d_", "_l_"];

				for (var ci = 0; ci < 2; ci++) {
					var prop = props[ci];
					var id = cell[prop];
					var prefix = names[ci];
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
							has && (right.isnull || right.ques === 7 || right[prop] !== id),
							px + this.bw,
							py - this.bh,
							px + this.bw,
							py + this.bh
						],
						[
							has &&
								(bottom.isnull || bottom.ques === 7 || bottom[prop] !== id),
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
		},

		drawMarkers: function() {
			var g = this.vinc("cell_markers", "auto", true);
			var clist = this.range.cells;
			var rdot = this.cw * 0.12;

			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				if (cell.isnull || cell.ques === 7) {
					continue;
				}

				var px = cell.bx * this.bw,
					py = cell.by * this.bh;

				// ダブル点は2つの円を描くため、それぞれ別のvidを使う
				g.vid = "c_mark_b_" + cell.id;
				g.vhide();
				g.vid = "c_mark_r_" + cell.id;
				g.vhide();

				g.vid = "c_mark_" + cell.id;
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
						g.vid = "c_mark_b_" + cell.id;
						g.fillStyle = this.BLUECOLOR;
						g.fillCircle(px - rdot * 0.55, py, rdot * 0.7);
						g.vid = "c_mark_r_" + cell.id;
						g.fillStyle = this.REDCOLOR;
						g.fillCircle(px + rdot * 0.55, py, rdot * 0.7);
						break;
					case 8: // 赤点
						g.fillStyle = this.REDCOLOR;
						g.fillCircle(px, py, rdot);
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
			var valid =
				!!piece &&
				!cell.isnull &&
				cell.ques !== 7 &&
				mouse.isPlaceable(cell, offsets, prop);

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
						c.bx * this.bw - this.bw + 0.5,
						c.by * this.bh - this.bh + 0.5,
						this.cw - 1,
						this.ch - 1
					);
				} else {
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

		// 指定したプロパティ(qans/anum)の形状IDごとのセル一覧を返す
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
						return blue !== 1 || red > 0;
					case 4:
						return blue !== 1 || red !== 1;
					case 8:
						return red !== 1 || blue > 0;
				}
				return false;
			}, "nmDotNe");
		},

		checkNoDotNe: function() {
			this.checkAllCell(function(cell) {
				var covered = cell.qans > 0 || cell.anum > 0;
				return covered && cell.qnum < 1;
			}, "nmNoDotNe");
		},

		checkStarts: function() {
			var bd = this.board;
			var blueStarts = 0,
				redStarts = 0,
				hasRed = false;

			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				if (cell.qnum === 6) {
					blueStarts++;
				} else if (cell.qnum === 7) {
					redStarts++;
				}
				if (cell.anum > 0) {
					hasRed = true;
				}
			}

			// 起点は青がちょうど1つ、赤はあっても1つ
			// 起点のない色の図形は置けない
			if (blueStarts !== 1 || redStarts > 1 || (redStarts === 0 && hasRed)) {
				this.failcode.add("nmStartNe");
				if (this.checkOnly) {
					return;
				}
				bd.cell.seterr(1);
				return;
			}

			// 各起点マスは自分の色の図形に覆われている
			this.checkAllCell(function(cell) {
				if (cell.qnum === 6) {
					return cell.qans <= 0;
				}
				if (cell.qnum === 7) {
					return cell.anum <= 0;
				}
				return false;
			}, "nmStartNe");
		},

		checkShapesMatchBank: function() {
			var bank = this.board.bank;
			var maps = [this.getShapeMap("qans"), this.getShapeMap("anum")];

			for (var color = 0; color < 2; color++) {
				for (var id in maps[color]) {
					var clist = maps[color][id];
					var canon = clist.getBlockShapes().canon;

					var matched = false;
					for (var b = 0; b < bank.pieces.length; b++) {
						if (b % 2 === color && bank.pieces[b].canonize() === canon) {
							matched = true;
							break;
						}
					}
					if (matched) {
						continue;
					}

					this.failcode.add("bankInvalid");
					if (this.checkOnly) {
						return;
					}
					clist.seterr(1);
				}
			}
		},

		checkConnectivity: function() {
			this.checkColorConnectivity("qans");
			if (this.checkOnly && this.failcode.length > 0) {
				return;
			}
			this.checkColorConnectivity("anum");
		},

		checkColorConnectivity: function(prop) {
			var bd = this.board;
			var map = this.getShapeMap(prop);
			var ids = Object.keys(map);
			if (ids.length <= 1) {
				return;
			}

			var parent = {};
			for (var i = 0; i < ids.length; i++) {
				parent[ids[i]] = ids[i];
			}
			var find = function(x) {
				while (parent[x] !== x) {
					parent[x] = parent[parent[x]];
					x = parent[x];
				}
				return x;
			};
			var union = function(a, b) {
				var ra = find(a),
					rb = find(b);
				if (ra !== rb) {
					parent[ra] = rb;
				}
			};

			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c];
				if (cell[prop] <= 0 || cell.qnum === 5 || cell.ques === 7) {
					continue;
				}

				var right = cell.relcell(2, 0);
				if (
					!right.isnull &&
					right[prop] > 0 &&
					right[prop] !== cell[prop] &&
					right.qnum !== 5
				) {
					union(cell[prop], right[prop]);
				}
				var bottom = cell.relcell(0, 2);
				if (
					!bottom.isnull &&
					bottom[prop] > 0 &&
					bottom[prop] !== cell[prop] &&
					bottom.qnum !== 5
				) {
					union(cell[prop], bottom[prop]);
				}
			}

			var root = find(ids[0]);
			for (var j = 0; j < ids.length; j++) {
				if (find(ids[j]) === root) {
					continue;
				}

				this.failcode.add("csNoConn");
				if (this.checkOnly) {
					return;
				}
				map[ids[j]].seterr(1);
			}
		},

		checkNoContainment: function() {
			var mapBlue = this.getShapeMap("qans"),
				mapRed = this.getShapeMap("anum");

			for (var b in mapBlue) {
				var blueCells = mapBlue[b];
				for (var r in mapRed) {
					var redCells = mapRed[r];

					var containedInRed = true;
					for (var i = 0; i < blueCells.length; i++) {
						if (blueCells[i].anum !== +r) {
							containedInRed = false;
							break;
						}
					}
					var containedInBlue = true;
					for (var j = 0; j < redCells.length; j++) {
						if (redCells[j].qans !== +b) {
							containedInBlue = false;
							break;
						}
					}

					if (containedInRed || containedInBlue) {
						this.failcode.add("csContained");
						if (this.checkOnly) {
							return;
						}
						blueCells.seterr(1);
						redCells.seterr(1);
					}
				}
			}
		}
	}
});
