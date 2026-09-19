var assert = require("assert");

var pzpr = require("../../dist/js/pzpr.js");

describe("Variety:consecutivekakuro", function() {
	it("exports and restores consecutive bars in a puzzle URL", function() {
		var puzzle = new pzpr.Puzzle().open("consecutivekakuro/3/3");
		var board = puzzle.board;
		board.getb(2, 1).setQues(1);
		board.getb(1, 2).setQues(1);

		var url = puzzle.getURL(pzpr.parser.URL_PZPRV3);
		assert(url.indexOf("consecutivekakuro/3/3/") >= 0);

		var restored = new pzpr.Puzzle().open(url);
		assert.equal(restored.board.getb(2, 1).ques, 1);
		assert.equal(restored.board.getb(1, 2).ques, 1);
	});
});
