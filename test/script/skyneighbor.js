/* skyneighbor.js */

// Fixture from WPF Puzzle GP 2015 Round 4, puzzle 22.  The URL contains the
// three inner givens, the four rows of outside visibility clues, and the
// outlined-cell masks used by the published solution.
var skyNeighborUrl =
	"9/9/..........1.............................2.............................3........../.G..GG.GG;GGGG.G...;.G.G...GG;.G..G..G.;.GG....G.;.G.G....G;.G.GGGG.G;GGG....GG;.G.G.GGGG/212221313/212223121/213211232/221223121/010001111/010001111/011100010/001001111";

var skyNeighborInnerGivens = [
	".........",
	".1.......",
	".........",
	".........",
	"....2....",
	".........",
	".........",
	".......3.",
	"........."
];
var skyNeighborInnerGray = [
	".G..GG.GG",
	"GGGG.G...",
	".G.G...GG",
	".G..G..G.",
	".GG....G.",
	".G.G....G",
	".G.GGGG.G",
	"GGG....GG",
	".G.G.GGGG"
];
var skyNeighborOuterGivens = [
	"212221313",
	"212223121",
	"213211232",
	"221223121"
];
var skyNeighborOuterGray = ["010001111", "010001111", "011100010", "001001111"];
var skyNeighborOuterAnswer = [
	"212221313",
	"212223121",
	"213211232",
	"221223121"
];
var skyNeighborAnswer = [
	"232213131",
	"313132122",
	"121233213",
	"131312232",
	"312321312",
	"323121321",
	"213213123",
	"121332231",
	"232121313"
];

function skyCloneRows(rows) {
	return rows.map(function(row) {
		return row.split("");
	});
}

function skyLayer(
	layer,
	innerGivens,
	innerGray,
	outerGivens,
	outerGray,
	innerAnswer,
	outerAnswer
) {
	var rows = [];
	for (var fy = 0; fy < 11; fy++) {
		var row = [];
		for (var fx = 0; fx < 11; fx++) {
			var value = ".";
			var iy = fy - 1;
			var ix = fx - 1;
			if (iy >= 0 && iy < 9 && ix >= 0 && ix < 9) {
				if (layer === "qnum") {
					value = innerGivens[iy][ix];
				} else if (layer === "gray") {
					value = innerGray[iy][ix] === "G" ? "1" : "0";
				} else {
					value = innerAnswer[iy][ix];
				}
			} else if (fy === 0 && fx >= 1 && fx <= 9) {
				var top = fx - 1;
				value =
					layer === "qnum"
						? outerGivens[0][top]
						: layer === "gray"
						? outerGray[0][top]
						: outerAnswer[0][top];
			} else if (fy === 10 && fx >= 1 && fx <= 9) {
				var bottom = fx - 1;
				value =
					layer === "qnum"
						? outerGivens[1][bottom]
						: layer === "gray"
						? outerGray[1][bottom]
						: outerAnswer[1][bottom];
			} else if (fx === 0 && fy >= 1 && fy <= 9) {
				var left = fy - 1;
				value =
					layer === "qnum"
						? outerGivens[2][left]
						: layer === "gray"
						? outerGray[2][left]
						: outerAnswer[2][left];
			} else if (fx === 10 && fy >= 1 && fy <= 9) {
				var right = fy - 1;
				value =
					layer === "qnum"
						? outerGivens[3][right]
						: layer === "gray"
						? outerGray[3][right]
						: outerAnswer[3][right];
			}
			row.push(value);
		}
		rows.push(row.join(" "));
	}
	return rows.join(" / ");
}

function skyNeighborFile(options) {
	options = options || {};
	var innerGivens = skyCloneRows(options.innerGivens || skyNeighborInnerGivens);
	var innerGray = skyCloneRows(options.innerGray || skyNeighborInnerGray);
	var outerGivens = (options.outerGivens || skyNeighborOuterGivens).map(
		function(row) {
			return row.split("");
		}
	);
	var outerGray = (options.outerGray || skyNeighborOuterGray).map(function(
		row
	) {
		return row.split("");
	});
	var answer = (options.answer || skyNeighborAnswer).map(function(row) {
		return row.split("");
	});
	var outerAnswer = (options.outerAnswer || skyNeighborOuterAnswer).map(
		function(row) {
			return row.split("");
		}
	);
	return (
		[
			"pzprv3/skyneighbor/9/9/" +
				skyLayer(
					"qnum",
					innerGivens,
					innerGray,
					outerGivens,
					outerGray,
					answer,
					outerAnswer
				),
			skyLayer(
				"gray",
				innerGivens,
				innerGray,
				outerGivens,
				outerGray,
				answer,
				outerAnswer
			),
			skyLayer(
				"anum",
				innerGivens,
				innerGray,
				outerGivens,
				outerGray,
				answer,
				outerAnswer
			)
		].join(" / ") + " /"
	);
}

var skyNeighborValidFile = skyNeighborFile();
var skyNeighborNoNumAnswer = skyNeighborAnswer.map(function(row) {
	return row.split("");
});
skyNeighborNoNumAnswer[0][0] = ".";
var skyNeighborNoNumFile = skyNeighborFile({
	answer: skyNeighborNoNumAnswer.map(function(row) {
		return row.join("");
	})
});

var skyNeighborFixedAnswer = skyNeighborAnswer.map(function(row) {
	return row.split("");
});
skyNeighborFixedAnswer[1][1] = "2"; // the published inner given is 1
var skyNeighborFixedFile = skyNeighborFile({
	answer: skyNeighborFixedAnswer.map(function(row) {
		return row.join("");
	})
});

var skyNeighborCountAnswer = skyNeighborAnswer.map(function(row) {
	return row.split("");
});
skyNeighborCountAnswer[0][0] = "1";
var skyNeighborCountFile = skyNeighborFile({
	answer: skyNeighborCountAnswer.map(function(row) {
		return row.join("");
	})
});

var skyNeighborNeighborGray = skyNeighborInnerGray.map(function(row) {
	return row.split("");
});
skyNeighborNeighborGray[0][2] = "G"; // this white 2 touches another 2
var skyNeighborNeighborFile = skyNeighborFile({
	innerGray: skyNeighborNeighborGray.map(function(row) {
		return row.join("");
	})
});

var skyNeighborSkyGivens = skyNeighborOuterGivens.map(function(row) {
	return row.split("");
});
var skyNeighborSkyOuterAnswer = skyNeighborOuterAnswer.map(function(row) {
	return row.split("");
});
// Remove one outside given so a deliberately wrong outside answer reports the
// visibility rule rather than the fixed-number rule.
skyNeighborSkyGivens[0][6] = ".";
skyNeighborSkyOuterAnswer[0][6] = "2";
var skyNeighborSkyFile = skyNeighborFile({
	outerGivens: skyNeighborSkyGivens.map(function(row) {
		return row.join("");
	}),
	outerAnswer: skyNeighborSkyOuterAnswer.map(function(row) {
		return row.join("");
	})
});

ui.debug.addDebugData("skyneighbor", {
	url: skyNeighborUrl,
	failcheck: [
		["ceNoNum", skyNeighborNoNumFile],
		["nmFixed", skyNeighborFixedFile],
		["nmCount", skyNeighborCountFile],
		["nmNeighbor", skyNeighborNeighborFile],
		["nmSky", skyNeighborSkyFile],
		[null, skyNeighborValidFile]
	],
	inputs: [
		{
			input: ["editmode", "newboard,9,9", "cursor,1,1", "key,1", "key,g"],
			result: function(puzzle, assert) {
				assert.equal(puzzle.board.getc(1, 1).qnum, 1);
				assert.equal(puzzle.board.getc(1, 1).ques, 1);
			}
		},
		{
			input: ["editmode", "newboard,9,9", "cursor,1,-1", "key,2"],
			result: function(puzzle, assert) {
				assert.equal(puzzle.board.getex(1, -1).qnum, 2);
			}
		},
		{
			input: ["editmode", "newboard,9,9", "cursor,1,-1", "key,g"],
			result: function(puzzle, assert) {
				assert.equal(puzzle.board.getex(1, -1).ques, 1);
			}
		},
		{
			input: [
				"editmode",
				"newboard,9,9",
				"cursor,1,-1",
				"key,1",
				"playmode",
				"key,2"
			],
			result: function(puzzle, assert) {
				assert.equal(puzzle.board.getex(1, -1).anum, -1);
				puzzle.board.getex(1, -1).qnum = -1;
				puzzle.cursor.init(1, -1);
				puzzle.key.inputKeys("2");
				assert.equal(puzzle.board.getex(1, -1).anum, 2);
			}
		},
		{
			input: ["playmode", "cursor,1,-1", "key, ", "cursor,1,1", "key,2"],
			result: function(puzzle, assert) {
				assert.equal(puzzle.board.getex(1, -1).anum, -1);
				assert.equal(puzzle.board.getc(1, 1).anum, 2);
			}
		}
	]
});
