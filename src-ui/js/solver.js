import Module from "../wasm/cspuz_solver_backend.js";

var AUTO_SOLVE_DELAY = 250;
var solverModulePromise = null;
var backendWorkerTask = null;
var controls = null;
var autoSolveTimer = null;
var isApplying = false;
var solveRequestId = 0;
var hasSolverState = false;
var suppressHistory = false;
var restartSolveAfterCurrent = false;
var LOCAL_SOLVER_YIELD_INTERVAL = 1024;
var TL_FLOOR_FLAGS = {
	ICE: 1,
	NOTOUCH: 2,
	NOADJ: 4,
	SLOOP: 8,
	CWFLOOR: 16
};

function isTravelLinePuzzle() {
	return window.ui && ui.puzzle && ui.puzzle.pid === "travelline";
}

function hasTravelLineCrossingSupportGap() {
	return false;
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
				partial: function(count) {
					return count + " 個の確定結果を反映しました";
				},
				noChange: "反映できる新規結果はありません",
				cleared: "手入力を検出したため回答を消去しました",
				unsupported: "この盤面はまだ自動適用に対応していません",
				crossingUnsupported:
					"交差対応の travelline solver はまだ実装途中のため、結果は適用しませんでした",
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
				partial: function(count) {
					return (
						"applied " +
						count +
						" irrefutable solver result" +
						(count === 1 ? "" : "s")
					);
				},
				noChange: "no solver result could be applied",
				cleared: "manual edit detected, cleared current answer",
				unsupported: "this puzzle is not supported for auto-apply yet",
				crossingUnsupported:
					"crossing-aware travel line solver is still in progress, so no result was applied",
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
	return runBackendWorker("solve_problem", getSolverUrl());
}

function readSolverResult(module, resultPtr) {
	var length =
		module.HEAPU8[resultPtr] |
		(module.HEAPU8[resultPtr + 1] << 8) |
		(module.HEAPU8[resultPtr + 2] << 16) |
		(module.HEAPU8[resultPtr + 3] << 24);
	var json = new TextDecoder().decode(
		module.HEAPU8.slice(resultPtr + 4, resultPtr + 4 + length)
	);
	return JSON.parse(json);
}

function makeAbortError(message) {
	var error = new Error(message || "solver aborted");
	error.code = "TL_ABORTED";
	return error;
}

function cancelBackendWorker(message) {
	if (!backendWorkerTask) {
		return;
	}
	var task = backendWorkerTask;
	backendWorkerTask = null;
	task.worker.onmessage = null;
	task.worker.onerror = null;
	task.worker.terminate();
	task.reject(makeAbortError(message || "solver worker aborted"));
}

function runBackendWorker(action, payload) {
	cancelBackendWorker("superseded by a newer solver request");
	return new Promise(function(resolve, reject) {
		var worker = new Worker(new URL("./solver-worker.js", import.meta.url), {
			type: "module"
		});
		backendWorkerTask = { worker: worker, reject: reject };

		worker.onmessage = function(event) {
			if (backendWorkerTask && backendWorkerTask.worker === worker) {
				backendWorkerTask = null;
			}
			worker.terminate();
			resolve(event.data);
		};
		worker.onerror = function(event) {
			if (backendWorkerTask && backendWorkerTask.worker === worker) {
				backendWorkerTask = null;
			}
			worker.terminate();
			reject(
				new Error(
					event && event.message
						? event.message
						: "solver worker failed unexpectedly"
				)
			);
		};
		worker.postMessage({
			action: action,
			payload: payload
		});
	});
}

function getTravelLineBorderSide(board, border) {
	if (!border || border.isnull) {
		return null;
	}
	if (border.by === board.minby + 2) {
		return "up";
	}
	if (border.by === board.maxby - 2) {
		return "down";
	}
	if (border.bx === board.minbx + 2) {
		return "left";
	}
	if (border.bx === board.maxbx - 2) {
		return "right";
	}
	return null;
}

function getTravelLineBackendPayload() {
	var board = ui.puzzle.board;
	var rows = board.rows;
	var cols = board.cols;
	var startBorder = board.arrowin ? board.arrowin.getb() : null;
	var goalBorder = board.arrowout ? board.arrowout.getb() : null;
	var startCell = board.getStartCell ? board.getStartCell() : board.startpos.getc();
	var goalCell = board.getGoalCell ? board.getGoalCell() : board.goalpos.getc();
	var bars = [];
	var ice = [];
	var cwfloor = [];
	var noadj = [];
	var notouch = [];
	var sloop = [];
	var specials = [];
	var order = [];
	var divide = [];
	var slither = [];
	var countryH = [];
	var countryV = [];
	var directed = [];
	var requiredH = [];
	var requiredV = [];
	var forcedH = [];
	var forcedV = [];

	for (var y = 0; y < rows; y++) {
		var barRow = [];
		var iceRow = [];
		var cwfloorRow = [];
		var noadjRow = [];
		var notouchRow = [];
		var sloopRow = [];
		var specialsRow = [];
		var orderRow = [];
		var directedRow = [];
		var reqHRow = [];
		var countryHRow = [];
		var forcedHRow = [];
		for (var x = 0; x < cols; x++) {
			var cell = board.cell[y * cols + x];
			var qnum = cell.qnum;
			var floors = cell.ques || 0;
			barRow.push(qnum === 1);
			iceRow.push(qnum === 2 || !!(floors & TL_FLOOR_FLAGS.ICE));
			cwfloorRow.push(!!(floors & TL_FLOOR_FLAGS.CWFLOOR));
			noadjRow.push(qnum === 6 || !!(floors & TL_FLOOR_FLAGS.NOADJ));
			notouchRow.push(qnum === 5 || !!(floors & TL_FLOOR_FLAGS.NOTOUCH));
			sloopRow.push(qnum === 9 || !!(floors & TL_FLOOR_FLAGS.SLOOP));
			if (qnum === 14 || qnum === 15) {
				var sideMap = {};
				sideMap[cell.UP] = "up";
				sideMap[cell.DN] = "down";
				sideMap[cell.LT] = "left";
				sideMap[cell.RT] = "right";
				directedRow.push({
					kind: qnum,
					side: sideMap[cell.qdir] || "up",
					value: Math.max(cell.qnum2, 0)
				});
			} else {
				directedRow.push(null);
			}
			if (qnum === 3 || qnum === 4 || qnum === 7 || qnum === 8) {
				specialsRow.push(qnum);
			} else {
				specialsRow.push(-1);
			}
			orderRow.push(qnum === 16 ? Math.max(cell.qnum2, 0) : -1);
			if (
				qnum !== -1 &&
				qnum !== 1 &&
				qnum !== 2 &&
				qnum !== 3 &&
				qnum !== 4 &&
				qnum !== 5 &&
				qnum !== 6 &&
				qnum !== 7 &&
				qnum !== 8 &&
				qnum !== 9 &&
				qnum !== 14 &&
				qnum !== 15 &&
				qnum !== 16
			) {
				return null;
			}
			if (
				floors &
				~(
					TL_FLOOR_FLAGS.ICE |
					TL_FLOOR_FLAGS.NOTOUCH |
					TL_FLOOR_FLAGS.NOADJ |
					TL_FLOOR_FLAGS.SLOOP |
					TL_FLOOR_FLAGS.CWFLOOR
				)
			) {
				return null;
			}
			if (x + 1 < cols) {
				var borderH = board.getb(cell.bx + 1, cell.by);
				reqHRow.push(borderH.ques === 2);
				countryHRow.push(borderH.ques === 1);
				if (borderH.isLine()) {
					forcedHRow.push(1);
				} else if (borderH.qsub === 2) {
					forcedHRow.push(0);
				} else {
					forcedHRow.push(-1);
				}
			}
		}
		bars.push(barRow);
		ice.push(iceRow);
		cwfloor.push(cwfloorRow);
		noadj.push(noadjRow);
		notouch.push(notouchRow);
		sloop.push(sloopRow);
		specials.push(specialsRow);
		order.push(orderRow);
		directed.push(directedRow);
		requiredH.push(reqHRow);
		countryH.push(countryHRow);
		forcedH.push(forcedHRow);
	}
	for (var dy = 0; dy <= rows; dy++) {
		var divideRow = [];
		for (var dx = 0; dx <= cols; dx++) {
			var cross2 = board.cross[dy * (cols + 1) + dx];
			if (!cross2 || cross2.qnum === -1) {
				divideRow.push(0);
			} else if (cross2.qnum >= 11 && cross2.qnum <= 13) {
				divideRow.push(cross2.qnum - 10);
			} else {
				divideRow.push(0);
			}
		}
		divide.push(divideRow);
	}
	for (var sy = 0; sy <= rows; sy++) {
		var crossRow = [];
		for (var sx = 0; sx <= cols; sx++) {
			var cross = board.cross[sy * (cols + 1) + sx];
			if (!cross) {
				crossRow.push(-1);
				continue;
			}
			if (cross.qnum >= 0 && cross.qnum <= 4) {
				crossRow.push(cross.qnum);
			} else if (
				cross.qnum === -1 ||
				(cross.qnum >= 11 && cross.qnum <= 13)
			) {
				crossRow.push(-1);
			} else {
				return null;
			}
		}
		slither.push(crossRow);
	}

	for (var y2 = 0; y2 + 1 < rows; y2++) {
		var reqVRow = [];
		var countryVRow = [];
		var forcedVRow = [];
		for (var x2 = 0; x2 < cols; x2++) {
			var cell2 = board.cell[y2 * cols + x2];
			var borderV = board.getb(cell2.bx, cell2.by + 1);
			reqVRow.push(borderV.ques === 2);
			countryVRow.push(borderV.ques === 1);
			if (borderV.isLine()) {
				forcedVRow.push(1);
			} else if (borderV.qsub === 2) {
				forcedVRow.push(0);
			} else {
				forcedVRow.push(-1);
			}
		}
		requiredV.push(reqVRow);
		countryV.push(countryVRow);
		forcedV.push(forcedVRow);
	}

	var startSide = getTravelLineBorderSide(board, startBorder);
	var goalSide = getTravelLineBorderSide(board, goalBorder);
	if (!startSide || !goalSide) {
		return null;
	}

	// Cross clues are currently supported only for slither-style 0..4.
	for (var borderId = 0; borderId < board.border.length; borderId++) {
		var border = board.border[borderId];
		if (border.inside && border.qnum !== -1) {
			return null;
		}
	}

	return {
		rows: rows,
		cols: cols,
		start: startCell.id,
		goal: goalCell.id,
		startSide: startSide,
		goalSide: goalSide,
		bars: bars,
		ice: ice,
		cwfloor: cwfloor,
		noadj: noadj,
		notouch: notouch,
		sloop: sloop,
		specials: specials,
		order: order,
		divide: divide,
		slither: slither,
		countryH: countryH,
		countryV: countryV,
		directed: directed,
		requiredH: requiredH,
		requiredV: requiredV,
		forcedH: forcedH,
		forcedV: forcedV
	};
}

async function solveTravelLineWithBackend() {
	var payload = getTravelLineBackendPayload();
	if (!payload) {
		return null;
	}
	return runBackendWorker("solve_custom_travelline", payload);
}

async function solveTravelLinePuzzle(requestId) {
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
	var insideBorderBitIndex = {};
	var nextBorderBit = 0;
	var searchResultCache = new Map();

	var backendResult = await solveTravelLineWithBackend();
	if (backendResult && backendResult.status === "ok") {
		var changed = applyDescription(backendResult);
		var endpointChanged = 0;
		withSuppressedHistory(function() {
			if (startBorder && !startBorder.isLine()) {
				startBorder.setLine();
				endpointChanged++;
			}
			if (goalBorder && !goalBorder.isLine()) {
				goalBorder.setLine();
				endpointChanged++;
			}
			if (endpointChanged > 0) {
				board.rebuildInfo();
				ui.puzzle.redraw();
			}
		});
		hasSolverState = changed + endpointChanged > 0;
		return { changed: changed + endpointChanged, partial: true };
	}
	if (
		backendResult &&
		backendResult.status === "error" &&
		typeof backendResult.description === "string" &&
		backendResult.description.indexOf("unsupported travelline") !== -1
	) {
		backendResult = null;
	}
	if (backendResult && backendResult.status === "error") {
		throw new Error(backendResult.description || "travelline backend failed");
	}

	function throwAborted() {
		throw makeAbortError("travel line solver aborted");
	}
	async function checkpoint() {
		if (requestId !== solveRequestId) {
			throwAborted();
		}
		if ((states & (LOCAL_SOLVER_YIELD_INTERVAL - 1)) === 0) {
			await new Promise(function(resolve) {
				setTimeout(resolve, 0);
			});
			if (requestId !== solveRequestId) {
				throwAborted();
			}
		}
	}

	function idxToCell(idx) {
		return board.cell[idx];
	}
	function floorFlags(idx) {
		return idxToCell(idx).ques || 0;
	}
	function hasFloorFlag(idx, flag) {
		return !!(floorFlags(idx) & flag);
	}
	function getClue(idx) {
		return idxToCell(idx).qnum;
	}
	function isBar(idx) {
		return getClue(idx) === 1;
	}
	function isYajilin(idx) {
		return getClue(idx) === 14;
	}
	function isLineBlocked(idx) {
		return isBar(idx) || isYajilin(idx);
	}
	function isIce(idx) {
		return getClue(idx) === 2 || hasFloorFlag(idx, TL_FLOOR_FLAGS.ICE);
	}
	function isNoTouch(idx) {
		return getClue(idx) === 5 || hasFloorFlag(idx, TL_FLOOR_FLAGS.NOTOUCH);
	}
	function isNoAdj(idx) {
		return getClue(idx) === 6 || hasFloorFlag(idx, TL_FLOOR_FLAGS.NOADJ);
	}
	function isSloop(idx) {
		return getClue(idx) === 9 || hasFloorFlag(idx, TL_FLOOR_FLAGS.SLOOP);
	}
	function isCwFloor(idx) {
		return hasFloorFlag(idx, TL_FLOOR_FLAGS.CWFLOOR);
	}
	function requiredVisit(idx) {
		var clue = getClue(idx);
		return (
			clue === 3 ||
			clue === 4 ||
			clue === 7 ||
			clue === 8 ||
			isSloop(idx) ||
			clue === 16
		);
	}
	function orderSequencePossible(path) {
		var last = -1;
		var seen = {};
		for (var i = 0; i < path.length; i++) {
			var cell = idxToCell(path[i]);
			if (cell.qnum !== 16) {
				continue;
			}
			if (seen[cell.qnum2] || cell.qnum2 <= last) {
				return false;
			}
			seen[cell.qnum2] = true;
			last = cell.qnum2;
		}
		return true;
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
	function isClockwiseTurn(a, b, c) {
		var ab = direction(a, b);
		var bc = direction(b, c);
		return ab.dx * bc.dy - ab.dy * bc.dx > 0;
	}
	function isCrossingCell(idx) {
		return isIce(idx) || isCwFloor(idx);
	}
	function orientationBit(a, b, c) {
		if (!isStraight(a, b, c)) {
			return 0;
		}
		var ab = direction(a, b);
		return ab.dx === 0 ? 1 : 2;
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
	function getBorderBetweenCells(a, b) {
		var cellA = idxToCell(a);
		var cellB = idxToCell(b);
		return board.getb((cellA.bx + cellB.bx) >> 1, (cellA.by + cellB.by) >> 1);
	}
	function cloneStateMap(source) {
		var copy = {};
		if (!source) {
			return copy;
		}
		Object.keys(source).forEach(function(key) {
			copy[key] = source[key];
		});
		return copy;
	}
	function getCurrentTravelLineForcedStates() {
		var states = {};
		for (var borderId = 0; borderId < board.border.length; borderId++) {
			var border = board.border[borderId];
			if (border.isnull) {
				continue;
			}
			if (border.isLine()) {
				states[border.id] = true;
			} else if (border.qsub === 2) {
				states[border.id] = false;
			}
		}
		if (startBorder) {
			states[startBorder.id] = true;
		}
		if (goalBorder) {
			states[goalBorder.id] = true;
		}
		return states;
	}
	function getBorderBit(borderId) {
		var index = insideBorderBitIndex[borderId];
		return index === undefined ? 0n : 1n << BigInt(index);
	}
	function isBorderUsed(borderId, edgeMask) {
		return (edgeMask & getBorderBit(borderId)) !== 0n;
	}
	function getForcedStateKey(forcedStates) {
		var entries = [];
		Object.keys(forcedStates || {})
			.sort(function(a, b) {
				return +a - +b;
			})
			.forEach(function(id) {
				entries.push(id + ":" + (forcedStates[id] ? "1" : "0"));
			});
		return entries.join(",");
	}
	function borderTouchesClue(border) {
		var c1 = border.sidecell[0];
		var c2 = border.sidecell[1];
		return (
			(!c1.isnull && (c1.qnum >= 0 || c1.ques > 0)) ||
			(!c2.isnull && (c2.qnum >= 0 || c2.ques > 0)) ||
			(border.inside &&
				(border.ques > 0 ||
					border.sidecross[0].qnum >= 0 ||
					border.sidecross[1].qnum >= 0))
		);
	}
	function borderPriority(borderId, baseStates) {
		var border = board.border[borderId];
		var score = 0;
		if (baseStates[borderId]) {
			score += 50;
		}
		if (borderTouchesClue(border)) {
			score += 100;
		}
		if (startBorder && borderId === startBorder.id) {
			score += 1000;
		}
		if (goalBorder && borderId === goalBorder.id) {
			score += 1000;
		}
		return score;
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
	function computeReachableCells(current, visitCount, edgeMask) {
		var queue = [current];
		var seen = {};
		seen[current] = true;
		while (queue.length) {
			var node = queue.shift();
			var nexts = neighbors(node);
			for (var i = 0; i < nexts.length; i++) {
				var next = nexts[i];
				var border = getBorderBetweenCells(node, next);
				if (seen[next] || isLineBlocked(next) || isBorderUsed(border.id, edgeMask)) {
					continue;
				}
				if (visitCount[next] > 0 && !isCrossingCell(next) && next !== goal) {
					continue;
				}
				if (visitCount[next] > 1 || (visitCount[next] > 0 && next === goal)) {
					continue;
				}
				seen[next] = true;
				queue.push(next);
			}
		}
		return seen;
	}
	function directedCluesPossible(path, visitCount, reachable) {
		for (var cellId = 0; cellId < total; cellId++) {
			var cell = idxToCell(cellId);
			if (cell.qnum === 14) {
				var totalCells = 0;
				var currentVisited = 0;
				var maybeVisitable = 0;
				var pos = cell.getaddr().clone();
				while (true) {
					pos.movedir(cell.qdir, 2);
					var next = pos.getc();
					if (next.isnull) {
						break;
					}
					if (!isLineBlocked(next.id)) {
						totalCells++;
						if (visitCount[next.id] > 0) {
							currentVisited++;
						} else if (reachable[next.id]) {
							maybeVisitable++;
						}
					}
				}
				var targetUnvisited = Math.max(cell.qnum2, 0);
				var requiredVisited = totalCells - targetUnvisited;
				if (currentVisited > requiredVisited) {
					return false;
				}
				if (currentVisited + maybeVisitable < requiredVisited) {
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
		if (clue === 14) {
			return false;
		}
		if (isIce(cur) || clue === 3 || clue === 7) {
			return isStraight(prev, cur, next);
		}
		if (clue === 4 || clue === 8) {
			return isCurve(prev, cur, next);
		}
		if (isCwFloor(cur) && isCurve(prev, cur, next)) {
			return isClockwiseTurn(prev, cur, next);
		}
		return true;
	}
	function reachableCheck(reachable, remainingRequired) {
		if (!reachable[goal]) {
			return false;
		}
		for (var j = 0; j < remainingRequired.length; j++) {
			if (!reachable[remainingRequired[j]]) {
				return false;
			}
		}
		return true;
	}
	function noAdjStillPossible(visitCount, reachable) {
		for (var n = 0; n < total; n++) {
			if (!isNoAdj(n) || visitCount[n] > 0 || reachable[n]) {
				continue;
			}
			var adj = neighbors(n);
			for (var i = 0; i < adj.length; i++) {
				var other = adj[i];
				if (
					isNoAdj(other) &&
					!(visitCount[other] > 0) &&
					!reachable[other]
				) {
					return false;
				}
			}
		}
		return true;
	}
	function crossingCellStillCompletable(
		current,
		visitCount,
		finishedCrossMask,
		edgeMask
	) {
		for (var idx in finishedCrossMask) {
			if (!finishedCrossMask[idx] || +idx === current) {
				continue;
			}
			if ((visitCount[idx] || 0) !== 1) {
				continue;
			}
			var cell = idxToCell(+idx);
			var mask = finishedCrossMask[idx];
			var candidates =
				mask === 1
					? [cell.adjborder.left, cell.adjborder.right]
					: [cell.adjborder.top, cell.adjborder.bottom];
			var canFinish = false;
			for (var i = 0; i < candidates.length; i++) {
				var border = candidates[i];
				if (!border.isnull && !isBorderUsed(border.id, edgeMask)) {
					canFinish = true;
					break;
				}
			}
			if (!canFinish) {
				return false;
			}
		}
		return true;
	}
	function finalValidate(path, visitCount) {
		if (path[0] !== start || path[path.length - 1] !== goal) {
			return false;
		}

		for (var i = 0; i < total; i++) {
			var clue = getClue(i);
			var used = (visitCount[i] || 0) > 0;
			if (clue === 1 && used) {
				return false;
			}
			if (clue === 14 && used) {
				return false;
			}
			if ((clue === 3 || clue === 4 || clue === 7 || clue === 8) && !used) {
				return false;
			}
			if (isSloop(i) && !used) {
				return false;
			}
			if (clue === 16 && !used) {
				return false;
			}
			if (!isCrossingCell(i) && (visitCount[i] || 0) > 1) {
				return false;
			}
			if ((visitCount[i] || 0) > 0 && idxToCell(i).lcnt === 4 && (visitCount[i] || 0) !== 2) {
				return false;
			}
		}

		for (var p = 1; p < path.length - 1; p++) {
			var prev = path[p - 1];
			var cur = path[p];
			var next = path[p + 1];
			var q = getClue(cur);
			if ((isIce(cur) || q === 3 || q === 7) && !isStraight(prev, cur, next)) {
				return false;
			}
			if ((q === 4 || q === 8) && !isCurve(prev, cur, next)) {
				return false;
			}
			if (isCwFloor(cur) && isCurve(prev, cur, next) && !isClockwiseTurn(prev, cur, next)) {
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
			if (isNoTouch(n) && visitCount[n] > 0) {
				var adj = neighbors(n);
				for (var a = 0; a < adj.length; a++) {
					var other = adj[a];
					if (isNoTouch(other) && visitCount[other] > 0) {
						if (!visitedPair(path, n, other)) {
							return false;
						}
					}
				}
			}
			if (!(visitCount[n] > 0) && isNoAdj(n)) {
				var adj2 = neighbors(n);
				for (var b = 0; b < adj2.length; b++) {
					var other2 = adj2[b];
					if (isNoAdj(other2) && !(visitCount[other2] > 0)) {
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
			var v1 = !c1.isnull && visitCount[c1.id] > 0;
			var v2 = !c2.isnull && visitCount[c2.id] > 0;
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
					if (
						nextCell.qnum !== 1 &&
						nextCell.qnum !== 14 &&
						!(visitCount[nextCell.id] > 0)
					) {
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

		if (!orderSequencePossible(path)) {
			return false;
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
	function pathMatchesForcedStates(pathStates, forcedStates) {
		var ids = Object.keys(forcedStates);
		for (var i = 0; i < ids.length; i++) {
			var id = ids[i];
			if (pathStates[id] !== forcedStates[id]) {
				return false;
			}
		}
		return true;
	}
	function applyTravelLineIrrefutable(irrefutableStates) {
		var changed = 0;
		withSuppressedHistory(function() {
			ui.puzzle.opemgr.newOperation();
			Object.keys(irrefutableStates).forEach(function(id) {
				var border = board.border[+id];
				if (!border) {
					return;
				}
				if (irrefutableStates[id]) {
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
			partial: true
		};
	}
	function throwIncomplete() {
		var error = new Error("travel line solver did not finish exhaustive deduction");
		error.code = "TL_INCOMPLETE";
		throw error;
	}
	async function findTravelLineSolution(forcedStates, preferredStates) {
		var forcedKey = getForcedStateKey(forcedStates || {});
		if (searchResultCache.has(forcedKey)) {
			return searchResultCache.get(forcedKey);
		}

		var path = [start];
		var visitCount = {};
		visitCount[start] = 1;
		var found = null;
		var edgeMask = 0n;
		var finishedCrossMask = {};
		var failedStateCache = new Set();

		function moveRespectsForced(current, next) {
			var border = getBorderBetweenCells(current, next);
			return !forcedStates || forcedStates[border.id] !== false;
		}
		function getStateKey(current) {
			var crossKeys = [];
			Object.keys(finishedCrossMask)
				.sort(function(a, b) {
					return +a - +b;
				})
				.forEach(function(id) {
					if (finishedCrossMask[id]) {
						crossKeys.push(id + ":" + finishedCrossMask[id]);
					}
				});
			return current + ":" + edgeMask.toString(36) + ":" + crossKeys.join("|");
		}
		function canReenterCell(next, current) {
			if (!isCrossingCell(next)) {
				return false;
			}
			if ((visitCount[next] || 0) >= 2) {
				return false;
			}
			var usedMask = finishedCrossMask[next] || 0;
			if (!usedMask) {
				return false;
			}
			var stepDir = direction(current, next);
			var bit = stepDir.dx === 0 ? 1 : 2;
			return (usedMask & bit) === 0;
		}
		function applyFinishedCellState() {
			if (path.length < 3) {
				return { ok: true, cellId: -1, prevMask: 0 };
			}
			var prev = path[path.length - 3];
			var cur = path[path.length - 2];
			var next = path[path.length - 1];
			if (!validateFinishedCell(path, path.length - 2)) {
				return { ok: false };
			}
			if (!isCrossingCell(cur)) {
				return { ok: true, cellId: cur, prevMask: finishedCrossMask[cur] || 0 };
			}
			var oldMask = finishedCrossMask[cur] || 0;
			var bit = orientationBit(prev, cur, next);
			if (bit) {
				if (oldMask & bit) {
					return { ok: false };
				}
				finishedCrossMask[cur] = oldMask | bit;
			} else if (oldMask) {
				return { ok: false };
			}
			return { ok: true, cellId: cur, prevMask: oldMask };
		}

		async function search(current) {
			var stateKey = getStateKey(current);
			if (failedStateCache.has(stateKey)) {
				return;
			}

			states++;
			await checkpoint();
			if (states > maxStates || Date.now() > deadline) {
				throwIncomplete();
			}
			if (found) {
				return;
			}

			var remainingRequired = [];
			for (var i = 0; i < required.length; i++) {
				if (!(visitCount[required[i]] > 0)) {
					remainingRequired.push(required[i]);
				}
			}
			var reachable = computeReachableCells(current, visitCount, edgeMask);
			if (!reachableCheck(reachable, remainingRequired)) {
				return;
			}
			if (
				!crossingCellStillCompletable(
					current,
					visitCount,
					finishedCrossMask,
					edgeMask
				)
			) {
				return;
			}
			if (!noAdjStillPossible(visitCount, reachable)) {
				return;
			}
			if (!directedCluesPossible(path, visitCount, reachable)) {
				return;
			}
			if (!orderSequencePossible(path)) {
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
				var pathStates = getPathBorderStates(path);
				if (
					finalValidate(path, visitCount) &&
					pathMatchesForcedStates(pathStates, forcedStates || {})
				) {
					found = path.slice();
				}
				return;
			}

			var solved = false;
			var options = neighbors(current).filter(function(next) {
				var border = getBorderBetweenCells(current, next);
				return (
					!isLineBlocked(next) &&
					!isBorderUsed(border.id, edgeMask) &&
					!(next === goal && remainingRequired.length > 0) &&
					moveRespectsForced(current, next) &&
					(!(visitCount[next] > 0) || canReenterCell(next, current))
				);
			});
			options.sort(function(a, b) {
				var borderA = getBorderBetweenCells(current, a);
				var borderB = getBorderBetweenCells(current, b);
				var preferA =
					preferredStates && preferredStates[borderA.id] ? 0 : 1;
				var preferB =
					preferredStates && preferredStates[borderB.id] ? 0 : 1;
				if (preferA !== preferB) {
					return preferA - preferB;
				}
				var sa = requiredVisit(a) ? 0 : a === goal ? 1 : 2;
				var sb = requiredVisit(b) ? 0 : b === goal ? 1 : 2;
				return sa - sb;
			});

			for (var j = 0; j < options.length; j++) {
				var next = options[j];
				var border = getBorderBetweenCells(current, next);
				var prevMask = edgeMask;
				var previousCount = visitCount[next] || 0;
				edgeMask |= getBorderBit(border.id);
				path.push(next);
				visitCount[next] = previousCount + 1;

				var finishedInfo = applyFinishedCellState();
				if (finishedInfo.ok) {
					await search(next);
				}

				if (finishedInfo.cellId >= 0) {
					if (finishedInfo.prevMask) {
						finishedCrossMask[finishedInfo.cellId] = finishedInfo.prevMask;
					} else {
						delete finishedCrossMask[finishedInfo.cellId];
					}
				}
				if (previousCount > 0) {
					visitCount[next] = previousCount;
				} else {
					delete visitCount[next];
				}
				path.pop();
				edgeMask = prevMask;
				if (found) {
					solved = true;
					return;
				}
			}
			if (!solved) {
				failedStateCache.add(stateKey);
			}
		}

		await search(start);
		searchResultCache.set(forcedKey, found);
		return found;
	}

	if (isLineBlocked(start) || isLineBlocked(goal)) {
		throw new Error("start or goal is blocked");
	}

	var required = [];
	for (var r = 0; r < total; r++) {
		if (requiredVisit(r)) {
			required.push(r);
		}
	}
	var candidateBorders = [];
	for (var borderId = 0; borderId < board.border.length; borderId++) {
		var border = board.border[borderId];
		if (border.isnull || !border.inside) {
			continue;
		}
		insideBorderBitIndex[borderId] = nextBorderBit;
		nextBorderBit++;
		candidateBorders.push(borderId);
	}

	var initialForcedStates = getCurrentTravelLineForcedStates();
	var basePath = await findTravelLineSolution(initialForcedStates, null);
	if (!basePath) {
		throw new Error("travel line solver found no solution");
	}
	var baseStates = getPathBorderStates(basePath);
	var irrefutableStates = {};
	if (startBorder) {
		irrefutableStates[startBorder.id] = true;
	}
	if (goalBorder) {
		irrefutableStates[goalBorder.id] = true;
	}
	candidateBorders.sort(function(a, b) {
		return borderPriority(b, baseStates) - borderPriority(a, baseStates);
	});

	for (var i = 0; i < candidateBorders.length; i++) {
		var borderId = candidateBorders[i];
		if (irrefutableStates[borderId] !== undefined) {
			continue;
		}
		var forcedStates = cloneStateMap(initialForcedStates);
		Object.keys(irrefutableStates).forEach(function(id) {
			forcedStates[id] = irrefutableStates[id];
		});
		forcedStates[borderId] = !baseStates[borderId];
		var altPath = await findTravelLineSolution(forcedStates, baseStates);
		if (!altPath) {
			irrefutableStates[borderId] = baseStates[borderId];
		}
	}

	return applyTravelLineIrrefutable(irrefutableStates);
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
			if (hasTravelLineCrossingSupportGap()) {
				setStatus(messages.crossingUnsupported);
				return;
			}
			clearCurrentAnswer();
			setStatus(messages.solving);
			var localResult = await solveTravelLinePuzzle(requestId);
			if (localResult.changed > 0) {
				setStatus(
					localResult.partial
						? messages.partial(localResult.changed)
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
		if (error && error.code === "TL_ABORTED") {
			return;
		}
		if (error && error.code === "TL_INCOMPLETE") {
			setStatus(messages.incomplete);
		} else {
			setStatus(
				messages.error(error && error.message ? error.message : String(error))
			);
		}
	} finally {
		cancelBackendWorker("solver request finished");
		isApplying = false;
		setBusy(false);
		if (restartSolveAfterCurrent) {
			restartSolveAfterCurrent = false;
			scheduleRestartSolve();
		}
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
function scheduleRestartSolve() {
	if (isApplying) {
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
	if (suppressHistory) {
		return;
	}
	if (isApplying) {
		solveRequestId++;
		restartSolveAfterCurrent = true;
		cancelBackendWorker("board changed during solve");
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
