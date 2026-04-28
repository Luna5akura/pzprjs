var assert = require("assert");

var pzpr = require("../../");

describe("Variety:travelline", function() {
	it("edits yajilin clue numbers through zero by mouse clicks", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		puzzle.setMode("edit");
		puzzle.mouse.setInputMode("travel-yajilin");

		var cell = puzzle.board.getc(1, 1);

		puzzle.mouse.inputPath("left", 1, 1);
		assert.equal(cell.qnum, 14);
		assert.equal(cell.qnum2, 0);

		puzzle.mouse.inputPath("left", 1, 1);
		assert.equal(cell.qnum2, 1);

		puzzle.mouse.inputPath("right", 1, 1);
		assert.equal(cell.qnum2, 0);

		puzzle.mouse.inputPath("right", 1, 1);
		assert.equal(cell.qnum, -1);
		assert.equal(cell.qnum2, -1);
		assert.equal(cell.qdir, 0);
	});

	it("exports and reloads URL with custom clues", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		var board = puzzle.board;

		board.cell[0].setQnum(14);
		board.cell[0].setQdir(board.cell[0].RT);
		board.cell[0].setQnum2(1);

		board.cell[1].setQnum(15);
		board.cell[1].setQdir(board.cell[1].DN);
		board.cell[1].setQnum2(2);

		board.cell[2].setQnum(16);
		board.cell[2].setQnum2(3);
		board.cell[2].setQdir(0);

		board.cell[3].setQues(1 | 4 | 16);
		board.cell[4].setQues(2 | 8);

		board.cross[0].setQnum(2);
		board.cross[1].setQnum(11);

		board.getb(2, 1).setQues(1);
		board.getb(3, 2).setQues(2);

		board.arrowin.set(board.getb(0, 3));
		board.arrowout.set(board.getb(6, 5));

		var url = puzzle.getURL();
		var reloaded = new pzpr.Puzzle().open(url);
		var board2 = reloaded.board;

		assert.equal(board2.cell[0].qnum, 14);
		assert.equal(board2.cell[0].qdir, board2.cell[0].RT);
		assert.equal(board2.cell[0].qnum2, 1);

		assert.equal(board2.cell[1].qnum, 15);
		assert.equal(board2.cell[1].qdir, board2.cell[1].DN);
		assert.equal(board2.cell[1].qnum2, 2);

		assert.equal(board2.cell[2].qnum, 16);
		assert.equal(board2.cell[2].qnum2, 3);

		assert.equal(board2.cell[3].ques, 1 | 4 | 16);
		assert.equal(board2.cell[4].ques, 2 | 8);

		assert.equal(board2.cross[0].qnum, 2);
		assert.equal(board2.cross[1].qnum, 11);

		assert.equal(board2.getb(2, 1).ques, 1);
		assert.equal(board2.getb(3, 2).ques, 2);

		assert.equal(board2.arrowin.getid(), board.arrowin.getid());
		assert.equal(board2.arrowout.getid(), board.arrowout.getid());
	});

	it("does not count yajilin clue cells in another yajilin ray", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		var board = puzzle.board;

		board.arrowin.set(board.getb(1, 4));
		board.arrowout.set(board.getb(7, 4));
		board.arrowin.getb().setLine();
		board.arrowout.getb().setLine();
		board.getb(2, 3).setLine();
		board.getb(4, 3).setLine();
		board.getb(6, 3).setLine();

		board.cell[0].setQnum(14);
		board.cell[0].setQdir(board.cell[0].RT);
		board.cell[0].setQnum2(2);

		board.cell[2].setQnum(14);
		board.cell[2].setQdir(board.cell[2].RT);
		board.cell[2].setQnum2(1);

		var checker = puzzle.checker;
		checker.failcode = new checker.klass.FailCode();
		checker.checkOnly = true;
		checker.checkYajilinClues();
		assert.equal(checker.failcode[0], undefined);
	});
});
