import Module from "../wasm/cspuz_solver_backend.js";

var AUTO_SOLVE_DELAY = 250;
var solverModulePromise = null;
var controls = null;
var autoSolveTimer = null;
var isApplying = false;
var solveRequestId = 0;
var hasSolverState = false;
var suppressHistory = false;

function isTravelLinePuzzle() {
	return window.ui && ui.puzzle && ui.puzzle.pid === "travelline";
}

function getMessages() {
	return pzpr.lang === "ja"
		? {
				idle: "solver 待機中",
				loading: "solver を読み込み中...",
				solving: "空盤面から solver 実行中...",
				applied: function(count) {
					return count + " 個の結果を反映しました";
				},
				partial: function(count, solutions) {
					return (
						solutions +
						" 通りの全解に共通する " +
						count +
						" 個の結果を反映しました"
					);
				},
				noChange: "反映できる新規結果はありません",
				cleared: "手入力を検出したため回答を消去しました",
				unsupported: "この盤面はまだ自動適用に対応していません",
				incomplete: "solver が全解を調べ切れなかったため、確定部分は適用しませんでした",
				error: function(message) {
					return "solver error: " + message;
				}
		  }
		: {
				idle: "solver idle",
				loading: "loading solver...",
				solving: "running solver from a blank answer...",
				applied: function(count) {
					return "applied " + count + " solver result" + (count === 1 ? "" : "s");
				},
				partial: function(count, solutions) {
					return (
						"applied " +
						count +
						" irrefutable solver result" +
						(count === 1 ? "" : "s") +
						" shared by all " +
						solutions +
						" solutions"
					);
				},
				noChange: "no solver result could be applied",
				cleared: "manual edit detected, cleared current answer",
				unsupported: "this puzzle is not supported for auto-apply yet",
				incomplete:
					"solver could not finish exhaustive deduction, so no tentative result was applied",
				error: function(message) {
					return "solver error: " + message;
				}
		  };
}

function setStatus(message) {
	if (controls && controls.status) {
		controls.status.textContent = message;
	}
}

function getControls() {
	if (controls) {
		return controls;
	}

	controls = {
		panel: document.getElementById("solverpanel"),
		auto: document.getElementById("solver-auto"),
		run: document.getElementById("solver-run"),
		erase: document.getElementById("solver-erase"),
		status: document.getElementById("solver-status")
	};

	return controls;
}

function setBusy(isBusy) {
	var uiControls = getControls();
	uiControls.run.disabled = isBusy;
	uiControls.auto.disabled = isBusy;
}

function getSolverUrl() {
	var url = ui.puzzle.getURL(pzpr.parser.URL_PZPRV3);
	var query = url.split("?")[1] || "";
	query = query.replace(/^type=[^&]+&/, "");
	return "https://puzz.link/p?" + query;
}

async function getSolverModule() {
	if (!solverModulePromise) {
		solverModulePromise = Module({
			locateFile: function(path) {
				if (path.endsWith(".wasm")) {
					return new URL("../wasm/cspuz_solver_backend.wasm", import.meta.url).href;
				}
				return path;
			}
		});
	}

	return solverModulePromise;
}

function withSuppressedHistory(callback) {
	suppressHistory = true;
	try {
		return callback();
	} finally {
		suppressHistory = false;
	}
}

function clearCurrentAnswer() {
	withSuppressedHistory(function() {
		ui.puzzle.board.ansclear();
		ui.puzzle.board.subclear();
		ui.puzzle.board.errclear();
		ui.puzzle.redraw();
	});
	hasSolverState = false;
}

async function solveCurrentPuzzle() {
	var module = await getSolverModule();
	var encoded = new TextEncoder().encode(getSolverUrl());
	var ptr = module._malloc(encoded.length);
	module.HEAPU8.set(encoded, ptr);

	try {
		var resultPtr = module._solve_problem(ptr, encoded.length);
		var length =
			module.HEAPU8[resultPtr] |
			(module.HEAPU8[resultPtr + 1] << 8) |
			(module.HEAPU8[resultPtr + 2] << 16) |
			(module.HEAPU8[resultPtr + 3] << 24);
		var json = new TextDecoder().decode(
			module.HEAPU8.slice(resultPtr + 4, resultPtr + 4 + length)
		);
		return JSON.parse(json);
	} finally {
		module._free(ptr);
	}
}

function solveTravelLinePuzzle() {
	var board = ui.puzzle.board;
	var cols = board.cols;
	var rows = board.rows;
	var total = cols * rows;
	var startCell = board.getStartCell ? board.getStartCell() : board.startpos.getc();
	var goalCell = board.getGoalCell ? board.getGoalCell() : board.goalpos.getc();
	var startBorder = board.arrowin ? board.arrowin.getb() : null;
	var goalBorder = board.arrowout ? board.arrowout.getb() : null;
	var start = startCell.id;
	var goal = goalCell.id;
	var maxStates = 2000000;
	var deadline = Date.now() + 20000;
	var states = 0;

	function idxToCell(idx) {
		return board.cell[idx];
	}
	function getClue(idx) {
		return idxToCell(idx).qnum;
	}
	function isBar(idx) {
		return getClue(idx) === 1;
	}
	function requiredVisit(idx) {
		var clue = getClue(idx);
		return clue === 3 || clue === 4 || clue === 7 || clue === 8 || clue === 9;
	}
	function neighbors(idx) {
		var x = idx % cols;
		var y = (idx / cols) | 0;
		var ret = [];
		if (y > 0) {
			ret.push(idx - cols);
		}
		if (y + 1 < rows) {
			ret.push(idx + cols);
		}
		if (x > 0) {
			ret.push(idx - 1);
		}
		if (x + 1 < cols) {
			ret.push(idx + 1);
		}
		return ret;
	}
	function direction(a, b) {
		var ax = a % cols;
		var ay = (a / cols) | 0;
		var bx = b % cols;
		var by = (b / cols) | 0;
		return { dx: bx - ax, dy: by - ay };
	}
	function isStraight(a, b, c) {
		var d1 = direction(b, a);
		var d2 = direction(b, c);
		return d1.dx === -d2.dx && d1.dy === -d2.dy;
	}
	function isCurve(a, b, c) {
		return !isStraight(a, b, c);
	}
	function visitedPair(path, a, b) {
		for (var i = 1; i < path.length; i++) {
			if (
				(path[i - 1] === a && path[i] === b) ||
				(path[i - 1] === b && path[i] === a)
			) {
				return true;
			}
		}
		return false;
	}
	function pathUsesBorder(path, border) {
		var c1 = border.sidecell[0];
		var c2 = border.sidecell[1];
		if (c1.isnull || c2.isnull) {
			return false;
		}
		return visitedPair(path, c1.id, c2.id);
	}
	function crossLineCount(cross, path) {
		var count = 0;
		var borders = [
			cross.relbd(-1, 0),
			cross.relbd(1, 0),
			cross.relbd(0, -1),
			cross.relbd(0, 1)
		];
		for (var i = 0; i < borders.length; i++) {
			var border = borders[i];
			if (border.isnull) {
				continue;
			}
			if (border.inside) {
				var c1 = border.sidecell[0];
				var c2 = border.sidecell[1];
				if (!c1.isnull && !c2.isnull && visitedPair(path, c1.id, c2.id)) {
					count++;
				}
			} else {
				var entry = border.sidecell[0].isnull ? border.sidecell[1] : border.sidecell[0];
				if (!entry.isnull) {
					if (
						startBorder &&
						border.id === startBorder.id &&
						path.length > 0 &&
						path[0] === entry.id
					) {
						count++;
					}
					if (
						goalBorder &&
						border.id === goalBorder.id &&
						path.length > 0 &&
						path[path.length - 1] === entry.id
					) {
						count++;
					}
				}
			}
		}
		return count;
	}
	function divideRegionValid(path) {
		var visitedCross = {};
		for (var i = 0; i < board.cross.length; i++) {
			var startCross = board.cross[i];
			if (startCross.isnull || visitedCross[startCross.id]) {
				continue;
			}
			var queue = [startCross];
			var types = {};
			visitedCross[startCross.id] = true;
			while (queue.length) {
				var cross = queue.shift();
				if (cross.qnum >= 11 && cross.qnum <= 13) {
					types[cross.qnum] = true;
				}
				var nexts = [
					{ cross: cross.relcross(-2, 0), border: cross.relbd(-1, 0) },
					{ cross: cross.relcross(2, 0), border: cross.relbd(1, 0) },
					{ cross: cross.relcross(0, -2), border: cross.relbd(0, -1) },
					{ cross: cross.relcross(0, 2), border: cross.relbd(0, 1) }
				];
				for (var n = 0; n < nexts.length; n++) {
					var next = nexts[n];
					if (next.cross.isnull || next.border.isnull || visitedCross[next.cross.id]) {
						continue;
					}
					if (next.border.inside) {
						var a = next.border.sidecell[0];
						var b = next.border.sidecell[1];
						if (a.isnull || b.isnull || visitedPair(path, a.id, b.id)) {
							continue;
						}
					} else {
						continue;
					}
					visitedCross[next.cross.id] = true;
					queue.push(next.cross);
				}
			}
			if (Object.keys(types).length >= 2) {
				return false;
			}
		}
		return true;
	}
	function directedCluesPossible(path, visited) {
		for (var cellId = 0; cellId < total; cellId++) {
			var cell = idxToCell(cellId);
			if (cell.qnum === 14) {
				var remaining = 0;
				var pos = cell.getaddr().clone();
				while (true) {
					pos.movedir(cell.qdir, 2);
					var next = pos.getc();
					if (next.isnull) {
						break;
					}
					if (next.qnum !== 1 && !visited[next.id]) {
						remaining++;
					}
				}
				if (remaining < Math.max(cell.qnum2, 0)) {
					return false;
				}
			} else if (cell.qnum === 15) {
				var current = 0;
				var pos2 = cell.getaddr().clone();
				while (true) {
					var border = pos2.reldirbd(cell.qdir, 1);
					if (border.isnull || !border.inside) {
						break;
					}
					var a = border.sidecell[0];
					var b = border.sidecell[1];
					if (!a.isnull && !b.isnull && visitedPair(path, a.id, b.id)) {
						current++;
					}
					pos2.movedir(cell.qdir, 2);
					if (pos2.getc().isnull) {
						break;
					}
				}
				if (current > Math.max(cell.qnum2, 0)) {
					return false;
				}
			}
		}
		return true;
	}
	function validateFinishedCell(path, index) {
		if (index <= 0 || index >= path.length - 1) {
			return true;
		}
		var prev = path[index - 1];
		var cur = path[index];
		var next = path[index + 1];
		var clue = getClue(cur);
		if (clue === 2 || clue === 3 || clue === 7) {
			return isStraight(prev, cur, next);
		}
		if (clue === 4 || clue === 8) {
			return isCurve(prev, cur, next);
		}
		return true;
	}
	function reachableCheck(current, visited, remainingRequired) {
		var queue = [current];
		var seen = {};
		seen[current] = true;
		while (queue.length) {
			var node = queue.shift();
			var nexts = neighbors(node);
			for (var i = 0; i < nexts.length; i++) {
				var next = nexts[i];
				if (seen[next] || isBar(next)) {
					continue;
				}
				if (visited[next] && next !== goal) {
					continue;
				}
				seen[next] = true;
				queue.push(next);
			}
		}
		if (!seen[goal]) {
			return false;
		}
		for (var j = 0; j < remainingRequired.length; j++) {
			if (!seen[remainingRequired[j]]) {
				return false;
			}
		}
		return true;
	}
	function finalValidate(path, visited) {
		if (path[0] !== start || path[path.length - 1] !== goal) {
			return false;
		}

		for (var i = 0; i < total; i++) {
			var clue = getClue(i);
			var used = !!visited[i];
			if (clue === 1 && used) {
				return false;
			}
			if ((clue === 3 || clue === 4 || clue === 7 || clue === 8) && !used) {
				return false;
			}
			if (clue === 9 && !used) {
				return false;
			}
		}

		for (var p = 1; p < path.length - 1; p++) {
			var prev = path[p - 1];
			var cur = path[p];
			var next = path[p + 1];
			var q = getClue(cur);
			if ((q === 2 || q === 3 || q === 7) && !isStraight(prev, cur, next)) {
				return false;
			}
			if ((q === 4 || q === 8) && !isCurve(prev, cur, next)) {
				return false;
			}
		}

		for (var k = 0; k < path.length; k++) {
			var idx = path[k];
			var qnum = getClue(idx);
			if (qnum === 3) {
				if (k <= 0 || k >= path.length - 1) {
					return false;
				}
				if (!isStraight(path[k - 1], idx, path[k + 1])) {
					return false;
				}
				var leftok =
					k - 1 > 0 && isCurve(path[k - 2], path[k - 1], idx);
				var rightok =
					k + 1 < path.length - 1 && isCurve(idx, path[k + 1], path[k + 2]);
				if (!leftok && !rightok) {
					return false;
				}
			} else if (qnum === 4) {
				if (k <= 0 || k >= path.length - 1) {
					return false;
				}
				if (!isCurve(path[k - 1], idx, path[k + 1])) {
					return false;
				}
				if (
					k - 1 <= 0 ||
					k + 1 >= path.length - 1 ||
					!isStraight(path[k - 2], path[k - 1], idx) ||
					!isStraight(idx, path[k + 1], path[k + 2])
				) {
					return false;
				}
			}
		}

		for (var n = 0; n < total; n++) {
			var cell = idxToCell(n);
			if (cell.qnum === 5 && visited[n]) {
				var adj = neighbors(n);
				for (var a = 0; a < adj.length; a++) {
					var other = adj[a];
					if (idxToCell(other).qnum === 5 && visited[other]) {
						if (!visitedPair(path, n, other)) {
							return false;
						}
					}
				}
			}
			if (cell.qnum === 6 && !visited[n]) {
				var adj2 = neighbors(n);
				for (var b = 0; b < adj2.length; b++) {
					var other2 = adj2[b];
					if (idxToCell(other2).qnum === 6 && !visited[other2]) {
						return false;
					}
				}
			}
		}

		for (var borderId = 0; borderId < board.border.length; borderId++) {
			var border = board.border[borderId];
			if (border.ques === 2 && !pathUsesBorder(path, border)) {
				return false;
			}
			if (!border.ques) {
				continue;
			}
			var c1 = border.sidecell[0];
			var c2 = border.sidecell[1];
			var v1 = !c1.isnull && visited[c1.id];
			var v2 = !c2.isnull && visited[c2.id];
			if (!v1 && !v2) {
				return false;
			}
		}

		for (var crossId = 0; crossId < board.cross.length; crossId++) {
			var cross = board.cross[crossId];
			if (cross.qnum >= 0 && cross.qnum <= 4) {
				if (crossLineCount(cross, path) !== cross.qnum) {
					return false;
				}
			}
		}

		if (!divideRegionValid(path)) {
			return false;
		}

		for (var cellId = 0; cellId < total; cellId++) {
			var cell2 = idxToCell(cellId);
			if (cell2.qnum === 14) {
				var count = 0;
				var pos = cell2.getaddr().clone();
				while (true) {
					pos.movedir(cell2.qdir, 2);
					var nextCell = pos.getc();
					if (nextCell.isnull) {
						break;
					}
					if (nextCell.qnum !== 1 && !visited[nextCell.id]) {
						count++;
					}
				}
				if (count !== cell2.qnum2) {
					return false;
				}
			} else if (cell2.qnum === 15) {
				var len = 0;
				var pos2 = cell2.getaddr().clone();
				while (true) {
					var border2 = pos2.reldirbd(cell2.qdir, 1);
					if (border2.isnull || !border2.inside) {
						break;
					}
					var a2 = border2.sidecell[0];
					var b2 = border2.sidecell[1];
					if (!a2.isnull && !b2.isnull && visitedPair(path, a2.id, b2.id)) {
						len++;
					}
					pos2.movedir(cell2.qdir, 2);
					if (pos2.getc().isnull) {
						break;
					}
				}
				if (len !== cell2.qnum2) {
					return false;
				}
			}
		}

		return true;
	}
	function getPathBorderStates(path) {
		var statesByBorder = {};
		for (var borderId = 0; borderId < board.border.length; borderId++) {
			statesByBorder[borderId] = false;
		}
		if (startBorder) {
			statesByBorder[startBorder.id] = true;
		}
		for (var i = 1; i < path.length; i++) {
			var a = idxToCell(path[i - 1]);
			var b = idxToCell(path[i]);
			var border = board.getb((a.bx + b.bx) >> 1, (a.by + b.by) >> 1);
			if (!border.isnull) {
				statesByBorder[border.id] = true;
			}
		}
		if (goalBorder) {
			statesByBorder[goalBorder.id] = true;
		}
		return statesByBorder;
	}
	function applyTravelLineConsensus(commonStates, solutionCount) {
		var changed = 0;
		withSuppressedHistory(function() {
			ui.puzzle.opemgr.newOperation();
			Object.keys(commonStates).forEach(function(id) {
				var border = board.border[+id];
				if (!border) {
					return;
				}
				if (commonStates[id]) {
					if (!border.isLine()) {
						border.setLine();
						changed++;
					}
				} else if (border.inside && (border.line !== 0 || border.qsub !== 2)) {
					border.setPeke();
					changed++;
				}
			});
			board.rebuildInfo();
			ui.puzzle.redraw();
		});
		hasSolverState = changed > 0;
		return {
			changed: changed,
			solutions: solutionCount,
			partial: solutionCount > 1
		};
	}
	function mergeCommonStates(commonStates, path) {
		var pathStates = getPathBorderStates(path);
		if (commonStates === null) {
			return pathStates;
		}
		Object.keys(commonStates).forEach(function(id) {
			if (commonStates[id] !== pathStates[id]) {
				delete commonStates[id];
			}
		});
		return commonStates;
	}
	function throwIncomplete() {
		var error = new Error("travel line solver did not finish exhaustive deduction");
		error.code = "TL_INCOMPLETE";
		throw error;
	}

	if (isBar(start) || isBar(goal)) {
		throw new Error("start or goal is blocked");
	}

	var required = [];
	for (var r = 0; r < total; r++) {
		if (requiredVisit(r)) {
			required.push(r);
		}
	}

	var path = [start];
	var visited = {};
	visited[start] = true;
	var solutionCount = 0;
	var commonStates = null;

	function dfs(current) {
		states++;
		if (states > maxStates || Date.now() > deadline) {
			throwIncomplete();
		}

		var remainingRequired = [];
		for (var i = 0; i < required.length; i++) {
			if (!visited[required[i]]) {
				remainingRequired.push(required[i]);
			}
		}
		if (!reachableCheck(current, visited, remainingRequired)) {
			return;
		}
		if (!directedCluesPossible(path, visited)) {
			return;
		}

		for (var crossId = 0; crossId < board.cross.length; crossId++) {
			var cross = board.cross[crossId];
			if (cross.qnum >= 0 && cross.qnum <= 4) {
				if (crossLineCount(cross, path) > cross.qnum) {
					return;
				}
			}
		}

		if (current === goal) {
			if (finalValidate(path, visited)) {
				solutionCount++;
				commonStates = mergeCommonStates(commonStates, path);
			}
			return;
		}

		var options = neighbors(current).filter(function(next) {
			return !isBar(next) && !visited[next];
		});
		options.sort(function(a, b) {
			var sa = requiredVisit(a) ? 0 : a === goal ? 1 : 2;
			var sb = requiredVisit(b) ? 0 : b === goal ? 1 : 2;
			return sa - sb;
		});

		for (var j = 0; j < options.length; j++) {
			var next = options[j];
			path.push(next);
			visited[next] = true;

			if (path.length < 3 || validateFinishedCell(path, path.length - 2)) {
				dfs(next);
			}

			delete visited[next];
			path.pop();
		}

		return;
	}

	dfs(start);
	if (!solutionCount) {
		throw new Error("travel line solver found no solution");
	}
	return applyTravelLineConsensus(commonStates, solutionCount);
}

function getItemKind(item) {
	return typeof item === "string" ? item : item && item.kind;
}

function isAnswerColor(entry) {
	return !!entry && entry.color !== "black";
}

function isCellCoordinate(entry) {
	return !!entry && entry.x % 2 === 1 && entry.y % 2 === 1;
}

function isBorderCoordinate(entry) {
	return !!entry && (entry.x + entry.y) % 2 === 1;
}

function getPlayInputModes() {
	var modes = ui.puzzle.mouse.getInputModeList();
	return modes || [];
}

function isLinePuzzle() {
	var modes = getPlayInputModes();
	return (
		modes.indexOf("line") >= 0 ||
		modes.indexOf("peke") >= 0 ||
		modes.indexOf("bar") >= 0
	);
}

function isBorderPuzzle() {
	var modes = getPlayInputModes();
	return modes.indexOf("border") >= 0;
}

function applyCellEntry(entry) {
	var kind = getItemKind(entry.item);
	var cell = ui.puzzle.board.getc(entry.x, entry.y);
	if (cell.isnull || cell.qnum !== -1) {
		return 0;
	}

	if (kind === "block" || kind === "fill") {
		if (!cell.isShade() || cell.qsub !== 0) {
			cell.setQsub(0);
			cell.setShade();
			return 1;
		}
		return 0;
	}

	if (
		kind === "dot" ||
		kind === "circle" ||
		kind === "smallCircle" ||
		kind === "square"
	) {
		if (cell.isShade() || cell.qsub !== 1) {
			cell.clrShade();
			cell.setQsub(1);
			return 1;
		}
		return 0;
	}

	return null;
}

function applyBorderAsLine(border, kind) {
	if (kind === "line" || kind === "wall") {
		if (!border.isLine() || border.qsub === 2) {
			border.setLine();
			return 1;
		}
		return 0;
	}

	if (kind === "doubleLine") {
		if (border.line !== 2 || border.qsub === 2) {
			border.setLineVal(2);
			if (border.qsub === 2) {
				border.setQsub(0);
			}
			return 1;
		}
		return 0;
	}

	if (kind === "cross") {
		if (border.line !== 0 || border.qsub !== 2) {
			border.setPeke();
			return 1;
		}
		return 0;
	}

	return null;
}

function applyBorderAsBorder(border, kind) {
	if (
		kind === "wall" ||
		kind === "boldWall" ||
		kind === "dottedWall" ||
		kind === "dottedHorizontalWall" ||
		kind === "dottedVerticalWall"
	) {
		if (!border.isBorder()) {
			border.setBorder();
			return 1;
		}
		return 0;
	}

	if (kind === "cross") {
		if (border.isBorder()) {
			border.removeBorder();
			return 1;
		}
		return 0;
	}

	return null;
}

function applyBorderEntry(entry) {
	var kind = getItemKind(entry.item);
	var border = ui.puzzle.board.getb(entry.x, entry.y);
	if (border.isnull) {
		return 0;
	}

	var result = null;
	if (isLinePuzzle()) {
		result = applyBorderAsLine(border, kind);
		if (result !== null) {
			return result;
		}
	}

	if (isBorderPuzzle()) {
		result = applyBorderAsBorder(border, kind);
		if (result !== null) {
			return result;
		}
	}

	return null;
}

function applyEntry(entry) {
	if (!isAnswerColor(entry)) {
		return null;
	}

	if (isCellCoordinate(entry)) {
		return applyCellEntry(entry);
	}

	if (isBorderCoordinate(entry)) {
		return applyBorderEntry(entry);
	}

	return null;
}

function applyDescription(result) {
	if (!result || result.status !== "ok" || !result.description) {
		throw new Error(
			(result && result.description) || "solver did not return a board description"
		);
	}

	var description = result.description;
	if (!description.data || !description.data.length) {
		throw new Error("solver returned no drawable result");
	}

	var changed = 0;
	var recognized = 0;

	withSuppressedHistory(function() {
		ui.puzzle.opemgr.newOperation();
		for (var i = 0; i < description.data.length; i++) {
			var applied = applyEntry(description.data[i]);
			if (applied !== null) {
				recognized++;
				changed += applied;
			}
		}
		ui.puzzle.board.rebuildInfo();
		ui.puzzle.redraw();
	});

	if (!recognized) {
		throw new Error(getMessages().unsupported);
	}

	hasSolverState = changed > 0;
	return changed;
}

async function runSolver() {
	var requestId = ++solveRequestId;
	var messages = getMessages();

	if (isApplying) {
		return;
	}

	isApplying = true;
	setBusy(true);
	setStatus(messages.loading);

	try {
		if (isTravelLinePuzzle()) {
			clearCurrentAnswer();
			setStatus(messages.solving);
			var localResult = solveTravelLinePuzzle();
			if (localResult.changed > 0) {
				setStatus(
					localResult.partial
						? messages.partial(localResult.changed, localResult.solutions)
						: messages.applied(localResult.changed)
				);
			} else {
				setStatus(messages.noChange);
			}
			return;
		}

		await getSolverModule();
		if (requestId !== solveRequestId) {
			return;
		}

		clearCurrentAnswer();
		setStatus(messages.solving);

		var result = await solveCurrentPuzzle();
		if (requestId !== solveRequestId) {
			return;
		}

		var appliedCount = applyDescription(result);
		setStatus(
			appliedCount > 0 ? messages.applied(appliedCount) : messages.noChange
		);
	} catch (error) {
		if (error && error.code === "TL_INCOMPLETE") {
			setStatus(messages.incomplete);
		} else {
			setStatus(
				messages.error(error && error.message ? error.message : String(error))
			);
		}
	} finally {
		isApplying = false;
		setBusy(false);
	}
}

function scheduleAutoSolve() {
	if (!getControls().auto.checked || isApplying) {
		return;
	}
	if (autoSolveTimer) {
		clearTimeout(autoSolveTimer);
	}
	autoSolveTimer = setTimeout(function() {
		autoSolveTimer = null;
		runSolver();
	}, AUTO_SOLVE_DELAY);
}

function onHistoryChange() {
	if (suppressHistory || isApplying) {
		return;
	}

	if (hasSolverState) {
		clearCurrentAnswer();
		setStatus(getMessages().cleared);
	}

	scheduleAutoSolve();
}

function refreshVisibility() {
	var uiControls = getControls();
	var supported = ui.puzzle && !!ui.puzzle.board && !!ui.puzzle.board.cell;
	uiControls.panel.style.display = supported ? "flex" : "none";
	if (supported && !isApplying && !hasSolverState) {
		setStatus(getMessages().idle);
	}
}

function initializeSolverUi() {
	var uiControls = getControls();
	if (!uiControls.panel) {
		return;
	}

	uiControls.erase.checked = true;
	uiControls.erase.disabled = true;

	uiControls.run.addEventListener("click", function() {
		runSolver();
	});

	uiControls.auto.addEventListener("change", function() {
		if (uiControls.auto.checked) {
			scheduleAutoSolve();
		} else if (autoSolveTimer) {
			clearTimeout(autoSolveTimer);
			autoSolveTimer = null;
			setStatus(getMessages().idle);
		}
	});

	ui.puzzle.on("ready", function() {
		hasSolverState = false;
		refreshVisibility();
	});
	ui.puzzle.on("history", onHistoryChange);

	refreshVisibility();
}

pzpr.on("load", function() {
	if (window.ui && ui.puzzle) {
		initializeSolverUi();
	}
});
