//
// パズル固有スクリプト部 ヘックスましゅ版 hexmasyu.js
//
// 盤面は六角形マスのハニカム格子。マスの中央を通る線で一つの輪を作る。
// 白丸・黒丸のルールは通常のましゅと同じ:
// - 白丸: 線は白丸の上で直進し、白丸の隣のマスの片方もしくは両方で曲がる
// - 黒丸: 線は黒丸の上で曲がり、黒丸の隣のマスでは直進する
//
// 六角形マスの座標系 (cspuz の hex モジュールと同じ):
//   (y, x) の隣接マスは
//     右 (y, x+1), 左 (y, x-1),
//     下左 (y+1, x), 下右 (y+1, x+1),
//     上右 (y-1, x), 上左 (y-1, x-1)
// 画面座標: px = (x - y/2) * S, py = y * T (T = S * √3/2)
//
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["hexmasyu"], {
	//---------------------------------------------------------
	// マウス入力系
	MouseEvent: {
		inputModes: {
			edit: ["circle-shade", "circle-unshade", "undef", "clear", "info-line"],
			play: ["line", "peke", "info-line"]
		},

		autoedit_func: "qnum",
		autoplay_func: "line",

		//---------------------------------------------------------------------------
		// 六角形格子へのマウス座標変換
		//---------------------------------------------------------------------------
		mousereset: function() {
			this.common.mousereset.call(this);
			this.prevPekeEdge = null;
			this.prevLineEdge = null;
			this.prevLineCell = null;
		},

		//---------------------------------------------------------------------------
		// inputqnum() 1回のクリックで直接入力する
		//              左クリック: 白丸 (既に白丸なら消去)
		//              右クリック: 黒丸 (既に黒丸なら消去)
		//---------------------------------------------------------------------------
		inputqnum: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				return;
			}
			this.mouseCell = cell;
			var val;
			if (this.btn === "right") {
				val = cell.qnum === 2 ? -1 : 2;
			} else {
				val = cell.qnum === 1 ? -1 : 1;
			}
			cell.setNum(val);
			cell.draw();
		},

		// マウス位置 (inputPoint) を含む六角形セルを返す。
		// inputPoint は getBoardAddress が返す盤面座標で、すでに pc.x0/pc.y0
		// が引かれている (描画側の translate/viewBox オフセットと対応済み)。
		// ここで x0/y0 を足し戻すとマッピングが半セルずれてしまう。
		getHexCell: function() {
			var pc = this.puzzle.painter;
			pc.computeHexMetrics();
			var px = this.inputPoint.bx * pc.bw;
			var py = this.inputPoint.by * pc.bh;
			return this.getHexCellAtXY(px, py);
		},

		getHexCellAtXY: function(px, py) {
			var pc = this.puzzle.painter;
			var fy = (py - pc.hexOY) / pc.hexT;
			var fx = (px - pc.hexOX) / pc.hexS + fy / 2;

			// 最近傍セルを cube rounding で求める。
			// この格子は基底 R=(1,0), BL=(-1/2,√3/2) (S単位) で張られ、
			// セル中心は (u, v) = (x - y/2, y·√3/2)。120°ずつ回転した
			// 等長の cube 基底 (長さ 1/√3) での座標は
			//   a = u - v/√3,  b = 2v/√3,  c = -u - v/√3
			// で、round 後のセルは (x, y) = (a + b, b) になる。
			// ここで v = fy·√3/2 なので、fy で書き直すと
			//   a = u - fy/2,  b = fy,  c = -u - fy/2
			// となる。
			var u = fx - fy / 2;
			var ca = u - fy / 2;
			var cb = fy;
			var cc = -u - fy / 2;
			var ra = Math.round(ca),
				rb = Math.round(cb),
				rc = Math.round(cc);
			var da = Math.abs(ra - ca),
				db = Math.abs(rb - cb),
				dc = Math.abs(rc - cc);
			if (da > db && da > dc) {
				ra = -rb - rc;
			} else if (db > dc) {
				rb = -ra - rc;
			} else {
				rc = -ra - rb;
			}

			var cell = this.board.getHexCell(ra + rb, rb);
			if (!cell.isnull && !cell.isHexInBoard()) {
				return this.board.emptycell;
			}
			return cell;
		},

		// マウス位置に最も近い六角形の辺を返す
		getHexEdgeAtMouse: function() {
			var pc = this.puzzle.painter;
			pc.computeHexMetrics();
			// getHexCell と同様、inputPoint にはすでに x0/y0 が織り込まれている
			var px = this.inputPoint.bx * pc.bw;
			var py = this.inputPoint.by * pc.bh;

			var bd = this.board,
				best = null,
				bestd = pc.hexS * 0.4;
			for (var i = 0; i < bd.hexedges.length; i++) {
				var edge = bd.hexedges[i],
					c1 = edge.sideobj[0],
					off = pc.getHexEdgeMidOffset(edge.dir1);
				var mx = pc.getHexCX(c1) + off[0],
					my = pc.getHexCY(c1) + off[1];
				var dx = mx - px,
					dy = my - py;
				var d = Math.sqrt(dx * dx + dy * dy);
				if (d < bestd) {
					bestd = d;
					best = edge;
				}
			}
			return best;
		},

		//---------------------------------------------------------------------------
		// getcell() 六角形マスを返すようにオーバーライド
		//---------------------------------------------------------------------------
		getcell: function() {
			return this.getHexCell();
		},

		//---------------------------------------------------------------------------
		// e_mousedown() ポインタキャプチャを設定してから共通処理を呼ぶ。
		// 小さいウィンドウでは盤面の下端がキャンバスの下端に接しており、
		// キャプチャがないとドラッグがキャンバス外に出た瞬間に move/up が
		// 失われて mouseup が届かず、inputData が古いまま残って次のドラッグの
		// 描画/消去が逆転するなどの不具合が起きる。
		//---------------------------------------------------------------------------
		e_mousedown: function(e) {
			if (
				e.pointerId !== void 0 &&
				this.puzzle.canvas &&
				this.puzzle.canvas.setPointerCapture
			) {
				try {
					this.puzzle.canvas.setPointerCapture(e.pointerId);
				} catch (err) {}
			}
			return this.common.e_mousedown.call(this, e);
		},

		//---------------------------------------------------------------------------
		// inputLine() 線の入力
		//   マス中心から別のマス中心へドラッグすると、その2マスの間の辺に
		//   線を引く (マス目をなぞるように連続して引ける)。
		//   マウスダウンした位置は最寄りのマス中心にスナップし、
		//   ドラッグ中にマスが変わったときに前のマスとの間の辺を切り替える。
		//---------------------------------------------------------------------------
		inputLine: function() {
			var cell = this.getcell();
			if (cell.isnull) {
				return;
			}

			// ドラッグ開始: 始点のマスを記録するだけ
			if (this.mousestart || !this.prevLineCell) {
				this.prevLineCell = cell;
				return;
			}

			if (cell === this.prevLineCell) {
				return;
			}

			var edge = this.prevLineCell.getHexEdgeTo(cell);
			this.prevLineCell = cell;
			if (!edge) {
				return;
			}

			if (this.inputData === null) {
				this.inputData = edge.isLine() ? 0 : 1;
			}
			if (this.inputData === 1) {
				edge.setLine();
			} else if (this.inputData === 0) {
				edge.removeLine();
			}
		},

		//---------------------------------------------------------------------------
		// inputpeke() 線が通らないことを示す×を入力する (六角形の辺バージョン)
		//---------------------------------------------------------------------------
		inputpeke: function() {
			var edge = this.getHexEdgeAtMouse();
			if (!edge || edge === this.prevPekeEdge) {
				return;
			}
			this.prevPekeEdge = edge;

			if (this.inputData === null) {
				this.inputData = edge.qsub !== 2 ? 2 : 3;
			}
			if (this.inputData === 2 && edge.isLine()) {
				edge.removeLine();
			} else if (this.inputData === 2) {
				edge.setPeke();
			} else if (this.inputData === 3) {
				edge.removeLineAndQsub();
			}
		},

		//---------------------------------------------------------------------------
		// dispInfoLine() ひとつながりの線を赤く表示する
		//---------------------------------------------------------------------------
		dispInfoLine: function() {
			var bd = this.board;
			var edge = this.getHexEdgeAtMouse();
			this.mousereset();
			if (!edge) {
				return;
			}

			if (!edge.isLine()) {
				var cell = this.getHexCell();
				if (cell.isnull) {
					return;
				}
				var dirs = ["R", "L", "TR", "TL", "BL", "BR"],
					e2 = null;
				for (var i = 0; i < 6; i++) {
					var e = cell.getHexEdge(dirs[i]);
					if (!!e && e.isLine()) {
						e2 = e;
						break;
					}
				}
				if (!e2) {
					return;
				}
				edge = e2;
			}

			for (var i = 0; i < bd.hexedges.length; i++) {
				bd.hexedges[i].setinfo(-1);
			}
			edge.path.setedgeinfo(1);
			bd.hasinfo = true;
			this.puzzle.redraw();
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
		numberAsObject: true,

		maxnum: 2,

		// 6方向の辺 (Board.initHexEdges で設定される)
		hexedges: null,

		getHexEdge: function(dir) {
			return this.hexedges[dir];
		},

		// 六角形盤面の中のセルかどうか
		isHexInBoard: function() {
			return this.board.isHexInBoard((this.bx - 1) / 2, (this.by - 1) / 2);
		},

		// 線が向かい合う2辺を通っているか (直進)
		isHexLineStraight: function() {
			if (this.lcnt !== 2) {
				return false;
			}
			var e = this.hexedges;
			return (
				(!!e.R && e.R.isLine() && !!e.L && e.L.isLine()) ||
				(!!e.TR && e.TR.isLine() && !!e.BL && e.BL.isLine()) ||
				(!!e.TL && e.TL.isLine() && !!e.BR && e.BR.isLine())
			);
		},

		// 線が向かい合わない2辺を通っているか (カーブ)
		isHexLineTurn: function() {
			return this.lcnt === 2 && !this.isHexLineStraight();
		},

		// このセルで実際に線が通っている2方向を返す
		getHexLineDirs: function() {
			var dirs = ["R", "L", "TR", "TL", "BL", "BR"],
				ret = [];
			for (var i = 0; i < 6; i++) {
				var e = this.hexedges[dirs[i]];
				if (!!e && e.isLine()) {
					ret.push(dirs[i]);
				}
			}
			return ret;
		},

		// 辺の反対側のセルを返す
		getHexEdgeNeighbor: function(edge) {
			return edge.sideobj[0] === this ? edge.sideobj[1] : edge.sideobj[0];
		},

		// 隣接する2セルを共有する辺を返す (隣接していなければnull)
		getHexEdgeTo: function(cell) {
			var dirs = ["R", "L", "TR", "TL", "BL", "BR"];
			for (var i = 0; i < 6; i++) {
				var e = this.hexedges[dirs[i]];
				if (!!e && this.getHexEdgeNeighbor(e) === cell) {
					return e;
				}
			}
			return null;
		},

		//---------------------------------------------------------------------------
		// cell.setHexCellLineError() セルと周りの辺にエラーフラグを設定する
		//---------------------------------------------------------------------------
		setHexCellLineError: function(flag) {
			if (flag) {
				this.seterr(1);
			}
			var dirs = ["R", "L", "TR", "TL", "BL", "BR"];
			for (var i = 0; i < 6; i++) {
				var e = this.hexedges[dirs[i]];
				if (!!e) {
					e.seterr(1);
				}
			}
		}
	},

	Board: {
		cols: 9,
		rows: 9,

		initBoardSize: function(col, row) {
			this.hexedges = [];
			this.common.initBoardSize.call(this, col, row);
			this.initHexEdges();
			this.rebuildInfo();
		},

		//---------------------------------------------------------------------------
		// 六角形盤面の領域は矩形グリッドの寸法から導出する
		// (triangular double choco の getTriRegion と同様の方式):
		//   盤内 = -b < y - x < a,  a = cols/2 + 1 (切り捨て), b = rows/2 + 1
		// 正六角形 (1辺 n) は 2n-1 x 2n-1 のグリッド (a = b = n) に対応する。
		//---------------------------------------------------------------------------
		getHexSides: function() {
			return { a: (this.cols >> 1) + 1, b: (this.rows >> 1) + 1 };
		},

		isHexRegular: function() {
			var s = this.getHexSides();
			return s.a === s.b && this.cols === 2 * s.a - 1 && this.rows === 2 * s.b - 1;
		},

		// (x, y) = 六角形座標 (セル列, セル行)。六角形盤面の中かどうか。
		isHexInBoard: function(x, y) {
			if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) {
				return false;
			}
			var s = this.getHexSides();
			var d = y - x;
			return -s.b < d && d < s.a;
		},

		// 六角形盤面のセルを行優先順で返す
		getHexInBoardCells: function() {
			var ret = [];
			for (var y = 0; y < this.rows; y++) {
				for (var x = 0; x < this.cols; x++) {
					if (this.isHexInBoard(x, y)) {
						ret.push(this.getHexCell(x, y));
					}
				}
			}
			return ret;
		},

		//---------------------------------------------------------------------------
		// 六角形の隣接関係から辺オブジェクトを生成する (盤内のセル同士のみ)
		//---------------------------------------------------------------------------
		initHexEdges: function() {
			var bd = this,
				edges = [];
			for (var c = 0; c < bd.cell.length; c++) {
				bd.cell[c].hexedges = { R: null, L: null, TR: null, TL: null, BL: null, BR: null };
			}

			var makeEdge = function(c1, d1, c2, d2) {
				var edge = new bd.klass.HexEdge(edges.length);
				edge.board = bd;
				edge.group = "hexedges";
				edge.sideobj = [c1, c2];
				edge.dir1 = d1;
				edge.dir2 = d2;
				edges.push(edge);
				c1.hexedges[d1] = edge;
				c2.hexedges[d2] = edge;
				return edge;
			};

			for (var y = 0; y < bd.rows; y++) {
				for (var x = 0; x < bd.cols; x++) {
					if (!bd.isHexInBoard(x, y)) {
						continue;
					}
					var cell = bd.getHexCell(x, y);
					if (bd.isHexInBoard(x + 1, y)) {
						makeEdge(cell, "R", bd.getHexCell(x + 1, y), "L");
					}
					if (bd.isHexInBoard(x, y + 1)) {
						makeEdge(cell, "BL", bd.getHexCell(x, y + 1), "TR");
					}
					if (bd.isHexInBoard(x + 1, y + 1)) {
						makeEdge(cell, "BR", bd.getHexCell(x + 1, y + 1), "TL");
					}
				}
			}

			bd.hexedges = edges;
		},

		// 六角形マスの座標 (x, y) からセルを取得する
		getHexCell: function(x, y) {
			return this.getc(2 * x + 1, 2 * y + 1);
		},

		// セルと方向から辺を取得する
		getHexEdgeByDir: function(cell, dir) {
			return cell.hexedges[dir] || null;
		},

		// 隣接する2セル間の方向を返す (隣接していなければnull)
		getHexDirBetween: function(c1, c2) {
			// セルの bx/by は2倍の表示座標なので半分にして比較する
			var dy = (c2.by - c1.by) / 2,
				dx = (c2.bx - c1.bx) / 2;
			if (dy === 0 && dx === 1) {
				return "R";
			}
			if (dy === 0 && dx === -1) {
				return "L";
			}
			if (dy === 1 && dx === 0) {
				return "BL";
			}
			if (dy === 1 && dx === 1) {
				return "BR";
			}
			if (dy === -1 && dx === 0) {
				return "TR";
			}
			if (dy === -1 && dx === -1) {
				return "TL";
			}
			return null;
		},

		//---------------------------------------------------------------------------
		// 盤面の拡大・縮小 (adjust)。どの方向ボタンでも正六角形を保つ:
		//   拡大 = 1辺 +1 (盤面全体が1周大きくなる)
		//   縮小 = 1辺 -1 (盤面全体が1周小さくなり、盤外に出た丸は消える)
		// 回転・反転 (turnflip) は BoardExec 側の六角形対称変換を使う。
		//---------------------------------------------------------------------------
		operate: function(type) {
			if (this.trialstage > 0 && this.exec.isBoardOp(type)) {
				throw Error("board operations are not possible in trial mode");
			}
			if (!this.exec.boardtype[type]) {
				return;
			}

			// 回転・反転は通常の execadjust 経由 (正六角形の対称変換)
			if (type.indexOf("turn") === 0 || type.indexOf("flip") === 0) {
				this.common.operate.call(this, type);
				return;
			}

			var expand = type.indexOf("expand") === 0;
			var s = this.getHexSides();
			var n = Math.max(s.a, s.b);
			var newn = expand ? n + 1 : n - 1;
			if (newn < 1) {
				return;
			}

			var before = this.getHexBoardSnapshot();
			this.puzzle.opemgr.newOperation();
			this.applyHexResize(newn);
			var after = this.getHexBoardSnapshot();
			this.puzzle.opemgr.add(new this.klass.HexResizeOperation(before, after));
		},

		//---------------------------------------------------------------------------
		// 履歴 (undo/redo) を消さずに盤面を作り直す。
		// 通常の initBoardSize は最後に opemgr.allerase() を呼ぶため、
		// adjust の拡大・縮小でそのまま使うと履歴が消えてしまう。
		//---------------------------------------------------------------------------
		rebuildHexBoard: function(side) {
			var om = this.puzzle.opemgr;
			var saved = {
				history: om.history,
				position: om.position,
				lastope: om.lastope,
				broken: om.broken,
				initpos: om.initpos,
				changeflag: om.changeflag,
				chainflag: om.chainflag,
				trialpos: om.trialpos,
				limitTrialUndo: om.limitTrialUndo
			};
			this.initBoardSize(2 * side - 1, 2 * side - 1);
			om.history = saved.history;
			om.position = saved.position;
			om.lastope = saved.lastope;
			om.broken = saved.broken;
			om.initpos = saved.initpos;
			om.changeflag = saved.changeflag;
			om.chainflag = saved.chainflag;
			om.trialpos = saved.trialpos;
			om.limitTrialUndo = saved.limitTrialUndo;
			om.checkenable();
		},

		// 盤面の白丸・黒丸の配置をスナップショットする
		getHexBoardSnapshot: function() {
			var ret = { side: this.getHexSides().a, pearls: [] };
			var cells = this.getHexInBoardCells();
			for (var i = 0; i < cells.length; i++) {
				var c = cells[i];
				if (c.qnum !== -1) {
					ret.pearls.push({
						x: (c.bx - 1) / 2,
						y: (c.by - 1) / 2,
						qnum: c.qnum
					});
				}
			}
			return ret;
		},

		// 正六角形を指定した1辺の長さで作り直し、丸の配置を復元する
		applyHexResize: function(side) {
			var pearls = this.getHexBoardSnapshot().pearls;
			var cw = this.puzzle.painter.cw;
			this.rebuildHexBoard(side);
			var om = this.puzzle.opemgr;
			om.disableRecord();
			for (var i = 0; i < pearls.length; i++) {
				var p = pearls[i];
				if (this.isHexInBoard(p.x, p.y)) {
					this.getHexCell(p.x, p.y).setQnum(p.qnum);
				}
			}
			om.enableRecord();
			// キャンバスを新しい盤面サイズに作り直す (セルサイズは維持)。
			// 普通の redraw だと縮小時に古いセルの描画が残ってしまう。
			this.puzzle.setCanvasSizeByCellSize(cw, true);
			this.puzzle.redraw(true);
		},

		// エラーが設定されていない辺に noerr を設定する
		hexedgesSetNoErr: function() {
			for (var i = 0; i < this.hexedges.length; i++) {
				if (this.hexedges[i].err === 0) {
					this.hexedges[i].err = -1;
				}
			}
		},

		errclear: function() {
			var isclear = this.common.errclear.call(this);
			if (isclear) {
				for (var i = 0; i < this.hexedges.length; i++) {
					this.hexedges[i].err = 0;
				}
			}
			return isclear;
		},

		trialclear: function(forcemode) {
			this.common.trialclear.call(this, forcemode);
			if (this.trialstage > 0 || !!forcemode) {
				for (var i = 0; i < this.hexedges.length; i++) {
					this.hexedges[i].trial = 0;
				}
			}
		}
	},

	//---------------------------------------------------------
	// 六角形の辺オブジェクト (線・ペケを保持する)
	HexEdge: {
		initialize: function(id) {
			this.id = id;
		},

		board: null,
		sideobj: null,
		group: "hexedges",
		dir1: "",
		dir2: "",
		line: 0,
		qsub: 0,
		trial: 0,
		err: 0,
		info: 0,
		path: null,

		isLine: function() {
			return !!this.line;
		},

		setLineVal: function(val, force) {
			if (!force && this.line === val) {
				return;
			}
			if (!force) {
				this.addOpe("line", this.line, val);
			}
			this.line = val;

			var trialstage = this.board.trialstage;
			if (trialstage > 0) {
				this.trial = trialstage;
			}
			if (val && this.qsub === 2) {
				this.qsub = 0;
			}

			this.board.linegraph.setEdgeByLinkObj(this);
			this.puzzle.checker.resetCache();
			this.puzzle.painter.paintAll();
		},
		setLine: function() {
			this.setLineVal(1);
		},
		removeLine: function() {
			this.setLineVal(0);
		},

		setQsubVal: function(val, force) {
			if (!force && this.qsub === val) {
				return;
			}
			if (!force) {
				this.addOpe("qsub", this.qsub, val);
			}
			this.qsub = val;
			this.puzzle.checker.resetCache();
			this.puzzle.painter.paintAll();
		},
		setPeke: function() {
			this.setQsubVal(2);
		},
		removeLineAndQsub: function() {
			if (this.isLine()) {
				this.setLineVal(0);
			}
			if (this.qsub !== 0) {
				this.setQsubVal(0);
			}
		},

		addOpe: function(prop, old, num) {
			this.puzzle.opemgr.add(new this.klass.HexEdgeOperation(this, prop, old, num));
		},

		seterr: function(num) {
			if (this.board.isenableSetError()) {
				this.err = num;
			}
		},
		setinfo: function(num) {
			this.info = num;
		}
	},

	"HexEdgeOperation:Operation": {
		setData: function(edge, prop, old, num) {
			this.edgeid = edge.id;
			this.prop = prop;
			this.old = old;
			this.num = num;
		},

		isModify: function(lastope) {
			return (
				lastope instanceof this.klass.HexEdgeOperation &&
				lastope.edgeid === this.edgeid &&
				lastope.prop === this.prop &&
				this.num === lastope.old
			);
		},
		isNoop: function() {
			return this.num === this.old;
		},

		exec: function(num) {
			var edge = this.board.hexedges[this.edgeid];
			if (this.prop === "line") {
				edge.setLineVal(num, true);
			} else if (this.prop === "qsub") {
				edge.setQsubVal(num, true);
			}
		}
	},

	//---------------------------------------------------------------------------
	// 盤面の拡大・縮小・回転・反転 (adjust/turnflip)。
	// 拡大・縮小は通常の矩形グリッド処理を使い、六角形の領域は
	// グリッド寸法から導出し直される (triangular double choco と同様)。
	// 正六角形の回転・反転は六角形格子の対称性 (60度回転・対角線反転) を使う。
	//---------------------------------------------------------------------------
	"BoardExec": {
		execadjust: function(name) {
			var bd = this.board;
			this.common.execadjust.call(this, name);
			// セルの座標が変わったので六角形の辺を再構築する
			bd.initHexEdges();
			bd.rebuildInfo();
			bd.puzzle.redraw();
		},

		execadjust_main: function(key, d) {
			var bd = this.board;
			if (key & this.TURNFLIP) {
				if (bd.isHexRegular()) {
					this.hexTurnflip(key);
				} else {
					// 変則六角形は矩形の回転・反転 (盤外に出た丸は消える)
					this.common.execadjust_main.call(this, key, d);
				}
			} else {
				this.common.execadjust_main.call(this, key, d);
			}
			bd.initHexEdges();
		},

		//---------------------------------------------------------------------------
		// 正六角形の回転・反転: 六角形格子の対称変換で丸を移動する
		//   TURNL: 60度左回転, TURNR: 60度右回転
		//   FLIPX: 左右反転,   FLIPY: 上下反転
		//---------------------------------------------------------------------------
		hexTurnflip: function(key) {
			var bd = this.board,
				n = bd.getHexSides().a;

			// 戻り値は [x', y'] (getHexCell(x, y) の座標系)
			var map = null;
			if (key === this.TURNL) {
				// 60度左回転: 左上の頂点は左の頂点へ
				map = function(y, x) {
					return [y, y - x + n - 1];
				};
			} else if (key === this.TURNR) {
				// 60度右回転: 左上の頂点は右上の頂点へ
				map = function(y, x) {
					return [x - y + n - 1, x];
				};
			} else if (key === this.FLIPX) {
				// 左右反転: 左上と右上が入れ替わる
				map = function(y, x) {
					return [y - x + n - 1, y];
				};
			} else if (key === this.FLIPY) {
				// 上下反転: 左上と下の頂点が入れ替わる
				map = function(y, x) {
					return [x + n - 1 - y, 2 * n - 2 - y];
				};
			}

			var pearls = [];
			var cells = bd.getHexInBoardCells();
			for (var i = 0; i < cells.length; i++) {
				if (cells[i].qnum !== -1) {
					pearls.push({
						y: (cells[i].by - 1) / 2,
						x: (cells[i].bx - 1) / 2,
						qnum: cells[i].qnum
					});
				}
			}

			var om = bd.puzzle.opemgr;
			om.disableRecord();
			for (var c = 0; c < cells.length; c++) {
				if (cells[c].qnum !== -1) {
					cells[c].setQnum(-1);
				}
			}
			for (var j = 0; j < pearls.length; j++) {
				var np = map(pearls[j].y, pearls[j].x);
				if (bd.isHexInBoard(np[0], np[1])) {
					bd.getHexCell(np[0], np[1]).setQnum(pearls[j].qnum);
				}
			}
			om.enableRecord();
		}
	},

	// 盤面の拡大・縮小の undo/redo 用操作
	"HexResizeOperation:Operation": {
		setData: function(before, after) {
			this.old = before;
			this.num = after;
		},

		isNoop: function() {
			return false;
		},

		exec: function(state) {
			var bd = this.board,
				pearls = state.pearls,
				om = bd.puzzle.opemgr;
			var cw = bd.puzzle.painter.cw;
			bd.rebuildHexBoard(state.side);
			om.disableRecord();
			for (var i = 0; i < pearls.length; i++) {
				var p = pearls[i];
				if (bd.isHexInBoard(p.x, p.y)) {
					bd.getHexCell(p.x, p.y).setQnum(p.qnum);
				}
			}
			om.enableRecord();
			bd.puzzle.setCanvasSizeByCellSize(cw, true);
			bd.puzzle.redraw(true);
		}
	},

	// adjust/turnflip の undo/redo でも六角形の辺を再構築する
	// (共通 BoardAdjustOperation を継承して exec だけ差し替える)
	"BoardAdjustOperation:BoardAdjustOperation": {
		exec: function(num) {
			var bd = this.board;
			var d = { x1: 0, y1: 0, x2: 2 * bd.cols, y2: 2 * bd.rows };
			bd.exec.execadjust_main(num, d);
			bd.initHexEdges();
			bd.rebuildInfo();
			this.puzzle.redraw();
		}
	},

	LineGraph: {
		enabled: true,

		relation: {},
		linkgroup: "hexedges",
		isLineCross: false,

		isedgevalidbylinkobj: function(edge) {
			return edge.isLine();
		}
	},

	//---------------------------------------------------------
	// 画像表示系
	Graphic: {
		irowake: true,

		gridcolor_type: "LIGHT",

		SQRT3_2: 0.8660254037844386,

		//---------------------------------------------------------------------------
		// 六角形の盤面は正方形マスの盤面より横長になるので、
		// キャンバスの縦横比を盤面に合わせる (領域はグリッド寸法から導出)
		//---------------------------------------------------------------------------
		margin: 0.5,

		getBoardCols: function() {
			var bd = this.board,
				s = bd.getHexSides();
			return (bd.cols + s.a + s.b - 1) / 2;
		},
		getBoardRows: function() {
			return (this.board.rows + 1 / 3) * this.SQRT3_2;
		},

		//---------------------------------------------------------------------------
		// 六角形格子の寸法と位置を計算する
		//---------------------------------------------------------------------------
		computeHexMetrics: function() {
			var bd = this.board;
			var S = (this.hexS = this.cw);
			var T = (this.hexT = S * this.SQRT3_2);
			var canvasW = this.canvasWidth || this.getCanvasCols() * S;
			var canvasH = this.canvasHeight || this.getCanvasRows() * T;
			var s = bd.getHexSides();
			var boardW = ((bd.cols + s.a + s.b - 1) / 2) * S;
			var boardH = (bd.rows + 1 / 3) * T;
			this.hexOX = (canvasW - boardW) / 2 + (s.a / 2) * S;
			this.hexOY = (canvasH - boardH) / 2 + (2 / 3) * T;
		},

		// セルの中心座標 (bx/by は2倍の表示座標)
		getHexCX: function(cell) {
			return this.hexOX + ((2 * cell.bx - cell.by - 1) / 4) * this.hexS;
		},
		getHexCY: function(cell) {
			return this.hexOY + ((cell.by - 1) / 2) * this.hexT;
		},

		// 六角形の頂点 (中心からの相対座標)
		getHexVertexOffsets: function() {
			var S = this.hexS,
				T = this.hexT;
			return [
				[S / 2, -T / 3],
				[S / 2, T / 3],
				[0, (2 * T) / 3],
				[-S / 2, T / 3],
				[-S / 2, -T / 3],
				[0, (-2 * T) / 3]
			];
		},

		// 方向ごとの辺の両端 (中心からの相対座標)
		getHexEdgeOffsets: function(dir) {
			var S = this.hexS,
				T = this.hexT;
			var o = {
				R: [
					[S / 2, -T / 3],
					[S / 2, T / 3]
				],
				TR: [
					[S / 2, -T / 3],
					[0, (-2 * T) / 3]
				],
				TL: [
					[0, (-2 * T) / 3],
					[-S / 2, -T / 3]
				],
				L: [
					[-S / 2, -T / 3],
					[-S / 2, T / 3]
				],
				BL: [
					[-S / 2, T / 3],
					[0, (2 * T) / 3]
				],
				BR: [
					[0, (2 * T) / 3],
					[S / 2, T / 3]
				]
			};
			return o[dir];
		},

		// 方向ごとの辺の中点 (中心からの相対座標)
		getHexEdgeMidOffset: function(dir) {
			var S = this.hexS,
				T = this.hexT;
			var o = {
				R: [S / 2, 0],
				TR: [S / 4, -T / 2],
				TL: [-S / 4, -T / 2],
				L: [-S / 2, 0],
				BL: [-S / 4, T / 2],
				BR: [S / 4, T / 2]
			};
			return o[dir];
		},

		// セルの六角形パスを描画する
		drawHexPolygonPath: function(g, cell) {
			var v = this.getHexVertexOffsets(),
				cx = this.getHexCX(cell),
				cy = this.getHexCY(cell);
			g.beginPath();
			g.moveTo(cx + v[0][0], cy + v[0][1]);
			for (var i = 1; i < 6; i++) {
				g.lineTo(cx + v[i][0], cy + v[i][1]);
			}
			g.closePath();
		},

		//---------------------------------------------------------------------------
		// キャンバス全体を背景色で塗る (盤面の形がキャンバスと一致しないため)
		//---------------------------------------------------------------------------
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

		paint: function() {
			this.computeHexMetrics();
			this.drawHexGrid();
			this.drawHexCircles();
			this.drawHexPekes();
			this.drawHexLines();
			this.drawHexChassis();
			this.drawTarget();
		},

		//---------------------------------------------------------------------------
		// 破線の六角形グリッド
		//---------------------------------------------------------------------------
		drawHexGrid: function() {
			var g = this.vinc("grid", "crispEdges", true),
				bd = this.board;
			g.lineWidth = this.gw;
			g.strokeStyle = this.gridcolor;
			var dash = this.getDashArray();

			var drawEdge = (function(pc) {
				return function(cell, dir) {
					var off = pc.getHexEdgeOffsets(dir),
						cx = pc.getHexCX(cell),
						cy = pc.getHexCY(cell);
					g.strokeDashedLine(
						cx + off[0][0],
						cy + off[0][1],
						cx + off[1][0],
						cy + off[1][1],
						dash
					);
				};
			})(this);

			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c];
				if (!cell.isHexInBoard()) {
					continue;
				}
				// 共有辺は1回だけ描画する (境界辺は外枠として実線で描く)
				if (!!cell.getHexEdge("R")) {
					drawEdge(cell, "R");
				}
				if (!!cell.getHexEdge("TR")) {
					drawEdge(cell, "TR");
				}
				if (!!cell.getHexEdge("BR")) {
					drawEdge(cell, "BR");
				}
			}
		},

		//---------------------------------------------------------------------------
		// 白丸・黒丸・はてな
		//---------------------------------------------------------------------------
		drawHexCircles: function() {
			var g = this.vinc("cell_circle", "auto", true),
				bd = this.board;
			var ra = this.circleratio,
				rsize_stroke = (this.cw * (ra[0] + ra[1])) / 2,
				rsize_fill = this.cw * ra[0];

			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c];
				if (!cell.isHexInBoard()) {
					g.vid = "c_cirb_" + cell.id;
					g.vhide();
					g.vid = "c_cira_" + cell.id;
					g.vhide();
					g.vid = "c_hatena_" + cell.id;
					g.vhide();
					continue;
				}
				var cx = this.getHexCX(cell),
					cy = this.getHexCY(cell);

				g.vid = "c_cirb_" + cell.id;
				if (cell.qnum === 2) {
					g.fillStyle =
						cell.error === 1 ? this.errcolor1 : this.quescolor;
					g.fillCircle(cx, cy, rsize_fill);
				} else {
					g.vhide();
				}

				g.vid = "c_cira_" + cell.id;
				if (cell.qnum === 1) {
					g.lineWidth = Math.max(this.cw * (ra[0] - ra[1]), 1);
					g.strokeStyle =
						cell.error === 1 ? this.errcolor1 : this.quescolor;
					g.strokeCircle(cx, cy, rsize_stroke);
				} else {
					g.vhide();
				}

				g.vid = "c_hatena_" + cell.id;
				if (cell.qnum === -2) {
					g.fillStyle = this.fontcolor;
					this.disptext("?", cx, cy, { ratio: 0.5 });
				} else {
					g.vhide();
				}
			}
		},

		//---------------------------------------------------------------------------
		// 線が通らないことを示す×
		//---------------------------------------------------------------------------
		drawHexPekes: function() {
			var g = this.vinc("border_peke", "auto", true),
				bd = this.board;
			var size = this.cw * 0.15 + 1;
			if (size < 4) {
				size = 4;
			}
			g.lineWidth = (1 + this.cw / 40) | 0;

			for (var i = 0; i < bd.hexedges.length; i++) {
				var edge = bd.hexedges[i];
				g.vid = "e_peke_" + edge.id;
				if (edge.qsub === 2) {
					var c1 = edge.sideobj[0],
						off = this.getHexEdgeMidOffset(edge.dir1);
					var mx = this.getHexCX(c1) + off[0],
						my = this.getHexCY(c1) + off[1];
					g.strokeStyle = !edge.trial ? this.pekecolor : this.trialcolor;
					g.strokeCross(mx, my, size - 1);
				} else {
					g.vhide();
				}
			}
		},

		//---------------------------------------------------------------------------
		// 線の色を取得する (エラー・試し書き・色分け対応)
		//---------------------------------------------------------------------------
		getHexLineColor: function(edge) {
			this.addlw = 0;
			if (!edge.isLine()) {
				return null;
			}

			var info = edge.err || edge.info,
				puzzle = this.puzzle;
			var isIrowake =
				puzzle.execConfig("irowake") && edge.path && edge.path.color;

			if (edge.trial && puzzle.execConfig("irowake")) {
				this.addlw = -this.lm;
			} else if (info === 1) {
				this.addlw = 1;
			}

			if (info === 1) {
				return this.errlinecolor;
			} else if (info === -1) {
				return this.noerrcolor;
			} else if (isIrowake) {
				return edge.path.color;
			} else {
				return edge.trial ? this.linetrialcolor : this.linecolor;
			}
		},

		//---------------------------------------------------------------------------
		// 六角形の辺上の線 (マスの中心同士を結ぶ)
		//---------------------------------------------------------------------------
		drawHexLines: function() {
			var g = this.vinc("line", "crispEdges"),
				bd = this.board;

			for (var i = 0; i < bd.hexedges.length; i++) {
				var edge = bd.hexedges[i],
					color = this.getHexLineColor(edge);
				g.vid = "e_line_" + edge.id;
				if (!!color) {
					var c1 = edge.sideobj[0],
						c2 = edge.sideobj[1];
					var x1 = this.getHexCX(c1),
						y1 = this.getHexCY(c1),
						x2 = this.getHexCX(c2),
						y2 = this.getHexCY(c2);
					var lw = Math.max(this.lm + this.addlw / 2, 1);
					g.strokeStyle = color;
					g.lineWidth = lw;
					g.beginPath();
					g.moveTo(x1, y1);
					g.lineTo(x2, y2);
					g.stroke();
					// 継ぎ目が綺麗につながるように両端に丸を打つ
					g.fillStyle = color;
					g.fillCircle(x1, y1, lw / 2);
					g.fillCircle(x2, y2, lw / 2);
				} else {
					g.vhide();
				}
			}
			this.addlw = 0;
		},

		//---------------------------------------------------------------------------
		// 盤面の外枠 (六角形盤面の輪郭を実線で描く)
		//---------------------------------------------------------------------------
		drawHexChassis: function() {
			var g = this.vinc("chassis", "crispEdges", true),
				bd = this.board;
			g.lineWidth = this.lw;
			g.strokeStyle = this.quescolor;

			var drawEdge = (function(pc) {
				return function(cell, dir) {
					var off = pc.getHexEdgeOffsets(dir),
						cx = pc.getHexCX(cell),
						cy = pc.getHexCY(cell);
					g.beginPath();
					g.moveTo(cx + off[0][0], cy + off[0][1]);
					g.lineTo(cx + off[1][0], cy + off[1][1]);
					g.stroke();
				};
			})(this);

			var dirs = ["R", "L", "TR", "TL", "BL", "BR"];
			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c];
				if (!cell.isHexInBoard()) {
					continue;
				}
				// 隣接マスが盤外の辺 = 六角形の輪郭
				for (var i = 0; i < 6; i++) {
					if (!cell.getHexEdge(dirs[i])) {
						drawEdge(cell, dirs[i]);
					}
				}
			}
		},

		//---------------------------------------------------------------------------
		// 対象セルのハイライトは描画しない (クリックで直接入力するため)
		//---------------------------------------------------------------------------
		drawTarget: function() {},

		//---------------------------------------------------------------------------
		// ソルバーによる解答表示
		//---------------------------------------------------------------------------
		drawSolverOverlays: function() {
			this.drawHexSolverOverlayCells();
			this.drawHexSolverOverlayLines();
		},

		drawHexSolverOverlayCells: function() {
			var g = this.vinc("solver_cell", "auto", true),
				bd = this.board;

			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c];
				var entries = this.getSolverOverlayEntries(cell);
				var visible =
					cell.isHexInBoard() &&
					entries.length > 0 &&
					!this.hasAnswerCellState(cell)
						? Math.min(entries.length, this.solverCellOverlaySlots)
						: 0;
				var j = 0;

				for (; j < visible; j++) {
					g.vid = "c_solver_" + cell.id + "_" + j;
					if (!this.drawHexSolverOverlayCellEntry(g, cell, entries[j])) {
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

		drawHexSolverOverlayCellEntry: function(g, cell, entry) {
			var kind = this.getSolverOverlayEntryKind(entry);
			var item = typeof entry === "string" ? null : entry && entry.item;
			var cx = this.getHexCX(cell),
				cy = this.getHexCY(cell);
			var color = this.getSolverOverlayEntryColor(
				entry,
				this.solverCellMarkColor
			);
			var linewidth = Math.max((1 + this.cw / 40) | 0, 1);
			var radius = this.cw * 0.3;

			if (kind === "block" || kind === "fill") {
				g.fillStyle = this.getSolverOverlayEntryColor(
					entry,
					this.solverCellFillColor
				);
				this.drawHexPolygonPath(g, cell);
				g.fill();
				return true;
			}
			if (kind === "dot") {
				g.fillStyle = color;
				g.fillCircle(cx, cy, Math.max(this.cw * 0.06, 2));
				return true;
			}
			if (kind === "circle" || kind === "smallCircle") {
				g.lineWidth = linewidth;
				g.strokeStyle = color;
				g.strokeCircle(cx, cy, kind === "smallCircle" ? radius * 0.45 : radius);
				return true;
			}
			if (kind === "filledCircle" || kind === "smallFilledCircle") {
				g.fillStyle = color;
				g.fillCircle(cx, cy, kind === "smallFilledCircle" ? radius * 0.45 : radius);
				return true;
			}
			if (kind === "text" && item && typeof item.data !== "undefined") {
				g.fillStyle = this.getSolverOverlayEntryColor(entry, this.solverTextColor);
				this.disptext(String(item.data), cx, cy, { ratio: 0.6 });
				return true;
			}
			if (kind === "cross") {
				g.lineWidth = linewidth;
				g.strokeStyle = color;
				g.strokeCross(cx, cy, this.cw * 0.35);
				return true;
			}
			return false;
		},

		drawHexSolverOverlayLines: function() {
			var g = this.vinc("solver_line", "crispEdges"),
				bd = this.board;
			var lm = Math.max(this.lm * 0.72, 1);

			for (var i = 0; i < bd.hexedges.length; i++) {
				var edge = bd.hexedges[i];
				var entries = this.getSolverOverlayEntries(edge);
				var entry = null;
				for (var j = 0; j < entries.length; j++) {
					if (this.getSolverOverlayEntryKind(entries[j]) === "lineTo") {
						entry = entries[j];
						break;
					}
				}
				g.vid = "e_solver_line_" + edge.id;
				if (entry && !edge.isLine() && edge.qsub !== 2) {
					var c1 = edge.sideobj[0],
						c2 = edge.sideobj[1];
					var x1 = this.getHexCX(c1),
						y1 = this.getHexCY(c1),
						x2 = this.getHexCX(c2),
						y2 = this.getHexCY(c2);
					g.strokeStyle = this.getSolverOverlayEntryColor(
						entry,
						this.solverLineColor
					);
					g.lineWidth = lm;
					g.beginPath();
					g.moveTo(x1, y1);
					g.lineTo(x2, y2);
					g.stroke();
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
			this.decodeHexCircle();
		},
		encodePzpr: function(type) {
			this.encodeHexCircle();
		},

		// 六角形盤面の中のセルだけを base27 でエンコードする
		decodeHexCircle: function() {
			var bd = this.board;
			var cells = bd.getHexInBoardCells();
			var bstr = this.outbstr,
				c = 0,
				tri = [9, 3, 1];
			var pos = bstr
				? Math.min(((cells.length + 2) / 3) | 0, bstr.length)
				: 0;
			for (var i = 0; i < pos; i++) {
				var ca = parseInt(bstr.charAt(i), 27);
				for (var w = 0; w < 3; w++) {
					if (c < cells.length) {
						var val = ((ca / tri[w]) | 0) % 3;
						if (val > 0) {
							cells[c].qnum = val;
						}
						c++;
					}
				}
			}
			this.outbstr = bstr.substr(pos);
		},
		encodeHexCircle: function() {
			var bd = this.board;
			var cells = bd.getHexInBoardCells();
			var cm = "",
				num = 0,
				pass = 0,
				tri = [9, 3, 1];
			for (var c = 0; c < cells.length; c++) {
				var val = Math.max(0, cells[c].qnum);
				pass += val * tri[num];
				num++;
				if (num === 3) {
					cm += pass.toString(27);
					num = 0;
					pass = 0;
				}
			}
			if (num > 0) {
				cm += pass.toString(27);
			}
			this.outbstr += cm;
		}
	},

	//---------------------------------------------------------
	FileIO: {
		decodeData: function() {
			this.decodeHexCellQnum();
			this.decodeHexEdgeLine();
		},
		encodeData: function() {
			this.encodeHexCellQnum();
			this.encodeHexEdgeLine();
		},

		//---------------------------------------------------------------------------
		// 六角形盤面の中のセルだけをファイルに読み書きする
		//---------------------------------------------------------------------------
		decodeHexCellQnum: function() {
			var bd = this.board,
				cells = bd.getHexInBoardCells();
			var idx = 0;
			// 行ごとに1行ずつ読み込む (必要以上に読み進めない)
			for (var y = 0; y < bd.rows && idx < cells.length; y++) {
				var line = this.readLine();
				if (!line) {
					break;
				}
				var strs = line.split(" ").filter(function(s) {
					return s !== "";
				});
				for (var j = 0; j < strs.length && idx < cells.length; j++) {
					if (strs[j] === "1") {
						cells[idx].qnum = 1;
					} else if (strs[j] === "2") {
						cells[idx].qnum = 2;
					} else if (strs[j] === "-") {
						cells[idx].qnum = -2;
					}
					idx++;
				}
			}
		},
		encodeHexCellQnum: function() {
			var bd = this.board,
				cells = bd.getHexInBoardCells();
			var idx = 0;
			for (var y = 0; y < bd.rows; y++) {
				var strs = [];
				for (var x = 0; x < bd.cols && idx < cells.length; x++) {
					if (!bd.isHexInBoard(x, y)) {
						continue;
					}
					var cell = cells[idx];
					if (cell.qnum >= 0) {
						strs.push(cell.qnum + "");
					} else if (cell.qnum === -2) {
						strs.push("-");
					} else {
						strs.push(".");
					}
					idx++;
				}
				this.writeLine(strs.join(" "));
			}
		},

		//---------------------------------------------------------------------------
		// 六角形の辺の線データ (R / BL / BR の3グループをこの順に出力)
		//---------------------------------------------------------------------------
		getHexEdgeRows: function() {
			var bd = this.board;
			var R = [],
				BL = [],
				BR = [];
			for (var y = 0; y < bd.rows; y++) {
				var rr = [],
					bb = [],
					brr = [];
				for (var x = 0; x < bd.cols; x++) {
					if (!bd.isHexInBoard(x, y)) {
						continue;
					}
					var cell = bd.getHexCell(x, y);
					if (bd.isHexInBoard(x + 1, y)) {
						rr.push(cell.getHexEdge("R"));
					}
					if (bd.isHexInBoard(x, y + 1)) {
						bb.push(cell.getHexEdge("BL"));
					}
					if (bd.isHexInBoard(x + 1, y + 1)) {
						brr.push(cell.getHexEdge("BR"));
					}
				}
				R.push(rr);
				BL.push(bb);
				BR.push(brr);
			}
			return { R: R, BL: BL, BR: BR };
		},

		decodeHexEdgeLine: function() {
			var groups = this.getHexEdgeRows();
			var decode = function(list) {
				for (var y = 0; y < list.length; y++) {
					var line = this.readLine();
					if (line === void 0 || line === null) {
						break;
					}
					var strs = (line || "").split(" ").filter(function(s) {
						return s !== "";
					});
					for (var j = 0; j < strs.length && j < list[y].length; j++) {
						if (strs[j] === "1") {
							list[y][j].line = 1;
						} else if (strs[j] === "2") {
							list[y][j].qsub = 2;
						}
					}
				}
			}.bind(this);
			decode(groups.R);
			decode(groups.BL);
			decode(groups.BR);
		},

		encodeHexEdgeLine: function() {
			var groups = this.getHexEdgeRows();
			var encode = function(list) {
				for (var y = 0; y < list.length; y++) {
					var strs = [];
					for (var j = 0; j < list[y].length; j++) {
						strs.push(
							list[y][j].isLine()
								? "1"
								: list[y][j].qsub === 2
								? "2"
								: "0"
						);
					}
					this.writeLine(strs.join(" "));
				}
			}.bind(this);
			encode(groups.R);
			encode(groups.BL);
			encode(groups.BR);
		}
	},

	//---------------------------------------------------------
	// 正解判定処理実行部
	AnsCheck: {
		checklist: [
			"checkLineExist+",
			"checkHexBranch",
			"checkDeadendLine+",
			"checkNoLinePearl",
			"checkWhitePearl1",
			"checkBlackPearl1",
			"checkBlackPearl2",
			"checkWhitePearl2",
			"checkOneLoop"
		],

		// 枝分かれ (六角形では3本以上でアウト)
		checkHexBranch: function() {
			this.checkAllCell(function(cell) {
				return cell.lcnt > 2;
			}, "lnBranch");
		},

		checkNoLinePearl: function() {
			this.checkAllCell(function(cell) {
				return cell.isNum() && cell.lcnt === 0;
			}, "mashuOnLine");
		},

		checkWhitePearl1: function() {
			var result = true,
				bd = this.board;
			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c];
				if (!(cell.qnum === 1 && cell.isHexLineTurn())) {
					continue;
				}

				result = false;
				if (this.checkOnly) {
					break;
				}
				cell.setHexCellLineError(1);
			}
			if (!result) {
				this.failcode.add("mashuWCurve");
				bd.hexedgesSetNoErr();
			}
		},
		checkBlackPearl1: function() {
			var result = true,
				bd = this.board;
			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c];
				if (!(cell.qnum === 2 && cell.isHexLineStraight())) {
					continue;
				}

				result = false;
				if (this.checkOnly) {
					break;
				}
				cell.setHexCellLineError(1);
			}
			if (!result) {
				this.failcode.add("mashuBStrig");
				bd.hexedgesSetNoErr();
			}
		},

		checkWhitePearl2: function() {
			var result = true,
				bd = this.board;
			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c];
				if (cell.qnum !== 1 || !cell.isHexLineStraight()) {
					continue;
				}
				var dirs = cell.getHexLineDirs(),
					nbr1 = cell.getHexEdgeNeighbor(cell.getHexEdge(dirs[0])),
					nbr2 = cell.getHexEdgeNeighbor(cell.getHexEdge(dirs[1]));
				if (!nbr1.isHexLineStraight() || !nbr2.isHexLineStraight()) {
					continue;
				}

				result = false;
				if (this.checkOnly) {
					break;
				}
				cell.setHexCellLineError(1);
			}
			if (!result) {
				this.failcode.add("mashuWStNbr");
				bd.hexedgesSetNoErr();
			}
		},
		checkBlackPearl2: function() {
			var result = true,
				bd = this.board;
			for (var c = 0; c < bd.cell.length; c++) {
				var cell = bd.cell[c];
				if (cell.qnum !== 2 || !cell.isHexLineTurn()) {
					continue;
				}
				var dirs = cell.getHexLineDirs(),
					nbr1 = cell.getHexEdgeNeighbor(cell.getHexEdge(dirs[0])),
					nbr2 = cell.getHexEdgeNeighbor(cell.getHexEdge(dirs[1]));
				if (!nbr1.isHexLineTurn() && !nbr2.isHexLineTurn()) {
					continue;
				}

				result = false;
				if (this.checkOnly) {
					break;
				}
				cell.setHexCellLineError(1);
			}
			if (!result) {
				this.failcode.add("mashuBCvNbr");
				bd.hexedgesSetNoErr();
			}
		},

		// 盤上の線が1つのループであること。
		// 六角形の辺 (hexedges) は linegraph の components に含まれないため、
		// 線の連結成分を独自に数える。
		checkOneLoop: function() {
			var bd = this.board,
				visited = {},
				components = 0;
			for (var i = 0; i < bd.hexedges.length; i++) {
				var edge0 = bd.hexedges[i];
				if (!edge0.isLine() || visited[edge0.id]) {
					continue;
				}
				components++;
				var stack = [edge0];
				visited[edge0.id] = true;
				while (stack.length) {
					var edge = stack.pop(),
						cells = edge.sideobj;
					for (var k = 0; k < cells.length; k++) {
						var hexedges = cells[k].hexedges;
						for (var key in hexedges) {
							var ne = hexedges[key];
							if (!!ne && ne.isLine() && !visited[ne.id]) {
								visited[ne.id] = true;
								stack.push(ne);
							}
						}
					}
				}
			}
			if (components > 1) {
				this.failcode.add("lnPlLoop");
				if (this.checkOnly) {
					return;
				}
				for (var i = 0; i < bd.hexedges.length; i++) {
					if (bd.hexedges[i].isLine()) {
						bd.hexedges[i].seterr(1);
					}
				}
			}
		}
	}
});
