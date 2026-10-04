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
		cols: 8,
		rows: 8
	},

	"Cell@tridbchoco": {
		// 上向き三角形(△)かどうか (x+yが偶数のセル)
		isTriUp: function() {
			return !!(((this.bx + this.by) >> 1) & 1);
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
			return true;
		},

		isedgevalidbylinkobj: function(border) {
			var c1 = border.sidecell[0],
				c2 = border.sidecell[1];
			if (c1.isnull || c2.isnull || !c1.isTriAdjacentTo(c2)) {
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

		isedgevalidbylinkobj: function(border) {
			var c1 = border.sidecell[0],
				c2 = border.sidecell[1];
			if (c1.isnull || c2.isnull || !c1.isTriAdjacentTo(c2)) {
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
		inputborder: function() {
			var pos = this.getpos(0.35);
			if (this.prevPos.equals(pos)) {
				return;
			}

			var border = this.prevPos.getborderobj(pos);
			if (!border.isnull) {
				var c1 = border.sidecell[0],
					c2 = border.sidecell[1];
				if (c1.isnull || c2.isnull || !c1.isTriAdjacentTo(c2)) {
					this.prevPos = pos;
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
			}
			this.prevPos = pos;
		}
	},

	"Graphic@tridbchoco": {
		paint: function() {
			// 正三角形の大きさを盤面に合わせて計算する
			var bd = this.board;
			this.triS = (this.cw * bd.cols) / (bd.cols + 0.5 * bd.rows + 0.5);
			this.triH = this.triS * 0.866;
			this.triOX = this.cw / 2;
			this.triOY = Math.max(
				0,
				(this.ch * bd.rows - this.triH * (bd.rows + 0.5)) / 2
			);
			this.drawTriBGCells();
			this.drawTriGrid();
			this.drawTriChassis();
			this.drawTriBorders();
			this.drawBorderQsubs();
			this.drawPekes();
			this.drawTriQuesNumbers();
			this.drawTarget();
		},

		// 正三角形格子: セル(x,y)は x+y が偶数なら上向き、奇数なら下向きの
		// 正三角形。隣接するセルと辺を共有して密集する。
		// (S=三角形の一辺, H=S*√3/2)
		getTriVertices: function(cell) {
			var x = cell.bx >> 1,
				y = cell.by >> 1,
				S = this.triS,
				H = this.triH,
				ox = this.triOX,
				oy = this.triOY;
			if ((x + y) % 2 === 0) {
				// 上向き(頂点が上)
				return [
					[(x + 1) * S + (y * S) / 2 + ox, y * H + oy],
					[x * S + ((y + 1) * S) / 2 + ox, (y + 1) * H + oy],
					[(x + 1) * S + ((y + 1) * S) / 2 + ox, (y + 1) * H + oy]
				];
			}
			// 下向き(頂点が下)
			return [
				[x * S + (y * S) / 2 + ox, y * H + oy],
				[(x + 1) * S + (y * S) / 2 + ox, y * H + oy],
				[x * S + ((y + 1) * S) / 2 + ox, (y + 1) * H + oy]
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
				if (!!color) {
					g.fillStyle = color;
					this.drawTriPolygon(g, cell);
					g.fill();
				} else {
					g.vhide();
				}
			}
		},

		// 破線のグリッド(dbchocoと同じ書式)を三角形格子の辺に沿って描く。
		// 各辺は一度だけ描く(隣接セルと共有する辺はどちらか一方から)。
		getTriEdges: function(cell) {
			var v = this.getTriVertices(cell);
			return [
				[v[0], v[1]],
				[v[1], v[2]],
				[v[2], v[0]]
			];
		},

		drawTriGrid: function() {
			var g = this.vinc("grid", "crispEdges", true);
			var dasharray = this.getDashArray();
			g.lineWidth = this.gw;
			g.strokeStyle = this.gridcolor;
			var clist = this.range.cells;
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i],
					edges = this.getTriEdges(cell);
				for (var e = 0; e < 3; e++) {
					var v1 = edges[e][0],
						v2 = edges[e][1];
					// この辺を共有する三角隣接セルがこのセルより前なら描画済み
					var nb = this.getTriEdgeNeighbor(cell, v1, v2);
					if (
						nb &&
						(nb.bx < cell.bx || (nb.bx === cell.bx && nb.by < cell.by))
					) {
						continue;
					}
					g.vid = "g_tri_" + cell.id + "_" + e;
					g.strokeDashedLine(v1[0], v1[1], v2[0], v2[1], dasharray);
				}
			}
		},

		// 辺(v1,v2)を共有する隣接セルを返す
		getTriEdgeNeighbor: function(cell, v1, v2) {
			var adc = cell.adjacent;
			for (var d in adc) {
				var nb = adc[d];
				if (nb.isnull || !cell.isTriAdjacentTo(nb)) {
					continue;
				}
				var nv = this.getTriVertices(nb);
				var cnt = 0;
				for (var a = 0; a < 3; a++) {
					for (var b = 0; b < 2; b++) {
						var p = b === 0 ? v1 : v2;
						if (
							Math.abs(nv[a][0] - p[0]) < 0.01 &&
							Math.abs(nv[a][1] - p[1]) < 0.01
						) {
							cnt++;
						}
					}
				}
				if (cnt === 2) {
					return nb;
				}
			}
			return null;
		},

		// 外枠: 盤面の平行四辺形に沿って描く
		drawTriChassis: function() {
			var bd = this.board,
				g = this.vinc("chassis", "crispEdges", true),
				S = this.triS,
				H = this.triH,
				ox = this.triOX,
				oy = this.triOY,
				W = bd.cols,
				R = bd.rows;
			var x0 = ox,
				y0 = oy,
				x1 = ox + W * S + ((R - 1) * S) / 2 + S / 2,
				y1 = oy + R * H;
			var topRight = ox + W * S - S / 2,
				bottomLeft = ox + ((R - 1) * S) / 2 + S / 2;
			var lw = this.lw;
			g.fillStyle = this.quescolor;
			var lines = [
				[x0, y0, topRight, y0],
				[topRight, y0, x1, y1],
				[x1, y1, bottomLeft, y1],
				[bottomLeft, y1, x0, y0]
			];
			for (var i = 0; i < 4; i++) {
				g.vid = "chst_" + i;
				var l = lines[i],
					dx = l[2] - l[0],
					dy = l[3] - l[1],
					len = Math.sqrt(dx * dx + dy * dy) || 1;
				var nx = -dy / len,
					ny = dx / len;
				g.beginPath();
				g.moveTo(l[0] + nx * lw, l[1] + ny * lw);
				g.lineTo(l[2] + nx * lw, l[3] + ny * lw);
				g.lineTo(l[2] - nx * lw, l[3] - ny * lw);
				g.lineTo(l[0] - nx * lw, l[1] - ny * lw);
				g.closePath();
				g.fill();
			}
		},

		drawTriBorders: function() {
			var g = this.vinc("border", "crispEdges");
			var blist = this.range.borders;
			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];
				g.vid = "b_qans_" + border.id;
				if (border.qans === 1) {
					var c1 = border.sidecell[0],
						c2 = border.sidecell[1];
					if (c1.isnull || c2.isnull || !c1.isTriAdjacentTo(c2)) {
						g.vhide();
						continue;
					}
					var v1 = this.getTriVertices(c1),
						v2 = this.getTriVertices(c2),
						pts = [];
					for (var a = 0; a < 3; a++) {
						for (var b = 0; b < 3; b++) {
							if (v1[a][0] === v2[b][0] && v1[a][1] === v2[b][1]) {
								pts.push(v1[a]);
							}
						}
					}
					if (pts.length !== 2) {
						g.vhide();
						continue;
					}
					g.strokeStyle = this.getBorderColor_qans(border);
					g.lineWidth = Math.max(this.lw * 2, 2);
					g.beginPath();
					g.moveTo(pts[0][0], pts[0][1]);
					g.lineTo(pts[1][0], pts[1][1]);
					g.stroke();
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
				if (!!text) {
					g.fillStyle = this.getQuesNumberColor(cell);
					var c = this.getTriCenter(cell);
					this.disptext(text, c[0], c[1]);
				} else {
					g.vhide();
				}
			}
		}
	},

	"AnsCheck@tridbchoco": {
		checklist: [
			"checkSingleBlock",
			"checkSmallNumberArea",
			"checkLargeBlock",
			"checkEqualShapes",
			"checkLargeNumberArea",
			"checkBorderDeadend"
		],

		isEqualShapes: function(clist) {
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i],
					adc = cell.adjacent,
					adb = cell.adjborder;
				for (var d in adc) {
					var nb = adc[d];
					if (nb.isnull || !cell.isTriAdjacentTo(nb) || cell.ques === nb.ques) {
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

		// 三角形格子の合同(回転6種×鏡映)で正規化した形状の文字列を返す
		getTriShapeCanon: function(clist) {
			var pts = [];
			for (var i = 0; i < clist.length; i++) {
				pts.push([clist[i].bx >> 1, clist[i].by >> 1]);
			}
			var rots = [
				function(p) {
					return [p[0], p[1]];
				},
				function(p) {
					return [p[0] - p[1], p[0] + p[1]];
				},
				function(p) {
					return [-p[1], p[0]];
				},
				function(p) {
					return [-p[0], -p[1]];
				},
				function(p) {
					return [p[1] - p[0], -p[0]];
				},
				function(p) {
					return [p[1], -p[0] - p[1]];
				}
			];
			var mirror = function(p) {
				return [p[0] + p[1], -p[1]];
			};

			var best = null;
			for (var m = 0; m < 2; m++) {
				for (var r = 0; r < 6; r++) {
					var rot = rots[r];
					var t = pts.map(
						m
							? function(p) {
									return rot(mirror(p));
							  }
							: rot
					);
					var minx = Infinity,
						miny = Infinity;
					for (var j = 0; j < t.length; j++) {
						if (t[j][0] < minx) {
							minx = t[j][0];
						}
						if (t[j][1] < miny) {
							miny = t[j][1];
						}
					}
					for (var j2 = 0; j2 < t.length; j2++) {
						t[j2] = [t[j2][0] - minx, t[j2][1] - miny];
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
			}
			return best;
		}
	}
});
