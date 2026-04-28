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
var TL_FLOOR_FLAGS = {
	BAR: 32,
	ICE: 1,
	NOTOUCH: 2,
	NOADJ: 4,
	SLOOP: 8,
	CWFLOOR: 16
};

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
				partial: function(count) {
					return count + " 個の確定結果を反映しました";
				},
					noChange: "反映できる新規結果はありません",
					cleared: "手入力を検出したため回答を消去しました",
					unsupported: "この盤面はまだ自動適用に対応していません",
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

function getTravelLineDirSide(cell, dir) {
	if (!cell || cell.isnull) {
		return null;
	}
	switch (dir) {
		case cell.UP:
			return "up";
		case cell.DN:
			return "down";
		case cell.LT:
			return "left";
		case cell.RT:
			return "right";
	}
	return null;
}

function getTravelLineOppositeSide(side) {
	switch (side) {
		case "up":
			return "down";
		case "down":
			return "up";
		case "left":
			return "right";
		case "right":
			return "left";
	}
	return null;
}

function getTravelLineCellEdgeSide(address, type) {
	if (!address || !address.oncell || !address.oncell()) {
		return null;
	}
	var cell = address.getc();
	if (!cell || cell.isnull || !cell.isOnBoardEdge()) {
		return null;
	}
	var side = getTravelLineDirSide(cell, address.getdir());
	if (!side) {
		return null;
	}
	if (type === "in") {
		return getTravelLineOppositeSide(side);
	}
	if (type === "out") {
		return side;
	}
	return null;
}

function getTravelLineEndpointSide(board, address, type) {
	if (!address) {
		return null;
	}
	if (address.onborder && address.onborder()) {
		return getTravelLineBorderSide(board, address.getb());
	}
	if (address.oncell && address.oncell()) {
		return getTravelLineCellEdgeSide(address, type);
	}
	return null;
}

function getTravelLineEndpointDir(address) {
	if (!address || !address.oncell || !address.oncell()) {
		return null;
	}
	return getTravelLineDirSide(address.getc(), address.getdir());
}

function getTravelLineEndpointPayload(board, address, type) {
	if (!address) {
		return null;
	}
	var outerSide = getTravelLineEndpointSide(board, address, type);
	var dir = getTravelLineEndpointDir(address);
	if (!outerSide && !dir) {
		return null;
	}
	return {
		outerSide: outerSide,
		dir: dir
	};
}

function getTravelLineBackendPayload() {
	var board = ui.puzzle.board;
	var rows = board.rows;
	var cols = board.cols;
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
			barRow.push(cell.isBar());
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
					throw new Error(
						"travelline backend does not support clue " +
							qnum +
							" at row " +
							(y + 1) +
							", col " +
							(x + 1)
					);
				}
				if (
					floors &
				~(
					TL_FLOOR_FLAGS.BAR |
					TL_FLOOR_FLAGS.ICE |
					TL_FLOOR_FLAGS.NOTOUCH |
					TL_FLOOR_FLAGS.NOADJ |
					TL_FLOOR_FLAGS.SLOOP |
						TL_FLOOR_FLAGS.CWFLOOR
					)
				) {
					throw new Error(
						"travelline backend does not support floor flag value " +
							floors +
							" at row " +
							(y + 1) +
							", col " +
							(x + 1)
					);
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
					throw new Error(
						"travelline backend does not support cross clue " +
							cross.qnum +
							" at cross " +
							cross.id
					);
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

	var startEndpoint = getTravelLineEndpointPayload(board, board.arrowin, "in");
	var goalEndpoint = getTravelLineEndpointPayload(board, board.arrowout, "out");
	if (!startEndpoint || !goalEndpoint) {
		throw new Error("travelline backend requires both in and out endpoints");
	}

	// Cross clues are currently supported only for slither-style 0..4.
	for (var borderId = 0; borderId < board.border.length; borderId++) {
		var border = board.border[borderId];
		if (border.inside && border.qnum !== -1) {
			throw new Error(
				"travelline backend does not support border clue " +
					border.qnum +
					" at border " +
					border.id
			);
		}
	}

	return {
		rows: rows,
		cols: cols,
		start: startCell.id,
		goal: goalCell.id,
		startSide: startEndpoint.outerSide,
		goalSide: goalEndpoint.outerSide,
		startOuterSide: startEndpoint.outerSide,
		goalOuterSide: goalEndpoint.outerSide,
		startDir: startEndpoint.dir,
		goalDir: goalEndpoint.dir,
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
	var result = await runBackendWorker("solve_custom_travelline", payload);
	if (!result || result.status !== "ok") {
		throw new Error(
			result && result.description
				? result.description
				: "travelline backend failed without a result"
		);
	}
	return result;
}

async function solveTravelLinePuzzle(requestId) {
	var board = ui.puzzle.board;
	var startBorder =
		board.arrowin && board.arrowin.onborder && board.arrowin.onborder()
			? board.arrowin.getb()
			: null;
	var goalBorder =
		board.arrowout && board.arrowout.onborder && board.arrowout.onborder()
			? board.arrowout.getb()
			: null;
	if (requestId !== solveRequestId) {
		throw makeAbortError("travel line solver aborted");
	}
	var backendResult = await solveTravelLineWithBackend();
	if (requestId !== solveRequestId) {
		throw makeAbortError("travel line solver aborted");
	}
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
				var backendResult = await solveTravelLinePuzzle(requestId);
				if (backendResult.changed > 0) {
					setStatus(
						backendResult.partial
							? messages.partial(backendResult.changed)
							: messages.applied(backendResult.changed)
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
			setStatus(
				messages.error(error && error.message ? error.message : String(error))
			);
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
