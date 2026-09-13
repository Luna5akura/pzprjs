/* neighbor.js */

var neighborGivens =
	"............3.......2.......1...3.......2.......1...3.......2.......1............";
var neighborGray =
	"111111101001110001011110001110111111110000101101111001100001111110101001000110000";
var neighborAnswer = [
	"132132123",
	"221313321",
	"232131123",
	"313213212",
	"123322131",
	"212131332",
	"311223213",
	"121321332",
	"333212211"
];

function neighborRows(data) {
	var rows = [];
	for (var y = 0; y < 9; y++) {
		rows.push(
			data
				.slice(y * 9, y * 9 + 9)
				.split("")
				.join(" ")
		);
	}
	return rows.join(" / ");
}

function neighborFile(gray, answer) {
	var answerRows = answer.map(function(row) {
		return row.split("").join(" ");
	});
	return (
		[
			"pzprv3/neighbor/9/9/" + neighborRows(neighborGivens),
			neighborRows(gray),
			answerRows.join(" / ")
		].join(" / ") + " /"
	);
}

function neighborAnswerWith(index, value) {
	var answer = neighborAnswer.map(function(row) {
		return row.split("");
	});
	answer[Math.floor(index / 9)][index % 9] = value;
	return answer.map(function(row) {
		return row.join("");
	});
}

var neighborValidFile = neighborFile(neighborGray, neighborAnswer);
var neighborNoNumFile = neighborFile(neighborGray, neighborAnswerWith(0, "."));
var neighborFixedFile = neighborFile(neighborGray, neighborAnswerWith(12, "2"));
var neighborCountFile = neighborFile(neighborGray, neighborAnswerWith(0, "2"));
var neighborGrayWithError =
	neighborGray.slice(0, 7) + "1" + neighborGray.slice(8);
var neighborAdjacencyFile = neighborFile(neighborGrayWithError, neighborAnswer);

ui.debug.addDebugData("neighbor", {
	url: "9/9/" + neighborGivens + "/" + neighborGray,
	failcheck: [
		["ceNoNum", neighborNoNumFile],
		["nmFixed", neighborFixedFile],
		["nmCount", neighborCountFile],
		["nmNeighbor", neighborAdjacencyFile],
		[null, neighborValidFile]
	],
	inputs: [
		{
			input: ["editmode", "newboard,9,9", "cursor,1,1", "key,1", "key,g"],
			result: function(puzzle, assert) {
				var cell = puzzle.board.getc(1, 1);
				assert.equal(cell.qnum, 1);
				assert.equal(cell.ques, 1);
			}
		},
		{
			input: ["editmode", "newboard,9,9", "cursor,1,1", "key,g"],
			result: function(puzzle, assert) {
				assert.equal(puzzle.board.getc(1, 1).ques, 1);
			}
		},
		{
			input: ["editmode", "newboard,9,9", "setconfig,use,1", "mouse,right,1,1"],
			result: function(puzzle, assert) {
				assert.equal(puzzle.board.getc(1, 1).ques, 1);
			}
		},
		{
			input: [
				"editmode",
				"newboard,9,9",
				"cursor,1,1",
				"key,1",
				"playmode",
				"cursor,3,1",
				"key,2"
			],
			result: function(puzzle, assert) {
				assert.equal(puzzle.board.getc(1, 1).qnum, 1);
				assert.equal(puzzle.board.getc(3, 1).anum, 2);
			}
		},
		{
			input: ["playmode", "cursor,3,1", "key, ", "mouse,right,3,1"],
			result: function(puzzle, assert) {
				assert.equal(puzzle.board.getc(3, 1).anum, -1);
			}
		}
	]
});
