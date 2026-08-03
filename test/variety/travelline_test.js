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

	it("clears a slither cross before placing a divide clue on the same point", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		puzzle.setMode("edit");
		var cross = puzzle.board.getx(0, 0);

		puzzle.mouse.setInputMode("travel-slither");
		puzzle.mouse.inputPath("left", 0, 0);
		assert.equal(cross.qnum, 0);

		puzzle.mouse.setInputMode("clear");
		puzzle.mouse.inputPath("left", 0, 0);
		assert.equal(cross.qnum, -1);

		puzzle.mouse.setInputMode("travel-div2");
		puzzle.mouse.inputPath("left", 0, 0);
		assert.equal(cross.qnum, 12);
	});

	it("places a directed clue as soon as a drag starts from an empty cell", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		puzzle.setMode("edit");
		var mouse = puzzle.mouse;
		mouse.setInputMode("travel-yajilin");
		var cell = puzzle.board.getc(1, 1);

		mouse.mousereset();
		mouse.btn = "left";
		mouse.inputPoint.init(1, 1);
		mouse.mousestart = true;
		mouse.inputDirectedClue();

		assert.equal(cell.qnum, 14);
		assert.equal(cell.qnum2, 0);

		mouse.inputPoint.init(3, 1);
		mouse.mousestart = false;
		mouse.mousemove = true;
		mouse.inputDirectedClue();

		assert.equal(cell.qdir, cell.RT);
	});

	it("supports keyboard number entry on cross clues", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		puzzle.setMode("edit");
		puzzle.mouse.setInputMode("travel-slither");
		puzzle.mouse.inputPath("left", 2, 2);
		var cross = puzzle.board.getx(2, 2);

		assert.equal(puzzle.cursor.bx, 2);
		assert.equal(puzzle.cursor.by, 2);
		puzzle.key.inputKeys("4");
		assert.equal(cross.qnum, 4);

		puzzle.key.inputKeys("BS");
		assert.equal(cross.qnum, -1);
	});

	it("creates slither, yajilin, castle wall, and order clues from keyboard based on the active input mode", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		puzzle.setMode("edit");
		var board = puzzle.board;
		var cross = board.getx(2, 2);
		var cell = board.getc(1, 1);

		puzzle.mouse.setInputMode("travel-slither");
		puzzle.mouse.inputPath("left", 2, 2);
		puzzle.key.inputKeys("3");
		assert.equal(cross.qnum, 3);

		puzzle.mouse.setInputMode("travel-yajilin");
		puzzle.mouse.inputPath("left", 1, 1);
		cell.setQnum(-1);
		cell.setQnum2(-1);
		cell.setQdir(0);
		puzzle.key.inputKeys("4");
		assert.equal(cell.qnum, 14);
		assert.equal(cell.qnum2, 4);

		puzzle.mouse.setInputMode("travel-cw");
		puzzle.key.inputKeys("2");
		assert.equal(cell.qnum, 15);
		assert.equal(cell.qnum2, 2);

		puzzle.mouse.setInputMode("travel-order");
		puzzle.key.inputKeys("1");
		assert.equal(cell.qnum, 16);
		assert.equal(cell.qnum2, 1);
	});

	it("supports keyboard number entry on directed and order clues after selecting the cell", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		puzzle.setMode("edit");
		var cell = puzzle.board.getc(1, 1);

		puzzle.mouse.setInputMode("travel-yajilin");
		puzzle.mouse.inputPath("left", 1, 1);
		assert.equal(puzzle.cursor.bx, 1);
		assert.equal(puzzle.cursor.by, 1);

		puzzle.key.inputKeys("3");
		assert.equal(cell.qnum, 14);
		assert.equal(cell.qnum2, 3);

		puzzle.key.inputKeys("c");
		puzzle.key.inputKeys("1");
		assert.equal(cell.qnum, 15);
		assert.equal(cell.qnum2, 1);

		puzzle.key.inputKeys("r");
		puzzle.key.inputKeys("2");
		assert.equal(cell.qnum, 16);
		assert.equal(cell.qnum2, 2);
	});

	it("accepts multi-digit clue input until it exceeds the board cell count", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/3");
		puzzle.setMode("edit");
		var cell = puzzle.board.getc(1, 1);

		puzzle.mouse.setInputMode("travel-yajilin");
		puzzle.mouse.inputPath("left", 1, 1);
		puzzle.key.inputKeys("1", "2");
		assert.equal(cell.qnum, 14);
		assert.equal(cell.qnum2, 12);

		puzzle.key.inputKeys("3");
		assert.equal(cell.qnum2, 3);
	});

	it("toggles a not-passed auxiliary cell mark in play mode", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		puzzle.setMode("play");
		puzzle.mouse.setInputMode("subcross");
		var cell = puzzle.board.getc(1, 1);

		puzzle.mouse.inputPath("left", 1, 1);
		assert.equal(cell.qsub, 2);

		puzzle.mouse.inputPath("left", 1, 1);
		assert.equal(cell.qsub, 0);
	});

	it("exports and reloads URL with custom clues", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		var board = puzzle.board;

		board.cell[0].setQnum(14);
		board.cell[0].setQdir(board.cell[0].RT);
		board.cell[0].setQnum2(1);
		board.cell[0].setFloorFlag(32);

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
		board.getb(4, 1).setQues(3);

		board.arrowin.set(board.getb(0, 3));
		board.arrowout.set(board.getb(6, 5));

		var url = puzzle.getURL();
		var reloaded = new pzpr.Puzzle().open(url);
		var board2 = reloaded.board;

		assert.equal(board2.cell[0].qnum, 14);
		assert.equal(board2.cell[0].qdir, board2.cell[0].RT);
		assert.equal(board2.cell[0].qnum2, 1);
		assert.equal(board2.cell[0].isBar(), true);

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
		assert.equal(board2.getb(4, 1).ques, 3);

		assert.equal(board2.arrowin.getid(), board.arrowin.getid());
		assert.equal(board2.arrowout.getid(), board.arrowout.getid());
	});

	it("exports and reloads explicit border and required-line URL extras", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		puzzle.board.getb(2, 1).setQues(3);
		puzzle.board.getb(2, 3).setQues(2);

		var url = puzzle.getURL();
		assert(url.indexOf(".b") >= 0);
		assert(url.indexOf(".r") >= 0);

		var reloaded = new pzpr.Puzzle().open(url);
		assert.equal(reloaded.board.getb(2, 1).ques, 3);
		assert.equal(reloaded.board.getb(2, 3).ques, 2);
	});

	it("counts other yajilin clue cells and skips bars in a yajilin ray", function() {
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

		board.cell[1].setFloorFlag(32);

		board.cell[2].setQnum(14);
		board.cell[2].setQdir(board.cell[2].RT);
		board.cell[2].setQnum2(1);

		var checker = puzzle.checker;
		checker.failcode = [];
		checker.failcode.add = function(code) {
			this.push(code);
		};
		checker.checkOnly = true;
		checker.checkYajilinClues();
		assert.equal(checker.failcode[0], undefined);
	});

	it("allows the travel line to pass through a yajilin clue cell", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/1");
		var board = puzzle.board;

		board.arrowin.set(board.getb(0, 1));
		board.arrowout.set(board.getb(6, 1));
		board.arrowin.getb().setLine();
		board.arrowout.getb().setLine();
		board.getb(2, 1).setLine();
		board.getb(4, 1).setLine();

		board.cell[1].setQnum(14);
		board.cell[1].setQdir(board.cell[1].RT);
		board.cell[1].setQnum2(0);

		assert.equal(board.cell[1].noLP(), false);

		var checker = puzzle.checker;
		checker.failcode = [];
		checker.failcode.add = function(code) {
			this.push(code);
		};
		checker.checkOnly = true;
		checker.checkYajilinClues();
		assert.equal(checker.failcode[0], undefined);
	});

	it("does not require the path to visit every ordinary cell", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/2");
		var board = puzzle.board;

		board.arrowin.set(board.getb(0, 1));
		board.arrowout.set(board.getb(6, 1));
		board.arrowin.getb().setLine();
		board.arrowout.getb().setLine();
		board.getb(2, 1).setLine();
		board.getb(4, 1).setLine();

		assert.equal(puzzle.check(false).complete, true);
	});

	it("allows a start or goal arrow to sit on a bar cell and relocates it when the bar is cleared", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		var board = puzzle.board;
		var startBorder = board.getb(3, 0);
		var goalBorder = board.getb(5, 6);
		var startCell = board.getc(3, 1);

		board.arrowin.set(startBorder);
		board.arrowout.set(goalBorder);
		startCell.setFloorFlag(32);

		assert.equal(board.isBarEndpointCell(startCell), true);

		startBorder.setLine();
		board.getb(2, 1).setLine();
		var checker = puzzle.checker;
		checker.failcode = [];
		checker.failcode.add = function(code) {
			this.push(code);
		};
		checker.checkOnly = true;
		checker.checkNoLineOnBar();
		assert.equal(checker.failcode[0], undefined);

		var oldStartId = board.arrowin.getid();
		var oldGoalId = board.arrowout.getid();
		startCell.setQnum(-1);
		board.relocateEndpointsFromClearedBar(startCell);

		assert.notEqual(board.arrowin.getid(), oldStartId);
		assert.equal(board.arrowout.getid(), oldGoalId);
		assert.equal(board.getEntryCell(board.arrowin).isBar(), false);
	});

	it("accepts short drag gestures when placing internal bar endpoints", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		puzzle.setMode("edit");
		var board = puzzle.board;
		var startBar = board.getc(3, 3);
		var goalBar = board.getc(7, 3);

		startBar.setFloorFlag(32);
		goalBar.setFloorFlag(32);
		puzzle.mouse.setInputMode("arrow");
		puzzle.mouse.inputPath("left", 3, 3, 5, 3);
		assert.equal(board.arrowin.getc(), startBar);

		puzzle.mouse.inputPath("left", 5, 3, 7, 3);
		assert.equal(board.arrowout.getc(), goalBar);
	});

	it("supports internal bar cells as true start and goal endpoints", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/1");
		var board = puzzle.board;
		var startCell = board.getc(3, 1);
		var goalCell = board.getc(5, 1);

		startCell.setFloorFlag(32);
		goalCell.setFloorFlag(32);
		board.arrowin.set(startCell, startCell.RT);
		board.arrowout.set(goalCell, goalCell.RT);
		board.getb(4, 1).setLine();

		assert.equal(board.arrowin.oncell(), true);
		assert.equal(board.arrowout.oncell(), true);
		assert.equal(board.getStartCell(), startCell);
		assert.equal(board.getGoalCell(), goalCell);
		var checker = puzzle.checker;
		checker.failcode = [];
		checker.failcode.add = function(code) {
			this.push(code);
		};
		checker.checkOnly = true;
		checker.checkStartGoalDegree();
		checker.checkNoDeadendExceptSG();
		checker.checkTravelPath();
		assert.equal(checker.failcode[0], undefined);
	});

	it("exports and reloads bar endpoints in URLs with their directions", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		var board = puzzle.board;
		var startBar = board.getc(3, 3);
		var goalBar = board.getc(7, 3);

		startBar.setFloorFlag(32);
		goalBar.setFloorFlag(32);
		board.arrowin.set(startBar, startBar.RT);
		board.arrowout.set(goalBar, goalBar.LT);

		var url = puzzle.getURL();
		var reloaded = new pzpr.Puzzle().open(url);
		var board2 = reloaded.board;

		assert.equal(board2.arrowin.oncell(), true);
		assert.equal(board2.arrowin.getc().id, startBar.id);
		assert.equal(board2.arrowin.getdir(), startBar.RT);
		assert.equal(board2.arrowout.oncell(), true);
		assert.equal(board2.arrowout.getc().id, goalBar.id);
		assert.equal(board2.arrowout.getdir(), goalBar.LT);
	});

	it("places internal start and goal arrows by dragging across a bar cell", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		puzzle.setMode("edit");
		puzzle.mouse.setInputMode("arrow");
		var board = puzzle.board;
		var startBar = board.getc(3, 3);
		var goalBar = board.getc(7, 3);

		startBar.setFloorFlag(32);
		goalBar.setFloorFlag(32);

		puzzle.mouse.inputPath("left", 3, 3, 5, 3);
		assert.equal(board.arrowin.oncell(), true);
		assert.equal(board.arrowin.getc(), startBar);
		assert.equal(board.arrowin.getdir(), startBar.RT);

		puzzle.mouse.inputPath("left", 5, 3, 7, 3);
		assert.equal(board.arrowout.oncell(), true);
		assert.equal(board.arrowout.getc(), goalBar);
		assert.equal(board.arrowout.getdir(), goalBar.RT);
	});

	it("anchors bar endpoint arrows to the selected edge instead of the cell center", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		var graphic = puzzle.painter;
		var cell = puzzle.board.getc(1, 1);
		var px = 100;
		var py = 80;
		var ll = 12;
		var layout = graphic.getCellEndpointArrowLayout(px, py, cell.RT, ll);

		assert(layout.sx < px);
		assert(layout.ex > px);
		assert.equal(layout.sy, py);
		assert.equal(layout.ey, py);
		assert(layout.ex - px > px - layout.sx);
	});

	it("draws a visible shaft and tip for bar endpoint arrows", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		var graphic = puzzle.painter;
		var cell = puzzle.board.getc(1, 1);
		var calls = [];
		var g = {
			vid: "",
			fillRectCenter: function() {
				calls.push("shaft");
			},
			beginPath: function() {
				calls.push("begin");
			},
			setOffsetLinePath: function() {
				calls.push("tip-path");
			},
			fill: function() {
				calls.push("fill");
			},
			vhide: function() {
				calls.push("hide");
			}
		};

		graphic.drawCellEndpointArrow(g, "in", 100, 80, cell.RT, 12, 1);

		assert.deepEqual(calls, ["shaft", "begin", "tip-path", "fill"]);
	});

	it("places bar endpoint labels opposite the arrow direction so edge cells stay readable", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		var graphic = puzzle.painter;
		var cell = puzzle.board.getc(1, 1);
		var px = 100;
		var py = 80;

		var rightLabel = graphic.getCellEndpointLabelPosition(px, py, cell.RT);
		assert(rightLabel.x < px);
		assert.equal(rightLabel.y, py);

		var upLabel = graphic.getCellEndpointLabelPosition(px, py, cell.UP);
		assert.equal(upLabel.x, px);
		assert(upLabel.y > py);
	});

	it("draws out arrows pointing inward from the chosen bar edge", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		var graphic = puzzle.painter;
		var cell = puzzle.board.getc(1, 1);
		var px = 100;
		var py = 80;
		var ll = 12;
		var leftEdge = px - graphic.cw * 0.5;

		var inDir = graphic.getCellEndpointArrowDir("in", cell.RT);
		var outDir = graphic.getCellEndpointArrowDir("out", cell.RT);
		var inLayout = graphic.getCellEndpointArrowLayout(px, py, cell.RT, ll, "in");
		var outLayout = graphic.getCellEndpointArrowLayout(px, py, cell.RT, ll, "out");

		assert.equal(inDir, cell.RT);
		assert.equal(outDir, cell.RT);
		assert(inLayout.ex > px);
		assert(outLayout.sx < leftEdge);
		assert.equal(outLayout.ex, leftEdge);
	});

	it("draws solver overlay lines without mutating answer lines", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		var border = puzzle.board.getb(2, 1);
		var calls = [];
		var graphic = puzzle.painter;
		var g = {
			vid: "",
			fillStyle: null,
			fillRectCenter: function() {
				calls.push("line");
			},
			vhide: function() {
				calls.push("hide:" + this.vid);
			}
		};

		border._travellineSolverState = "line";
		assert.equal(border.isLine(), false);

		graphic.range = { borders: [border] };
		graphic.context = g;
		graphic.vinc = function() {
			return g;
		};
		graphic.drawSolverOverlayLines();

		assert.deepEqual(calls, ["line"]);
		assert.equal(border.isLine(), false);
	});

	it("treats required lines as immutable black path segments", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		puzzle.setMode("edit");
		var border = puzzle.board.getb(2, 1);

		puzzle.mouse.setInputMode("travel-required");
		puzzle.mouse.inputPath("left", 1, 1, 3, 1);

		assert.equal(border.ques, 2);
		assert.equal(border.isLine(), true);
		assert.equal(border.line, 0);
		assert.equal(puzzle.painter.getLineColor(border), "#7b3ff2");

		puzzle.setMode("play");
		border.removeLine();
		border.setPeke();

		assert.equal(border.isLine(), true);
		assert.equal(border.qsub, 0);
	});

	it("blocks player line input on border clues", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		puzzle.setMode("edit");
		var border = puzzle.board.getb(2, 1);

		puzzle.mouse.setInputMode("border");
		puzzle.mouse.inputPath("left", 2, 0, 2, 2);
		assert.equal(border.ques, 3);

		puzzle.setMode("play");
		puzzle.mouse.setInputMode("line");
		puzzle.mouse.inputPath("left", 1, 1, 3, 1);

		assert.equal(border.isLine(), false);
		assert.equal(border.line, 0);
	});

	it("uses line-style dragging for required lines but border-style dragging for border clues", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		puzzle.setMode("edit");
		var border = puzzle.board.getb(2, 1);

		puzzle.mouse.setInputMode("border");
		puzzle.mouse.inputPath("left", 2, 0, 2, 2);
		assert.equal(border.ques, 3);

		puzzle.mouse.setInputMode("country");
		puzzle.mouse.inputPath("left", 2, 0, 2, 2);
		assert.equal(border.ques, 1);

		puzzle.mouse.setInputMode("travel-required");
		puzzle.mouse.inputPath("left", 2, 0, 2, 2);
		assert.equal(border.ques, 1);

		puzzle.mouse.setInputMode("travel-required");
		puzzle.mouse.inputPath("left", 1, 1, 3, 1);
		assert.equal(border.ques, 2);
	});

	it("draws solver not-passed cell crosses without mutating manual auxiliary marks", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		var cell = puzzle.board.getc(1, 1);
		var calls = [];
		var graphic = puzzle.painter;
		var g = {
			vid: "",
			strokeStyle: null,
			lineWidth: 0,
			strokeCross: function() {
				calls.push("cross");
			},
			vhide: function() {
				calls.push("hide:" + this.vid);
			}
		};

		cell._travellineSolverCellState = "cross";
		assert.equal(cell.qsub, 0);

		graphic.range = { cells: [cell] };
		graphic.context = g;
		graphic.vinc = function() {
			return g;
		};
		graphic.drawSolverOverlayCellCrosses();

		assert.deepEqual(calls, ["cross"]);
		assert.equal(cell.qsub, 0);
	});

	it("hides stale slither text when a cross clue changes to divide", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		var graphic = puzzle.painter;
		var cross = puzzle.board.getx(0, 0);
		var calls = [];
		var g = {
			vid: "",
			fillStyle: null,
			strokeStyle: null,
			shapeCircle: function() {
				calls.push(["circle", this.vid]);
			},
			vhide: function() {
				calls.push(["hide", this.vid]);
			}
		};

		cross.setQnum(12);
		graphic.range = { crosses: [cross] };
		graphic.context = g;
		graphic.vinc = function() {
			return g;
		};
		graphic.disptext = function(text) {
			calls.push([text, g.vid]);
		};

		graphic.drawCrossClues();

		assert(calls.some(function(entry) {
			return entry[0] === "hide" && entry[1] === "x_slither_" + cross.id;
		}));
		assert(calls.some(function(entry) {
			return entry[0] === "circle" && entry[1] === "x_divide_" + cross.id;
		}));
		assert(!calls.some(function(entry) {
			return entry[0] === "0" || entry[0] === "1" || entry[0] === "2" || entry[0] === "3" || entry[0] === "4";
		}));
	});

	it("hides stale point markers when a cell clue changes from dot to pearl", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		var graphic = puzzle.painter;
		var cell = puzzle.board.getc(1, 1);
		var calls = [];
		var g = {
			vid: "",
			fillStyle: null,
			strokeStyle: null,
			shapeCircle: function() {
				calls.push(["circle", this.vid]);
			},
			vhide: function() {
				calls.push(["hide", this.vid]);
			}
		};

		cell.setQnum(3);
		graphic.range = { cells: [cell] };
		graphic.context = g;
		graphic.vinc = function() {
			return g;
		};
		graphic.disptext = function() {};

		graphic.drawCellClues();

		assert(calls.some(function(entry) {
			return entry[0] === "circle" && entry[1] === "c_pearl_" + cell.id;
		}));
		assert(calls.some(function(entry) {
			return entry[0] === "hide" && entry[1] === "c_dot_" + cell.id;
		}));
	});

	it("mixes bar transparency with other floor clue colors", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/3");
		var cell = puzzle.board.getc(1, 1);
		var graphic = puzzle.painter;

		cell.setQues(32 | 8);
		var color = graphic.getBGCellColor(cell);

		assert.notEqual(color, "rgba(160,160,160,0.55)");
		assert(/^rgba?\(/.test(color));
	});

	it("maps edge border placement onto bar endpoints with the same drag direction", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		var board = puzzle.board;
		var topBar = board.getc(1, 1);
		var topBorder = board.getb(1, 0);
		var topBar2 = board.getc(3, 1);
		var topBorder2 = board.getb(3, 0);

		topBar.setFloorFlag(32);
		topBar2.setFloorFlag(32);

		puzzle.mouse.setEndpointByBorder(topBorder, 1, topBar.DN);
		assert.equal(board.arrowin.oncell(), true);
		assert.equal(board.arrowin.getc(), topBar);
		assert.equal(board.arrowin.getdir(), topBar.DN);

		puzzle.mouse.setEndpointByBorder(topBorder2, 2, topBar2.UP);
		assert.equal(board.arrowout.oncell(), true);
		assert.equal(board.arrowout.getc(), topBar2);
		assert.equal(board.arrowout.getdir(), topBar2.UP);
	});

	it("treats visible outer cells as edge cells for bar endpoint dragging", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/3");
		var board = puzzle.board;

		assert.equal(board.getc(1, 1).isOnBoardEdge(), true);
		assert.equal(board.getc(3, 3).isOnBoardEdge(), false);
	});

	it("places in and out on an edge bar according to drag direction", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		puzzle.setMode("edit");
		puzzle.mouse.setInputMode("arrow");
		var board = puzzle.board;
		var topBar = board.getc(1, 1);
		var topBar2 = board.getc(3, 1);

		topBar.setFloorFlag(32);
		topBar2.setFloorFlag(32);

		puzzle.mouse.inputPath("left", 1, 0, 1, 1);
		assert.equal(board.arrowin.oncell(), true);
		assert.equal(board.arrowin.getc(), topBar);
		assert.equal(board.arrowin.getdir(), topBar.DN);

		puzzle.mouse.inputPath("left", 3, 1, 3, 0);
		assert.equal(board.arrowout.oncell(), true);
		assert.equal(board.arrowout.getc(), topBar2);
		assert.equal(board.arrowout.getdir(), topBar2.UP);
	});

	it("keeps stable text ids for bar endpoint labels and hides stale bar arrows", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		var board = puzzle.board;
		var graphic = puzzle.painter;
		var inBar = board.getc(3, 1);
		var outBorder = board.getb(5, 0);
		var calls = [];
		var g = {
			vid: "",
			fillStyle: null,
			fillRectCenter: function() {},
			beginPath: function() {},
			setOffsetLinePath: function() {},
			fill: function() {},
			vhide: function() {
				calls.push(["hide", this.vid]);
			}
		};

		inBar.setFloorFlag(32);
		board.arrowin.set(inBar, inBar.DN);
		board.arrowout.set(outBorder);

		graphic.context = g;
		graphic.vinc = function() {
			return g;
		};
		graphic.disptext = function(text) {
			calls.push([text, g.vid]);
		};

		graphic.drawInOut();

		assert(calls.some(function(entry) {
			return entry[0] === "IN" && entry[1] === "string_in";
		}));
		assert(calls.some(function(entry) {
			return entry[0] === "OUT" && entry[1] === "string_out";
		}));
		assert(calls.some(function(entry) {
			return entry[0] === "hide" && entry[1] === "out_cell_arrow_shaft";
		}));
		assert(calls.some(function(entry) {
			return entry[0] === "hide" && entry[1] === "out_cell_arrow_tip";
		}));
	});

	it("does not freeze the inout layer so bar arrow paths can rotate", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		var graphic = puzzle.painter;
		var options;

		graphic.context = { vid: "", vhide: function() {} };
		graphic.vinc = function(layerid, rendering, freeze) {
			options = { layerid: layerid, rendering: rendering, freeze: freeze };
			return this.context;
		};
		graphic.disptext = function() {};

		graphic.drawInOut();

		assert.deepEqual(options, {
			layerid: "inout",
			rendering: "auto",
			freeze: undefined
		});
	});

	it("treats country and blocked borders as divide separators", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/2/2");
		var board = puzzle.board;
		var checker = puzzle.checker;
		var center = board.getx(2, 2);

		board.getx(0, 0).setQnum(12);
		center.setQnum(11);
		center.relbd(-1, 0).setLine();
		center.relbd(0, -1).setQues(1);
		center.relbd(0, 1).setQues(1);
		center.relbd(1, 0).setQues(3);

		checker.failcode = [];
		checker.failcode.add = function(code) {
			this.push(code);
		};
		checker.checkOnly = true;
		checker.checkDivideRegions();

		assert.equal(checker.failcode.length, 0);
	});

	it("checks clockwise floors against the in and out arrow direction at endpoints", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		var board = puzzle.board;
		var cells = [0, 1, 2, 3, 4, 5, 6, 7].map(function(id) {
			return board.cell[id];
		});
		var path = [4, 0, 1, 2, 3, 7];
		var checker = puzzle.checker;

		function borderBetween(a, b) {
			return board.getb((a.bx + b.bx) >> 1, (a.by + b.by) >> 1);
		}

		cells.forEach(function(cell) {
			cell.setFloorFlag(16);
		});
		board.arrowin.set(board.getb(0, 3));
		board.arrowout.set(board.getb(8, 3));
		board.arrowin.getb().setLine();
		board.arrowout.getb().setLine();
		for (var i = 1; i < path.length; i++) {
			borderBetween(board.cell[path[i - 1]], board.cell[path[i]]).setLine();
		}

		checker.failcode = [];
		checker.failcode.add = function(code) {
			this.push(code);
		};
		checker.checkOnly = true;
		checker.checkClockwiseFloors();
		assert.equal(checker.failcode[0], "tlCwFloor");
	});

	it("swaps in and out when dragging the opposite direction on the same edge bar", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/4/2");
		puzzle.setMode("edit");
		puzzle.mouse.setInputMode("arrow");
		var board = puzzle.board;
		var topBar = board.getc(3, 1);
		var oldOut = board.arrowout.getb();

		topBar.setFloorFlag(32);

		puzzle.mouse.inputPath("left", 3, 0, 3, 1);
		assert.equal(board.arrowin.oncell(), true);
		assert.equal(board.arrowin.getc(), topBar);
		assert.equal(board.arrowin.getdir(), topBar.DN);

		puzzle.mouse.inputPath("left", 3, 1, 3, 0);
		assert.equal(board.arrowout.oncell(), true);
		assert.equal(board.arrowout.getc(), topBar);
		assert.equal(board.arrowout.getdir(), topBar.UP);
		assert.equal(board.arrowin.oncell(), false);
		assert.equal(board.arrowin.getb(), oldOut);
	});

	it("clears floor clues while dragging clear input", function() {
		var puzzle = new pzpr.Puzzle().open("travelline/3/1");
		puzzle.setMode("edit");

		puzzle.mouse.setInputMode("travel-ice");
		puzzle.mouse.inputPath("left", 1, 1, 3, 1, 5, 1);
		assert.deepEqual(
			Array.prototype.map.call(puzzle.board.cell, function(cell) {
				return cell.ques;
			}),
			[1, 1, 1]
		);

		puzzle.mouse.setInputMode("clear");
		puzzle.mouse.inputPath("left", 1, 1, 3, 1, 5, 1);
		assert.deepEqual(
			Array.prototype.map.call(puzzle.board.cell, function(cell) {
				return cell.ques;
			}),
			[0, 0, 0]
		);
	});

	it("checks ice at an entrance against the outside direction", function() {
		var straight = new pzpr.Puzzle().open("travelline/2/1");
		var board = straight.board;
		board.arrowin.input(board.getb(0, 1));
		board.arrowout.input(board.getb(4, 1));
		board.getc(1, 1).setFloorFlag(1);
		[board.getb(0, 1), board.getb(2, 1), board.getb(4, 1)].forEach(function(
			border
		) {
			border.setLine();
		});
		assert.equal(straight.check(true).complete, true);

		var turn = new pzpr.Puzzle().open("travelline/2/2");
		board = turn.board;
		board.arrowin.input(board.getb(1, 0));
		board.arrowout.input(board.getb(4, 3));
		board.getc(1, 1).setFloorFlag(1);
		[
			board.getb(1, 0),
			board.getb(2, 1),
			board.getb(3, 2),
			board.getb(4, 3)
		].forEach(function(border) {
			border.setLine();
		});
		assert.equal(turn.check(true)[0], "tlIceTurn");
	});

	it("checks both passes of an ice white pearl at a crossing", function() {
		var url =
			"travelline/5/4/0000000r3g4k/-/-/-/b.f.1+c.f.1+d.f.1/0/2";
		var valid = new pzpr.Puzzle().open(url);
		var validBoard = valid.board;
		[
			[5, 4],
			[5, 6],
			[4, 5],
			[6, 5],
			[6, 3],
			[7, 4]
		].forEach(function(pos) {
			validBoard.getb(pos[0], pos[1]).setLine();
		});
		var checker = valid.checker;
		checker.failcode = [];
		checker.failcode.add = function(code) {
			this.push(code);
		};
		checker.checkOnly = true;
		checker.checkWhitePearl();
		assert.equal(checker.failcode.length, 0);

		var invalid = new pzpr.Puzzle().open(url);
		var invalidBoard = invalid.board;
		[
			[5, 4],
			[5, 6],
			[4, 5],
			[6, 5],
			[6, 3]
		].forEach(function(pos) {
			invalidBoard.getb(pos[0], pos[1]).setLine();
		});
		checker = invalid.checker;
		checker.failcode = [];
		checker.failcode.add = function(code) {
			this.push(code);
		};
		checker.checkOnly = true;
		checker.checkWhitePearl();
		assert.equal(checker.failcode[0], "tlWhitePearl");
	});
});
