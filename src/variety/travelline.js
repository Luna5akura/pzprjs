//
// Travel Line / travelline.js
//
var TL_FLOOR_FLAGS = {
	ICE: 1,
	NOTOUCH: 2,
	NOADJ: 4,
	SLOOP: 8,
	CWFLOOR: 16,
	BAR: 32
};
var TL_BORDER_CLUES = {
	COUNTRY: 1,
	REQUIRED: 2,
	BLOCK: 3
};
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["travelline"], {
	MouseEvent: {
		draggingSG: false,
		directedCluePlacedOnStart: false,
		inputModes: {
			edit: [
				"arrow",
				"border",
				"bar",
				"travel-sloop",
				"travel-order",
				"travel-ice",
				"travel-cwfloor",
				"travel-white",
				"travel-black",
				"travel-dotw",
				"travel-dotb",
				"travel-notouch",
				"travel-noadj",
					"travel-slither",
					"travel-div1",
					"travel-div2",
					"travel-div3",
					"travel-yajilin",
					"travel-cw",
					"country",
				"travel-required",
				"clear",
				"info-line"
			],
			play: ["line", "peke", "subcross", "diraux", "info-line"]
		},

		mouseinput: function() {
			if (this.puzzle.editmode) {
				if (this.inputMode === "arrow") {
					this.inputarrow_line();
					return;
				}
				if (this.inputMode === "travel-required") {
					this.inputRequiredLine();
					return;
				}
				if (this.isBorderClueInputMode()) {
					this.inputBorderClue();
					return;
				}
				if (this.inputMode === "travel-order") {
					this.inputOrderClue();
					return;
				}
				if (this.isDirectedInputMode()) {
					this.inputDirectedClue();
					return;
				}
				if (this.isCrossInputMode()) {
					this.inputCrossClue();
					return;
				}
				if (this.inputMode === "clear") {
					this.inputClearClue();
					return;
				}
				if (this.mousestart || this.mousemove) {
					this.inputClue();
				}
				return;
			}
			this.common.mouseinput.call(this);
		},

		mouseinput_other: function() {
			if (this.inputMode === "subcross") {
				this.inputNoPassAux();
			} else if (this.inputMode === "diraux") {
				if (this.mousestart || this.mousemove) {
					this.inputdiraux_mousemove();
				} else if (this.mouseend && this.notInputted()) {
					this.clickdiraux();
				}
			}
		},

		mouseinput_auto: function() {
			if (this.puzzle.playmode) {
				if (this.btn === "left") {
					if (this.mousestart || this.mousemove) {
						this.inputLine();
					} else if (this.mouseend && this.notInputted()) {
						this.clickdiraux();
					}
				} else if (this.btn === "right") {
					if (this.mousestart) {
						this.inputdiraux_mousedown();
					} else if (this.inputData === 2 || this.inputData === 3) {
						this.inputpeke();
					} else if (this.mousemove) {
						this.inputdiraux_mousemove();
					} else if (this.mouseend && this.notInputted()) {
						this.inputNoPassAux();
					}
				}
				return;
			}

			if (this.inputMode === "arrow") {
				this.inputarrow_line();
			} else if (this.inputMode === "travel-required") {
				this.inputRequiredLine();
			} else if (this.isBorderClueInputMode()) {
				this.inputBorderClue();
			} else if (this.inputMode === "travel-order") {
				this.inputOrderClue();
			} else if (this.isDirectedInputMode()) {
				this.inputDirectedClue();
			} else if (this.isCrossInputMode()) {
				this.inputCrossClue();
			} else if (this.inputMode === "clear") {
				this.inputClearClue();
			} else if (this.mousestart || this.mousemove) {
				this.inputClue();
			}
		},
		isDirectedInputMode: function() {
			return (
				this.inputMode === "travel-yajilin" ||
				this.inputMode === "travel-cw"
			);
		},
		isBorderClueInputMode: function() {
			return this.inputMode === "border" || this.inputMode === "country";
		},
		isCrossInputMode: function() {
			return (
				this.inputMode === "travel-slither" ||
				this.inputMode === "travel-div1" ||
				this.inputMode === "travel-div2" ||
				this.inputMode === "travel-div3"
			);
		},

		inputLine: function() {
			var cell = this.getcell();
			this.initFirstCell(cell);

			var pos = this.getpos(0);
			if (this.prevPos.equals(pos)) {
				return;
			}
			var border = this.prevPos.getnb(pos);
			if (!border.isnull) {
				if (this.inputData === null) {
					this.inputData = border.line > 0 ? 0 : 1;
				}
				if (this.inputData === 1) {
					border.setLine();
				} else if (this.inputData === 0) {
					border.removeLine();
				}
				border.draw();
			}
			this.prevPos = pos;
		},
		inputRequiredLine: function() {
			var cell = this.getcell();
			this.initFirstCell(cell);

			var pos = this.getpos(0);
			if (this.prevPos.equals(pos)) {
				return;
			}
			var border = this.prevPos.getnb(pos);
			if (!border.isnull && border.inside) {
				if (this.inputData === null) {
					this.inputData = border.isRequiredLine() ? 0 : TL_BORDER_CLUES.REQUIRED;
				}
				border.setQues(this.inputData);
				border.draw();
			}
			this.prevPos = pos;
		},

		inputarrow_line: function() {
			var pos = this.getpos(0);
			if (this.mousestart) {
				this.firstPoint = this.inputPoint.clone();
			}
			if (this.prevPos.equals(pos)) {
				if (!this.mousestart) {
					this.inputarrow_edgecell();
				}
				return;
			}

			var border = this.prevPos.getnb(pos);
			if (border.isnull) {
				border = pos.getb();
			}
			if (border.isnull) {
				border = this.prevPos.getb();
			}
			if (!border.isnull && !this.mousestart) {
				var dir = this.prevPos.getdir(pos, 2);
				if (dir === border.NDIR) {
					dir = this.prevPos.getdir(pos, 1);
				}
				if (border.inside && this.inputData === null) {
					this.inputarrow_internal(pos, dir);
				} else if (!border.inside && this.inputData === null) {
					this.inputarrow_inout(border, dir);
				}
				border.draw();
			}
			this.prevPos = pos;
		},
		inputarrow_internal: function(pos, dir) {
			if (dir === this.board.emptyborder.NDIR) {
				return;
			}
			var cell1 = this.prevPos.getc();
			var cell2 = pos.getc();
			if (cell1.isnull || cell2.isnull) {
				return;
			}
			if (cell1.isBar() && !cell2.isBar()) {
				this.board.arrowin.input(cell1, dir);
				this.inputData = 1;
				this.mousereset();
			} else if (!cell1.isBar() && cell2.isBar()) {
				this.board.arrowout.input(cell2, dir);
				this.inputData = 1;
				this.mousereset();
			}
		},
		inputarrow_edgecell: function() {
			if (this.inputData !== null || !this.firstPoint) {
				return;
			}
			var cell = this.getcell();
			if (cell.isnull || !cell.isOnBoardEdge()) {
				return;
			}
			var dx = this.inputPoint.bx - this.firstPoint.bx;
			var dy = this.inputPoint.by - this.firstPoint.by;
			if (Math.abs(dx) < 0.25 && Math.abs(dy) < 0.25) {
				return;
			}
			var bd = this.board;
			var edgeInfo = this.getEdgeDragInfo(cell, dx, dy);
			if (cell.isBar() && edgeInfo.dir !== bd.emptyborder.NDIR) {
				if (edgeInfo.type === 1) {
					bd.arrowin.input(cell, edgeInfo.dir);
				} else if (edgeInfo.type === 2) {
					bd.arrowout.input(cell, edgeInfo.dir);
				}
				this.mousereset();
				return;
			}
			var border = bd.emptyborder;
			var dir = 0;
			if (cell.by === bd.minby + 1 && Math.abs(dy) >= Math.abs(dx)) {
				border = bd.getb(cell.bx, cell.by - 1);
				dir = dy > 0 ? border.DN : border.UP;
			} else if (cell.by === bd.maxby - 1 && Math.abs(dy) >= Math.abs(dx)) {
				border = bd.getb(cell.bx, cell.by + 1);
				dir = dy > 0 ? border.DN : border.UP;
			} else if (cell.bx === bd.minbx + 1 && Math.abs(dx) >= Math.abs(dy)) {
				border = bd.getb(cell.bx - 1, cell.by);
				dir = dx > 0 ? border.RT : border.LT;
			} else if (cell.bx === bd.maxbx - 1 && Math.abs(dx) >= Math.abs(dy)) {
				border = bd.getb(cell.bx + 1, cell.by);
				dir = dx > 0 ? border.RT : border.LT;
			}
			if (!border.isnull && !border.inside && dir !== border.NDIR) {
				this.inputarrow_inout(border, dir);
			}
		},
		getEdgeDragInfo: function(cell, dx, dy) {
			var bd = this.board;
			var dir = bd.emptyborder.NDIR;
			var type = 0;
			if (cell.adjacent.top.group !== "cell" && Math.abs(dy) >= Math.abs(dx)) {
				dir = dy > 0 ? cell.DN : cell.UP;
				type = dy > 0 ? 1 : 2;
			} else if (
				cell.adjacent.bottom.group !== "cell" &&
				Math.abs(dy) >= Math.abs(dx)
			) {
				dir = dy > 0 ? cell.DN : cell.UP;
				type = dy < 0 ? 1 : 2;
			} else if (
				cell.adjacent.left.group !== "cell" &&
				Math.abs(dx) >= Math.abs(dy)
			) {
				dir = dx > 0 ? cell.RT : cell.LT;
				type = dx > 0 ? 1 : 2;
			} else if (
				cell.adjacent.right.group !== "cell" &&
				Math.abs(dx) >= Math.abs(dy)
			) {
				dir = dx > 0 ? cell.RT : cell.LT;
				type = dx < 0 ? 1 : 2;
			}
			return {
				dir: dir,
				type: type
			};
		},
		inputarrow_inout: function(border, dir) {
			var val = this.checkinout(border, dir);
			if (val > 0) {
				this.setEndpointByBorder(border, val, dir);
				this.mousereset();
			}
		},
		checkinout: function(border, dir) {
			if (border.isnull) {
				return 0;
			}
			var bd = this.board;
			var bx = border.bx;
			var by = border.by;
			if (
				(bx === bd.minbx + 2 && dir === border.RT) ||
				(bx === bd.maxbx - 2 && dir === border.LT) ||
				(by === bd.minby + 2 && dir === border.DN) ||
				(by === bd.maxby - 2 && dir === border.UP)
			) {
				return 1;
			} else if (
				(bx === bd.minbx + 2 && dir === border.LT) ||
				(bx === bd.maxbx - 2 && dir === border.RT) ||
				(by === bd.minby + 2 && dir === border.UP) ||
				(by === bd.maxby - 2 && dir === border.DN)
			) {
				return 2;
			}
			return 0;
		},
		setEndpointByBorder: function(border, type, dir) {
			var entryCell = this.board.getEntryCellByBorder(border);
			if (!entryCell.isnull && entryCell.isBar()) {
				if (type === 1) {
					this.board.arrowin.input(entryCell, dir);
				} else if (type === 2) {
					this.board.arrowout.input(entryCell, dir);
				}
				return;
			}
			if (type === 1) {
				this.board.arrowin.input(border);
			} else if (type === 2) {
				this.board.arrowout.input(border);
			}
		},

		inputClue: function() {
			var cell = this.getcell();
			if (cell.isnull || cell === this.mouseCell) {
				return;
			}
			if (cell !== this.cursor.getc()) {
				this.setcursor(cell);
			}
			var floorFlag = {
				bar: TL_FLOOR_FLAGS.BAR,
				"travel-sloop": TL_FLOOR_FLAGS.SLOOP,
				"travel-ice": TL_FLOOR_FLAGS.ICE,
				"travel-notouch": TL_FLOOR_FLAGS.NOTOUCH,
				"travel-noadj": TL_FLOOR_FLAGS.NOADJ,
				"travel-cwfloor": TL_FLOOR_FLAGS.CWFLOOR
			}[this.inputMode];
			if (floorFlag) {
				var wasBarFlag = cell.isBar();
				if (this.inputData === null) {
					this.inputData =
						this.btn === "right" || cell.hasFloorFlag(floorFlag) ? 0 : 1;
				}
				if (this.inputData === 1) {
					cell.setFloorFlag(floorFlag);
				} else {
					cell.removeFloorFlag(floorFlag);
				}
				if (wasBarFlag && floorFlag === TL_FLOOR_FLAGS.BAR && !cell.isBar()) {
					this.board.relocateEndpointsFromClearedBar(cell);
				}
				cell.draw();
				this.mouseCell = cell;
				return;
			}
			var clue = {
				"travel-white": 3,
				"travel-black": 4,
				"travel-dotw": 7,
				"travel-dotb": 8
			}[this.inputMode];
			if (!clue) {
				return;
			}
			if (this.inputData === null) {
				this.inputData = this.btn === "right" || cell.qnum === clue ? 0 : 1;
			}
			var wasBar = cell.isBar();
			if (this.inputData === 0) {
				cell.setQdir(0);
				cell.setQnum(-1);
				cell.setQnum2(-1);
				if (wasBar) {
					this.board.relocateEndpointsFromClearedBar(cell);
				}
				cell.draw();
				this.mouseCell = cell;
				return;
			}
			cell.setQdir(0);
			cell.setQnum2(-1);
			cell.setQnum(clue);
			if (wasBar && clue !== 1) {
				this.board.relocateEndpointsFromClearedBar(cell);
			}
			cell.draw();
			this.mouseCell = cell;
		},
		inputOrderClue: function() {
			if (!this.mousestart) {
				return;
			}
			var cell = this.getcell();
			if (cell.isnull) {
				return;
			}
			if (cell !== this.cursor.getc()) {
				this.setcursor(cell);
			}
			var wasBar = cell.isBar();
			if (this.btn === "right") {
				if (cell.qnum === 16 && cell.qnum2 > 0) {
					cell.setQnum2(cell.qnum2 - 1);
				} else {
					cell.setQnum(-1);
					cell.setQnum2(-1);
					cell.setQdir(0);
				}
			} else {
				if (cell.qnum !== 16) {
					cell.setQnum(16);
					cell.setQnum2(0);
					cell.setQdir(0);
				} else {
					cell.setQnum2(Math.min((cell.qnum2 >= 0 ? cell.qnum2 : 0) + 1, 51));
				}
			}
			if (wasBar && !cell.isBar()) {
				this.board.relocateEndpointsFromClearedBar(cell);
			}
			cell.draw();
			this.mousereset();
		},
		inputDirectedClue: function() {
			if (this.mousestart) {
				this.directedCluePlacedOnStart = false;
				this.inputDirectedArrow(true);
			} else if (this.mousemove) {
				if (this.notInputted() || this.directedCluePlacedOnStart) {
					this.inputDirectedArrow(false);
				}
			} else if (this.mouseend && this.notInputted()) {
				if (
					!this.directedCluePlacedOnStart &&
					this.prevPos.getc() === this.getcell()
				) {
					this.inputDirectedNumber();
				}
			}
		},
		inputDirectedArrow: function(onStart) {
			var pos = this.getpos(0);
			var type = this.inputMode === "travel-yajilin" ? 14 : 15;
			var cell = pos.getc();

			if (
				onStart &&
				this.btn === "left" &&
				!cell.isnull &&
				cell.qnum !== type
			) {
				if (cell !== this.cursor.getc()) {
					this.setcursor(cell);
				}
				cell.setQnum(type);
				cell.setQnum2(0);
				cell.setQdir(cell.qdir || cell.UP);
				cell.draw();
				this.directedCluePlacedOnStart = true;
			}

			if (this.prevPos.equals(pos)) {
				return;
			}

			cell = this.prevPos.getc();
			if (!cell.isnull && cell.qnum === type) {
				var dir = this.prevPos.getdir(pos, 2);
				if (dir !== cell.NDIR) {
					cell.setQdir(cell.qdir !== dir ? dir : 0);
					cell.draw();
				}
			}
			this.prevPos = pos;
		},
		inputDirectedNumber: function() {
			var cell = this.getcell();
			if (cell.isnull) {
				return;
			}
			if (cell !== this.cursor.getc()) {
				this.setcursor(cell);
			}
			var wasBar = cell.isBar();
			var clueType = this.inputMode === "travel-yajilin" ? 14 : 15;
			var current = cell.qnum === clueType ? cell.qnum2 : -1;
			var next = this.getNewNumber(
				{
					getmaxnum: function() {
						return 51;
					},
					getminnum: function() {
						return 0;
					},
					disInputHatena: true,
					qsub: 0
				},
				current
			);
			if (next === -1) {
				cell.setQnum(-1);
				cell.setQnum2(-1);
				cell.setQdir(0);
			} else {
				cell.setQnum(clueType);
				cell.setQnum2(next);
				cell.setQdir(cell.qdir || cell.UP);
			}
			if (wasBar && !cell.isBar()) {
				this.board.relocateEndpointsFromClearedBar(cell);
			}
			cell.draw();
			this.mousereset();
		},
		inputCrossClue: function() {
			if (!this.mousestart) {
				return;
			}
			var cross = this.getpos(0.25).getx();
			if (cross.isnull) {
				return;
			}
			if (cross !== this.cursor.getx()) {
				this.setcursor(cross);
			}

			if (this.inputMode === "travel-slither") {
				if (this.btn === "right") {
					cross.setQnum(cross.qnum >= 0 && cross.qnum <= 4 ? cross.qnum - 1 : -1);
				} else {
					cross.setQnum(cross.qnum >= 0 && cross.qnum < 4 ? cross.qnum + 1 : 0);
				}
			} else {
				var clue = {
					"travel-div1": 11,
					"travel-div2": 12,
					"travel-div3": 13
				}[this.inputMode];
				if (this.btn === "right") {
					cross.setQnum(-1);
				} else {
					cross.setQnum(cross.qnum !== clue ? clue : -1);
				}
			}
			cross.draw();
			this.mousereset();
		},

		inputBorderClue: function() {
			if (!this.mousestart && !this.mousemove) {
				return;
			}
			var pos = this.getpos(0.35);
			if (this.prevPos.equals(pos)) {
				return;
			}
			var border = this.prevPos.getborderobj(pos);
			if (border.isnull || !border.inside) {
				this.prevPos = pos;
				return;
			}
			var ques =
				this.inputMode === "travel-required"
					? TL_BORDER_CLUES.REQUIRED
					: this.inputMode === "country"
						? TL_BORDER_CLUES.COUNTRY
						: TL_BORDER_CLUES.BLOCK;
			if (this.inputData === null) {
				this.inputData = border.ques !== ques ? ques : 0;
			}
			border.setQues(this.inputData);
			border.draw();
			this.prevPos = pos;
			if (this.mouseend) {
				this.mousereset();
			}
		},

		inputClearClue: function() {
			if (!this.mousestart && !this.mousemove) {
				return;
			}
			if (this.clearCrossClueAtPointer()) {
				return;
			}
			this.clearDraggedBorderClue();
			if (!this.clearCellClueAtPointer()) {
				this.clearBorderClueAtPointer();
			}
		},
		clearCrossClueAtPointer: function() {
			var cross = this.getpos(0.25).getx();
			if (!cross.isnull) {
				if (cross === this.mouseCell) {
					return true;
				}
				if (cross !== this.cursor.getx()) {
					this.setcursor(cross);
				}
				cross.setQnum(-1);
				cross.draw();
				this.mouseCell = cross;
				return true;
			}
			return false;
		},
		clearDraggedBorderClue: function() {
			var borderPos = this.getpos(0.35);
			if (this.prevPos.equals(borderPos)) {
				return false;
			}
			var border = this.prevPos.getborderobj(borderPos);
			this.prevPos = borderPos;
			if (border.isnull || !border.inside || border === this.mouseCell) {
				return false;
			}
			border.setQues(0);
			border.draw();
			this.mouseCell = border;
			return true;
		},
		clearCellClueAtPointer: function() {
			var cellPos = this.getpos(0);
			var cell = cellPos.getc();
			if (!cell.isnull) {
				if (cell === this.mouseCell) {
					return true;
				}
				if (cell !== this.cursor.getc()) {
					this.setcursor(cell);
				}
				var wasBar = cell.isBar();
				cell.setQnum(-1);
				cell.setQnum2(-1);
				cell.setQdir(0);
				cell.setQues(0);
				if (wasBar) {
					this.board.relocateEndpointsFromClearedBar(cell);
				}
				cell.draw();
				this.mouseCell = cell;
				return true;
			}
			return false;
		},
		clearBorderClueAtPointer: function() {
			var border = this.getborder(0.35);
			if (border.isnull || !border.inside || border === this.mouseCell) {
				return false;
			}
			border.setQues(0);
			border.draw();
			this.mouseCell = border;
			return true;
		},

		inputNoPassAux: function() {
			if (!this.mousestart && !this.mouseend) {
				return;
			}
			var cell = this.getcell();
			if (cell.isnull) {
				return;
			}
			if (this.inputData === null) {
				this.inputData = cell.qsub === 2 ? 0 : 2;
			}
			cell.setQsub(this.inputData);
			cell.draw();
			this.mouseCell = cell;
			this.mousereset();
		}
	},

	KeyEvent: {
		enablemake: true,
		getTravelKeyboardCrossClueType: function(cross) {
			if (cross.isSlither()) {
				return "slither";
			}
			return this.puzzle.mouse.inputMode === "travel-slither" ? "slither" : null;
		},
		getTravelKeyboardCellClueType: function(cell) {
			switch (this.puzzle.mouse.inputMode) {
				case "travel-yajilin":
					return 14;
				case "travel-cw":
					return 15;
				case "travel-order":
					return 16;
			}
			if (cell.isYajilin()) {
				return 14;
			}
			if (cell.isCw()) {
				return 15;
			}
			if (cell.isOrder()) {
				return 16;
			}
			return null;
		},
		keyinputTravelCrossNumber: function(cross, ca) {
			if (cross.isnull) {
				return false;
			}
			var current = cross.qnum >= 0 ? cross.qnum : -1;
			var next = this.getNewNumber(cross, ca, current);
			if (next === null) {
				return false;
			}
			cross.setQnum(next);
			cross.draw();
			this.prev = cross;
			this.cancelDefault = true;
			return true;
		},
		keyinputTravelNumber: function(cell, ca, clueType, withDirection) {
			var current = cell.qnum === clueType ? cell.qnum2 : -1;
			var next = null;
			var max = cell.board.cell.length;
			if ("0" <= ca && ca <= "9") {
				var num = +ca;
				if (current <= 0 || current * 10 + num > max || this.prev !== cell) {
					current = 0;
				}
				next = current * 10 + num;
				if (next > max) {
					next = null;
				}
			} else if (ca === " " || ca === "BS" || ca === "-") {
				next = -1;
			}
			if (next === null) {
				return false;
			}
			if (next === -1) {
				cell.setQnum(-1);
				cell.setQnum2(-1);
				cell.setQdir(0);
			} else {
				cell.setQnum(clueType);
				cell.setQnum2(next);
				cell.setQdir(withDirection ? cell.qdir || cell.UP : 0);
			}
			cell.draw();
			this.prev = cell;
			this.cancelDefault = true;
			return true;
		},
		keyinput: function(ca) {
			var cross = this.cursor.getx();
			if (
				!cross.isnull &&
				this.getTravelKeyboardCrossClueType(cross) === "slither" &&
				this.keyinputTravelCrossNumber(cross, ca)
			) {
				return;
			}

			var cell = this.cursor.getc();
			if (cell.isnull) {
				return;
			}
			var clueType = this.getTravelKeyboardCellClueType(cell);
			if ((clueType === 14 || clueType === 15) && this.key_inputdirec(ca)) {
				return;
			}
			if (
				(clueType === 14 && this.keyinputTravelNumber(cell, ca, 14, true)) ||
				(clueType === 15 && this.keyinputTravelNumber(cell, ca, 15, true)) ||
				(clueType === 16 && this.keyinputTravelNumber(cell, ca, 16, false))
			) {
				return;
			}
			var qnum = null;
			var nextInputMode = null;
			switch (ca) {
				case "x":
					var wasBar = cell.isBar();
					cell.toggleFloorFlag(TL_FLOOR_FLAGS.BAR);
					if (wasBar && !cell.isBar()) {
						cell.board.relocateEndpointsFromClearedBar(cell);
					}
					cell.draw();
					return;
				case "i":
					cell.toggleFloorFlag(TL_FLOOR_FLAGS.ICE);
					cell.draw();
					return;
				case "w":
					qnum = 3;
					break;
				case "b":
					qnum = 4;
					break;
				case "t":
					cell.toggleFloorFlag(TL_FLOOR_FLAGS.NOTOUCH);
					cell.draw();
					return;
				case "a":
					cell.toggleFloorFlag(TL_FLOOR_FLAGS.NOADJ);
					cell.draw();
					return;
				case "o":
					qnum = 7;
					break;
				case "p":
					qnum = 8;
					break;
					case "s":
						cell.toggleFloorFlag(TL_FLOOR_FLAGS.SLOOP);
						cell.draw();
						return;
					case "y":
						qnum = 14;
						nextInputMode = "travel-yajilin";
						break;
				case "c":
						qnum = 15;
						nextInputMode = "travel-cw";
						break;
					case "g":
						cell.toggleFloorFlag(TL_FLOOR_FLAGS.CWFLOOR);
						cell.draw();
						return;
					case "r":
						qnum = 16;
						nextInputMode = "travel-order";
						break;
					case " ":
				case "BS":
				case "-":
					qnum = -1;
					break;
			}
			if (qnum !== null) {
				var wasBar = cell.isBar();
				cell.setQnum(qnum);
				if (qnum === 14 || qnum === 15) {
					cell.setQnum2(cell.qnum2 >= 0 ? cell.qnum2 : 0);
					cell.setQdir(cell.qdir || cell.UP);
				} else if (qnum === 16) {
					cell.setQnum2(cell.qnum2 >= 0 ? cell.qnum2 : 0);
					cell.setQdir(0);
				} else {
					cell.setQnum2(-1);
					cell.setQdir(0);
				}
				if (wasBar && !cell.isBar()) {
					cell.board.relocateEndpointsFromClearedBar(cell);
				}
				if (nextInputMode) {
					this.puzzle.mouse.setInputMode(nextInputMode);
				}
				cell.draw();
			}
		}
	},

	TargetCursor: {
		setminmax_customize: function() {
			var bd = this.board;
			this.minx = bd.minbx;
			this.miny = bd.minby;
			this.maxx = bd.maxbx;
			this.maxy = bd.maxby;
		}
	},

	Border: {
		enableLineNG: true,
		isCountryBorder: function() {
			return this.ques === TL_BORDER_CLUES.COUNTRY;
		},
		isRequiredLine: function() {
			return this.ques === TL_BORDER_CLUES.REQUIRED;
		},
		isBlockedBorder: function() {
			return this.ques === TL_BORDER_CLUES.BLOCK;
		},
		isDivideSeparator: function() {
			return (
				this.isLine() ||
				this.isCountryBorder() ||
				this.isBlockedBorder()
			);
		},
		getArrow: function() {
			return this.qdir;
		},
		setArrow: function(val) {
			this.setQdir(val);
		},
		isArrow: function() {
			return this.qdir > 0;
		},
		isLine: function() {
			return this.line > 0 || this.isRequiredLine();
		},
		setLine: function() {
			if (this.isBlockedBorder()) {
				return;
			}
			this.setLineVal(1);
			if (this.qsub === 2) {
				this.setQsub(0);
			}
		},
		setPeke: function() {
			if (this.isRequiredLine()) {
				return;
			}
			this.setLineVal(0);
			this.setQsub(2);
		},
		removeLine: function() {
			if (this.isRequiredLine()) {
				if (this.qsub === 2) {
					this.setQsub(0);
				}
				return;
			}
			this.setLineVal(0);
			if (this.qsub === 2) {
				this.setQsub(0);
			}
		},
		removeLineAndQsub: function() {
			if (this.isRequiredLine()) {
				this.setQsub(0);
				return;
			}
			this.setLineVal(0);
			this.setQsub(0);
		},
		isLineNG: function() {
			if (this.isBlockedBorder()) {
				return true;
			}
			var obj1 = this.sidecell[0];
			var obj2 = this.sidecell[1];
			if (this.isVert()) {
				return (
					(obj1.group === "cell" && obj1.noLP(obj1.RT)) ||
					(obj2.group === "cell" && obj2.noLP(obj2.LT))
				);
			}
			return (
				(obj1.group === "cell" && obj1.noLP(obj1.DN)) ||
				(obj2.group === "cell" && obj2.noLP(obj2.UP))
			);
		}
	},
	Cross: {
		maxnum: 13,
		minnum: 0,
		isSlither: function() {
			return this.qnum >= 0 && this.qnum <= 4;
		},
		getDivideType: function() {
			return this.qnum >= 11 && this.qnum <= 13 ? this.qnum - 10 : 0;
		}
	},

	Cell: {
		maxnum: 16,
		minnum: 1,
		prehook: {
			qnum2: function() {
				return false;
			}
		},

		hasFloorFlag: function(flag) {
			return !!(this.ques & flag);
		},
		toggleFloorFlag: function(flag) {
			this.setQues(this.ques ^ flag);
		},
		removeFloorFlag: function(flag) {
			this.setQues(this.ques & ~flag);
		},
		setFloorFlag: function(flag) {
			this.setQues(this.ques | flag);
		},
		isClockwiseTurn: function(prev, next) {
			if (prev === null || next === null || prev === undefined || next === undefined) {
				return true;
			}
			var dx1 = this.bx - this.board.cell[prev].bx;
			var dy1 = this.by - this.board.cell[prev].by;
			var dx2 = this.board.cell[next].bx - this.bx;
			var dy2 = this.board.cell[next].by - this.by;
			return dx1 * dy2 - dy1 * dx2 > 0;
		},
			noLP: function() {
				return this.isBar() && !this.board.isBarEndpointCell(this);
			},
		isOnBoardEdge: function() {
			return (
				this.adjacent.top.group !== "cell" ||
				this.adjacent.bottom.group !== "cell" ||
				this.adjacent.left.group !== "cell" ||
				this.adjacent.right.group !== "cell"
			);
		},
		isBar: function() {
			return this.hasFloorFlag(TL_FLOOR_FLAGS.BAR);
		},
		isIce: function() {
			return this.qnum === 2 || this.hasFloorFlag(TL_FLOOR_FLAGS.ICE);
		},
		isWhitePearl: function() {
			return this.qnum === 3;
		},
		isBlackPearl: function() {
			return this.qnum === 4;
		},
		isNoTouch: function() {
			return this.qnum === 5 || this.hasFloorFlag(TL_FLOOR_FLAGS.NOTOUCH);
		},
		isNoAdj: function() {
			return this.qnum === 6 || this.hasFloorFlag(TL_FLOOR_FLAGS.NOADJ);
		},
		isDotWhite: function() {
			return this.qnum === 7;
		},
		isDotBlack: function() {
			return this.qnum === 8;
		},
		isSloop: function() {
			return this.qnum === 9 || this.hasFloorFlag(TL_FLOOR_FLAGS.SLOOP);
		},
		isYajilin: function() {
			return this.qnum === 14;
		},
		isCw: function() {
			return this.qnum === 15;
		},
		isCwFloor: function() {
			return this.hasFloorFlag(TL_FLOOR_FLAGS.CWFLOOR);
		},
		isOrder: function() {
			return this.qnum === 16;
		},
		isLineStraightTravel: function() {
			return (
				(this.adjborder.top.isLine() && this.adjborder.bottom.isLine()) ||
				(this.adjborder.left.isLine() && this.adjborder.right.isLine())
			);
		},
		isLineCurveTravel: function() {
			return this.lcnt === 2 && !this.isLineStraightTravel();
		}
	},

	Board: {
		cols: 8,
		rows: 8,
		hasborder: 2,
		hasexcell: 2,
		hascross: 1,

		arrowin: null,
		arrowout: null,

		createExtraObject: function() {
			var classes = this.klass;
			this.arrowin = new classes.InAddress(2, 0);
			this.arrowout = new classes.OutAddress(4, 0);
			this.arrowin.partner = this.arrowout;
			this.arrowout.partner = this.arrowin;
		},
		initExtraObject: function(col, row) {
			this.disableInfo();
			if (col >= 3) {
				this.arrowin.init(1, 0);
				this.arrowout.init(5, 0);
			} else {
				this.arrowin.init(1, 0);
				this.arrowout.init(1, 2 * row);
			}
			this.enableInfo();
		},
		exchangeinout: function() {
			var oldin = this.arrowin.getb();
			var oldout = this.arrowout.getb();
			oldin.setArrow(0);
			oldout.setArrow(0);
			this.arrowin.set(oldout);
			this.arrowout.set(oldin);

			this.arrowin.draw();
			this.arrowout.draw();
		},
		getEntryCellByBorder: function(border) {
			return border.sidecell[0].group === "cell"
				? border.sidecell[0]
				: border.sidecell[1];
		},
		getEntryCell: function(address) {
			if (address.oncell()) {
				return address.getc();
			}
			return this.getEntryCellByBorder(address.getb());
		},
		isInternalEndpointCell: function(cell) {
			if (cell.isnull) {
				return false;
			}
			return (
				(this.arrowin.oncell() && this.arrowin.getc() === cell) ||
				(this.arrowout.oncell() && this.arrowout.getc() === cell)
			);
		},
		isBarEndpointCell: function(cell) {
			if (cell.isnull || !cell.isBar()) {
				return false;
			}
			var startCell = this.getEntryCell(this.arrowin);
			var goalCell = this.getEntryCell(this.arrowout);
			return startCell === cell || goalCell === cell;
		},
		getEndpointArrowDir: function(type, border) {
			var bd = this;
			var reverse = this.getEntryCellByBorder(border).isBar();
			var resolvedType = reverse
				? type === "in"
					? "out"
					: "in"
				: type;
			if (resolvedType === "in") {
				if (border.by === bd.maxby - 2) {
					return border.UP;
				} else if (border.by === bd.minby + 2) {
					return border.DN;
				} else if (border.bx === bd.maxbx - 2) {
					return border.LT;
				} else if (border.bx === bd.minbx + 2) {
					return border.RT;
				}
			} else {
				if (border.by === bd.minby + 2) {
					return border.UP;
				} else if (border.by === bd.maxby - 2) {
					return border.DN;
				} else if (border.bx === bd.minbx + 2) {
					return border.LT;
				} else if (border.bx === bd.maxbx - 2) {
					return border.RT;
				}
			}
			return border.NDIR;
		},
		isEndpointRelocationBorder: function(border, partnerBorder) {
			if (border.isnull || (partnerBorder && border === partnerBorder)) {
				return false;
			}
			return !this.getEntryCellByBorder(border).isBar();
		},
		getEndpointRelocationBorder: function(type, partnerBorder) {
			var border =
				type === "in"
					? this.getb(1, 0)
					: this.cols >= 3
						? this.getb(5, 0)
						: this.getb(1, 2 * this.rows);
			if (this.isEndpointRelocationBorder(border, partnerBorder)) {
				return border;
			}

			for (var x = 1; x <= 2 * this.cols - 1; x += 2) {
				border = this.getb(x, 0);
				if (this.isEndpointRelocationBorder(border, partnerBorder)) {
					return border;
				}
			}
			for (var x2 = 1; x2 <= 2 * this.cols - 1; x2 += 2) {
				border = this.getb(x2, 2 * this.rows);
				if (this.isEndpointRelocationBorder(border, partnerBorder)) {
					return border;
				}
			}
			for (var y = 1; y <= 2 * this.rows - 1; y += 2) {
				border = this.getb(0, y);
				if (this.isEndpointRelocationBorder(border, partnerBorder)) {
					return border;
				}
			}
			for (var y2 = 1; y2 <= 2 * this.rows - 1; y2 += 2) {
				border = this.getb(2 * this.cols, y2);
				if (this.isEndpointRelocationBorder(border, partnerBorder)) {
					return border;
				}
			}
			return this.emptyborder;
		},
		relocateEndpointFromClearedBar: function(type, cell) {
			var address = type === "in" ? this.arrowin : this.arrowout;
			if (this.getEntryCell(address) !== cell) {
				return;
			}
			var target = this.getEndpointRelocationBorder(type, address.partner.getb());
			if (target.isnull) {
				return;
			}
			var oldBorder = address.onborder() ? address.getb() : this.emptyborder;
			if (!oldBorder.isnull) {
				oldBorder.setArrow(0);
				oldBorder.removeLine();
			}
			address.set(target);
			if (!oldBorder.isnull) {
				oldBorder.draw();
			}
			address.draw();
		},
		relocateEndpointsFromClearedBar: function(cell) {
			this.relocateEndpointFromClearedBar("in", cell);
			this.relocateEndpointFromClearedBar("out", cell);
		},
		getStartCell: function() {
			return this.getEntryCell(this.arrowin);
		},
		getGoalCell: function() {
			return this.getEntryCell(this.arrowout);
		}
	},
	BoardExec: {
		adjustBoardData: function(key, d) {
			var bd = this.board;
			this.adjustBorderArrow(key, d);
			this.posinfo_in = bd.arrowin.getState();
			this.posinfo_out = bd.arrowout.getState();
			this.adjustEndpointState(key, d, this.posinfo_in);
			this.adjustEndpointState(key, d, this.posinfo_out);
		},
		adjustBoardData2: function() {
			var bd = this.board;
			bd.disableInfo();
			bd.arrowin.setState(this.posinfo_in);
			bd.arrowout.setState(this.posinfo_out);
			bd.enableInfo();
		},
		adjustEndpointState: function(key, d, info) {
			if (info.mode === "cell") {
				var posinfo = this.getAfterPos(key, d, this.board.getc(info.bx, info.by));
				info.bx = posinfo.pos.bx;
				info.by = posinfo.pos.by;
				if (key & this.TURNFLIP) {
					var trans = this.getTranslateDir(key);
					info.dir = trans[info.dir] || info.dir;
				}
			} else {
				var posinfo2 = this.getAfterPos(key, d, this.board.getb(info.bx, info.by));
				info.bx = posinfo2.pos.bx;
				info.by = posinfo2.pos.by;
			}
		}
	},
	OperationManager: {
		addExtraOperation: function() {
			this.operationlist.push(this.klass.InOutOperation);
		}
	},

	LineGraph: {
		enabled: true,
		makeClist: true,
		isLineCross: true,
		relation: { "border.line": "link", "border.ques": "link" },
		iscrossing: function(cell) {
			return cell.isIce() || cell.isCwFloor();
		},
		rebuild2: function() {
			var excells = this.board.excell;
			for (var c = 0; c < excells.length; c++) {
				this.setComponentRefs(excells[c], null);
				this.resetObjNodeList(excells[c]);
			}

			this.common.rebuild2.call(this);
		}
	},

	"InOutAddress:Address": {
		type: "",
		partner: null,
		dir: 0,

		init: function(bx, by) {
			this.bx = bx;
			this.by = by;
			this.dir = 0;
			if (!!this.board && this.onborder()) {
				this.setarrow(this.getb());
			}
			return this;
		},
		oncell: function() {
			return !!(this.bx & 1 && this.by & 1);
		},
		onborder: function() {
			return !!((this.bx + this.by) & 1);
		},
		getc: function() {
			return this.oncell() ? this.board.getc(this.bx, this.by) : this.board.emptycell;
		},
		getb: function() {
			return this.onborder() ? this.board.getb(this.bx, this.by) : this.board.emptyborder;
		},
		getdir: function() {
			return this.oncell() ? this.dir : this.board.getEndpointArrowDir(this.type, this.getb());
		},
		getState: function() {
			return {
				mode: this.oncell() ? "cell" : "border",
				bx: this.bx,
				by: this.by,
				dir: this.dir
			};
		},
		setState: function(state) {
			if (!state) {
				return;
			}
			if (state.mode === "cell") {
				this.set(this.board.getc(state.bx, state.by), state.dir);
			} else {
				this.set(this.board.getb(state.bx, state.by));
			}
		},

		getid: function() {
			return this.onborder() ? this.getb().id : -1;
		},
		setid: function(id) {
			this.input(this.board.border[id]);
		},

		input: function(pos, dir) {
			if (pos.group === "cell") {
				if (this.partner.oncell() && this.partner.equals(pos)) {
					var oldstate = this.getState();
					this.partner.setState(oldstate);
					if (!this.oncell() || !this.equals(pos) || this.dir !== dir) {
						if (this.onborder()) {
							this.getb().setArrow(0);
						}
						this.set(pos, dir);
					}
					return;
				}
				if (!this.oncell() || !this.equals(pos) || this.dir !== dir) {
					if (this.onborder()) {
						this.getb().setArrow(0);
					}
					this.set(pos, dir);
				}
			} else {
				if (!this.partner.equals(pos)) {
					if (!this.equals(pos)) {
						if (this.onborder()) {
							this.getb().setArrow(0);
						}
						this.set(pos);
					}
				} else {
					this.board.exchangeinout();
				}
			}
		},
		set: function(pos, dir) {
			var pos0 = this.getaddr();
			var oldstate = this.getState();
			var newdir = pos.group === "cell" ? dir || this.NDIR : 0;
			this.addOpe(oldstate, {
				mode: pos.group === "cell" ? "cell" : "border",
				bx: pos.bx,
				by: pos.by,
				dir: newdir
			});

			this.bx = pos.bx;
			this.by = pos.by;
			this.dir = newdir;
			if (pos.group === "border") {
				this.setarrow(this.getb());
			}

			if (!!this.puzzle.painter && !this.puzzle.painter.suspended) {
				this.puzzle.redraw();
			} else {
				pos0.drawaround();
				this.drawaround();
			}
		},

		addOpe: function(oldstate, newstate) {
			if (
				oldstate.mode === newstate.mode &&
				oldstate.bx === newstate.bx &&
				oldstate.by === newstate.by &&
				oldstate.dir === newstate.dir
			) {
				return;
			}
			this.puzzle.opemgr.add(
				new this.klass.InOutOperation(this.type, oldstate, newstate)
			);
		}
	},
	"InAddress:InOutAddress": {
		type: "in",

		setarrow: function(border) {
			border.setArrow(this.board.getEndpointArrowDir("in", border));
		}
	},
	"OutAddress:InOutAddress": {
		type: "out",

		setarrow: function(border) {
			border.setArrow(this.board.getEndpointArrowDir("out", border));
		}
	},
	"InOutOperation:Operation": {
		property: "",

		setData: function(property, from, to) {
			this.property = property;
			this.from = from;
			this.to = to;
		},
		decode: function(strs) {
			if (strs[0] !== "PI" && strs[0] !== "PO") {
				return false;
			}
			this.property = strs[0] === "PI" ? "in" : "out";
			this.from = {
				mode: strs[1],
				bx: +strs[2],
				by: +strs[3],
				dir: +strs[4]
			};
			this.to = {
				mode: strs[5],
				bx: +strs[6],
				by: +strs[7],
				dir: +strs[8]
			};
			return true;
		},
		toString: function() {
			return [
				this.property === "in" ? "PI" : "PO",
				this.from.mode,
				this.from.bx,
				this.from.by,
				this.from.dir,
				this.to.mode,
				this.to.bx,
				this.to.by,
				this.to.dir
			].join(",");
		},

		undo: function() {
			this.exec(this.from);
		},
		redo: function() {
			this.exec(this.to);
		},
		exec: function(state) {
			var bd = this.board;
			if (this.property === "in") {
				bd.arrowin.setState(state);
			} else if (this.property === "out") {
				bd.arrowout.setState(state);
			}
		}
	},

	Graphic: {
		irowake: true,
		gridcolor_type: "LIGHT",
		icecolor: "rgb(163, 216, 255)",
		castleWallClueColor: "rgb(0, 96, 192)",
		travellineSolverLineColor: "rgba(64, 128, 255, 0.55)",
		travellineSolverPekeColor: "rgba(64, 128, 255, 0.8)",
		drawSolverOverlayInPaintPost: false,

		paint: function() {
			this._travelLineColorMap = null;
			this.drawBGCells();
			this.drawGrid();
			this.drawBorders();
			this.drawArrowNumbers();
			this.drawLines();
			this.drawPekes();
			this.drawSolverOverlayLines();
			this.drawSolverOverlayPekes();
			this.drawSolverOverlayCellCrosses();
			this.drawBorderAuxDir();
			this.drawMBs();
			this.drawCellClues();
			this.drawCrossClues();
			this.drawBorderArrows();
			this.drawChassis();
			this.drawBoxBorders(true);
			this.drawTarget();
			this.drawInOut();
		},

		getCanvasCols: function() {
			var bd = this.board;
			var cols = this.getBoardCols() + 2 * this.margin;
			if (this.puzzle.playeronly) {
				if (bd.arrowin.bx === bd.minbx + 2 || bd.arrowout.bx === bd.minbx + 2) {
					cols += 1.2;
				}
				if (bd.arrowin.bx === bd.maxbx - 2 || bd.arrowout.bx === bd.maxbx - 2) {
					cols += 1.2;
				}
			} else {
				cols += 1.4;
			}
			return cols;
		},
		getCanvasRows: function() {
			var bd = this.board;
			var rows = this.getBoardRows() + 2 * this.margin;
			if (this.puzzle.playeronly) {
				if (bd.arrowin.by === bd.minby + 2 || bd.arrowout.by === bd.minby + 2) {
					rows += 0.7;
				}
				if (bd.arrowin.by === bd.maxby - 2 || bd.arrowout.by === bd.maxby - 2) {
					rows += 0.7;
				}
			} else {
				rows += 1.4;
			}
			return rows;
		},
		getBoardCols: function() {
			var bd = this.board;
			return (bd.maxbx - bd.minbx) / 2 - 2;
		},
		getBoardRows: function() {
			var bd = this.board;
			return (bd.maxby - bd.minby) / 2 - 2;
		},
		getOffsetCols: function() {
			var bd = this.board;
			var cols = 0;
			if (this.puzzle.playeronly) {
				if (bd.arrowin.bx === bd.minbx + 2 || bd.arrowout.bx === bd.minbx + 2) {
					cols += 0.6;
				}
				if (bd.arrowin.bx === bd.maxbx - 2 || bd.arrowout.bx === bd.maxbx - 2) {
					cols -= 0.6;
				}
			}
			return cols;
		},
		getOffsetRows: function() {
			var bd = this.board;
			var rows = 0;
			if (this.puzzle.playeronly) {
				if (bd.arrowin.by === bd.minby + 2 || bd.arrowout.by === bd.minby + 2) {
					rows += 0.35;
				}
				if (bd.arrowin.by === bd.maxby - 2 || bd.arrowout.by === bd.maxby - 2) {
					rows -= 0.35;
				}
			}
			return rows;
		},

		mixTravelFloorColor: function(colors) {
			var totalR = 0;
			var totalG = 0;
			var totalB = 0;
			var totalA = 0;
			var count = 0;
			for (var i = 0; i < colors.length; i++) {
				var match = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/.exec(
					colors[i]
				);
				if (!match) {
					continue;
				}
				totalR += +match[1];
				totalG += +match[2];
				totalB += +match[3];
				totalA += match[4] !== void 0 ? +match[4] : 1;
				count++;
			}
			var len = count || 1;
			var avgA = totalA / len;
			if (avgA >= 0.999) {
				return (
					"rgb(" +
					Math.round(totalR / len) +
					"," +
					Math.round(totalG / len) +
					"," +
					Math.round(totalB / len) +
					")"
				);
			}
			return (
				"rgba(" +
				Math.round(totalR / len) +
				"," +
				Math.round(totalG / len) +
				"," +
				Math.round(totalB / len) +
				"," +
				avgA.toFixed(3).replace(/0+$/, "").replace(/\.$/, "") +
				")"
			);
		},
		getBGCellColor: function(cell) {
			var info = cell.error || cell.qinfo;
			if (cell.isCw()) {
				return info === 1 ? this.errbcolor1 : null;
			}
			var floors = [];
			if (cell.isBar()) {
				floors.push("rgba(160,160,160,0.55)");
			}
			if (cell.isIce()) {
				floors.push(this.icecolor);
			}
			if (cell.isNoTouch()) {
				floors.push("rgb(246, 207, 207)");
			}
			if (cell.isNoAdj()) {
				floors.push("rgb(255, 235, 153)");
			}
			if (cell.isSloop()) {
				floors.push("rgb(210,255,210)");
			}
			if (cell.isCwFloor()) {
				floors.push("rgb(214, 191, 255)");
			}
			if (floors.length) {
				return info === 1 ? this.errbcolor1 : this.mixTravelFloorColor(floors);
			}
			if (info === 1) {
				return this.errbcolor1;
			}
			return null;
		},

		getQuesNumberText: function(cell) {
			if (cell.isYajilin() || cell.isCw()) {
				return this.getNumberTextCore(Math.max(cell.qnum2, 0));
			}
			return "";
		},

		getQuesNumberColor: function(cell) {
			if (cell.isCw()) {
				return (cell.error || cell.qinfo) === 1
					? this.errcolor1
					: this.castleWallClueColor;
			}
			return (cell.error || cell.qinfo) === 1 ? this.errcolor1 : this.quescolor;
		},

		getBorderColor: function(border) {
			if (border.isCountryBorder && border.isCountryBorder()) {
				return this.quescolor;
			}
			if (border.isBlockedBorder && border.isBlockedBorder()) {
				return this.quescolor;
			}
			return null;
		},
		getTravelLineConnectedBorders: function(cell, border) {
			var adb = cell.adjborder;
			var lines = [];
			var dirs = ["top", "bottom", "left", "right"];
			for (var i = 0; i < dirs.length; i++) {
				var b = adb[dirs[i]];
				if (b.isLine()) {
					lines.push(b);
				}
			}
			if (cell.lcnt === 2) {
				return lines.filter(function(other) {
					return other !== border;
				});
			}
			if (cell.lcnt === 4 && (cell.isIce() || cell.isCwFloor())) {
				if (border === adb.top) {
					return adb.bottom.isLine() ? [adb.bottom] : [];
				}
				if (border === adb.bottom) {
					return adb.top.isLine() ? [adb.top] : [];
				}
				if (border === adb.left) {
					return adb.right.isLine() ? [adb.right] : [];
				}
				if (border === adb.right) {
					return adb.left.isLine() ? [adb.left] : [];
				}
				return [];
			}
			return lines.filter(function(other) {
				return other !== border;
			});
		},
		getTravelLineColorMap: function() {
			if (this._travelLineColorMap) {
				return this._travelLineColorMap;
			}
			var bd = this.board;
			var map = {};
			var visited = {};
			for (var i = 0; i < bd.border.length; i++) {
				var start = bd.border[i];
				if (!start.isLine() || visited[start.id]) {
					continue;
				}
				var queue = [start];
				var component = [];
				visited[start.id] = true;
				var head = 0;
				while (head < queue.length) {
					var border = queue[head++];
					component.push(border);
					for (var s = 0; s < 2; s++) {
						var cell = border.sidecell[s];
						if (cell.isnull || cell.lcnt === 0) {
							continue;
						}
						var nexts = this.getTravelLineConnectedBorders(cell, border);
						for (var n = 0; n < nexts.length; n++) {
							var next = nexts[n];
							if (!visited[next.id]) {
								visited[next.id] = true;
								queue.push(next);
							}
						}
					}
				}
				component.sort(function(a, b) {
					return a.id - b.id;
				});
				var color = null;
				for (var c = 0; c < component.length; c++) {
					if (component[c].path && component[c].path.color) {
						color = component[c].path.color;
						break;
					}
				}
				if (!color) {
					color = this.getNewLineColor();
				}
				for (var j = 0; j < component.length; j++) {
					map[component[j].id] = color;
				}
			}
			this._travelLineColorMap = map;
			return map;
		},
		getLineColor: function(border) {
			if (border.isRequiredLine && border.isRequiredLine()) {
				this.addlw = -this.lw / 3;
				return (border.error || border.qinfo) === 1 ? this.errlinecolor : "#7b3ff2";
			}
			if (border.isLine() && this.puzzle.execConfig("irowake")) {
				var info = border.error || border.qinfo;
				if (border.trial) {
					this.addlw = -this.lm;
				} else if (info === 1) {
					this.addlw = 1;
				} else {
					this.addlw = 0;
				}
				if (info === 1) {
					return this.errlinecolor;
				}
				if (info === -1) {
					return this.noerrcolor;
				}
				return (
					this.getTravelLineColorMap()[border.id] ||
					(border.trial ? this.linetrialcolor : this.linecolor)
				);
			}
			return this.common.getLineColor.call(this, border);
		},

		drawCellClues: function() {
			var g = this.vinc("cell_clue", "auto", true);
			var clist = this.range.cells;
			var rsize = this.cw * 0.3;
			g.lineWidth = Math.max(this.cw / 24, 1.5);

			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				var px = cell.bx * this.bw;
				var py = cell.by * this.bh;
				var qn = cell.qnum;

				g.vid = "c_pearl_" + cell.id;
				if (qn === 3 || qn === 4) {
					g.fillStyle = qn === 4 ? this.quescolor : "white";
					g.strokeStyle = this.quescolor;
					g.shapeCircle(px, py, rsize);
					g.vid = "c_dot_" + cell.id;
					g.vhide();
				} else if (qn === 7 || qn === 8) {
					g.vid = "c_pearl_" + cell.id;
					g.vhide();
					g.vid = "c_dot_" + cell.id;
					g.fillStyle = qn === 8 ? this.quescolor : "white";
					g.strokeStyle = this.quescolor;
					g.shapeCircle(px, py, this.cw * 0.1);
				} else if (qn === 16) {
					g.vid = "c_pearl_" + cell.id;
					g.vhide();
					g.vid = "c_dot_" + cell.id;
					g.vhide();
					g.fillStyle = this.getQuesNumberColor(cell);
					this.disptext(this.getNumberTextCore_letter(Math.max(cell.qnum2, 0) + 1), px, py, {
						ratio: 0.52
					});
				} else {
					g.vhide();
					g.vid = "c_dot_" + cell.id;
					g.vhide();
				}
			}
		},
		drawSolverOverlayLines: function() {
			var g = this.vinc("travelline_solver_line", "crispEdges");
			var blist = this.range.borders;
			var lm = Math.max(this.lm * 0.72, 1);

			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];
				g.vid = "b_solver_line_" + border.id;
				if (
					border._travellineSolverState === "line" &&
					!border.isLine() &&
					border.qsub !== 2
				) {
					var px = border.bx * this.bw;
					var py = border.by * this.bh;
					var isvert = this.board.borderAsLine === border.isVert();
					g.fillStyle = this.travellineSolverLineColor;
					if (isvert) {
						g.fillRectCenter(px, py, lm, this.bh + lm);
					} else {
						g.fillRectCenter(px, py, this.bw + lm, lm);
					}
				} else {
					g.vhide();
				}
			}
		},
		drawSolverOverlayPekes: function() {
			var g = this.vinc("travelline_solver_peke", "auto", true);
			var size = this.cw * 0.13 + 1;
			if (size < 4) {
				size = 4;
			}
			g.lineWidth = Math.max((1 + this.cw / 45) | 0, 1);
			g.strokeStyle = this.travellineSolverPekeColor;

			var blist = this.range.borders;
			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];
				g.vid = "b_solver_peke_" + border.id;
				if (
					border._travellineSolverState === "cross" &&
					!border.isLine() &&
					border.qsub !== 2
				) {
					g.strokeCross(border.bx * this.bw, border.by * this.bh, size - 1);
				} else {
					g.vhide();
				}
			}
		},
		drawSolverOverlayCellCrosses: function() {
			var g = this.vinc("travelline_solver_cell_cross", "auto", true);
			var size = this.cw * 0.35;
			g.lineWidth = Math.max((1 + this.cw / 45) | 0, 1);
			g.strokeStyle = this.travellineSolverPekeColor;

			var clist = this.range.cells;
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i];
				g.vid = "c_solver_cross_" + cell.id;
				if (cell._travellineSolverCellState === "cross") {
					g.strokeCross(cell.bx * this.bw, cell.by * this.bh, size);
				} else {
					g.vhide();
				}
			}
		},
		drawCrossClues: function() {
			var g = this.vinc("cross_clue", "auto", true);
			var clist = this.range.crosses;
			g.lineWidth = Math.max(this.cw / 24, 1.5);

			for (var i = 0; i < clist.length; i++) {
				var cross = clist[i];
				var px = cross.bx * this.bw;
				var py = cross.by * this.bh;
				var divideType = cross.getDivideType();

				g.vid = "x_slither_" + cross.id;
				if (cross.isSlither()) {
					g.fillStyle = this.quescolor;
					this.disptext("" + cross.qnum, px, py, { ratio: 0.45 });
					g.vid = "x_divide_" + cross.id;
					g.vhide();
				} else if (divideType > 0) {
					g.vid = "x_slither_" + cross.id;
					g.vhide();
					var colors = {
						1: "#d04a4a",
						2: "#3f8c4f",
						3: "#4d6fd0"
					};
					g.vid = "x_divide_" + cross.id;
					g.fillStyle = colors[divideType];
					g.strokeStyle = this.quescolor;
					g.shapeCircle(px, py, this.cw * 0.12);
				} else {
					g.vid = "x_slither_" + cross.id;
					g.vhide();
					g.vid = "x_divide_" + cross.id;
					g.vhide();
				}
			}
		},

		drawBorderArrows: function() {
			var g = this.vinc("border_arrow", "crispEdges", true);
			var ll = this.cw * 0.35;
			var lw = Math.max(this.cw / 36, 1);
			var lm = lw / 2;
			var blist = this.range.borders;

			for (var i = 0; i < blist.length; i++) {
				var border = blist[i];
				var dir = border.getArrow();
				var px = border.bx * this.bw;
				var py = border.by * this.bh;

				g.fillStyle = this.quescolor;
				g.vid = "b_ar_" + border.id;
				if (dir === border.UP || dir === border.DN) {
					g.fillRectCenter(px, py, lm, ll);
				} else if (dir === border.LT || dir === border.RT) {
					g.fillRectCenter(px, py, ll, lm);
				} else {
					g.vhide();
				}

				g.vid = "b_tipa_" + border.id;
				if (dir === border.UP || dir === border.LT) {
					g.beginPath();
					if (dir === border.UP) {
						g.setOffsetLinePath(
							px,
							py,
							0,
							-ll,
							-ll / 2,
							-ll * 0.4,
							ll / 2,
							-ll * 0.4,
							true
						);
					} else {
						g.setOffsetLinePath(
							px,
							py,
							-ll,
							0,
							-ll * 0.4,
							-ll / 2,
							-ll * 0.4,
							ll / 2,
							true
						);
					}
					g.fill();
				} else {
					g.vhide();
				}

				g.vid = "b_tipb_" + border.id;
				if (dir === border.DN || dir === border.RT) {
					g.beginPath();
					if (dir === border.DN) {
						g.setOffsetLinePath(
							px,
							py,
							0,
							ll,
							-ll / 2,
							ll * 0.4,
							ll / 2,
							ll * 0.4,
							true
						);
					} else {
						g.setOffsetLinePath(
							px,
							py,
							ll,
							0,
							ll * 0.4,
							-ll / 2,
							ll * 0.4,
							ll / 2,
							true
						);
					}
					g.fill();
				} else {
					g.vhide();
				}
			}
		},

		drawInOut: function() {
			var g = this.vinc("inout", "auto");
			var bd = this.board;
			var border;
			var dir;
			var px;
			var py;
			var ll = this.cw * 0.26;
			var lm = Math.max(this.cw / 40, 1);

			g.vid = "string_in";
			border = bd.arrowin.getb();
			if (bd.arrowin.oncell()) {
				var inCell = bd.arrowin.getc();
				px = bd.arrowin.bx * this.bw;
				py = bd.arrowin.by * this.bh;
				dir = bd.arrowin.getdir();
				g.fillStyle =
					(inCell.error || inCell.qinfo) === 1 ? this.errcolor1 : this.quescolor;
				this.drawCellEndpointArrow(g, "in", px, py, dir, ll, lm);
				var inLabel = this.getCellEndpointLabelPosition(px, py, dir);
				g.vid = "string_in";
				this.disptext("IN", inLabel.x, inLabel.y, { ratio: 0.42, width: [] });
			} else if (!border.inside && border.id < bd.border.length) {
				g.vid = "in_cell_arrow_shaft";
				g.vhide();
				g.vid = "in_cell_arrow_tip";
				g.vhide();
				var bx = border.bx;
				var by = border.by;
				px = bx * this.bw;
				py = by * this.bh;
				if (by === bd.minby + 2) {
					py -= 1.2 * this.bh;
				} else if (by === bd.maxby - 2) {
					py += 1.2 * this.bh;
				} else if (bx === bd.minbx + 2) {
					px -= this.bw;
					py -= 0.6 * this.bh;
				} else if (bx === bd.maxbx - 2) {
					px += this.bw;
					py -= 0.6 * this.bh;
				}
				g.fillStyle = border.error === 4 ? this.errcolor1 : this.quescolor;
				g.vid = "string_in";
				this.disptext("IN", px, py, { ratio: 0.55, width: [] });
			} else {
				g.vid = "in_cell_arrow_shaft";
				g.vhide();
				g.vid = "in_cell_arrow_tip";
				g.vhide();
				g.vid = "string_in";
				g.vhide();
			}

			g.vid = "string_out";
			border = bd.arrowout.getb();
			if (bd.arrowout.oncell()) {
				var outCell = bd.arrowout.getc();
				px = bd.arrowout.bx * this.bw;
				py = bd.arrowout.by * this.bh;
				dir = bd.arrowout.getdir();
				g.fillStyle =
					(outCell.error || outCell.qinfo) === 1 ? this.errcolor1 : this.quescolor;
				this.drawCellEndpointArrow(g, "out", px, py, dir, ll, lm);
				var outLabel = this.getCellEndpointLabelPosition(px, py, dir);
				g.vid = "string_out";
				this.disptext("OUT", outLabel.x, outLabel.y, {
					ratio: 0.42,
					width: []
				});
			} else if (!border.inside && border.id < bd.border.length) {
				g.vid = "out_cell_arrow_shaft";
				g.vhide();
				g.vid = "out_cell_arrow_tip";
				g.vhide();
				var bx2 = border.bx;
				var by2 = border.by;
				var px2 = bx2 * this.bw;
				var py2 = by2 * this.bh;
				if (by2 === bd.minby + 2) {
					py2 -= 1.2 * this.bh;
				} else if (by2 === bd.maxby - 2) {
					py2 += 1.2 * this.bh;
				} else if (bx2 === bd.minbx + 2) {
					px2 -= 1.4 * this.bw;
					py2 -= 0.6 * this.bh;
				} else if (bx2 === bd.maxbx - 2) {
					px2 += 1.4 * this.bw;
					py2 -= 0.6 * this.bh;
				}
				g.fillStyle = border.error === 4 ? this.errcolor1 : this.quescolor;
				g.vid = "string_out";
				this.disptext("OUT", px2, py2, { ratio: 0.55, width: [] });
			} else {
				g.vid = "out_cell_arrow_shaft";
				g.vhide();
				g.vid = "out_cell_arrow_tip";
				g.vhide();
				g.vid = "string_out";
				g.vhide();
			}
		},
		getCellEndpointArrowLayout: function(px, py, dir, ll, key) {
			var dirs = this.board.emptycell;
			if (key === "out") {
				dir = this.getOppositeTravelDir(dir);
				var edge = this.cw * 0.5;
				var outside = Math.min(
					Math.max(ll * 1.6, this.cw * 0.46),
					this.cw * 0.58
				);
				switch (dir) {
					case dirs.UP:
						return {
							sx: px,
							sy: py - outside,
							ex: px,
							ey: py - edge
						};
					case dirs.DN:
						return {
							sx: px,
							sy: py + outside,
							ex: px,
							ey: py + edge
						};
					case dirs.LT:
						return {
							sx: px - outside,
							sy: py,
							ex: px - edge,
							ey: py
						};
					case dirs.RT:
						return {
							sx: px + outside,
							sy: py,
							ex: px + edge,
							ey: py
						};
				}
			}
			var reach = Math.min(Math.max(ll * 1.6, this.cw * 0.4), this.cw * 0.44);
			var tail = ll * 0.25;
			var sx = px;
			var sy = py;
			var ex = px;
			var ey = py;
			switch (dir) {
				case dirs.UP:
					sy += tail;
					ey -= reach;
					break;
				case dirs.DN:
					sy -= tail;
					ey += reach;
					break;
				case dirs.LT:
					sx += tail;
					ex -= reach;
					break;
				case dirs.RT:
					sx -= tail;
					ex += reach;
					break;
			}
			return {
				sx: sx,
				sy: sy,
				ex: ex,
				ey: ey
			};
		},
		getCellEndpointLabelPosition: function(px, py, dir) {
			var dirs = this.board.emptycell;
			var offset = this.cw * 0.28;
			switch (dir) {
				case dirs.UP:
					return { x: px, y: py + offset };
				case dirs.DN:
					return { x: px, y: py - offset };
				case dirs.LT:
					return { x: px + offset, y: py };
				case dirs.RT:
					return { x: px - offset, y: py };
			}
			return { x: px, y: py - offset };
		},
		getOppositeTravelDir: function(dir) {
			var dirs = this.board.emptycell;
			switch (dir) {
				case dirs.UP:
					return dirs.DN;
				case dirs.DN:
					return dirs.UP;
				case dirs.LT:
					return dirs.RT;
				case dirs.RT:
					return dirs.LT;
			}
			return dir;
		},
		getCellEndpointArrowDir: function(key, dir) {
			return dir;
		},
		drawCellEndpointArrow: function(g, key, px, py, dir, ll, lm) {
			var dirs = this.board.emptycell;
			var arrowDir = this.getCellEndpointArrowDir(key, dir);
			var layout = this.getCellEndpointArrowLayout(px, py, dir, ll, key);
			var shaftPx = (layout.sx + layout.ex) / 2;
			var shaftPy = (layout.sy + layout.ey) / 2;
			var shaftLength = Math.max(
				Math.abs(layout.ex - layout.sx),
				Math.abs(layout.ey - layout.sy)
			);

			g.vid = key + "_cell_arrow_shaft";
			if (arrowDir === dirs.UP || arrowDir === dirs.DN) {
				g.fillRectCenter(shaftPx, shaftPy, lm, shaftLength);
			} else if (arrowDir === dirs.LT || arrowDir === dirs.RT) {
				g.fillRectCenter(shaftPx, shaftPy, shaftLength, lm);
			} else {
				g.vhide();
			}
			g.vid = key + "_cell_arrow_tip";
			if (arrowDir === dirs.UP) {
				g.beginPath();
				g.setOffsetLinePath(
					layout.ex,
					layout.ey,
					0,
					-ll,
					-ll / 2,
					-ll * 0.4,
					ll / 2,
					-ll * 0.4,
					true
				);
				g.fill();
			} else if (arrowDir === dirs.DN) {
				g.beginPath();
				g.setOffsetLinePath(
					layout.ex,
					layout.ey,
					0,
					ll,
					-ll / 2,
					ll * 0.4,
					ll / 2,
					ll * 0.4,
					true
				);
				g.fill();
			} else if (arrowDir === dirs.LT) {
				g.beginPath();
				g.setOffsetLinePath(
					layout.ex,
					layout.ey,
					-ll,
					0,
					-ll * 0.4,
					-ll / 2,
					-ll * 0.4,
					ll / 2,
					true
				);
				g.fill();
			} else if (arrowDir === dirs.RT) {
				g.beginPath();
				g.setOffsetLinePath(
					layout.ex,
					layout.ey,
					ll,
					0,
					ll * 0.4,
					-ll / 2,
					ll * 0.4,
					ll / 2,
					true
				);
				g.fill();
			} else {
				g.vhide();
			}
		},

		repaintParts: function(blist) {
			this.range.borders = blist;
			this.drawBorderArrows();
		}
	},

	Encode: {
			decodePzpr: function() {
				this.decodeBorder();
				this.decodeNumber16();
				this.decodeRequiredBorderExtras();
				this.decodeCrossExtras();
				this.decodeDirectedCellExtras();
				this.decodeFloorCellExtras();
				this.decodeInOut();
				this.normalizeLegacyFloorClues();
			},
			encodePzpr: function() {
				this.encodeBaseBorder();
				this.encodeTravelNumber16();
				this.encodeRequiredBorderExtras();
				this.encodeCrossExtras();
				this.encodeDirectedCellExtras();
				this.encodeFloorCellExtras();
				this.encodeInOut();
			},
		encodeTravelNumber16: function() {
			var bd = this.board;
			this.genericEncodeNumber16(bd.cell.length, function(c) {
				var qnum = bd.cell[c].qnum;
				return qnum === 14 || qnum === 15 || qnum === 16 ? -1 : qnum;
			});
		},
		encodeBaseBorder: function() {
			var saved = [];
			for (var i = 0; i < this.board.border.length; i++) {
				var border = this.board.border[i];
				if (
					border.inside &&
					(border.ques === TL_BORDER_CLUES.REQUIRED ||
						border.ques === TL_BORDER_CLUES.BLOCK)
				) {
					saved.push([border, border.ques]);
					border.ques = 0;
				}
			}
			this.encodeBorder();
			for (var j = 0; j < saved.length; j++) {
				saved[j][0].ques = saved[j][1];
			}
		},
		decodeRequiredBorderExtras: function() {
			var barray = this.outbstr.split("/");
			if (barray.length <= 3) {
				return;
			}
			var seg = barray[1] || "-";
			var bd = this.board;
			if (seg !== "-") {
				var items = seg.split("+");
				for (var i = 0; i < items.length; i++) {
					if (!items[i]) {
						continue;
					}
					var parts = items[i].split(".");
					var id = parseInt(parts[0], 36);
					if (!bd.border[id] || !bd.border[id].inside) {
						continue;
					}
					if (parts[1] === "r") {
						bd.border[id].ques = TL_BORDER_CLUES.REQUIRED;
					} else if (parts[1] === "b") {
						bd.border[id].ques = TL_BORDER_CLUES.BLOCK;
					}
				}
			}
			this.outbstr = "/" + barray.slice(2).join("/");
		},
		encodeRequiredBorderExtras: function() {
			var list = [];
			for (var i = 0; i < this.board.border.length; i++) {
				var border = this.board.border[i];
				if (!border.inside) {
					continue;
				}
				if (border.ques === TL_BORDER_CLUES.REQUIRED) {
					list.push(i.toString(36) + ".r");
				} else if (border.ques === TL_BORDER_CLUES.BLOCK) {
					list.push(i.toString(36) + ".b");
				}
			}
			this.outbstr += "/" + (list.length ? list.join("+") : "-");
		},
		decodeCrossExtras: function() {
			var barray = this.outbstr.split("/");
			if (barray.length <= 3) {
				return;
			}
			var seg = barray[1] || "-";
			var bd = this.board;
			if (seg !== "-") {
				var items = seg.split("+");
				for (var i = 0; i < items.length; i++) {
					if (!items[i]) {
						continue;
					}
					var parts = items[i].split(".");
					var id = parseInt(parts[0], 36);
					if (!bd.cross[id]) {
						continue;
					}
					var code = parts[1];
					if (code === "a") {
						bd.cross[id].qnum = 11;
					} else if (code === "b") {
						bd.cross[id].qnum = 12;
					} else if (code === "c") {
						bd.cross[id].qnum = 13;
					} else {
						bd.cross[id].qnum = parseInt(code, 10);
					}
				}
			}
			this.outbstr = "/" + barray.slice(2).join("/");
		},
			encodeCrossExtras: function() {
			var list = [];
			for (var i = 0; i < this.board.cross.length; i++) {
				var qn = this.board.cross[i].qnum;
				if (qn === -1) {
					continue;
				}
				var code = "";
				if (qn >= 0 && qn <= 4) {
					code = "" + qn;
				} else if (qn === 11) {
					code = "a";
				} else if (qn === 12) {
					code = "b";
				} else if (qn === 13) {
					code = "c";
				} else {
					continue;
				}
				list.push(i.toString(36) + "." + code);
			}
				this.outbstr += "/" + (list.length ? list.join("+") : "-");
			},
			decodeDirectedCellExtras: function() {
				var barray = this.outbstr.split("/");
				if (barray.length <= 3) {
					return;
				}
				var seg = barray[1] || "-";
				var bd = this.board;
				if (seg !== "-") {
					var items = seg.split("+");
					for (var i = 0; i < items.length; i++) {
						if (!items[i]) {
							continue;
						}
						var parts = items[i].split(".");
						var id = parseInt(parts[0], 36);
						var cell = bd.cell[id];
						if (!cell) {
							continue;
						}
						if (parts[1] === "o") {
							cell.qnum = 16;
							cell.qdir = 0;
							cell.qnum2 = parseInt(parts[2], 36);
						} else {
							cell.qnum = parts[1] === "y" ? 14 : 15;
							cell.qdir = parseInt(parts[2], 10);
							cell.qnum2 = parseInt(parts[3], 36);
						}
					}
				}
				this.outbstr = "/" + barray.slice(2).join("/");
			},
			encodeDirectedCellExtras: function() {
				var list = [];
				for (var i = 0; i < this.board.cell.length; i++) {
					var cell = this.board.cell[i];
					if (cell.qnum !== 14 && cell.qnum !== 15 && cell.qnum !== 16) {
						continue;
					}
					if (cell.qnum === 16) {
						list.push(
							i.toString(36) +
								".o." +
								Math.max(cell.qnum2, 0).toString(36)
						);
					} else {
						list.push(
							i.toString(36) +
								"." +
								(cell.qnum === 14 ? "y" : "c") +
								"." +
								cell.qdir +
								"." +
								Math.max(cell.qnum2, 0).toString(36)
						);
					}
				}
				this.outbstr += "/" + (list.length ? list.join("+") : "-");
			},
			decodeFloorCellExtras: function() {
				var barray = this.outbstr.split("/");
				if (barray.length <= 3) {
					return;
				}
				var seg = barray[1] || "-";
				var bd = this.board;
				if (seg !== "-") {
					var items = seg.split("+");
					for (var i = 0; i < items.length; i++) {
						if (!items[i]) {
							continue;
						}
						var parts = items[i].split(".");
						var id = parseInt(parts[0], 36);
						var cell = bd.cell[id];
						if (!cell || parts[1] !== "f") {
							continue;
						}
						cell.ques = parseInt(parts[2], 36) || 0;
					}
				}
				this.outbstr = "/" + barray.slice(2).join("/");
			},
			encodeFloorCellExtras: function() {
				var list = [];
				for (var i = 0; i < this.board.cell.length; i++) {
					var cell = this.board.cell[i];
					if (!cell.ques) {
						continue;
					}
					list.push(i.toString(36) + ".f." + cell.ques.toString(36));
				}
				this.outbstr += "/" + (list.length ? list.join("+") : "-");
			},
			normalizeLegacyFloorClues: function() {
				for (var i = 0; i < this.board.cell.length; i++) {
					var cell = this.board.cell[i];
					if (cell.qnum === 1) {
						cell.setFloorFlag(TL_FLOOR_FLAGS.BAR);
						cell.qnum = -1;
					} else if (cell.qnum === 2) {
						cell.setFloorFlag(TL_FLOOR_FLAGS.ICE);
						cell.qnum = -1;
					} else if (cell.qnum === 5) {
						cell.setFloorFlag(TL_FLOOR_FLAGS.NOTOUCH);
						cell.qnum = -1;
					} else if (cell.qnum === 6) {
						cell.setFloorFlag(TL_FLOOR_FLAGS.NOADJ);
						cell.qnum = -1;
					} else if (cell.qnum === 9) {
						cell.setFloorFlag(TL_FLOOR_FLAGS.SLOOP);
						cell.qnum = -1;
					}
				}
			},
			decodeInOut: function() {
			var barray = this.outbstr.split("/");
			var bd = this.board;
			var idoffset = 2 * bd.cols * bd.rows - bd.cols - bd.rows;
			this.decodeEndpointState(bd.arrowin, barray[1], idoffset);
			this.decodeEndpointState(bd.arrowout, barray[2], idoffset);

			this.outbstr = "";
		},
		decodeEndpointState: function(address, token, idoffset) {
			token = token || "0";
			if (token.charAt(0) === "c") {
				var parts = token.substr(1).split(".");
				var cell = this.board.cell[parseInt(parts[0], 36)];
				if (cell) {
					address.set(cell, parseInt(parts[1], 10) || cell.RT);
				}
				return;
			}
			address.setid((+token || 0) + idoffset);
		},
		encodeInOut: function() {
			var bd = this.board;
			var idoffset = 2 * bd.cols * bd.rows - bd.cols - bd.rows;
			this.outbstr +=
				"/" +
				this.encodeEndpointState(bd.arrowin, idoffset) +
				"/" +
				this.encodeEndpointState(bd.arrowout, idoffset);
		},
		encodeEndpointState: function(address, idoffset) {
			if (address.oncell()) {
				return (
					"c" +
					address.getc().id.toString(36) +
					"." +
					address.getdir()
				);
			}
			return "" + (address.getid() - idoffset);
		}
	},
		FileIO: {
			decodeData: function() {
				this.decodeInOut();
				this.decodeBorder(function(border, ca) {
					if (ca === "1") {
						border.ques = TL_BORDER_CLUES.COUNTRY;
					} else if (ca === "2") {
						border.ques = TL_BORDER_CLUES.REQUIRED;
					} else if (ca === "3") {
						border.ques = TL_BORDER_CLUES.BLOCK;
					}
				});
				this.decodeCell(function(cell, ca) {
					if (ca === ".") {
						return;
					}
					var parts = ca.split(",");
					if (parts[0] === "Y") {
						cell.qnum = 14;
						cell.qdir = +parts[1];
						cell.qnum2 = +parts[2];
						cell.ques = parts[3] ? +parts[3] : 0;
						cell.qsub = parts[4] ? +parts[4] : 0;
					} else if (parts[0] === "C") {
						cell.qnum = 15;
						cell.qdir = +parts[1];
						cell.qnum2 = +parts[2];
						cell.ques = parts[3] ? +parts[3] : 0;
						cell.qsub = parts[4] ? +parts[4] : 0;
					} else if (parts[0] === "O") {
						cell.qnum = 16;
						cell.qdir = 0;
						cell.qnum2 = +parts[1];
						cell.ques = parts[2] ? +parts[2] : 0;
						cell.qsub = parts[3] ? +parts[3] : 0;
					} else if (parts[0] === "F") {
						cell.qnum = -1;
						cell.qdir = 0;
						cell.qnum2 = -1;
						cell.ques = +parts[1];
						cell.qsub = parts[2] ? +parts[2] : 0;
					} else {
						cell.qnum = +parts[0];
						cell.ques = parts[1] ? +parts[1] : 0;
						cell.qsub = parts[2] ? +parts[2] : 0;
					}
				});
				this.decodeCross(function(cross, ca) {
					if (ca !== ".") {
						cross.qnum = +ca;
					}
				});
				this.normalizeLegacyFloorClues();
				this.decodeBorderArrowAns();
			},
			encodeData: function() {
				this.filever = 1;
				this.encodeInOut();
				this.encodeBorder(function(border) {
					if (border.ques === TL_BORDER_CLUES.COUNTRY) {
						return "1 ";
					}
					if (border.ques === TL_BORDER_CLUES.REQUIRED) {
						return "2 ";
					}
					if (border.ques === TL_BORDER_CLUES.BLOCK) {
						return "3 ";
					}
					return "0 ";
				});
				this.encodeCell(function(cell) {
					if (cell.qnum === 14) {
						return (
							"Y," +
							cell.qdir +
							"," +
							Math.max(cell.qnum2, 0) +
							"," +
							(cell.ques || 0) +
							"," +
							(cell.qsub || 0) +
							" "
						);
					}
					if (cell.qnum === 15) {
						return (
							"C," +
							cell.qdir +
							"," +
							Math.max(cell.qnum2, 0) +
							"," +
							(cell.ques || 0) +
							"," +
							(cell.qsub || 0) +
							" "
						);
					}
					if (cell.qnum === 16) {
						return (
							"O," +
							Math.max(cell.qnum2, 0) +
							"," +
							(cell.ques || 0) +
							"," +
							(cell.qsub || 0) +
							" "
						);
					}
					if (cell.qnum >= 0) {
						return cell.qnum + "," + (cell.ques || 0) + "," + (cell.qsub || 0) + " ";
					}
					return cell.ques || cell.qsub ? "F," + (cell.ques || 0) + "," + (cell.qsub || 0) + " " : ". ";
				});
				this.encodeCross(function(cross) {
					return cross.qnum !== -1 ? cross.qnum + " " : ". ";
				});
			this.encodeBorderArrowAns();
		},
		decodeInOut: function() {
			var bd = this.board;
			this.decodeEndpointState(bd.arrowin, this.readLine());
			this.decodeEndpointState(bd.arrowout, this.readLine());
		},
		encodeInOut: function() {
			var bd = this.board;
			this.writeLine(this.encodeEndpointState(bd.arrowin));
			this.writeLine(this.encodeEndpointState(bd.arrowout));
		},
		decodeEndpointState: function(address, line) {
			line = line || "0";
			if (line.charAt(0) === "C") {
				var parts = line.substr(2).split(",");
				var cell = this.board.cell[+parts[0]];
				if (cell) {
					address.set(cell, +parts[1] || cell.RT);
				}
				return;
			}
			address.setid(+line);
		},
		encodeEndpointState: function(address) {
			if (address.oncell()) {
				return "C:" + address.getc().id + "," + address.getdir();
			}
			return "" + address.getid();
		}
	},

	AnsCheck: {
		checklist: [
			"checkBranchLine",
			"checkCrossLine",
			"checkStartGoalDegree",
			"checkNoDeadendExceptSG",
			"checkOneLine",
			"checkTravelPath",
			"checkSlitherClues",
			"checkDivideRegions",
			"checkYajilinClues",
			"checkCwClues",
			"checkOrderClues",
			"checkNoLineOnBar",
			"checkIceStraight",
			"checkClockwiseFloors",
			"checkDotWhite",
			"checkDotBlack",
			"checkWhitePearl",
			"checkBlackPearl",
			"checkNoTouchTiles",
			"checkNoAdjTiles",
			"checkSloopCoverage",
			"checkRequiredLine",
			"checkCountryBorders"
		],

		checkStartGoalDegree: function() {
			var board = this.board;
			var start = board.arrowin.getb();
			var goal = board.arrowout.getb();
			var startCell = board.getStartCell();
			var goalCell = board.getGoalCell();
			if (
				(board.arrowin.oncell() && startCell.lcnt !== 1) ||
				(board.arrowin.onborder() && !start.isLine())
			) {
				this.failcode.add("tlNoStartLine");
				if (!this.checkOnly) {
					if (board.arrowin.oncell()) {
						startCell.seterr(1);
					} else {
						start.seterr(4);
					}
				}
				return;
			}
			if (
				(board.arrowout.oncell() && goalCell.lcnt !== 1) ||
				(board.arrowout.onborder() && !goal.isLine())
			) {
				this.failcode.add("tlNoGoalLine");
				if (!this.checkOnly) {
					if (board.arrowout.oncell()) {
						goalCell.seterr(1);
					} else {
						goal.seterr(4);
					}
				}
			}
		},

		checkNoDeadendExceptSG: function() {
			var startCell = this.board.arrowin.oncell() ? this.board.getStartCell() : null;
			var goalCell = this.board.arrowout.oncell() ? this.board.getGoalCell() : null;
			this.checkAllCell(function(cell) {
				return cell.lcnt === 1 && cell !== startCell && cell !== goalCell;
			}, "lnDeadEnd");
		},
		checkCrossLine: function() {
			this.checkAllCell(function(cell) {
				return cell.lcnt === 4 && !cell.isIce() && !cell.isCwFloor();
			}, "lnCross");
		},

		checkTravelPath: function() {
			var info = this.getTraceInfo();
			var goalCell = this.board.getGoalCell();
			var reachedGoal = this.board.arrowout.oncell()
				? info.lastcell === goalCell
				: info.lastborder === this.board.arrowout.getb();
			if (
				!reachedGoal ||
				info.blist.length !== info.totalLineCount
			) {
				this.failcode.add("tlBadRoute");
				if (!this.checkOnly) {
					this.board.border.setnoerr();
					info.blist.seterr(1);
				}
			}
		},
		checkSlitherClues: function() {
			var bd = this.board;
			for (var i = 0; i < bd.cross.length; i++) {
				var cross = bd.cross[i];
				if (!cross.isSlither()) {
					continue;
				}
				var count = 0;
				if (cross.relbd(-1, 0).isLine()) {
					count++;
				}
				if (cross.relbd(1, 0).isLine()) {
					count++;
				}
				if (cross.relbd(0, -1).isLine()) {
					count++;
				}
				if (cross.relbd(0, 1).isLine()) {
					count++;
				}
				if (count !== cross.qnum) {
					this.failcode.add("tlSlither");
					if (!this.checkOnly) {
						cross.seterr(1);
					}
					return;
				}
			}
		},
		checkDivideRegions: function() {
			var bd = this.board;
			var visited = {};
			for (var i = 0; i < bd.cross.length; i++) {
				var start = bd.cross[i];
				if (start.isnull || visited[start.id]) {
					continue;
				}
				var queue = [start];
				var region = [];
				var types = {};
				var typeCount = 0;
				visited[start.id] = true;

				var head = 0;
				while (head < queue.length) {
					var cross = queue[head++];
					region.push(cross);
					var divideType = cross.getDivideType();
					if (divideType > 0 && !types[divideType]) {
						types[divideType] = true;
						typeCount++;
					}
					this.addDivideRegionNeighbor(
						queue,
						visited,
						cross.relcross(-2, 0),
						cross.relbd(-1, 0)
					);
					this.addDivideRegionNeighbor(
						queue,
						visited,
						cross.relcross(2, 0),
						cross.relbd(1, 0)
					);
					this.addDivideRegionNeighbor(
						queue,
						visited,
						cross.relcross(0, -2),
						cross.relbd(0, -1)
					);
					this.addDivideRegionNeighbor(
						queue,
						visited,
						cross.relcross(0, 2),
						cross.relbd(0, 1)
					);
				}

				if (typeCount >= 2) {
					this.failcode.add("tlDivide");
					if (!this.checkOnly) {
						for (var r = 0; r < region.length; r++) {
							if (region[r].getDivideType() > 0) {
								region[r].seterr(1);
							}
						}
					}
					return;
				}
			}
		},
		addDivideRegionNeighbor: function(queue, visited, cross, border) {
			if (
				cross.isnull ||
				border.isnull ||
				border.isDivideSeparator() ||
				visited[cross.id]
			) {
				return;
			}
			visited[cross.id] = true;
			queue.push(cross);
		},
		checkYajilinClues: function() {
			var bd = this.board;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				if (!cell.isYajilin()) {
					continue;
				}
				var count = 0;
				var pos = cell.getaddr();
				while (true) {
					pos = pos.movedir(cell.qdir, 2);
					var next = pos.getc();
					if (next.isnull) {
						break;
					}
					if (!next.isBar() && next.lcnt === 0) {
						count++;
					}
				}
				if (count !== Math.max(cell.qnum2, 0)) {
					this.failcode.add("tlYajilin");
					if (!this.checkOnly) {
						cell.seterr(1);
					}
					return;
				}
			}
		},
		checkCwClues: function() {
			var bd = this.board;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				if (!cell.isCw()) {
					continue;
				}
				var count = 0;
				var pos = cell.getaddr();
				while (true) {
					var border = pos.reldirbd(cell.qdir, 1);
					if (border.isnull || !border.inside) {
						break;
					}
					if (border.isLine()) {
						count++;
					}
					pos = pos.movedir(cell.qdir, 2);
					if (pos.getc().isnull) {
						break;
					}
				}
				if (count !== Math.max(cell.qnum2, 0)) {
					this.failcode.add("tlCw");
					if (!this.checkOnly) {
						cell.seterr(1);
					}
					return;
				}
			}
		},
		checkOrderClues: function() {
			var bd = this.board;
			var required = {};
			var requiredCount = 0;
			for (var i = 0; i < bd.cell.length; i++) {
				var orderCell = bd.cell[i];
				if (orderCell.isOrder()) {
					required[orderCell.qnum2] = orderCell;
					requiredCount++;
				}
			}
			if (!requiredCount) {
				return;
			}

			var startBorder = bd.arrowin.getb();
			var prevBorder = bd.arrowin.onborder() ? startBorder : null;
			var cell = bd.getStartCell();
			var goalOnCell = bd.arrowout.oncell();
			var seen = {};
			var seenCount = 0;
			var last = -1;

			while (!cell.isnull && cell.lcnt > 0) {
				if (cell.isOrder()) {
					if (seen[cell.qnum2]) {
						this.failcode.add("tlOrder");
						if (!this.checkOnly) {
							cell.seterr(1);
						}
						return;
					}
					if (cell.qnum2 <= last) {
						this.failcode.add("tlOrder");
						if (!this.checkOnly) {
							cell.seterr(1);
						}
						return;
					}
					seen[cell.qnum2] = true;
					seenCount++;
					last = cell.qnum2;
				}

				var nextborder = this.getExitBorder(prevBorder, cell);
				if (!nextborder || (!goalOnCell && !nextborder.inside)) {
					break;
				}
				cell =
					nextborder.sidecell[0] === cell
						? nextborder.sidecell[1]
						: nextborder.sidecell[0];
				prevBorder = nextborder;
			}

			if (cell.isOrder()) {
				if (seen[cell.qnum2] || cell.qnum2 <= last) {
					this.failcode.add("tlOrder");
					if (!this.checkOnly) {
						cell.seterr(1);
					}
					return;
				}
				seen[cell.qnum2] = true;
				seenCount++;
			}

			if (seenCount !== requiredCount) {
				this.failcode.add("tlOrder");
				if (!this.checkOnly) {
					for (var key in required) {
						if (!seen[key]) {
							required[key].seterr(1);
						}
					}
				}
			}
		},

		getTraceInfo: function() {
			var board = this.board;
			var startBorder = board.arrowin.getb();
			var goalBorder = board.arrowout.getb();
			var goalOnCell = board.arrowout.oncell();
			var goalOnBorder = board.arrowout.onborder();
			var goalCell = goalOnCell ? board.getGoalCell() : board.emptycell;
			var prevBorder = board.arrowin.onborder() ? startBorder : null;
			var cell = board.getStartCell();
			var blist = new this.klass.BorderList();
			var lastborder = board.emptyborder;
			var lastcell = board.emptycell;
			var visitedBorders = {};
			var totalLineCount = 0;
			for (var i = 0; i < board.border.length; i++) {
				if (board.border[i].isLine()) {
					totalLineCount++;
				}
			}
			if (board.arrowin.onborder()) {
				blist.add(startBorder);
				visitedBorders[startBorder.id] = true;
				lastborder = startBorder;
			}

			while (!cell.isnull && cell.lcnt > 0) {
				lastcell = cell;
				var nextborder = this.getExitBorder(prevBorder, cell);
				if (!nextborder) {
					break;
				}
				if (visitedBorders[nextborder.id]) {
					break;
				}
				blist.add(nextborder);
				visitedBorders[nextborder.id] = true;
				lastborder = nextborder;
				if (
					(goalOnBorder && nextborder === goalBorder) ||
					(!goalOnCell && !nextborder.inside)
				) {
					break;
				}
				cell =
					nextborder.sidecell[0] === cell
						? nextborder.sidecell[1]
						: nextborder.sidecell[0];
				prevBorder = nextborder;
				if (
					cell.isnull ||
					((cell.lcnt !== 2 && cell.lcnt !== 4) &&
						!(goalOnCell && cell === goalCell && cell.lcnt === 1))
				) {
					break;
				}
			}

			return {
				lastcell: lastcell,
				lastborder: lastborder,
				blist: blist,
				totalLineCount: totalLineCount
			};
		},

		getExitBorder: function(prevBorder, cell) {
			var adb = cell.adjborder;
			if (prevBorder === null) {
				if (adb.top.isLine()) {
					return adb.top;
				}
				if (adb.bottom.isLine()) {
					return adb.bottom;
				}
				if (adb.left.isLine()) {
					return adb.left;
				}
				if (adb.right.isLine()) {
					return adb.right;
				}
				return null;
			}
			if (cell.lcnt === 4) {
				if (prevBorder === adb.top) {
					return adb.bottom.isLine() ? adb.bottom : null;
				}
				if (prevBorder === adb.bottom) {
					return adb.top.isLine() ? adb.top : null;
				}
				if (prevBorder === adb.left) {
					return adb.right.isLine() ? adb.right : null;
				}
				if (prevBorder === adb.right) {
					return adb.left.isLine() ? adb.left : null;
				}
				return null;
			}
			if (adb.top !== prevBorder && adb.top.isLine()) {
				return adb.top;
			}
			if (adb.bottom !== prevBorder && adb.bottom.isLine()) {
				return adb.bottom;
			}
			if (adb.left !== prevBorder && adb.left.isLine()) {
				return adb.left;
			}
			if (adb.right !== prevBorder && adb.right.isLine()) {
				return adb.right;
			}
			return null;
		},
		getTravelNeighborByBorder: function(border, cell) {
			if (!border || border.isnull || !cell || cell.isnull) {
				return null;
			}
			if (!border.inside) {
				return this.getOutsideNeighborAcrossBorder(border, cell);
			}
			if (border.sidecell[0] === cell) {
				return border.sidecell[1];
			}
			if (border.sidecell[1] === cell) {
				return border.sidecell[0];
			}
			return null;
		},
		getOutsideNeighborAcrossBorder: function(border, cell) {
			if (!border || border.isnull || border.inside || !cell || cell.isnull) {
				return null;
			}
			if (border.bx === cell.bx && Math.abs(border.by - cell.by) === 1) {
				return this.getVirtualNeighbor(cell, border.by < cell.by ? cell.UP : cell.DN);
			}
			if (border.by === cell.by && Math.abs(border.bx - cell.bx) === 1) {
				return this.getVirtualNeighbor(cell, border.bx < cell.bx ? cell.LT : cell.RT);
			}
			return null;
		},
		getVirtualNeighbor: function(cell, dir) {
			if (!cell || cell.isnull) {
				return null;
			}
			switch (dir) {
				case cell.UP:
					return { bx: cell.bx, by: cell.by - 2, isnull: false };
				case cell.DN:
					return { bx: cell.bx, by: cell.by + 2, isnull: false };
				case cell.LT:
					return { bx: cell.bx - 2, by: cell.by, isnull: false };
				case cell.RT:
					return { bx: cell.bx + 2, by: cell.by, isnull: false };
			}
			return null;
		},
		getOppositeTravelDir: function(dir) {
			var pos = this.board.emptycell;
			switch (dir) {
				case pos.UP:
					return pos.DN;
				case pos.DN:
					return pos.UP;
				case pos.LT:
					return pos.RT;
				case pos.RT:
					return pos.LT;
			}
			return pos.NDIR;
		},
		getEndpointOutsideNeighbor: function(address, type) {
			if (!address || !address.oncell || !address.oncell()) {
				return null;
			}
			var cell = address.getc();
			var dir = address.getdir();
			if (type === "in") {
				dir = this.getOppositeTravelDir(dir);
			}
			return this.getVirtualNeighbor(cell, dir);
		},
		getTravelPreviousNeighbor: function(prevBorder, cell, startCell, arrowin) {
			if (prevBorder !== null) {
				return this.getTravelNeighborByBorder(prevBorder, cell);
			}
			if (cell === startCell) {
				return this.getEndpointOutsideNeighbor(arrowin, "in");
			}
			return null;
		},
		getTravelNextNeighbor: function(nextBorder, cell, goalCell, arrowout) {
			if (nextBorder) {
				return this.getTravelNeighborByBorder(nextBorder, cell);
			}
			if (cell === goalCell) {
				return this.getEndpointOutsideNeighbor(arrowout, "out");
			}
			return null;
		},
		hasTravelNeighbors: function(prevObj, nextObj) {
			return !!(prevObj && !prevObj.isnull && nextObj && !nextObj.isnull);
		},
		isTravelStraightBetween: function(cell, prevObj, nextObj) {
			var dx1 = cell.bx - prevObj.bx;
			var dy1 = cell.by - prevObj.by;
			var dx2 = nextObj.bx - cell.bx;
			var dy2 = nextObj.by - cell.by;
			return dx1 === dx2 && dy1 === dy2;
		},
		isTravelClockwiseBetween: function(cell, prevObj, nextObj) {
			var dx1 = cell.bx - prevObj.bx;
			var dy1 = cell.by - prevObj.by;
			var dx2 = nextObj.bx - cell.bx;
			var dy2 = nextObj.by - cell.by;
			return dx1 * dy2 - dy1 * dx2 > 0;
		},
		forEachTravelPass: function(callback) {
			var bd = this.board;
			var startOnCell = bd.arrowin.oncell();
			var goalOnCell = bd.arrowout.oncell();
			var prevBorder = startOnCell ? null : bd.arrowin.getb();
			var startCell = bd.getStartCell();
			var goalCell = goalOnCell ? bd.getGoalCell() : bd.emptycell;
			var cell = startCell;

			while (!cell.isnull && cell.lcnt > 0) {
				var nextborder = this.getExitBorder(prevBorder, cell);
				var prevObj = this.getTravelPreviousNeighbor(
					prevBorder,
					cell,
					startCell,
					bd.arrowin
				);
				var nextObj = this.getTravelNextNeighbor(
					nextborder,
					cell,
					goalCell,
					bd.arrowout
				);
				if (callback.call(this, cell, prevObj, nextObj)) {
					return true;
				}
				if (!nextborder || !nextborder.inside || !nextObj || nextObj.isnull) {
					break;
				}
				cell = nextObj;
				prevBorder = nextborder;
			}
			return false;
		},

		checkNoLineOnBar: function() {
			this.checkAllCell(function(cell) {
				return cell.isBar() && !cell.board.isBarEndpointCell(cell) && cell.lcnt > 0;
			}, "tlBarLine");
		},
		checkIceStraight: function() {
			this.forEachTravelPass(function(cell, prevObj, nextObj) {
				if (
					cell.isIce() &&
					cell.lcnt > 0 &&
					cell.lcnt !== 4 &&
					this.hasTravelNeighbors(prevObj, nextObj) &&
					!this.isTravelStraightBetween(cell, prevObj, nextObj)
				) {
					this.failcode.add("tlIceTurn");
					if (!this.checkOnly) {
						cell.seterr(1);
					}
					return true;
				}
				return false;
			});
		},
		checkClockwiseFloors: function() {
			this.forEachTravelPass(function(cell, prevObj, nextObj) {
				if (
					cell.isCwFloor() &&
					cell.lcnt !== 4 &&
					this.hasTravelNeighbors(prevObj, nextObj) &&
					!this.isTravelStraightBetween(cell, prevObj, nextObj) &&
					!this.isTravelClockwiseBetween(cell, prevObj, nextObj)
				) {
					this.failcode.add("tlCwFloor");
					if (!this.checkOnly) {
						cell.seterr(1);
					}
					return true;
				}
				return false;
			});
		},
		checkDotWhite: function() {
			this.checkAllCell(function(cell) {
				return cell.isDotWhite() && (cell.lcnt !== 2 || !cell.isLineStraightTravel());
			}, "tlDotWhite");
		},
		checkDotBlack: function() {
			this.checkAllCell(function(cell) {
				return cell.isDotBlack() && (cell.lcnt !== 2 || !cell.isLineCurveTravel());
			}, "tlDotBlack");
		},
		checkWhitePearl: function() {
			this.checkAllCell(function(cell) {
				if (!cell.isWhitePearl()) {
					return false;
				}
				if (cell.lcnt !== 2 || !cell.isLineStraightTravel()) {
					return true;
				}
				if (cell.adjborder.top.isLine() && cell.adjborder.bottom.isLine()) {
					return !(
						cell.relcell(0, -2).isLineCurveTravel() ||
						cell.relcell(0, 2).isLineCurveTravel()
					);
				}
				return !(
					cell.relcell(-2, 0).isLineCurveTravel() ||
					cell.relcell(2, 0).isLineCurveTravel()
				);
			}, "tlWhitePearl");
		},
		checkBlackPearl: function() {
			this.checkAllCell(function(cell) {
				if (!cell.isBlackPearl()) {
					return false;
				}
				if (cell.lcnt !== 2 || !cell.isLineCurveTravel()) {
					return true;
				}
				var ok1 = false;
				var ok2 = false;
				if (cell.adjborder.top.isLine()) {
					ok1 = cell.relcell(0, -2).isLineStraightTravel();
				}
				if (cell.adjborder.bottom.isLine()) {
					if (ok1) {
						ok2 = cell.relcell(0, 2).isLineStraightTravel();
					} else {
						ok1 = cell.relcell(0, 2).isLineStraightTravel();
					}
				}
				if (cell.adjborder.left.isLine()) {
					if (ok1) {
						ok2 = cell.relcell(-2, 0).isLineStraightTravel();
					} else {
						ok1 = cell.relcell(-2, 0).isLineStraightTravel();
					}
				}
				if (cell.adjborder.right.isLine()) {
					if (ok1) {
						ok2 = cell.relcell(2, 0).isLineStraightTravel();
					} else {
						ok1 = cell.relcell(2, 0).isLineStraightTravel();
					}
				}
				return !(ok1 && ok2);
			}, "tlBlackPearl");
		},
		checkNoTouchTiles: function() {
			var bd = this.board;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				if (!cell.isNoTouch() || cell.lcnt === 0) {
					continue;
				}
				var right = cell.relcell(2, 0);
				var down = cell.relcell(0, 2);
				if (
					!right.isnull &&
					right.isNoTouch() &&
					right.lcnt > 0 &&
					!cell.adjborder.right.isLine()
				) {
					this.failcode.add("tlNoTouch");
					if (!this.checkOnly) {
						cell.seterr(1);
						right.seterr(1);
					}
					return;
				}
				if (
					!down.isnull &&
					down.isNoTouch() &&
					down.lcnt > 0 &&
					!cell.adjborder.bottom.isLine()
				) {
					this.failcode.add("tlNoTouch");
					if (!this.checkOnly) {
						cell.seterr(1);
						down.seterr(1);
					}
					return;
				}
			}
		},
		checkNoAdjTiles: function() {
			var bd = this.board;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i];
				if (!cell.isNoAdj() || cell.lcnt !== 0) {
					continue;
				}
				var right = cell.relcell(2, 0);
				var down = cell.relcell(0, 2);
				if (!right.isnull && right.isNoAdj() && right.lcnt === 0) {
					this.failcode.add("tlNoAdj");
					if (!this.checkOnly) {
						cell.seterr(1);
						right.seterr(1);
					}
					return;
				}
				if (!down.isnull && down.isNoAdj() && down.lcnt === 0) {
					this.failcode.add("tlNoAdj");
					if (!this.checkOnly) {
						cell.seterr(1);
						down.seterr(1);
					}
					return;
				}
			}
		},
		checkSloopCoverage: function() {
			this.checkAllCell(function(cell) {
				return cell.isSloop() && cell.lcnt === 0;
			}, "tlSloop");
		},
		checkRequiredLine: function() {
			var bd = this.board;
			for (var i = 0; i < bd.border.length; i++) {
				var border = bd.border[i];
				if (border.inside && border.isRequiredLine() && !border.isLine()) {
					this.failcode.add("tlReqLine");
					if (!this.checkOnly) {
						border.seterr(1);
					}
					return;
				}
			}
		},
		checkCountryBorders: function() {
			var bd = this.board;
			for (var i = 0; i < bd.border.length; i++) {
				var border = bd.border[i];
				if (!border.inside || !border.isCountryBorder()) {
					continue;
				}
				var c1 = border.sidecell[0];
				var c2 = border.sidecell[1];
				if ((c1.isnull || c1.lcnt === 0) && (c2.isnull || c2.lcnt === 0)) {
					this.failcode.add("tlCountry");
					if (!this.checkOnly) {
						border.seterr(1);
						if (!c1.isnull) {
							c1.seterr(1);
						}
						if (!c2.isnull) {
							c2.seterr(1);
						}
					}
					return;
				}
			}
		}
	},

	FailCode: {
		tlNoStartLine: ["入口セルから線が始まっていません。", "The path does not start from the IN cell."],
		tlNoGoalLine: ["出口セルまで線が届いていません。", "The path does not reach the OUT cell."],
		tlBadRoute: ["線が入口セルから出口セルまで一続きになっていません。", "The path does not connect the IN cell to the OUT cell."],
		tlBarLine: ["黒マスを線が通っています。", "A Bar clue cell is crossed by the path."],
		tlIceTurn: ["アイスのマスで線が曲がっています。", "The path turns on an Ice clue cell."],
		tlCwFloor: ["Clockwise floor のマスでは右折しかできません。", "A Clockwise floor cell only allows right turns."],
		tlDotWhite: ["白ダイヤのマスは直進しなければなりません。", "A white dot clue cell must be passed straight."],
		tlDotBlack: ["黒ダイヤのマスは曲がらなければなりません。", "A black dot clue cell must turn."],
		tlWhitePearl: ["白丸の条件を満たしていません。", "A white pearl condition is violated."],
		tlBlackPearl: ["黒丸の条件を満たしていません。", "A black pearl condition is violated."],
		tlNoTouch: ["Notouch のマス同士が不正に接しています。", "Touched Notouch clue cells are not directly connected."],
		tlNoAdj: ["Noadj の未訪問マスが隣接しています。", "Unvisited Noadj clue cells are adjacent."],
		tlSloop: ["Sloop のマスが未訪問です。", "A Sloop clue cell is not visited."],
		tlSlither: ["Slither の数字条件を満たしていません。", "A Slither clue count is violated."],
		tlDivide: ["同じ Divide 領域に複数タイプがあります。", "A Divide region contains multiple Divide types."],
		tlYajilin: ["Yajilin の矢印数字条件を満たしていません。", "A Yajilin clue count is violated."],
		tlCw: [
			"Castle wall の矢印数字条件を満たしていません。",
			"A Castle wall clue count is violated."
		],
		tlOrder: ["Order の文字順条件を満たしていません。", "An Order clue sequence is violated."],
		tlReqLine: ["Required line が通っていません。", "A required line edge is not used."],
		tlCountry: ["Country の境界の両側が未訪問です。", "Neither side of a Country border is visited."]
	}
});
