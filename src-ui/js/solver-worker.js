/* global Promise */

var solverModuleFactoryPromise = null;
var solverModulePromise = null;
var solverModuleUrl = new URL("../wasm/cspuz_solver_backend.js", import.meta.url).href;
var solverWasmUrl = new URL("../wasm/cspuz_solver_backend.wasm", import.meta.url).href;

function getSolverModuleFactory() {
	if (!solverModuleFactoryPromise) {
		solverModuleFactoryPromise = new Function(
			"path",
			"return import(path);"
		)(solverModuleUrl).then(function(imported) {
			return imported.default || imported;
		});
	}
	return solverModuleFactoryPromise;
}

function getSolverModule() {
	if (!solverModulePromise) {
		solverModulePromise = getSolverModuleFactory().then(function(factory) {
			return factory({
				locateFile: function(path) {
					if (path.endsWith(".wasm")) {
						return solverWasmUrl;
					}
					return path;
				}
			});
		});
	}
	return solverModulePromise;
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

function allocateSolverInput(module, encoded) {
	if (typeof module._prepare_input_buffer === "function") {
		return {
			ptr: module._prepare_input_buffer(encoded.length),
			release: function() {}
		};
	}
	if (typeof module._malloc === "function") {
		var ptr = module._malloc(encoded.length);
		return {
			ptr: ptr,
			release: function() {
				if (ptr) {
					module._free(ptr);
				}
			}
		};
	}
	throw new Error(
		"solver backend does not provide _prepare_input_buffer or _malloc"
	);
}

function solveProblem(url) {
	return getSolverModule().then(function(module) {
		var encoded = new TextEncoder().encode(url);
		var input = allocateSolverInput(module, encoded);
		module.HEAPU8.set(encoded, input.ptr);
		try {
			return readSolverResult(
				module,
				module._solve_problem(input.ptr, encoded.length)
			);
		} finally {
			input.release();
		}
	});
}

function solveCustomTravelLine(payload) {
	return getSolverModule().then(function(module) {
		if (typeof module._solve_custom_travelline !== "function") {
			return null;
		}

		var encoded = new TextEncoder().encode(JSON.stringify(payload));
		var input = allocateSolverInput(module, encoded);
		module.HEAPU8.set(encoded, input.ptr);
		try {
			return readSolverResult(
				module,
				module._solve_custom_travelline(input.ptr, encoded.length)
			);
		} finally {
			input.release();
		}
	});
}

self.onmessage = function(event) {
	var data = event.data || {};
	var runner;

	if (data.action === "solve_problem") {
		runner = solveProblem(data.payload);
	} else if (data.action === "solve_custom_travelline") {
		runner = solveCustomTravelLine(data.payload);
	} else {
		runner = Promise.reject(
			new Error("unknown solver worker action: " + data.action)
		);
	}

	runner
		.then(function(result) {
			self.postMessage(result);
		})
		.catch(function(error) {
			self.postMessage({
				status: "error",
				description:
					error && error.message
						? error.message
						: String(error || "solver worker failed")
			});
		});
};
