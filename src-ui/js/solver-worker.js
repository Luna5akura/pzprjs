/* global Promise */

var solverModuleFactoryPromise = null;
var solverModulePromise = null;

function getSolverModuleFactory() {
	if (!solverModuleFactoryPromise) {
		solverModuleFactoryPromise = new Function(
			"path",
			"return import(path);"
		)("../wasm/cspuz_solver_backend.js").then(function(imported) {
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
						return "../wasm/cspuz_solver_backend.wasm";
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

function solveProblem(url) {
	return getSolverModule().then(function(module) {
		var encoded = new TextEncoder().encode(url);
		var ptr = module._malloc(encoded.length);
		module.HEAPU8.set(encoded, ptr);

		try {
			return readSolverResult(module, module._solve_problem(ptr, encoded.length));
		} finally {
			module._free(ptr);
		}
	});
}

function solveCustomTravelLine(payload) {
	return getSolverModule().then(function(module) {
		if (typeof module._solve_custom_travelline !== "function") {
			return null;
		}

		var encoded = new TextEncoder().encode(JSON.stringify(payload));
		var ptr = module._malloc(encoded.length);
		module.HEAPU8.set(encoded, ptr);

		try {
			return readSolverResult(
				module,
				module._solve_custom_travelline(ptr, encoded.length)
			);
		} finally {
			module._free(ptr);
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
