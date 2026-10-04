//
// パズル固有スクリプト部 コンビブロック版 cbblock.js
//

/* global Set:false */

(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["cbblock", "dbchoco", "tridbchoco", "nikoji", "mirrorbk"], {
	//---------------------------------------------------------
	// マウス入力系
	"MouseEvent@cbblock": {
		inputModes: { edit: ["border"], play: ["border", "subline"] },
		mouseinput_auto: function() {
			if (this.puzzle.playmode) {
				if (this.mousestart || this.mousemove) {
					if (this.btn === "left" && this.isBorderMode()) {
						this.inputborder();
					} else {
						this.inputQsubLine();
					}
				}
			} else if (this.puzzle.editmode) {
				if (this.mousestart || this.mousemove) {
					this.inputborder();
				}
			}
		}
	},
	"MouseEvent@dbchoco,tridbchoco": {
		inputModes: {
			edit: ["shade", "number", "clear"],
			play: ["border", "subline"]
		},
		mouseinput_auto: function() {
			if (this.puzzle.playmode) {
				if (this.mousestart || this.mousemove) {
					if (this.btn === "left" && this.isBorderMode()) {
						this.inputborder();
					} else {
						this.inputQsubLine();
					}
				}
			} else if (this.puzzle.editmode) {
				var cell = this.getcell();
				if (cell.isnull) {
					return;
				}

				if (
					this.mousestart &&
					(this.btn !== "right" || cell === this.cursor.getc())
				) {
					this.inputData = -1;
				}

				if (
					(this.mousestart &&
						cell !== this.cursor.getc() &&
						this.btn === "right") ||
					(this.mousemove && this.inputData >= 0)
				) {
					this.inputShade();
				} else if (this.mouseend && this.notInputted()) {
					if (
						cell !== this.cursor.getc() &&
						this.inputMode === "auto" &&
						this.btn === "left"
					) {
						this.setcursor(cell);
					} else {
						this.inputqnum(cell);
					}
				}
			}
		},
		inputShade: function() {
			this.inputIcebarn();
		}
	},

	"MouseEvent@nikoji": {
		inputModes: {
			edit: ["number", "clear"],
			play: ["border", "subline"]
		},

		autoedit_func: "qnum",
		autoplay_func: "border"
	},

	"MouseEvent@mirrorbk": {
		inputModes: {
			edit: ["number", "border"],
			play: ["border", "subline"]
		},
		autoedit_func: "areanum",
		autoplay_func: "border"
	},

	"KeyEvent@dbchoco,tridbchoco": {
		enablemake: true,

		keyinput: function(ca) {
			if (ca === "q") {
				var cell = this.cursor.getc();
				cell.setQues(cell.ques !== 6 ? 6 : 0);
				this.prev = cell;
				cell.draw();
			} else {
				this.key_inputqnum(ca);
			}
		}
	},

	"KeyEvent@tridbchoco": {
		keyinput: function(ca) {
			var cell = this.cursor.getc();
			if (cell.isnull || !cell.isTriInBoard()) {
				return;
			}
			if (ca === "q") {
				cell.setQues(cell.ques !== 6 ? 6 : 0);
				this.prev = cell;
				cell.draw();
			} else {
				this.key_inputqnum(ca);
			}
		}
	},

	"KeyEvent@nikoji,mirrorbk": {
		enablemake: true
	},

	//---------------------------------------------------------
	// 盤面管理系
	"Border@cbblock#1": {
		ques: 1
	},
	"Border@cbblock,mirrorbk": {
		enableLineNG: true,

		// 線を引かせたくないので上書き
		isLineNG: function() {
			return this.ques === 1;
		},

		isGround: function() {
			return this.ques > 0;
		}
	},

	Board: {
		cols: 8,
		rows: 8,

		hascross: 1,
		hasborder: 1,

		addExtraInfo: function() {
			this.tilegraph = this.addInfoList(this.klass.AreaTileGraph);
			this.blockgraph = this.addInfoList(this.klass.AreaBlockGraph);
		}
	},

	"Board@nikoji": {
		recountNumbers: function() {
			var set = new Set();
			this.cell.each(function(cell) {
				if (cell.qnum >= 0) {
					set.add(cell.qnum);
				}
			});
			this.nums = Array.from(set);
		},

		addExtraInfo: function() {}
	},

	"Board@mirrorbk": {
		addExtraInfo: function() {}
	},

	"Board@dbchoco": {
		cols: 10,
		rows: 10
	},

	"Cell@dbchoco,tridbchoco": {
		maxnum: function() {
			var bd = this.board;
			return (bd.cols * bd.rows) >> 1;
		}
	},

	"Cell@mirrorbk": {
		maxnum: function() {
			var bd = this.board;
			return bd.cols * bd.rows;
		}
	},

	"Cell@nikoji": {
		maxnum: 52,
		numberAsLetter: true,
		disInputHatena: true,

		posthook: {
			qnum: function() {
				this.board.roommgr.setExtraData(this.room);
				this.board.recountNumbers();
			}
		}
	},

	"AreaTileGraph:AreaGraphBase": {
		enabled: true,
		setComponentRefs: function(obj, component) {
			obj.tile = component;
		},
		getObjNodeList: function(nodeobj) {
			return nodeobj.tilenodes;
		},
		resetObjNodeList: function(nodeobj) {
			nodeobj.tilenodes = [];
		},

		isnodevalid: function(nodeobj) {
			return true;
		},

		setExtraData: function(component) {
			// Call super class
			this.klass.AreaGraphBase.prototype.setExtraData.call(this, component);

			if (this.rebuildmode || component.clist.length === 0) {
				return;
			}

			// A tile is always contained within a single block.
			var block = component.clist[0].block;
			if (block) {
				this.board.blockgraph.setComponentInfo(block);
			}
		}
	},
	"AreaTileGraph@cbblock": {
		relation: { "border.ques": "separator" },
		isedgevalidbylinkobj: function(border) {
			return border.isGround();
		}
	},
	"AreaTileGraph@dbchoco": {
		relation: { "border.qans": "separator", "cell.ques": "node" },
		isedgevalidbylinkobj: function(border) {
			if (border.sidecell[0].isnull || border.sidecell[1].isnull) {
				return false;
			}
			return (
				border.qans === 0 && border.sidecell[0].ques === border.sidecell[1].ques
			);
		}
	},

	"AreaBlockGraph:AreaRoomGraph": {
		enabled: true,
		getComponentRefs: function(obj) {
			return obj.block;
		}, // getSideAreaInfo用
		setComponentRefs: function(obj, component) {
			obj.block = component;
		},
		getObjNodeList: function(nodeobj) {
			return nodeobj.blocknodes;
		},
		resetObjNodeList: function(nodeobj) {
			nodeobj.blocknodes = [];
		},

		isedgevalidbylinkobj: function(border) {
			return border.qans === 0;
		},

		setExtraData: function(component) {
			var cnt = 0;
			var clist = (component.clist = new this.klass.CellList(
				component.getnodeobjs()
			));
			component.size = clist.length;

			var tiles = this.board.tilegraph.components;
			for (var i = 0; i < tiles.length; i++) {
				tiles[i].count = 0;
			}
			for (var i = 0; i < clist.length; i++) {
				// It's possible that this function is called before all cells are connected to a tile.
				if (!clist[i].tile) {
					// Abort the count and wait until all cells in the grid are connected.
					component.dotcnt = 0;
					return;
				}
				clist[i].tile.count++;
			}
			for (var i = 0; i < tiles.length; i++) {
				if (tiles[i].count > 0) {
					cnt++;
				}
			}
			component.dotcnt = cnt;
		}
	},

	"AreaRoomGraph@nikoji": {
		enabled: true,

		setExtraData: function(component) {
			var clist = (component.clist = new this.klass.CellList(
				component.getnodeobjs()
			));
			var numlist = clist.filter(function(cell) {
				return cell.qnum !== -1;
			});

			component.numcell = numlist.length === 1 ? numlist[0] : null;
			component.num = component.numcell ? component.numcell.qnum : null;
		}
	},
	"AreaRoomGraph@mirrorbk": {
		enabled: true
	},

	//---------------------------------------------------------
	// 画像表示系
	Graphic: {
		gridcolor_type: "LIGHT",

		paint: function() {
			this.drawBGCells();
			this.drawDashedGrid();

			if (this.pid === "mirrorbk") {
				this.drawMirrorBase();
				this.drawMirrorSplit();
			}

			this.drawBorders();

			this.drawBorderQsubs();

			if (this.pid !== "mirrorbk") {
				this.drawBaseMarks();
			}

			this.drawChassis();

			this.drawPekes();

			if (this.pid !== "cbblock") {
				this.drawQuesNumbers();
				this.drawTarget();
			}
		}
	},

	"Graphic@cbblock": {
		// オーバーライド
		getBorderColor: function(border) {
			if (border.ques === 1) {
				var cell2 = border.sidecell[1];
				return cell2.isnull || cell2.error === 0 ? "white" : this.errbcolor1;
			} else if (border.qans === 1) {
				if (border.error === 1) {
					return this.errcolor1;
				}
				if (border.trial) {
					return this.trialcolor;
				}
				return this.qanscolor;
			}
			return null;
		}
	},

	"Graphic@dbchoco,tridbchoco": {
		bgcellcolor_func: "icebarn",
		icecolor: "rgb(204,204,204)",

		bordercolor_func: "qans"
	},

	"Graphic@nikoji": {
		bordercolor_func: "qans"
	},

	"Graphic@mirrorbk": {
		fontsizeratio: 0.75,

		drawMirrorBase: function() {
			var g = this.vinc("border_mirror", "crispEdges", true);

			var blist = this.range.borders;
			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];

				g.vid = "b_mirror_" + border.id;
				if (border.ques === 1) {
					var px = border.bx * this.bw,
						py = border.by * this.bh;
					var lm = (this.lw + this.addlw) * 1.2;
					var pad = 0;

					g.fillStyle = "black";
					if (border.isVert()) {
						if (border.relbd(0, 2).ques === 1) {
							py += 1;
							pad += 1;
						}

						g.fillRectCenter(px, py, lm, this.bh + pad);
					} else {
						if (border.relbd(2, 0).ques === 1) {
							px += 1;
							pad += 1;
						}

						g.fillRectCenter(px, py, this.bw + pad, lm);
					}
				} else {
					g.vhide();
				}
			}
		},

		drawMirrorSplit: function() {
			var g = this.vinc("border_mirror2", "crispEdges", true);

			var blist = this.range.borders;
			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];

				g.vid = "b_mirror2_" + border.id;
				if (border.ques === 1) {
					var px = border.bx * this.bw,
						py = border.by * this.bh;
					var lm = (this.lw + this.addlw) * 0.4;
					var pad = 0;

					g.fillStyle = "white";
					if (border.isVert()) {
						if (border.relbd(0, 2).ques === 1) {
							py += 1;
							pad += 1;
						}

						g.fillRectCenter(px, py, lm, this.bh + pad);
					} else {
						if (border.relbd(2, 0).ques === 1) {
							px += 1;
							pad += 1;
						}

						g.fillRectCenter(px, py, this.bw + pad, lm);
					}
				} else {
					g.vhide();
				}
			}
		},

		getBorderColor: function(border) {
			return border.qans ? this.getBorderColor_qans(border) : null;
		}
	},

	//---------------------------------------------------------
	// URLエンコード/デコード処理
	"Encode@cbblock": {
		decodePzpr: function(type) {
			this.decodeCBBlock();
		},
		encodePzpr: function(type) {
			this.encodeCBBlock();
		},

		decodeCBBlock: function() {
			var bstr = this.outbstr,
				bd = this.board,
				twi = [16, 8, 4, 2, 1];
			var pos = bstr
					? Math.min(((bd.border.length + 4) / 5) | 0, bstr.length)
					: 0,
				id = 0;
			for (var i = 0; i < pos; i++) {
				var ca = parseInt(bstr.charAt(i), 32);
				for (var w = 0; w < 5; w++) {
					if (!!bd.border[id]) {
						bd.border[id].ques = ca & twi[w] ? 1 : 0;
						id++;
					}
				}
			}
			this.outbstr = bstr.substr(pos);
		},
		encodeCBBlock: function() {
			var num = 0,
				pass = 0,
				cm = "",
				bd = this.board,
				twi = [16, 8, 4, 2, 1];
			for (var id = 0, max = bd.border.length; id < max; id++) {
				if (bd.border[id].isGround()) {
					pass += twi[num];
				}
				num++;
				if (num === 5) {
					cm += pass.toString(32);
					num = 0;
					pass = 0;
				}
			}
			if (num > 0) {
				cm += pass.toString(32);
			}
			this.outbstr += cm;
		}
	},

	"Encode@dbchoco,tridbchoco": {
		decodePzpr: function(type) {
			this.decodeDBChoco();
		},
		encodePzpr: function(type) {
			this.encodeDBChoco();
		},

		decodeDBChoco: function() {
			this.decodeIce();
			this.decodeNumber16();
		},
		encodeDBChoco: function() {
			this.encodeIce();
			this.encodeNumber16();
		}
	},

	"Encode@nikoji": {
		decodePzpr: function(type) {
			this.decodeNumber16();
		},
		encodePzpr: function(type) {
			this.encodeNumber16();
		}
	},

	"Encode@mirrorbk": {
		decodePzpr: function(type) {
			this.decodeNumber16();
			this.decodeBorder();
		},
		encodePzpr: function(type) {
			this.encodeNumber16();
			this.encodeBorder();
		}
	},

	//---------------------------------------------------------
	"FileIO@cbblock,mirrorbk": {
		decodeData: function() {
			if (this.pid === "mirrorbk") {
				this.decodeCellQnum();
			}
			this.decodeBorder(function(border, ca) {
				if (ca === "3") {
					border.ques = 0;
					border.qans = 1;
					border.qsub = 1;
				} else if (ca === "1") {
					border.ques = 0;
					border.qans = 1;
				} else if (ca === "-1") {
					border.ques = 1;
					border.qsub = 1;
				} else if (ca === "-2") {
					border.ques = 0;
					border.qsub = 1;
				} else if (ca === "2") {
					border.ques = 0;
				} else {
					border.ques = 1;
				}
			});
		},
		encodeData: function() {
			if (this.pid === "mirrorbk") {
				this.encodeCellQnum();
			}
			this.encodeBorder(function(border) {
				if (border.qans === 1 && border.qsub === 1) {
					return "3 ";
				} else if (border.qans === 1) {
					return "1 ";
				} else if (border.ques === 1 && border.qsub === 1) {
					return "-1 ";
				} else if (border.ques === 0 && border.qsub === 1) {
					return "-2 ";
				} else if (border.ques === 0) {
					return "2 ";
				} else {
					return "0 ";
				}
			});
		}
	},

	"FileIO@dbchoco,tridbchoco": {
		decodeData: function() {
			this.decodeCell(function(cell, ca) {
				if (ca.charAt(0) === "-") {
					cell.ques = 6;
					ca = ca.substr(1);
				}

				if (ca === "0") {
					cell.qnum = -2;
				} else if (ca !== "." && +ca > 0) {
					cell.qnum = +ca;
				}
			});
			this.decodeBorderAns();
		},
		encodeData: function() {
			this.encodeCell(function(cell) {
				var ca = "";
				if (cell.ques === 6) {
					ca += "-";
				}

				if (cell.qnum === -2) {
					ca += "0";
				} else if (cell.qnum !== -1) {
					ca += cell.qnum.toString();
				}

				if (ca === "") {
					ca = ".";
				}
				return ca + " ";
			});
			this.encodeBorderAns();
		}
	},

	"FileIO@nikoji": {
		decodeData: function() {
			this.decodeCellQnum();
			this.decodeBorderAns();
		},
		encodeData: function() {
			this.encodeCellQnum();
			this.encodeBorderAns();
		}
	},

	//---------------------------------------------------------
	// 正解判定処理実行部
	AnsCheck: {
		checklist: [
			"checkSingleBlock",
			"checkSmallNumberArea@dbchoco",
			"checkBlockNotRect@cbblock",
			"checkDifferentShapeBlock@cbblock",
			"checkLargeBlock",
			"checkEqualShapes@dbchoco",
			"checkLargeNumberArea@dbchoco",
			"checkBorderDeadend"
		],

		checkBlockNotRect: function() {
			this.checkAllArea(
				this.board.blockgraph,
				function(w, h, a, n) {
					return w * h !== a;
				},
				"bkRect"
			);
		},

		checkSingleBlock: function() {
			this.checkMiniBlockCount(1, "bkSubLt2");
		},
		checkLargeBlock: function() {
			this.checkMiniBlockCount(3, "bkSubGt2");
		},
		checkMiniBlockCount: function(flag, code) {
			var blocks = this.board.blockgraph.components;
			for (var r = 0; r < blocks.length; r++) {
				var cnt = blocks[r].dotcnt;
				if ((flag === 1 && cnt > 1) || (flag === 3 && cnt <= 2)) {
					continue;
				}

				this.failcode.add(code);
				if (this.checkOnly) {
					break;
				}
				blocks[r].clist.seterr(1);
			}
		},

		checkDifferentShapeBlock: function() {
			var sides = this.board.blockgraph.getSideAreaInfo();
			for (var i = 0; i < sides.length; i++) {
				var area1 = sides[i][0],
					area2 = sides[i][1];
				if (area1.dotcnt !== 2 || area2.dotcnt !== 2) {
					continue;
				}
				if (this.isDifferentShapeBlock(area1, area2)) {
					continue;
				}

				this.failcode.add("bsSameShape");
				if (this.checkOnly) {
					break;
				}
				area1.clist.seterr(1);
				area2.clist.seterr(1);
			}
		},

		checkSmallNumberArea: function() {
			return this.checkNumberArea(-1, "bkSizeLt");
		},
		checkLargeNumberArea: function() {
			return this.checkNumberArea(+1, "bkSizeGt");
		},

		checkNumberArea: function(factor, code) {
			var tiles = this.board.tilegraph.components;
			for (var r = 0; r < tiles.length; r++) {
				var clist = tiles[r].clist,
					d = clist.length;
				for (var i = 0; i < clist.length; i++) {
					var cell = clist[i];
					var qnum = cell.qnum;
					if (qnum <= 0) {
						continue;
					}
					if ((factor < 0 && d < qnum) || (factor > 0 && d > qnum)) {
						this.failcode.add(code);
						if (this.checkOnly) {
							return;
						}
						clist.seterr(1);
					}
				}
			}
		},

		checkEqualShapes: function() {
			var blocks = this.board.blockgraph.components;
			for (var r = 0; r < blocks.length; r++) {
				var block = blocks[r];
				if (block.dotcnt !== 2) {
					continue;
				}
				if (this.isEqualShapes(block.clist)) {
					continue;
				}

				this.failcode.add("bkDifferentShape");
				if (this.checkOnly) {
					break;
				}
				block.clist.seterr(1);
			}
		},

		isEqualShapes: function(clist) {
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				var borders = [cell.adjborder.right, cell.adjborder.bottom];

				for (var b = 0; b < borders.length; b++) {
					var bd = borders[b];
					if (!bd || bd.isnull) {
						continue;
					}
					var side0 = bd.sidecell[0];
					var side1 = bd.sidecell[1];

					if (
						bd.qans === 0 &&
						!side0.isnull &&
						!side1.isnull &&
						side0.ques !== side1.ques
					) {
						return !this.isDifferentShapeBlock(side0.tile, side1.tile);
					}
				}
			}
			return false;
		}
	},

	"AnsCheck@nikoji": {
		checklist: [
			"checkNoNumber",
			"checkIdenticalShapes",
			"checkIdenticalOrientation",
			"checkIdenticalPositions",
			"checkUniqueShapes",
			"checkDoubleNumber",
			"checkBorderDeadend"
		],

		checkIdenticalShapes: function() {
			if (!this.board.nums) {
				this.board.recountNumbers();
			}

			var rooms = this.board.roommgr.components;
			for (var nn = 0; nn < this.board.nums.length; nn++) {
				var n = this.board.nums[nn];
				var first = null;
				for (var r = 0; r < rooms.length; r++) {
					var room = rooms[r];
					if (room.num !== n) {
						continue;
					}

					if (!first) {
						first = room;
						continue;
					}
					if (!this.isDifferentShapeBlock(first, room)) {
						continue;
					}
					this.failcode.add("bkDifferentShape");
					if (this.checkOnly) {
						return;
					}
					first.clist.seterr(1);
					room.clist.seterr(1);
				}
			}
		},

		checkIdenticalOrientation: function() {
			if (!this.board.nums) {
				this.board.recountNumbers();
			}

			var rooms = this.board.roommgr.components;
			for (var nn = 0; nn < this.board.nums.length; nn++) {
				var n = this.board.nums[nn];

				var first = null;
				var firstshape = null;

				for (var r = 0; r < rooms.length; r++) {
					var room = rooms[r];
					if (room.num !== n) {
						continue;
					}
					if (!first) {
						first = room.clist;
						firstshape = room.clist.getBlockShapes();
						continue;
					}

					var second = room.clist;
					var secondshape = room.clist.getBlockShapes();
					if (firstshape.id === secondshape.id) {
						continue;
					}
					this.failcode.add("bkDifferentOrientation");
					if (this.checkOnly) {
						return;
					}
					first.seterr(1);
					second.seterr(1);
				}
			}
		},

		checkIdenticalPositions: function() {
			if (!this.board.nums) {
				this.board.recountNumbers();
			}

			var rooms = this.board.roommgr.components;
			for (var nn = 0; nn < this.board.nums.length; nn++) {
				var n = this.board.nums[nn];

				var first = null;
				var firstsize = null;

				for (var r = 0; r < rooms.length; r++) {
					var room = rooms[r];

					if (room.num !== n) {
						continue;
					}

					if (!first) {
						first = room;
						firstsize = room.clist.getRectSize();
					} else {
						var second = room;
						var secondsize = room.clist.getRectSize();

						// Will be marked as bkDifferentShape
						if (
							firstsize.rows !== secondsize.rows ||
							firstsize.cols !== secondsize.cols
						) {
							continue;
						}

						if (
							first.numcell.bx - firstsize.x1 ===
								second.numcell.bx - secondsize.x1 &&
							first.numcell.by - firstsize.y1 ===
								second.numcell.by - secondsize.y1
						) {
							continue;
						}

						this.failcode.add("bkDifferentPosition");

						if (this.checkOnly) {
							return;
						}
						first.clist.seterr(1);
						second.clist.seterr(1);
					}
				}
			}
		},

		checkUniqueShapes: function() {
			if (!this.board.nums) {
				this.board.recountNumbers();
			}
			var rooms = this.board.roommgr.components;

			var shapeMap = {};
			for (var r = 0; r < rooms.length; r++) {
				var room = rooms[r];

				if (room.num === null) {
					continue;
				}
				var key = room.num + "";
				if (!(key in shapeMap)) {
					shapeMap[key] = room;
				}
			}

			var shapes = [];
			for (var nn = 0; nn < this.board.nums.length; nn++) {
				var n = this.board.nums[nn];
				if (n in shapeMap) {
					shapes.push(shapeMap[n]);
				}
			}

			for (var nna = 0; nna < shapes.length; nna++) {
				for (var nnb = nna + 1; nnb < shapes.length; nnb++) {
					if (!this.isDifferentShapeBlock(shapes[nna], shapes[nnb])) {
						this.failcode.add("bkDifferentLetters");

						if (this.checkOnly) {
							return;
						}
						shapes[nna].clist.seterr(1);
						shapes[nnb].clist.seterr(1);
					}
				}
			}
		}
	},
	"AnsCheck@mirrorbk": {
		checklist: [
			"checkDoubleNumber",
			"checkNumberAndSize",
			"checkMirrorShape",
			"checkMirrorUnused"
		],

		checkMirrorShape: function() {
			var borders = this.board.border;
			for (var id = 0; id < borders.length; id++) {
				var border = borders[id];
				if (border.isnull || !border.ques) {
					continue;
				}
				var a1 = border.sidecell[0].room,
					a2 = border.sidecell[1].room;
				if (a1 === a2) {
					continue;
				}

				if (a1.clist.length === a2.clist.length) {
					var found = false;
					for (var i = 0; i < a1.clist.length && !found; i++) {
						var c1 = a1.clist[i];
						var c2 = border.isVert()
							? c1.relcell(2 * (border.bx - c1.bx), 0)
							: c1.relcell(0, 2 * (border.by - c1.by));

						if (c2.isnull || c2.room !== a2) {
							found = true;
						}
					}

					if (!found) {
						continue;
					}
				}

				this.failcode.add("bkMirror");
				if (this.checkOnly) {
					break;
				}
				a1.clist.seterr(1);
				a2.clist.seterr(1);
			}
		},

		checkMirrorUnused: function() {
			var borders = this.board.border;
			for (var id = 0; id < borders.length; id++) {
				var border = borders[id];
				if (border.isnull || !border.ques) {
					continue;
				}
				var a1 = border.sidecell[0].room,
					a2 = border.sidecell[1].room;
				if (a1 !== a2) {
					continue;
				}
				this.failcode.add("bdUnused");
				if (this.checkOnly) {
					break;
				}
				new this.klass.CellList(border.sidecell).seterr(1);
			}
		}
	},
	//---------------------------------------------------------
	// Triangular Double Choco: 盤面が三角形格子
	"Board@tridbchoco": {
		cols: 17,
		rows: 8,

		// 盤面の形: 頂点が上向きの大きな正三角形。
		// 頂点の列apexは偶数(頂点のセルを△にするため)、行数rowsは偶数
		// (白と灰色の総数が一致するため)に丸める。
		getTriRegion: function() {
			var apex = (this.cols - 1) >> 1;
			if (apex & 1) {
				apex--;
			}
			var rows = Math.min(this.rows, apex + 1, this.cols - apex);
			if (rows & 1) {
				rows--;
			}
			return { apex: apex, rows: rows };
		}
	},

	"Cell@tridbchoco": {
		// 上向き三角形(△)かどうか (x+yが偶数のセル)
		isTriUp: function() {
			return !!(((this.bx + this.by) >> 1) & 1);
		},

		// 盤面(正三角形)の中のセルかどうか
		isTriInBoard: function() {
			var r = this.board.getTriRegion();
			var x = this.bx >> 1,
				y = this.by >> 1;
			return y < r.rows && x >= r.apex - y && x <= r.apex + y;
		},

		// 数字の最大値: 盤面(正三角形)のセル数の半分
		maxnum: function() {
			var r = this.board.getTriRegion();
			return (r.rows * r.rows) >> 1;
		},

		// 三角形格子での隣接判定
		// 左右は常に隣接。上下は△なら下、▽なら上とだけ隣接する
		isTriAdjacentTo: function(cell2) {
			var dx = cell2.bx - this.bx,
				dy = cell2.by - this.by;
			if (Math.abs(dx) === 2 && dy === 0) {
				return true;
			}
			if (dx !== 0 || Math.abs(dy) !== 2) {
				return false;
			}
			if (dy === 2) {
				return this.isTriUp();
			}
			return cell2.isTriUp();
		}
	},

	"AreaTileGraph@tridbchoco": {
		enabled: true,
		relation: { "border.qans": "separator", "cell.ques": "node" },
		setComponentRefs: function(obj, component) {
			obj.tile = component;
		},
		getObjNodeList: function(nodeobj) {
			return nodeobj.tilenodes;
		},
		resetObjNodeList: function(nodeobj) {
			nodeobj.tilenodes = [];
		},

		isnodevalid: function(nodeobj) {
			return nodeobj.isTriInBoard();
		},

		isedgevalidbylinkobj: function(border) {
			var c1 = border.sidecell[0],
				c2 = border.sidecell[1];
			if (
				c1.isnull ||
				c2.isnull ||
				!c1.isTriInBoard() ||
				!c2.isTriInBoard() ||
				!c1.isTriAdjacentTo(c2)
			) {
				return false;
			}
			return border.qans === 0 && c1.ques === c2.ques;
		},

		setExtraData: function(component) {
			this.klass.AreaGraphBase.prototype.setExtraData.call(this, component);

			if (this.rebuildmode || component.clist.length === 0) {
				return;
			}

			var block = component.clist[0].block;
			if (block) {
				this.board.blockgraph.setComponentInfo(block);
			}
		}
	},

	"AreaBlockGraph@tridbchoco": {
		enabled: true,
		getComponentRefs: function(obj) {
			return obj.block;
		},
		setComponentRefs: function(obj, component) {
			obj.block = component;
		},
		getObjNodeList: function(nodeobj) {
			return nodeobj.blocknodes;
		},
		resetObjNodeList: function(nodeobj) {
			nodeobj.blocknodes = [];
		},

		isnodevalid: function(nodeobj) {
			return nodeobj.isTriInBoard();
		},

		isedgevalidbylinkobj: function(border) {
			var c1 = border.sidecell[0],
				c2 = border.sidecell[1];
			if (
				c1.isnull ||
				c2.isnull ||
				!c1.isTriInBoard() ||
				!c2.isTriInBoard() ||
				!c1.isTriAdjacentTo(c2)
			) {
				return false;
			}
			return border.qans === 0;
		},

		setExtraData: function(component) {
			var cnt = 0;
			var clist = (component.clist = new this.klass.CellList(
				component.getnodeobjs()
			));
			component.size = clist.length;

			var tiles = this.board.tilegraph.components;
			for (var i = 0; i < tiles.length; i++) {
				tiles[i].count = 0;
			}
			for (var i = 0; i < clist.length; i++) {
				if (!clist[i].tile) {
					component.dotcnt = 0;
					return;
				}
				clist[i].tile.count++;
			}
			for (var i = 0; i < tiles.length; i++) {
				if (tiles[i].count > 0) {
					cnt++;
				}
			}
			component.dotcnt = cnt;
		}
	},

	"MouseEvent@tridbchoco": {
		// マウス位置を三角形格子の座標 (tx: S単位, ty: H単位) に変換する
		getTriPos: function() {
			var pc = this.puzzle.painter;
			if (!(pc.triS > 0)) {
				pc.computeTriMetrics();
			}
			var px = this.inputPoint.bx * pc.bw + pc.x0;
			var py = this.inputPoint.by * pc.bh + pc.y0;
			return {
				tx: (px - pc.triOX) / pc.triS,
				ty: (py - pc.triOY) / pc.triH
			};
		},

		// マウス位置を含む三角形セルを返す (盤外ならnull)
		getTriCellAt: function(y, v, u) {
			var bd = this.board;
			if (y < 0 || y >= bd.rows) {
				return null;
			}
			// 整数の頂点列 k (セルx=2k-2) と半整数の頂点列 k+0.5 (セルx=2k+1)
			var k = Math.round(u);
			var xc = 2 * k - 2;
			if (xc >= 0 && xc < bd.cols) {
				var cell = bd.getc(xc * 2 + 1, y * 2 + 1);
				if (cell.isTriInBoard()) {
					var limit = cell.isTriUp() ? 0.5 * v : 0.5 * (1 - v);
					if (Math.abs(u - k) <= limit + 1e-9) {
						return cell;
					}
				}
			}
			var k2 = Math.round(u - 0.5);
			var xc2 = 2 * k2 - 1;
			if (xc2 >= 0 && xc2 < bd.cols) {
				var cell2 = bd.getc(xc2 * 2 + 1, y * 2 + 1);
				if (cell2.isTriInBoard()) {
					var limit2 = cell2.isTriUp() ? 0.5 * v : 0.5 * (1 - v);
					if (Math.abs(u - (k2 + 0.5)) <= limit2 + 1e-9) {
						return cell2;
					}
				}
			}
			return null;
		},

		getTriCell: function() {
			var pos = this.getTriPos();
			var y = Math.floor(pos.ty);
			var v = pos.ty - y,
				u = pos.tx;
			var cell = this.getTriCellAt(y, v, u);
			if (cell) {
				return cell;
			}
			// 行の境界線上は上下どちらのセルにも属しうる
			if (v < 1e-6) {
				return this.getTriCellAt(y - 1, 1, u);
			}
			if (v > 1 - 1e-6) {
				return this.getTriCellAt(y + 1, 0, u);
			}
			return null;
		},

		getcell: function() {
			return this.getTriCell() || this.board.nullobj;
		},

		// マウス位置を最寄りの格子頂点にスナップする ([x, y], S/H単位)。
		// 頂点は yが整数・xが0.5刻みで、かつ 2x-y が偶数の位置だけにある。
		// 盤面の外ならnull
		getTriVertex: function() {
			var pc = this.puzzle.painter;
			if (!(pc.triS > 0)) {
				pc.computeTriMetrics();
			}
			var bd = this.board;
			var m = bd.getTriRegion().rows;
			var pos = this.getTriPos();
			var vy = Math.round(pos.ty);
			if (vy < 0 || vy > m) {
				return null;
			}
			var vx = Math.round(pos.tx * 2) / 2;
			if ((Math.round(vx * 2) - vy) % 2 !== 0) {
				// この位置に頂点はないので、tx に近い側の頂点へ寄せる
				vx += pos.tx > vx ? 0.5 : -0.5;
			}
			if (
				vx < pc.getTriLeftX(vy) - 1e-9 ||
				vx > pc.getTriRightX(vy) + 1e-9
			) {
				return null;
			}
			return [vx, vy];
		},

		// 頂点対 → 境界線オブジェクトの対応表を作る (盤面の辺ごと)
		getTriEdgeMap: function() {
			var bd = this.board;
			if (this.triEdgeMap && this.triEdgeMapBoard === bd) {
				return this.triEdgeMap;
			}
			var pc = this.puzzle.painter;
			if (!(pc.triS > 0)) {
				pc.computeTriMetrics();
			}
			var map = {};
			for (var id = 0; id < bd.border.length; id++) {
				var border = bd.border[id];
				var c1 = border.sidecell[0],
					c2 = border.sidecell[1];
				if (
					c1.isnull ||
					c2.isnull ||
					!c1.isTriInBoard() ||
					!c2.isTriInBoard() ||
					!c1.isTriAdjacentTo(c2)
				) {
					continue;
				}
				var v1 = pc.getTriVertices(c1),
					v2 = pc.getTriVertices(c2);
				var pts = [];
				for (var a = 0; a < 3; a++) {
					for (var b = 0; b < 3; b++) {
						if (v1[a][0] === v2[b][0] && v1[a][1] === v2[b][1]) {
							pts.push(v1[a]);
						}
					}
				}
				if (pts.length !== 2) {
					continue;
				}
				var p1 = [
					Math.round(((pts[0][0] - pc.triOX) / pc.triS) * 2) / 2,
					Math.round((pts[0][1] - pc.triOY) / pc.triH)
				];
				var p2 = [
					Math.round(((pts[1][0] - pc.triOX) / pc.triS) * 2) / 2,
					Math.round((pts[1][1] - pc.triOY) / pc.triH)
				];
				map[p1[0] + "," + p1[1] + "|" + p2[0] + "," + p2[1]] = border;
				map[p2[0] + "," + p2[1] + "|" + p1[0] + "," + p1[1]] = border;
			}
			this.triEdgeMap = map;
			this.triEdgeMapBoard = bd;
			return map;
		},

		// 隣接する頂点対 (辺の両端) から境界線オブジェクトを得る
		getTriBorderAt: function(v1, v2) {
			var map = this.getTriEdgeMap();
			return (
				map[v1[0] + "," + v1[1] + "|" + v2[0] + "," + v2[1]] ||
				this.board.nullobj
			);
		},

		inputborder: function() {
			var vertex = this.getTriVertex();
			if (!vertex) {
				return;
			}
			if (this.mousestart) {
				// 始点(端点)を記録するだけで、まだ線は引かない
				this.prevTriVertex = vertex;
				return;
			}
			var prev = this.prevTriVertex;
			this.prevTriVertex = vertex;
			if (!prev || (prev[0] === vertex[0] && prev[1] === vertex[1])) {
				return;
			}
			var border = this.getTriBorderAt(prev, vertex);
			if (border.isnull) {
				return;
			}
			if (this.inputData === null) {
				this.inputData = border.isBorder() ? 0 : 1;
			}
			if (this.inputData === 1) {
				border.setBorder();
			} else if (this.inputData === 0) {
				border.removeBorder();
			}
			border.draw();
		},

		inputQsubLine: function() {
			var vertex = this.getTriVertex();
			if (!vertex) {
				return;
			}
			if (this.mousestart) {
				this.prevTriVertex = vertex;
				return;
			}
			var prev = this.prevTriVertex;
			this.prevTriVertex = vertex;
			if (!prev || (prev[0] === vertex[0] && prev[1] === vertex[1])) {
				return;
			}
			var border = this.getTriBorderAt(prev, vertex);
			if (border.isnull) {
				return;
			}
			if (this.inputData === null) {
				this.inputData = border.qsub === 0 ? 1 : 0;
			}
			if (this.inputData === 1) {
				border.setQsub(1);
			} else if (this.inputData === 0) {
				border.setQsub(0);
			}
			border.draw();
		}
	},

	"Graphic@tridbchoco": {
		// 三角形の盤面は正方形マスの盤面より縦長になるので、
		// キャンバス(および外枠の中心位置)を盤面の縦横比に合わせる。
		// 正三角形の盤面は、底辺が rows 個の三角形の辺、高さが rows 個の
		// 三角形の高さ (1辺の √3/2 倍) なので、縦幅と同じ「セル数」に
		// 換算した横幅を返す。
		getBoardCols: function() {
			return this.board.getTriRegion().rows / 0.8660254037844386;
		},
		getBoardRows: function() {
			return this.board.getTriRegion().rows;
		},

		paint: function() {
			this.computeTriMetrics();
			this.drawTriBGCells();
			this.drawTriGrid();
			this.drawTriChassis();
			this.drawTriBorders();
			this.drawTriBorderQsubs();
			this.drawTriPekes();
			this.drawTriQuesNumbers();
			this.drawTriTarget();
		},

		// 背景: 正三角形の盤面は正方形マスとは寸法が異なるので、
		// キャンバス全体を背景色で塗る (三角形の底辺が背景から
		// はみ出さないようにする)
		flushCanvas: function() {
			var g = this.vinc("background", "crispEdges", true);
			g.vid = "BG";
			g.fillStyle = this.bgcolor;
			g.fillRect(
				-this.x0 - 0.5,
				-this.y0 - 0.5,
				this.canvasWidth + 1,
				this.canvasHeight + 1
			);
		},

		// 盤面全体の大きさと位置を計算する。
		// 三角形格子: セル(x,y)は x+y が偶数なら△(頂点が上)、奇数なら▽。
		// 三角形は列ごとに縦に積み重なり、隣接セル同士が辺を隙間なく共有する。
		// 盤面は頂点が上向きの大きな正三角形。
		// (S=三角形の一辺, H=S*√3/2)
		computeTriMetrics: function() {
			var bd = this.board;
			var r = bd.getTriRegion();
			var m = r.rows;
			var cw = this.cw,
				ch = this.ch;
			var canvasW = this.canvasWidth || cw * (m / 0.8660254037844386 + 2 * this.margin);
			var canvasH = this.canvasHeight || ch * (m + 2 * this.margin);
			var pad = cw * 0.5;
			var S = Math.min(
				(canvasW - pad) / m,
				(canvasH - pad) / (m * 0.8660254037844386)
			);
			this.triS = S;
			this.triH = S * 0.8660254037844386;
			// 三角形は x座標 [1*S, (apex+1)*S] の範囲にあり、
			// その中心をキャンバスの中央に合わせる
			this.triOX = (canvasW - (r.apex + 2) * S) / 2;
			this.triOY = (canvasH - m * this.triH) / 2;
		},

		// 三角形セルの頂点座標
		// up:   [頂点(上), 底辺左, 底辺右]
		// down: [上辺左, 上辺右, 頂点(下)]
		getTriVertices: function(cell) {
			var x = cell.bx >> 1,
				y = cell.by >> 1,
				S = this.triS,
				H = this.triH,
				ox = this.triOX,
				oy = this.triOY;
			if ((x + y) % 2 === 0) {
				return [
					[(x / 2 + 1) * S + ox, y * H + oy],
					[(x / 2 + 0.5) * S + ox, (y + 1) * H + oy],
					[(x / 2 + 1.5) * S + ox, (y + 1) * H + oy]
				];
			}
			return [
				[((x + 1) / 2) * S + ox, y * H + oy],
				[((x + 3) / 2) * S + ox, y * H + oy],
				[((x + 2) / 2) * S + ox, (y + 1) * H + oy]
			];
		},

		getTriCenter: function(cell) {
			var v = this.getTriVertices(cell);
			return [
				(v[0][0] + v[1][0] + v[2][0]) / 3,
				(v[0][1] + v[1][1] + v[2][1]) / 3
			];
		},

		drawTriPolygon: function(g, cell) {
			var v = this.getTriVertices(cell);
			g.beginPath();
			g.moveTo(v[0][0], v[0][1]);
			g.lineTo(v[1][0], v[1][1]);
			g.lineTo(v[2][0], v[2][1]);
			g.closePath();
		},

		drawTriBGCells: function() {
			var g = this.vinc("cell_bg", "crispEdges", true);
			var clist = this.range.cells;
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i],
					color = this.getBGCellColor_icebarn(cell);
				g.vid = "c_bg_" + cell.id;
				if (!!color && cell.isTriInBoard()) {
					g.fillStyle = color;
					this.drawTriPolygon(g, cell);
					g.fill();
				} else {
					g.vhide();
				}
			}
		},

		// 破線パターンが途切れず流れるように、折れ線を1本のパスとして
		// 破線描画する (点線のオン/オフ区間を自前で計算してpathに焼き込む)
		strokeTriDashedPath: function(g, pts, dashOn, dashOff) {
			var n = pts.length >> 1;
			if (n < 2) {
				return;
			}
			var total = 0,
				segLens = [];
			for (var i = 0; i + 1 < n; i++) {
				var dx = pts[(i + 1) << 1] - pts[i << 1],
					dy = pts[(i + 1) << 1 | 1] - pts[i << 1 | 1];
				var len = Math.sqrt(dx * dx + dy * dy);
				segLens.push(len);
				total += len;
			}

			// パターン: on/2, off, on, off, ..., on, off, on/2
			// 線の両端が「線」で始まり「線」で終わるようにする
			var step = dashOn + dashOff;
			var dashCount = Math.max(Math.round(total / step), 2);
			var pattern = [dashOn / 2, dashOff];
			for (i = 1; i < dashCount; i++) {
				pattern.push(dashOn, dashOff);
			}
			pattern.push(dashOn / 2 + Math.max(0, total - dashCount * step));

			g.beginPath();
			var seg = 0,
				segpos = 0,
				pi = 0,
				left = pattern[0],
				drawing = true,
				moving = false;
			while (seg < segLens.length && pi < pattern.length) {
				var slen = segLens[seg],
					remain = slen - segpos;
				var take = Math.min(left, remain);
				var u0 = segpos / slen,
					u1 = (segpos + take) / slen;
				var ax = pts[seg << 1],
					ay = pts[seg << 1 | 1];
				var bx = pts[(seg + 1) << 1],
					by = pts[(seg + 1) << 1 | 1];
				var x0 = ax + (bx - ax) * u0,
					y0 = ay + (by - ay) * u0;
				var x1 = ax + (bx - ax) * u1,
					y1 = ay + (by - ay) * u1;
				if (drawing) {
					if (!moving) {
						g.moveTo(x0, y0);
						moving = true;
					}
					g.lineTo(x1, y1);
				} else {
					moving = false;
				}
				segpos += take;
				left -= take;
				if (left <= 1e-9) {
					pi++;
					if (pi < pattern.length) {
						left = pattern[pi];
						drawing = !drawing;
					}
				}
				if (segpos >= slen - 1e-9) {
					seg++;
					segpos = 0;
				}
			}
			g.stroke();
		},

		// 三角形の左辺のx座標 (行yの位置, S単位)
		getTriLeftX: function(y) {
			var apex = this.board.getTriRegion().apex;
			return (apex + 2 - (apex & 1)) / 2 - 0.5 * y;
		},

		// 三角形の右辺のx座標 (行yの位置, S単位)
		getTriRightX: function(y) {
			var apex = this.board.getTriRegion().apex;
			return (apex + 2 + (apex & 1)) / 2 + 0.5 * y;
		},

		// 点線のグリッド: 横線と、列を仕切るジグザグ線をそれぞれ1本の
		// 折れ線として描く。破線が辺ごとに分断されず線全体でつながる。
		drawTriGrid: function() {
			var g = this.vinc("grid", "crispEdges", true);
			var bd = this.board;
			var r = bd.getTriRegion();
			var m = r.rows;
			var S = this.triS,
				H = this.triH,
				ox = this.triOX,
				oy = this.triOY;
			g.lineWidth = this.gw;
			g.strokeStyle = this.gridcolor;
			var step = S / 10;
			var dashOn = step * 0.625,
				dashOff = step * 0.375;

			// 横方向の線 (y=1..m-1)
			for (var y = 1; y < m; y++) {
				var xa = this.getTriLeftX(y) * S + ox;
				var xb = this.getTriRightX(y) * S + ox;
				var yy = y * H + oy;
				g.vid = "grid_h_" + y;
				this.strokeTriDashedPath(g, [xa, yy, xb, yy], dashOn, dashOff);
			}
			// 列の境界のジグザグ線: セルxとセルx+1の間 (x=0..cols-2)
			// 両側のセルが盤内に入る行から描き始める。
			// 偶数番目の境界は行ごとに右へ、奇数番目は左へジグザグする
			for (var x = 0; x < bd.cols - 1; x++) {
				var y0 = Math.max(
					Math.abs(x - r.apex),
					Math.abs(x + 1 - r.apex)
				);
				if (y0 >= m) {
					continue;
				}
				var k = x % 2 === 0 ? x / 2 + 1 : (x + 3) / 2;
				var sign = x % 2 === 0 ? 1 : -1;
				var pts = [];
				for (var y2 = y0; y2 <= m; y2++) {
					pts.push((k + sign * 0.5 * (y2 & 1)) * S + ox, y2 * H + oy);
				}
				g.vid = "grid_v_" + x;
				this.strokeTriDashedPath(g, pts, dashOn, dashOff);
			}
		},

		// 外枠: 正三角形の輪郭を1本の閉じたパスで描く
		drawTriChassis: function() {
			var g = this.vinc("chassis", "crispEdges", true);
			var bd = this.board,
				S = this.triS,
				H = this.triH,
				ox = this.triOX,
				oy = this.triOY;
			var m = bd.getTriRegion().rows;
			g.strokeStyle = this.quescolor;
			g.lineWidth = this.lw;
			g.vid = "tri_chassis";
			g.beginPath();
			// 頂点 → 右辺 → 底辺 → 左辺
			g.moveTo(this.getTriLeftX(0) * S + ox, oy);
			g.lineTo(this.getTriRightX(0) * S + ox, oy);
			for (var y = 1; y <= m; y++) {
				g.lineTo(this.getTriRightX(y) * S + ox, y * H + oy);
			}
			g.lineTo(this.getTriLeftX(m) * S + ox, m * H + oy);
			for (var y2 = m - 1; y2 >= 0; y2--) {
				g.lineTo(this.getTriLeftX(y2) * S + ox, y2 * H + oy);
			}
			g.closePath();
			g.stroke();
		},

		drawTriBorders: function() {
			var g = this.vinc("border", "crispEdges");
			var blist = this.range.borders;
			var lm = (this.lw + this.addlw) / 2;
			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];
				g.vid = "b_qans_" + border.id;
				if (border.qans === 1) {
					var pts = this.getTriBorderEnds(border);
					if (!pts) {
						g.vhide();
						continue;
					}
					// 端点を少し延長した四角形を塗る。頂点で隣接する線分同士が
					// 重なり合い、継ぎ目が途切れずつながって見える。
					var dx = pts[2] - pts[0],
						dy = pts[3] - pts[1];
					var len = Math.sqrt(dx * dx + dy * dy) || 1;
					var ex = (dx / len) * lm,
						ey = (dy / len) * lm;
					var nx = (-dy / len) * lm,
						ny = (dx / len) * lm;
					g.fillStyle = this.getBorderColor_qans(border);
					g.beginPath();
					g.moveTo(pts[0] - ex + nx, pts[1] - ey + ny);
					g.lineTo(pts[2] + ex + nx, pts[3] + ey + ny);
					g.lineTo(pts[2] + ex - nx, pts[3] + ey - ny);
					g.lineTo(pts[0] - ex - nx, pts[1] - ey - ny);
					g.closePath();
					g.fill();
				} else {
					g.vhide();
				}
			}
		},

		// 境界線が共有している三角形の辺の両端 [x0,y0,x1,y1] を返す
		getTriBorderEnds: function(border) {
			var c1 = border.sidecell[0],
				c2 = border.sidecell[1];
			if (
				c1.isnull ||
				c2.isnull ||
				!c1.isTriInBoard() ||
				!c2.isTriInBoard() ||
				!c1.isTriAdjacentTo(c2)
			) {
				return null;
			}
			var v1 = this.getTriVertices(c1),
				v2 = this.getTriVertices(c2);
			var pts = [];
			for (var a = 0; a < 3; a++) {
				for (var b = 0; b < 3; b++) {
					if (v1[a][0] === v2[b][0] && v1[a][1] === v2[b][1]) {
						pts.push(v1[a]);
					}
				}
			}
			if (pts.length !== 2) {
				return null;
			}
			return [pts[0][0], pts[0][1], pts[1][0], pts[1][1]];
		},

		// 境界線上の補助記号(qsub=1): 辺の中点に辺と垂直な短い線分
		drawTriBorderQsubs: function() {
			var g = this.vinc("border_qsub", "crispEdges", true);
			var blist = this.range.borders;
			var m = Math.max(this.cw * 0.15, this.triS * 0.15);
			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];
				g.vid = "b_qsub1_" + border.id;
				if (border.qsub === 1) {
					var pts = this.getTriBorderEnds(border);
					if (!pts) {
						g.vhide();
						continue;
					}
					var mx = (pts[0] + pts[2]) / 2,
						my = (pts[1] + pts[3]) / 2;
					var dx = pts[2] - pts[0],
						dy = pts[3] - pts[1];
					var len = Math.sqrt(dx * dx + dy * dy) || 1;
					var nx = (-dy / len) * m * 0.5,
						ny = (dx / len) * m * 0.5;
					var hw = 0.4;
					g.fillStyle = !border.trial ? this.pekecolor : this.linetrialcolor;
					g.beginPath();
					g.moveTo(mx - nx - dx / len * hw, my - ny - dy / len * hw);
					g.lineTo(mx + nx - dx / len * hw, my + ny - dy / len * hw);
					g.lineTo(mx + nx + dx / len * hw, my + ny + dy / len * hw);
					g.lineTo(mx - nx + dx / len * hw, my - ny + dy / len * hw);
					g.closePath();
					g.fill();
				} else {
					g.vhide();
				}
			}
		},

		// 境界線上の×印(qsub=2)
		drawTriPekes: function() {
			var g = this.vinc("border_peke", "auto", true);
			var size = Math.max(this.triS * 0.18 + 1, 4);
			g.lineWidth = (1 + this.cw / 40) | 0;
			var blist = this.range.borders;
			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];
				g.vid = "b_peke_" + border.id;
				if (border.qsub === 2) {
					var pts = this.getTriBorderEnds(border);
					if (!pts) {
						g.vhide();
						continue;
					}
					g.strokeStyle = !border.trial ? this.pekecolor : this.trialcolor;
					g.strokeCross(
						(pts[0] + pts[2]) / 2,
						(pts[1] + pts[3]) / 2,
						size - 1
					);
				} else {
					g.vhide();
				}
			}
		},

		drawTriQuesNumbers: function() {
			var g = this.vinc("cell_number", "auto");
			var clist = this.range.cells;
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				g.vid = "cell_text_" + cell.id;
				var text = this.getQuesNumberText(cell);
				if (!!text && cell.isTriInBoard()) {
					g.fillStyle = this.getQuesNumberColor(cell);
					var c = this.getTriCenter(cell);
					this.disptext(text, c[0], c[1]);
				} else {
					g.vhide();
				}
			}
		},

		// カーソル位置のセルを三角形の枠で囲む
		// solver オーバーレイ: 三角形格子の辺・セルの位置に合わせて描く
		drawSolverOverlayCells: function() {
			var g = this.vinc("solver_cell", "auto", true);
			var clist = this.range.cells;

			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				var entries = this.getSolverOverlayEntries(cell);
				var visible =
					entries.length > 0 && !this.hasAnswerCellState(cell)
						? Math.min(entries.length, this.solverCellOverlaySlots)
						: 0;
				var j = 0;

				for (; j < visible; j++) {
					g.vid = "c_solver_" + cell.id + "_" + j;
					if (!this.drawTriSolverOverlayCellEntry(g, cell, entries[j])) {
						g.vhide();
					}
				}

				for (; j < this.solverCellOverlaySlots; j++) {
					g.vid = "c_solver_" + cell.id + "_" + j;
					g.vhide();
				}

				g.vid = "c_solver_" + cell.id;
				g.vhide();
			}
		},

		drawTriSolverOverlayCellEntry: function(g, cell, entry) {
			// 灰色マスは盤面自体にすでに表示されているので、
			// solver オーバーレイでは何も描かない
			return false;
		},

		drawSolverOverlayLines: function() {
			var g = this.vinc("solver_line", "crispEdges");
			var blist = this.range.borders;
			var lm = Math.max(this.lm * 0.72, 1);

			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];
				var entry = this.getSolverOverlayBorderEntry(border, [
					"line",
					"wall",
					"doubleLine"
				]);
				g.vid = "b_solver_line_" + border.id;
				if (entry && !this.hasAnswerLineState(border)) {
					var pts = this.getTriBorderEnds(border);
					if (!pts) {
						g.vhide();
						g.vid = "b_solver_line2_" + border.id;
						g.vhide();
						continue;
					}
					var dx = pts[2] - pts[0],
						dy = pts[3] - pts[1];
					var len = Math.sqrt(dx * dx + dy * dy) || 1;
					var nx = (-dy / len) * lm,
						ny = (dx / len) * lm;
					g.fillStyle = this.getSolverOverlayEntryColor(
						entry,
						this.solverLineColor
					);
					g.beginPath();
					g.moveTo(pts[0] + nx, pts[1] + ny);
					g.lineTo(pts[2] + nx, pts[3] + ny);
					g.lineTo(pts[2] - nx, pts[3] - ny);
					g.lineTo(pts[0] - nx, pts[1] - ny);
					g.closePath();
					g.fill();
					g.vid = "b_solver_line2_" + border.id;
					g.vhide();
				} else {
					g.vhide();
					g.vid = "b_solver_line2_" + border.id;
					g.vhide();
				}
			}
		},

		drawSolverOverlayPekes: function() {
			var g = this.vinc("solver_peke", "auto", true);
			var size = this.cw * 0.13 + 1;
			if (size < 4) {
				size = 4;
			}
			g.lineWidth = Math.max((1 + this.cw / 45) | 0, 1);
			g.strokeStyle = this.solverPekeColor;

			var blist = this.range.borders;
			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];
				var entry = this.getSolverOverlayBorderEntry(border, ["cross"]);
				g.vid = "b_solver_peke_" + border.id;
				if (entry && !this.hasAnswerLineState(border)) {
					var pts = this.getTriBorderEnds(border);
					if (!pts) {
						g.vhide();
						continue;
					}
					g.strokeStyle = this.getSolverOverlayEntryColor(
						entry,
						this.solverPekeColor
					);
					g.strokeCross(
						(pts[0] + pts[2]) / 2,
						(pts[1] + pts[3]) / 2,
						size - 1
					);
				} else {
					g.vhide();
				}
			}
		},

		drawTriTarget: function() {
			var g = this.vinc("target_cursor", "crispEdges");
			var cell = this.puzzle.cursor.getc();
			g.vid = "ti1_";
			if (
				cell.isnull ||
				!cell.isTriInBoard() ||
				this.outputImage ||
				!this.puzzle.getConfig("cursor")
			) {
				g.vhide();
				return;
			}
			var t = Math.max(this.cw / 16, 2) | 0;
			g.strokeStyle = this.puzzle.editmode
				? this.targetColorEdit
				: this.targetColorPlay;
			g.lineWidth = t;
			// 境界線や外枠を隠さないように、枠を内側へ少し寄せる
			var v = this.getTriVertices(cell);
			var c = this.getTriCenter(cell);
			var inset = t * 0.6;
			var p = [];
			for (var i = 0; i < 3; i++) {
				var dx = c[0] - v[i][0],
					dy = c[1] - v[i][1];
				var len = Math.sqrt(dx * dx + dy * dy) || 1;
				p.push([v[i][0] + (dx / len) * inset, v[i][1] + (dy / len) * inset]);
			}
			g.beginPath();
			g.moveTo(p[0][0], p[0][1]);
			g.lineTo(p[1][0], p[1][1]);
			g.lineTo(p[2][0], p[2][1]);
			g.closePath();
			g.stroke();
		}
	},

	"AnsCheck@tridbchoco": {
		checklist: [
			"checkSingleBlock",
			"checkSmallNumberArea",
			"checkLargeBlock",
			"checkEqualShapes",
			"checkLargeNumberArea"
		],

		isEqualShapes: function(clist) {
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i],
					adc = cell.adjacent,
					adb = cell.adjborder;
				for (var d in adc) {
					var nb = adc[d];
					if (
						nb.isnull ||
						!nb.isTriInBoard() ||
						!cell.isTriAdjacentTo(nb) ||
						cell.ques === nb.ques
					) {
						continue;
					}
					var bd = adb[d];
					if (bd.isnull || bd.qans !== 0) {
						continue;
					}
					return !this.isDifferentShapeBlock(cell.tile, nb.tile);
				}
			}
			return false;
		},

		isDifferentShapeBlock: function(area1, area2) {
			if (area1.clist.length !== area2.clist.length) {
				return true;
			}
			return (
				this.getTriShapeCanon(area1.clist) !==
				this.getTriShapeCanon(area2.clist)
			);
		},

		// 三角形格子(セルの隣接グラフ)の合同変換12種で正規化した形状の
		// 文字列を返す。各変換は (x,y) -> ((a*x+b*y+tx)/2, (c*x+d*y+ty)/2)
		// の形で、平行移動(tx,ty)はセルの向き(x+yの偶奇)によって異なる。
		getTriShapeCanon: function(clist) {
			var pts = [];
			for (var i = 0; i < clist.length; i++) {
				pts.push([clist[i].bx >> 1, clist[i].by >> 1]);
			}
			var maps = [
				[2, 0, 0, 2, 0, 0, 0, 0], // 恒等変換
				[-2, 0, 0, 2, 0, 0, 0, 0], // 鏡映
				[-1, -3, 1, -1, 0, 0, 1, 1], // 120°回転系
				[-1, 3, -1, -1, 0, 0, -1, 1],
				[1, -3, -1, -1, 0, 0, 1, 1],
				[1, 3, 1, -1, 0, 0, -1, 1],
				[-2, 0, 0, -2, 0, 2, 0, 2], // 180°回転
				[-1, -3, -1, 1, 0, 2, 1, 1], // 60°回転系
				[-1, 3, 1, 1, 0, -2, -1, -3],
				[1, -3, 1, 1, 0, 2, 1, 1],
				[1, 3, -1, 1, 0, -2, -1, -3],
				[2, 0, 0, -2, 0, 2, 0, 2] // 鏡映
			];

			var best = null;
			for (var m = 0; m < 12; m++) {
				var mm = maps[m];
				var t = [];
				for (var j = 0; j < pts.length; j++) {
					var x = pts[j][0],
						y = pts[j][1];
					var up = (x + y) % 2 === 0;
					var tx = up ? mm[4] : mm[6],
						ty = up ? mm[5] : mm[7];
					t.push([
						(mm[0] * x + mm[1] * y + tx) / 2,
						(mm[2] * x + mm[3] * y + ty) / 2
					]);
				}
				var minx = Infinity,
					miny = Infinity;
				for (j = 0; j < t.length; j++) {
					if (t[j][0] < minx) {
						minx = t[j][0];
					}
					if (t[j][1] < miny) {
						miny = t[j][1];
					}
				}
				for (j = 0; j < t.length; j++) {
					t[j] = [t[j][0] - minx, t[j][1] - miny];
				}
				t.sort(function(a, b) {
					return a[0] - b[0] || a[1] - b[1];
				});
				var key = t
					.map(function(p) {
						return p[0] + "," + p[1];
					})
					.join("/");
				if (best === null || key < best) {
					best = key;
				}
			}
			return best;
		}
	}
});
