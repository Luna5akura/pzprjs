//
// パズル固有スクリプト部 ユニークぬりかべ版 uniqnurikabe.js
//
// ぬりかべのルールに加えて、それぞれの島 (白マスのカタマリ) の形が
// すべて異なること (回転・反転して同じになる形は同じ形とみなす)。
//
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["uniqnurikabe"], {
	//---------------------------------------------------------
	// マウス入力系
	MouseEvent: {
		use: true,
		inputModes: {
			edit: ["number", "clear", "info-blk"],
			play: ["shade", "unshade", "info-blk"]
		},
		autoedit_func: "qnum",
		autoplay_func: "cell"
	},

	//---------------------------------------------------------
	// キーボード入力系
	KeyEvent: {
		enablemake: true
	},

	//---------------------------------------------------------
	// 盤面管理系
	Cell: {
		numberRemainsUnshaded: true
	},

	AreaShadeGraph: {
		enabled: true,
		coloring: true
	},
	AreaUnshadeGraph: {
		enabled: true
	},

	//---------------------------------------------------------
	// 画像表示系
	Graphic: {
		numbercolor_func: "qnum",
		qanscolor: "black",

		irowakeblk: true,

		paint: function() {
			this.drawBGCells();
			this.drawShadedCells();
			this.drawDotCells();
			this.drawGrid();

			this.drawQuesNumbers();

			this.drawChassis();

			this.drawTarget();
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
			"check2x2ShadeCell",
			"checkNoNumberInUnshade",
			"checkConnectShade",
			"checkDoubleNumberInUnshade",
			"checkNumberAndUnshadeSize",
			"doneShadingDecided",
			"checkUniqueShapes"
		],

		checkNoNumberInUnshade: function() {
			this.checkAllBlock(
				this.board.ublkmgr,
				function(cell) {
					return cell.isNum();
				},
				function(w, h, a, n) {
					return a !== 0;
				},
				"bkNoNum"
			);
		},
		checkDoubleNumberInUnshade: function() {
			this.checkAllBlock(
				this.board.ublkmgr,
				function(cell) {
					return cell.isNum();
				},
				function(w, h, a, n) {
					return a < 2;
				},
				"bkNumGe2"
			);
		},
		checkNumberAndUnshadeSize: function() {
			this.checkAllArea(
				this.board.ublkmgr,
				function(w, h, a, n) {
					return n <= 0 || n === a;
				},
				"bkSizeNe"
			);
		},

		// 島 (白マスのカタマリ) の形がすべて異なること。
		// 回転・反転して同じになる形は同じ形とみなす。
		checkUniqueShapes: function() {
			var areas = this.board.ublkmgr.components,
				seen = {},
				dup = null;
			for (var id = 0; id < areas.length; id++) {
				var clist = areas[id].clist,
					top = !!areas[id].top ? areas[id].top : clist.getQnumCell();
				if (top.isnull || top.qnum <= 0) {
					continue; /* 数字のない島は別の判定に任せる */
				}
				var key = this.getIslandShapeKey(clist);
				if (!!seen[key]) {
					dup = key;
					this.failcode.add("nuShapeDup");
					if (this.checkOnly) {
						return;
					}
					break;
				}
				seen[key] = true;
			}
			if (!!dup && !this.checkOnly) {
				/* 同じ形の島をすべてエラー表示する */
				for (var id2 = 0; id2 < areas.length; id2++) {
					var clist2 = areas[id2].clist;
					if (this.getIslandShapeKey(clist2) === dup) {
						clist2.seterr(1);
					}
				}
			}
		},

		// 島の形の正規形キーを返す。8種類の回転・反転のうち
		// 平行移動で正規化した座標列が辞書順最小になるものを採用する。
		getIslandShapeKey: function(clist) {
			var pts = [];
			for (var i = 0; i < clist.length; i++) {
				pts.push([clist[i].bx, clist[i].by]);
			}
			var keys = [];
			for (var t = 0; t < 8; t++) {
				var tpts = [];
				for (var i = 0; i < pts.length; i++) {
					var x = pts[i][0],
						y = pts[i][1];
					if (t & 4) {
						x = -x; /* 反転 */
					}
					var r = t & 3;
					for (var j = 0; j < r; j++) {
						var nx = y,
							ny = -x; /* 90度回転 */
						x = nx;
						y = ny;
					}
					tpts.push([x, y]);
				}
				var minx = tpts[0][0],
					miny = tpts[0][1];
				for (var i = 1; i < tpts.length; i++) {
					if (tpts[i][0] < minx) {
						minx = tpts[i][0];
					}
					if (tpts[i][1] < miny) {
						miny = tpts[i][1];
					}
				}
				var strs = [];
				for (var i = 0; i < tpts.length; i++) {
					strs.push(tpts[i][0] - minx + ":" + (tpts[i][1] - miny));
				}
				strs.sort();
				keys.push(strs.join("/"));
			}
			keys.sort();
			return keys[0];
		}
	}
});
