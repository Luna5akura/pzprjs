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
var solverWorkerSequence = 0;
var SOLVER_DIAGNOSTICS_STORAGE_KEY = "pzpr.solver.debug";
var SOLVER_DIAGNOSTICS_MAX_EVENTS = 120;
var solverDiagnostics = {
	enabled: false,
	sequence: 0,
	events: []
};
var TL_FLOOR_FLAGS = {
	BAR: 32,
	ICE: 1,
	NOTOUCH: 2,
	NOADJ: 4,
	SLOOP: 8,
	CWFLOOR: 16
};
var TL_BORDER_CLUES = {
	COUNTRY: 1,
	REQUIRED: 2,
	BLOCK: 3
};

function readSolverDiagnosticsEnabled() {
	try {
		return (
			!!window.localStorage &&
			window.localStorage.getItem(SOLVER_DIAGNOSTICS_STORAGE_KEY) === "1"
		);
	} catch (e) {
		return false;
	}
}

function cloneSolverDiagnosticValue(value) {
	if (typeof value === "undefined") {
		return null;
	}
	try {
		return JSON.parse(JSON.stringify(value));
	} catch (e) {
		return String(value);
	}
}

function recordSolverDiagnostic(type, data) {
	if (!solverDiagnostics.enabled) {
		return;
	}

	var record = {
		sequence: ++solverDiagnostics.sequence,
		time: new Date().toISOString(),
		type: type,
		data: cloneSolverDiagnosticValue(data || {})
	};
	solverDiagnostics.events.push(record);
	if (solverDiagnostics.events.length > SOLVER_DIAGNOSTICS_MAX_EVENTS) {
		solverDiagnostics.events.shift();
	}
	if (window.console && typeof window.console.debug === "function") {
		window.console.debug("[pzpr solver]", record);
	}
}

function getSolverDiagnosticsSnapshot() {
	return {
		version: 1,
		enabled: solverDiagnostics.enabled,
		page: window.location.href,
		userAgent: window.navigator && window.navigator.userAgent,
		events: cloneSolverDiagnosticValue(solverDiagnostics.events)
	};
}

function installSolverDiagnostics() {
	solverDiagnostics.enabled = readSolverDiagnosticsEnabled();
	window.pzprSolverDiagnostics = {
		enable: function() {
			solverDiagnostics.enabled = true;
			try {
				window.localStorage.setItem(SOLVER_DIAGNOSTICS_STORAGE_KEY, "1");
			} catch (e) {
				// Diagnostics still work for the current page when storage is unavailable.
			}
			recordSolverDiagnostic("diagnostics-enabled", {});
		},
		disable: function() {
			solverDiagnostics.enabled = false;
			try {
				window.localStorage.removeItem(SOLVER_DIAGNOSTICS_STORAGE_KEY);
			} catch (e) {
				// Ignore storage errors.
			}
		},
		clear: function() {
			solverDiagnostics.events = [];
			solverDiagnostics.sequence = 0;
		},
		get: getSolverDiagnosticsSnapshot,
		export: function() {
			return JSON.stringify(getSolverDiagnosticsSnapshot(), null, 2);
		}
	};
}

function getSolverBoardSnapshot() {
	if (!window.ui || !ui.puzzle) {
		return null;
	}

	var puzzle = ui.puzzle;
	var board = puzzle.board;
	var snapshot = {
		pid: puzzle.pid,
		ready: puzzle.ready,
		playmode: puzzle.playmode,
		editmode: puzzle.editmode,
		rows: board && board.rows,
		cols: board && board.cols
	};

	try {
		snapshot.pzprUrl = puzzle.getURL(pzpr.parser.URL_PZPRV3);
	} catch (e) {
		snapshot.pzprUrlError = String(e);
	}
	try {
		snapshot.solverUrl = getSolverUrl();
	} catch (e2) {
		snapshot.solverUrlError = String(e2);
	}

	if (!board) {
		return snapshot;
	}

	snapshot.cells = [];
	for (var i = 0; i < board.cell.length; i++) {
		var cell = board.cell[i];
		if (!cell || cell.isnull) {
			continue;
		}
		snapshot.cells.push({
			id: cell.id,
			x: cell.bx,
			y: cell.by,
			qnum: cell.qnum,
			ques: cell.ques,
			qans: cell.qans,
			qsub: cell.qsub,
			anum: cell.anum,
			solverState: cloneSolverDiagnosticValue(cell._solverState),
			walkwalkSolverState: cell._walkwalkSolverState,
			travellineSolverCellState: cell._travellineSolverCellState
		});
	}
	snapshot.borders = [];
	for (var j = 0; j < board.border.length; j++) {
		var border = board.border[j];
		if (!border || border.isnull) {
			continue;
		}
		snapshot.borders.push({
			id: border.id,
			x: border.bx,
			y: border.by,
			ques: border.ques,
			qans: border.qans,
			qsub: border.qsub,
			line: !!(border.isLine && border.isLine()),
			solverState: cloneSolverDiagnosticValue(border._solverState),
			travellineSolverState: border._travellineSolverState
		});
	}
	return snapshot;
}

function getSolverDescriptionSummary(result) {
	var description = result && result.description;
	var data =
		description && Array.isArray(description.data) ? description.data : [];
	var colors = {};
	var kinds = {};
	var coordinates = {};
	var suspiciousCellCoordinates = [];

	for (var i = 0; i < data.length; i++) {
		var entry = data[i] || {};
		var kind = getItemKind(entry.item) || "(unknown)";
		var color = entry.color || "(missing)";
		colors[color] = (colors[color] || 0) + 1;
		kinds[kind] = (kinds[kind] || 0) + 1;

		if (!isAnswerColor(entry) || !isCellCoordinate(entry)) {
			continue;
		}
		var coordinate = entry.x + "," + entry.y;
		if (!coordinates[coordinate]) {
			coordinates[coordinate] = [];
		}
		coordinates[coordinate].push({
			index: i,
			color: color,
			kind: kind,
			item: cloneSolverDiagnosticValue(entry.item)
		});
	}

	Object.keys(coordinates).forEach(function(coordinate) {
		var entries = coordinates[coordinate];
		var shapeKinds = [];
		for (var i = 0; i < entries.length; i++) {
			if (
				entries[i].kind !== "text" &&
				shapeKinds.indexOf(entries[i].kind) < 0
			) {
				shapeKinds.push(entries[i].kind);
			}
		}
		var hasDarkMark =
			shapeKinds.indexOf("block") >= 0 ||
			shapeKinds.indexOf("fill") >= 0 ||
			shapeKinds.indexOf("filledCircle") >= 0;
		var hasLightMark =
			shapeKinds.indexOf("dot") >= 0 || shapeKinds.indexOf("circle") >= 0;
		if (hasDarkMark && hasLightMark) {
			suspiciousCellCoordinates.push({
				coordinate: coordinate,
				entries: entries
			});
		}
	});

	return {
		status: result && result.status,
		description: cloneSolverDiagnosticValue(description),
		dataLength: data.length,
		colors: colors,
		kinds: kinds,
		suspiciousCellCoordinates: suspiciousCellCoordinates
	};
}

installSolverDiagnostics();

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
					return count + " 個の solver 結果を表示しました";
				},
				partial: function(count) {
					return count + " 個の確定 solver 結果を表示しました";
				},
				noChange: "表示できる新規 solver 結果はありません",
				cleared: "手入力を検出したため solver 表示を消去しました",
				clearedOverlay: "手入力を検出したため solver 表示を消去しました",
				unsupported: "この盤面はまだ solver 表示に対応していません",
				unsupportedForcedLines:
					"このパズルは回答線を条件にした solver 実行にまだ対応していません",
				error: function(message) {
					return "solver error: " + message;
				}
		  }
		: {
				idle: "solver idle",
				loading: "loading solver...",
				solving: "running solver from a blank answer...",
				applied: function(count) {
					return "displayed " + count + " solver result" + (count === 1 ? "" : "s");
				},
				partial: function(count) {
					return (
						"displayed " +
						count +
						" irrefutable solver result" +
						(count === 1 ? "" : "s")
					);
				},
				noChange: "no solver result could be displayed",
				cleared: "manual edit detected, cleared the solver overlay",
				clearedOverlay: "manual edit detected, cleared the solver overlay",
				unsupported: "this puzzle is not supported for solver overlay yet",
				unsupportedForcedLines:
					"this puzzle does not support solving with answer-mode line constraints yet",
				error: function(message) {
					return "solver error: " + message;
				}
		  };
}

function setStatus(message) {
	if (controls && controls.status) {
		controls.status.textContent = message;
		controls.status.title = message;
	}
	if (window.ui && typeof ui.scheduleControlPanelHeightStabilize === "function") {
		ui.scheduleControlPanelHeightStabilize();
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
	var previous = suppressHistory;
	suppressHistory = true;
	try {
		return callback();
	} finally {
		suppressHistory = previous;
	}
}

function clearGenericSolverOverlay() {
	if (!ui.puzzle || !ui.puzzle.board) {
		hasSolverState = false;
		return 0;
	}

	var board = ui.puzzle.board;
	var changed = 0;
	withSuppressedHistory(function() {
		for (var i = 0; i < board.border.length; i++) {
			if (board.border[i]._solverState) {
				board.border[i]._solverState = null;
				changed++;
			}
		}
		for (var j = 0; j < board.cell.length; j++) {
			if (board.cell[j]._solverState) {
				board.cell[j]._solverState = null;
				changed++;
			}
			if (board.cell[j]._walkwalkSolverState) {
				board.cell[j]._walkwalkSolverState = null;
				changed++;
			}
		}
		if (changed > 0) {
			ui.puzzle.redraw();
		}
	});
	hasSolverState = false;
	return changed;
}

function clearTravelLineSolverOverlay() {
	if (!isTravelLinePuzzle() || !ui.puzzle || !ui.puzzle.board) {
		hasSolverState = false;
		return 0;
	}

	var board = ui.puzzle.board;
	var changed = 0;
	withSuppressedHistory(function() {
		for (var i = 0; i < board.border.length; i++) {
			if (board.border[i]._travellineSolverState) {
				board.border[i]._travellineSolverState = null;
				changed++;
			}
		}
		for (var j = 0; j < board.cell.length; j++) {
			if (board.cell[j]._travellineSolverCellState) {
				board.cell[j]._travellineSolverCellState = null;
				changed++;
			}
		}
		if (changed > 0) {
			ui.puzzle.redraw();
		}
	});
	hasSolverState = false;
	return changed;
}

async function solveCurrentPuzzle() {
	return runBackendWorker("solve_problem", getSolverUrl());
}

async function solveCurrentPuzzleWithForcedLines(payload) {
	return runBackendWorker("solve_problem_with_forced_lines", payload);
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
	recordSolverDiagnostic("worker-cancel", {
		taskId: task.id,
		action: task.action,
		message: message || "solver worker aborted"
	});
	task.worker.onmessage = null;
	task.worker.onerror = null;
	task.worker.terminate();
	task.reject(makeAbortError(message || "solver worker aborted"));
}

function runBackendWorker(action, payload) {
	cancelBackendWorker("superseded by a newer solver request");
	return new Promise(function(resolve, reject) {
		var taskId = ++solverWorkerSequence;
		var worker = new Worker(new URL("./solver-worker.js", import.meta.url), {
			type: "module"
		});
		backendWorkerTask = {
			id: taskId,
			action: action,
			worker: worker,
			reject: reject
		};
		recordSolverDiagnostic("worker-start", {
			taskId: taskId,
			action: action,
			payload: payload
		});

		worker.onmessage = function(event) {
			if (backendWorkerTask && backendWorkerTask.worker === worker) {
				backendWorkerTask = null;
			}
			worker.terminate();
			recordSolverDiagnostic("worker-result", {
				taskId: taskId,
				action: action,
				result: getSolverDescriptionSummary(event.data)
			});
			resolve(event.data);
		};
		worker.onerror = function(event) {
			if (backendWorkerTask && backendWorkerTask.worker === worker) {
				backendWorkerTask = null;
			}
			worker.terminate();
			recordSolverDiagnostic("worker-error", {
				taskId: taskId,
				action: action,
				message:
					event && event.message
						? event.message
						: "solver worker failed unexpectedly"
			});
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

function getTravelLineCellBorder(cell, side) {
	if (!cell || cell.isnull) {
		return null;
	}
	switch (side) {
		case "up":
			return cell.adjborder.top;
		case "down":
			return cell.adjborder.bottom;
		case "left":
			return cell.adjborder.left;
		case "right":
			return cell.adjborder.right;
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

function getForcedLineStateForBorder(border) {
	if (!border || border.isnull) {
		return -1;
	}
	if (border.isLine && border.isLine()) {
		return 1;
	}
	if (border.qsub === 2) {
		return 0;
	}
	return -1;
}

function getForcedLinePayload() {
	var board = ui.puzzle.board;
	var rows = board.rows;
	var cols = board.cols;
	var forcedH = [];
	var forcedV = [];
	var hasForced = false;

	for (var y = 0; y < rows; y++) {
		var hRow = [];
		for (var x = 0; x + 1 < cols; x++) {
			var cell = board.cell[y * cols + x];
			var hState = getForcedLineStateForBorder(board.getb(cell.bx + 1, cell.by));
			if (hState !== -1) {
				hasForced = true;
			}
			hRow.push(hState);
		}
		forcedH.push(hRow);
	}

	for (var y2 = 0; y2 + 1 < rows; y2++) {
		var vRow = [];
		for (var x2 = 0; x2 < cols; x2++) {
			var cell2 = board.cell[y2 * cols + x2];
			var vState = getForcedLineStateForBorder(board.getb(cell2.bx, cell2.by + 1));
			if (vState !== -1) {
				hasForced = true;
			}
			vRow.push(vState);
		}
		forcedV.push(vRow);
	}

	return {
		url: getSolverUrl(),
		forcedH: forcedH,
		forcedV: forcedV,
		hasForced: hasForced
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
	var borderH = [];
	var borderV = [];
	var directed = [];
	var requiredH = [];
	var requiredV = [];
	var forcedH = [];
	var forcedV = [];
	var boundaryArrows = [];

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
		var borderHRow = [];
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
				var hBorder = board.getb(cell.bx + 1, cell.by);
				reqHRow.push(hBorder.ques === TL_BORDER_CLUES.REQUIRED);
				countryHRow.push(hBorder.ques === TL_BORDER_CLUES.COUNTRY);
				borderHRow.push(hBorder.ques === TL_BORDER_CLUES.BLOCK);
				forcedHRow.push(getForcedLineStateForBorder(hBorder));
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
		borderH.push(borderHRow);
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
		var borderVRow = [];
		var forcedVRow = [];
		for (var x2 = 0; x2 < cols; x2++) {
			var cell2 = board.cell[y2 * cols + x2];
			var vBorder = board.getb(cell2.bx, cell2.by + 1);
			reqVRow.push(vBorder.ques === TL_BORDER_CLUES.REQUIRED);
			countryVRow.push(vBorder.ques === TL_BORDER_CLUES.COUNTRY);
			borderVRow.push(vBorder.ques === TL_BORDER_CLUES.BLOCK);
			forcedVRow.push(getForcedLineStateForBorder(vBorder));
		}
		requiredV.push(reqVRow);
		countryV.push(countryVRow);
		borderV.push(borderVRow);
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
		if (border.inside && border.qnum !== -1 && !border.isTravelLineBoundaryArrow()) {
			throw new Error(
				"travelline backend does not support border clue " +
					border.qnum +
					" at border " +
					border.id
			);
		}
		if (border.isTravelLineBoundaryArrow()) {
			var arrowCell = null;
			var arrowSide = null;
			var arrowDir = border.getTravelLineBoundaryArrow();
			var sideCells = border.inside
				? border.sidecell
				: [board.getEntryCellByBorder(border)];
			for (var sideIndex = 0; sideIndex < sideCells.length; sideIndex++) {
				var candidate = sideCells[sideIndex];
				var candidateSide = getTravelLineDirSide(candidate, arrowDir);
				if (
					candidate &&
					!candidate.isnull &&
					candidateSide &&
					getTravelLineCellBorder(candidate, candidateSide) === border
				) {
					arrowCell = candidate;
					arrowSide = candidateSide;
					break;
				}
			}
			if (!arrowCell || !arrowSide) {
				throw new Error(
					"travelline backend cannot encode boundary arrow at border " +
						border.id
				);
			}
			var boundarySide = getTravelLineBorderSide(board, border);
			if (!border.inside && !boundarySide) {
				throw new Error(
					"travelline backend cannot determine boundary arrow side at border " +
						border.id
				);
			}
			boundaryArrows.push({
				cell: arrowCell.id,
				side: arrowSide,
				boundarySide: boundarySide
			});
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
		borderH: borderH,
		borderV: borderV,
		directed: directed,
		requiredH: requiredH,
		requiredV: requiredV,
		forcedH: forcedH,
		forcedV: forcedV,
		boundaryArrows: boundaryArrows
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
	var changed = applyTravelLineDescription(backendResult);
	var endpointChanged = 0;
	withSuppressedHistory(function() {
		if (
			startBorder &&
			!hasAnswerLineState(startBorder) &&
			startBorder._travellineSolverState !== "line"
		) {
			startBorder._travellineSolverState = "line";
			endpointChanged++;
		}
		if (
			goalBorder &&
			!hasAnswerLineState(goalBorder) &&
			goalBorder._travellineSolverState !== "line"
		) {
			goalBorder._travellineSolverState = "line";
			endpointChanged++;
		}
		var cellOverlay = recomputeTravelLineCellOverlayStates(board);
		endpointChanged += cellOverlay.changed;
		if (endpointChanged > 0) {
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

function getAnswerInputModes() {
	if (!window.ui || !ui.puzzle || !ui.puzzle.mouse) {
		return [];
	}
	var modes = ui.puzzle.mouse.getInputModeList("play");
	return modes || [];
}

function isLinePuzzle() {
	var modes = getAnswerInputModes();
	return (
		modes.indexOf("line") >= 0 ||
		modes.indexOf("peke") >= 0 ||
		modes.indexOf("bar") >= 0
	);
}

function isWalkWalkPuzzle() {
	return window.ui && ui.puzzle && ui.puzzle.pid === "walkwalk";
}

function isSolverOverlayCircleKind(kind) {
	return (
		kind === "dot" ||
		kind === "circle" ||
		kind === "filledCircle" ||
		kind === "smallCircle" ||
		kind === "smallFilledCircle"
	);
}

function isSolverOverlayCellKind(kind) {
	return (
		kind === "text" ||
		kind === "block" ||
		kind === "fill" ||
		kind === "square" ||
		kind === "triangle" ||
		kind === "cross" ||
		kind === "slash" ||
		kind === "backslash" ||
		kind === "dottedSlash" ||
		kind === "dottedBackslash" ||
		kind === "plus" ||
		kind === "lineTo" ||
		kind === "arrowUp" ||
		kind === "arrowDown" ||
		kind === "arrowLeft" ||
		kind === "arrowRight" ||
		kind === "sideArrowUp" ||
		kind === "sideArrowDown" ||
		kind === "sideArrowLeft" ||
		kind === "sideArrowRight" ||
		kind === "pencilUp" ||
		kind === "pencilDown" ||
		kind === "pencilLeft" ||
		kind === "pencilRight" ||
		kind === "firewalkCellUnknown" ||
		kind === "firewalkCellUl" ||
		kind === "firewalkCellUr" ||
		kind === "firewalkCellDl" ||
		kind === "firewalkCellDr" ||
		kind === "firewalkCellUlDr" ||
		kind === "firewalkCellUrDl" ||
		isSolverOverlayCircleKind(kind)
	);
}

function hasAnswerCellState(cell) {
	return (
		!!cell &&
		!cell.isnull &&
		(cell.qans !== 0 || cell.qsub !== 0 || cell.anum !== -1)
	);
}

function appendSolverOverlayState(piece, entry) {
	var state = piece._solverState;
	if (!state) {
		state = piece._solverState = [];
	} else if (!Array.isArray(state)) {
		state = piece._solverState = [{ color: "green", item: state }];
	}
	state.push({ color: entry.color, item: entry.item });
	return 1;
}

function applyCellEntry(entry) {
	var kind = getItemKind(entry.item);
	if (!isSolverOverlayCellKind(kind)) {
		return null;
	}

	var cell = ui.puzzle.board.getc(entry.x, entry.y);
	if (cell.isnull) {
		return 0;
	}
	if (hasAnswerCellState(cell)) {
		return 0;
	}

	if (isWalkWalkPuzzle() && isSolverOverlayCircleKind(kind)) {
		if (cell._walkwalkSolverState !== "passed") {
			cell._walkwalkSolverState = "passed";
			return 1;
		}
		return 0;
	}

	return appendSolverOverlayState(cell, entry);
}

function applyBorderEntry(entry) {
	if (!getGenericSolverOverlayKind(entry)) {
		return null;
	}

	var border = ui.puzzle.board.getb(entry.x, entry.y);
	if (border.isnull) {
		return 0;
	}
	if (hasAnswerLineState(border)) {
		return 0;
	}

	return appendSolverOverlayState(border, entry);
}

function getGenericSolverOverlayKind(entry) {
	var kind = getItemKind(entry.item);
	if (kind === "doubleLine") {
		return "doubleLine";
	}
	if (
		kind === "line" ||
		kind === "wall" ||
		kind === "boldWall" ||
		kind === "dottedLine" ||
		kind === "dottedWall" ||
		kind === "dottedHorizontalWall" ||
		kind === "dottedVerticalWall"
	) {
		return "line";
	}
	if (kind === "cross") {
		return "cross";
	}
	return null;
}

function hasAnswerLineState(border) {
	return (
		!!border &&
		!border.isnull &&
		((border.isLine && border.isLine()) || border.qans !== 0 || border.qsub === 2)
	);
}

function applyGenericSolverOverlayEntry(entry) {
	return applyEntry(entry);
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

function getTravelLineOverlayKind(entry) {
	var kind = getItemKind(entry.item);
	if (kind === "line" || kind === "wall") {
		return "line";
	}
	if (kind === "cross") {
		return "cross";
	}
	return null;
}

function isTravelLineOverlayPossibleBorder(border) {
	if (!border || border.isnull) {
		return false;
	}
	if (border.isLine && border.isLine()) {
		return true;
	}
	if (border.qsub === 2) {
		return false;
	}
	if (border.inside) {
		return border._travellineSolverState !== "cross";
	}
	return border._travellineSolverState === "line";
}

function deriveTravelLineCellOverlayState(cell) {
	if (!cell || cell.isnull) {
		return null;
	}
	if (cell.isBar && cell.isBar() && !cell.board.isBarEndpointCell(cell)) {
		return "cross";
	}
	var adb = cell.adjborder;
	var candidates = [adb.top, adb.bottom, adb.left, adb.right];
	for (var i = 0; i < candidates.length; i++) {
		if (isTravelLineOverlayPossibleBorder(candidates[i])) {
			return null;
		}
	}
	return "cross";
}

function recomputeTravelLineCellOverlayStates(board) {
	var changed = 0;
	var recognized = 0;
	for (var c = 0; c < board.cell.length; c++) {
		var boardCell = board.cell[c];
		var explicitState = boardCell._travellineSolverCellState === "cross" ? "cross" : null;
		var derivedState = explicitState || deriveTravelLineCellOverlayState(boardCell);
		if (boardCell._travellineSolverCellState !== derivedState) {
			boardCell._travellineSolverCellState = derivedState;
			changed++;
		}
		if (derivedState) {
			recognized++;
		}
	}
	return { changed: changed, recognized: recognized };
}

function applyTravelLineDescription(result) {
	if (!result || result.status !== "ok" || !result.description) {
		throw new Error(
			(result && result.description) || "solver did not return a board description"
		);
	}

	recordSolverDiagnostic("description-apply-start", {
		mode: "travelline",
		result: getSolverDescriptionSummary(result),
		board: getSolverBoardSnapshot()
	});
	var description = result.description;
	var data = description.data || [];
	var changed = 0;
	var recognized = 0;
	clearTravelLineSolverOverlay();

	withSuppressedHistory(function() {
		for (var i = 0; i < data.length; i++) {
			var entry = data[i];
			if (!isAnswerColor(entry)) {
				continue;
			}
			var state = getTravelLineOverlayKind(entry);
			if (!state) {
				continue;
			}
			if (isBorderCoordinate(entry)) {
				var border = ui.puzzle.board.getb(entry.x, entry.y);
				if (border.isnull) {
					continue;
				}
				recognized++;
				if (hasAnswerLineState(border)) {
					continue;
				}
				if (border._travellineSolverState !== state) {
					border._travellineSolverState = state;
					changed++;
				}
			} else if (isCellCoordinate(entry) && state === "cross") {
				var cell = ui.puzzle.board.getc(entry.x, entry.y);
				if (cell.isnull) {
					continue;
				}
				recognized++;
				if (cell._travellineSolverCellState !== "cross") {
					cell._travellineSolverCellState = "cross";
					changed++;
				}
			}
		}
		var cellOverlay = recomputeTravelLineCellOverlayStates(ui.puzzle.board);
		changed += cellOverlay.changed;
		recognized += cellOverlay.recognized;
		if (changed > 0) {
			ui.puzzle.redraw();
		}
	});

	if (!recognized && data.length) {
		throw new Error(getMessages().unsupported);
	}

	hasSolverState = recognized > 0;
	recordSolverDiagnostic("description-apply-finish", {
		mode: "travelline",
		recognized: recognized,
		changed: changed,
		board: getSolverBoardSnapshot()
	});
	return changed;
}

function applyGenericSolverOverlayDescription(result) {
	if (!result || result.status !== "ok" || !result.description) {
		throw new Error(
			(result && result.description) || "solver did not return a board description"
		);
	}

	var description = result.description;
	if (!description.data || !description.data.length) {
		throw new Error("solver returned no drawable result");
	}

	recordSolverDiagnostic("description-apply-start", {
		mode: "generic",
		result: getSolverDescriptionSummary(result),
		board: getSolverBoardSnapshot()
	});
	var changed = 0;
	var recognized = 0;
	var answerEntries = 0;
	clearGenericSolverOverlay();

	withSuppressedHistory(function() {
		for (var i = 0; i < description.data.length; i++) {
			var entry = description.data[i];
			if (!isAnswerColor(entry)) {
				continue;
			}
			answerEntries++;
			var applied = applyGenericSolverOverlayEntry(entry);
			if (applied !== null) {
				recognized++;
				changed += applied;
			}
		}
		if (changed > 0) {
			ui.puzzle.redraw();
		}
	});

	if (!recognized) {
		if (!answerEntries) {
			hasSolverState = false;
			recordSolverDiagnostic("description-apply-finish", {
				mode: "generic",
				recognized: recognized,
				answerEntries: answerEntries,
				changed: changed,
				board: getSolverBoardSnapshot()
			});
			return 0;
		}
		throw new Error(getMessages().unsupported);
	}

	hasSolverState = changed > 0;
	recordSolverDiagnostic("description-apply-finish", {
		mode: "generic",
		recognized: recognized,
		answerEntries: answerEntries,
		changed: changed,
		board: getSolverBoardSnapshot()
	});
	return changed;
}

function applyDescription(result) {
	return applyGenericSolverOverlayDescription(result);
}

async function runSolver() {
	var requestId = ++solveRequestId;
	var messages = getMessages();
	var startedAt = Date.now();
	recordSolverDiagnostic("solve-start", {
		requestId: requestId,
		board: getSolverBoardSnapshot()
	});

	if (isApplying) {
		recordSolverDiagnostic("solve-skipped", {
			requestId: requestId,
			reason: "already applying"
		});
		return;
	}

	isApplying = true;
	setBusy(true);
	setStatus(messages.loading);

	try {
		if (isTravelLinePuzzle()) {
			clearTravelLineSolverOverlay();
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
			recordSolverDiagnostic("solve-finish", {
				requestId: requestId,
				durationMs: Date.now() - startedAt,
				changed: backendResult.changed,
				partial: backendResult.partial,
				board: getSolverBoardSnapshot()
			});
			return;
		}

		await getSolverModule();
		if (requestId !== solveRequestId) {
			recordSolverDiagnostic("solve-stale", {
				requestId: requestId,
				currentRequestId: solveRequestId,
				stage: "after module load"
			});
			return;
		}

		setStatus(messages.solving);

		var result;
		var linePuzzle = isLinePuzzle();
		if (linePuzzle) {
			clearGenericSolverOverlay();
			var forcedPayload = getForcedLinePayload();
			if (forcedPayload.hasForced) {
				result = await solveCurrentPuzzleWithForcedLines(forcedPayload);
				if (!result) {
					throw new Error(messages.unsupportedForcedLines);
				}
			} else {
				result = await solveCurrentPuzzle();
			}
		} else {
			clearGenericSolverOverlay();
			result = await solveCurrentPuzzle();
		}
		if (requestId !== solveRequestId) {
			recordSolverDiagnostic("solve-stale", {
				requestId: requestId,
				currentRequestId: solveRequestId,
				stage: "after backend result",
				board: getSolverBoardSnapshot()
			});
			return;
		}

		var appliedCount = linePuzzle
			? applyGenericSolverOverlayDescription(result)
			: applyDescription(result);
		setStatus(
			appliedCount > 0 ? messages.applied(appliedCount) : messages.noChange
		);
		recordSolverDiagnostic("solve-finish", {
			requestId: requestId,
			durationMs: Date.now() - startedAt,
			changed: appliedCount,
			linePuzzle: linePuzzle,
			board: getSolverBoardSnapshot()
		});
	} catch (error) {
		if (error && error.code === "TL_ABORTED") {
			recordSolverDiagnostic("solve-aborted", {
				requestId: requestId,
				durationMs: Date.now() - startedAt,
				message: error.message
			});
			return;
		}
		recordSolverDiagnostic("solve-error", {
			requestId: requestId,
			durationMs: Date.now() - startedAt,
			message: error && error.message ? error.message : String(error),
			board: getSolverBoardSnapshot()
		});
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
		recordSolverDiagnostic("solve-cleanup", {
			requestId: requestId,
			currentRequestId: solveRequestId,
			restartScheduled: !!autoSolveTimer
		});
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

function invalidatePendingSolver(reason) {
	var hadPendingWork = isApplying || !!backendWorkerTask || !!autoSolveTimer;
	solveRequestId++;
	restartSolveAfterCurrent = false;
	if (autoSolveTimer) {
		clearTimeout(autoSolveTimer);
		autoSolveTimer = null;
	}
	cancelBackendWorker(reason);
	recordSolverDiagnostic("solver-invalidated", {
		reason: reason,
		hadPendingWork: hadPendingWork,
		currentRequestId: solveRequestId
	});
}

function onHistoryChange() {
	if (suppressHistory) {
		return;
	}
	if (isTravelLinePuzzle() && ui.puzzle && ui.puzzle.playmode) {
		return;
	}
	if (isApplying) {
		solveRequestId++;
		restartSolveAfterCurrent = true;
		recordSolverDiagnostic("board-changed-during-solve", {
			currentRequestId: solveRequestId,
			board: getSolverBoardSnapshot()
		});
		cancelBackendWorker("board changed during solve");
		return;
	}

	if (hasSolverState) {
		if (isTravelLinePuzzle()) {
			clearTravelLineSolverOverlay();
		} else {
			clearGenericSolverOverlay();
		}
		setStatus(getMessages().clearedOverlay);
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
	if (window.ui && typeof ui.scheduleControlPanelHeightStabilize === "function") {
		ui.scheduleControlPanelHeightStabilize();
	}
}

function onModeChange() {
	if (hasSolverState) {
		ui.puzzle.redraw();
	}
	refreshVisibility();
}

function initializeSolverUi() {
	var uiControls = getControls();
	if (!uiControls.panel) {
		return;
	}

	uiControls.erase.checked = true;
	uiControls.erase.disabled = true;
	if (uiControls.erase.parentNode) {
		uiControls.erase.parentNode.style.display = "none";
	}

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
		invalidatePendingSolver("puzzle reloaded");
		if (isTravelLinePuzzle()) {
			clearTravelLineSolverOverlay();
		} else {
			clearGenericSolverOverlay();
		}
		hasSolverState = false;
		recordSolverDiagnostic("puzzle-ready", {
			board: getSolverBoardSnapshot()
		});
		refreshVisibility();
	});
	ui.puzzle.on("history", onHistoryChange);
	ui.puzzle.on("mode", onModeChange);

	refreshVisibility();
}

pzpr.on("load", function() {
	if (window.ui && ui.puzzle) {
		initializeSolverUi();
	}
});
