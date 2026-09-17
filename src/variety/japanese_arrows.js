// Japanese Arrows
// Fill every unnumbered cell. The number and arrow in a cell indicate the
// number of distinct values visible in that direction, excluding the cell.
// Gray-dotted arrows point along diagonally touching cells.
(function(pidlist, classbase) {
	if (typeof module === "object" && module.exports) {
		module.exports = [pidlist, classbase];
	} else {
		pzpr.classmgr.makeCustom(pidlist, classbase);
	}
})(["japanese_arrows"], {
	MouseEvent: {
		inputModes: { edit: ["number", "direc", "clear"], play: ["number", "clear"] },
		inputdirec: function() {
			var pos = this.getpos(0);
			if (this.prevPos.equals(pos)) {
				return;
			}
			var cell = this.prevPos.getc();
			if (!cell.isnull) {
				var dx = pos.bx - this.prevPos.bx;
				var dy = pos.by - this.prevPos.by;
				var dir = this.prevPos.getdir(pos, 2);
				if (Math.abs(dx) === 2 && Math.abs(dy) === 2) {
					dir = dy < 0 ? (dx < 0 ? 5 : 6) : (dx < 0 ? 7 : 8);
				}
				if (dir !== cell.NDIR) {
					cell.setQdir(cell.qdir !== dir ? dir : 0);
					cell.draw();
				}
			}
			this.prevPos = pos;
		},
		mouseinputAutoEdit: function() {
			if (this.mousestart || this.mousemove) {
				this.inputdirec();
			} else if (this.mouseend && this.notInputted()) {
				this.inputqnum();
			}
		},
		mouseinputAutoPlay: function() {
			if (this.mousestart) {
				this.inputqnum();
			}
		}
	},
	KeyEvent: {
		enablemake: true,
		enableplay: true,
		moveTarget: function(ca) { return ca.match(/shift/) ? false : this.moveTCell(ca); },
		key_inputdirec_japanese: function(ca) {
			var cell = this.cursor.getc();
			if (cell.isnull) { return false; }
			var dir = cell.NDIR;
			switch (ca) {
				case "shift+up": dir = cell.UP; break;
				case "shift+down": dir = cell.DN; break;
				case "shift+left": dir = cell.LT; break;
				case "shift+right": dir = cell.RT; break;
				case "shift+7": dir = 5; break;
				case "shift+9": dir = 6; break;
				case "shift+1": dir = 7; break;
				case "shift+3": dir = 8; break;
			}
			if (dir === cell.NDIR) { return false; }
			cell.setQdir(cell.qdir !== dir ? dir : 0);
			cell.draw();
			return true;
		},
		keyinput: function(ca) {
			if (this.puzzle.editmode && this.key_inputdirec_japanese(ca)) {return;}
			this.key_inputqnum(ca);
		}
	},
	Cell: {
		minnum: 1,
		maxnum: function() {
			return Math.max(1, Math.max(this.board.cols, this.board.rows) - 1);
		},
		disInputHatena: true,
		getNum: function() {
			return this.anum !== -1 ? this.anum : this.qnum;
		},
		setNum: function(val) {
			if (this.puzzle.editmode) {
				if (val >= this.getminnum() && val <= this.getmaxnum()) {
					this.setQnum(val);
				} else if (val < 0) {
					this.setQnum(-1);
				}
				this.setAnum(-1);
			} else if (this.qnum < 0) {
				if (val >= this.getminnum() && val <= this.getmaxnum()) {
					this.setAnum(val);
				} else if (val < 0) {
					this.setAnum(-1);
				}
			}
		},
		isValidNum: function() {
			var num = this.getNum();
			return !this.isnull && num >= this.getminnum() && num <= this.getmaxnum();
		},
		noNum: function() {
			return !this.isnull && !this.isValidNum();
		}
	},
	BoardExec: {
		adjustBoardData: function(key, d) {
			this.adjustNumberArrow(key, d);
			if (!(key & this.TURNFLIP)) { return; }
			var trans = {};
			if (key === this.FLIPY) { trans = { 5: 7, 6: 8, 7: 5, 8: 6 }; }
			if (key === this.FLIPX) { trans = { 5: 6, 6: 5, 7: 8, 8: 7 }; }
			if (key === this.TURNR) { trans = { 5: 6, 6: 8, 8: 7, 7: 5 }; }
			if (key === this.TURNL) { trans = { 5: 7, 7: 8, 8: 6, 6: 5 }; }
			var clist = this.board.cellinside(d.x1, d.y1, d.x2, d.y2);
			for (var i = 0; i < clist.length; i++) {
				if (trans[clist[i].qdir]) { clist[i].qdir = trans[clist[i].qdir]; }
			}
		}
	},
	Graphic: {
		qanscolor: "#000000",
		numbercolor_func: "qnum",
		/*
		 * Japanese Arrows always puts the arrow on the left and the number on
		 * the right of a cell.  drawCellArrows/drawArrowNumbers use the generic
		 * pzpr layout (which places vertical arrows above or below a number),
		 * so drawing the complete cell here keeps the printed puzzle's layout
		 * for both clue and answer numbers.
		 */
		drawJapaneseArrows: function() {
			var g = this.context;
			this.vinc("japanese_arrow", "auto", true);
			var clist = this.range.cells;
			var unit = Math.min(this.cw, this.ch);
			var length = unit * 0.62;
			var shaft = Math.max(unit * 0.24, 2);
			var head = unit * 0.46;
			var headLength = unit * 0.25;
			for (var i = 0; i < clist.length; i++) {
				var cell = clist[i], dir = cell.qdir;
				var px = cell.bx * this.bw, py = cell.by * this.bh;
				var text = cell.qnum >= 0
					? this.getNumberText(cell, cell.qnum)
					: this.getNumberText(cell, cell.anum);

				g.vid = "ja_arrow_" + cell.id;
				if (dir < 1 || dir > 8) {
					g.vhide();
				} else {
					var vectors = {
						1: [0, -1], 2: [0, 1], 3: [-1, 0], 4: [1, 0],
						5: [-1, -1], 6: [1, -1], 7: [-1, 1], 8: [1, 1]
					};
					var v = vectors[dir], norm = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
					var ux = v[0] / norm, uy = v[1] / norm;
					var vx = -uy, vy = ux;
					var cx = px - this.cw * 0.18, cy = py;
					var tx = cx - ux * length * 0.5, ty = cy - uy * length * 0.5;
					var bx = cx + ux * (length * 0.5 - headLength);
					var by = cy + uy * (length * 0.5 - headLength);
					var tipx = cx + ux * length * 0.5, tipy = cy + uy * length * 0.5;
					g.fillStyle = this.qanscolor;
					g.beginPath();
					g.moveTo(tx + vx * shaft * 0.5, ty + vy * shaft * 0.5);
					g.lineTo(bx + vx * shaft * 0.5, by + vy * shaft * 0.5);
					g.lineTo(bx + vx * head * 0.5, by + vy * head * 0.5);
					g.lineTo(tipx, tipy);
					g.lineTo(bx - vx * head * 0.5, by - vy * head * 0.5);
					g.lineTo(bx - vx * shaft * 0.5, by - vy * shaft * 0.5);
					g.lineTo(tx - vx * shaft * 0.5, ty - vy * shaft * 0.5);
					g.closePath();
					g.fill();
				}

				g.vid = "ja_dot_" + cell.id;
				if (dir >= 5 && dir <= 8) {
					g.fillStyle = "#999999";
					g.fillCircle(px - this.cw * 0.18, py, unit * 0.09);
				} else {
					g.vhide();
				}

				g.vid = "ja_number_" + cell.id;
				if (text) {
					g.fillStyle = cell.qnum >= 0
						? this.getQuesNumberColor(cell)
						: this.getAnsNumberColor(cell);
					var numberX = dir >= 1 && dir <= 8 ? px + this.cw * 0.25 : px;
					this.disptext(text, numberX, py, { ratio: 0.7 });
				} else {
					g.vhide();
				}
			}
		},
		paint: function() {
			this.drawBGCells();
			this.drawGrid();
			this.drawJapaneseArrows();
			this.drawTarget();
		}
	},
	Encode: {
		decodePzpr: function() {
			this.decodeArrowNumber16();
			this.board.cell.each(function(cell) {
				if (cell.qnum === 4095 && cell.qdir >= 1 && cell.qdir <= 8) {
					cell.qnum = -1;
				}
			});
		},
		encodePzpr: function() {
			var bd = this.board, out = "", skipped = 0;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i], dir = cell.qdir || 0, num = cell.qnum;
				var encoded = "";
				if (dir >= 1 && dir <= 8 && num === -1) {
					encoded = "-" + dir.toString(16) + "fff";
				} else if (dir >= 5 && dir <= 8 && num >= 0) {
					encoded = "-" + dir.toString(16) + num.toString(16).padStart(3, "0");
				} else if (num === -3) {
					encoded = "+";
				} else if (num === -2) {
					encoded = dir.toString(16) + ".";
				} else if (num >= 0 && num < 16 && dir >= 0 && dir <= 4) {
					encoded = dir.toString(16) + num.toString(16);
				} else if (num >= 16 && num < 256 && dir >= 0 && dir <= 4) {
					encoded = (dir + 5).toString(16) + num.toString(16).padStart(2, "0");
				} else if (num >= 256 && num < 4096 && dir >= 0 && dir <= 9) {
					encoded = "-" + dir.toString(16) + num.toString(16).padStart(3, "0");
				}
				if (!encoded) {
					skipped++;
					continue;
				}
				while (skipped > 0) {
					var run = Math.min(skipped, 26);
					out += String.fromCharCode(96 + run);
					skipped -= run;
				}
				out += encoded;
			}
			while (skipped > 0) {
				var run = Math.min(skipped, 26);
				out += String.fromCharCode(96 + run);
				skipped -= run;
			}
			this.outbstr += out;
		}
	},
	FileIO: {
		decodeData: function() {
			this.decodeCell(function(cell, ca) {
				if (ca === ".") { return; }
				var values = ca.split(",");
				cell.qdir = +values[0] || 0;
				cell.qnum = values[1] === "*" ? -1 : +values[1];
			});
			this.decodeCellAns();
		},
		encodeData: function() {
			this.encodeCell(function(cell) {
				if (!cell.qdir && cell.qnum < 0) { return ". "; }
				return cell.qdir + "," + (cell.qnum < 0 ? "*" : cell.qnum) + " ";
			});
			this.encodeCellAns();
		}
	},
	AnsCheck: {
		checklist: ["checkNoNumCell+", "checkArrowNumber"],
		checkArrowNumber: function() {
			var bd = this.board;
			for (var i = 0; i < bd.cell.length; i++) {
				var cell = bd.cell[i], val = cell.getNum();
				if (!cell.qdir || val < 1) {continue;}
				var pos = cell.getaddr(), seen = {}, list = [], dir = cell.qdir;
				while (1) {
					if (dir <= 4) {
						pos.movedir(dir, 2);
					} else {
						var dx = dir === 5 || dir === 7 ? -2 : 2;
						var dy = dir === 5 || dir === 6 ? -2 : 2;
						pos.move(dx, dy);
					}
					var c2 = pos.getc();
					if (c2.isnull) {break;}
					var n = c2.getNum();
					if (n < 1) { list = null; break; }
					if (!seen[n]) { seen[n] = true; list.push(n); }
				}
				if (list && list.length !== val) {
					this.failcode.add("anNumberNe");
					if (this.checkOnly) {break;}
					cell.seterr(1);
				}
			}
		}
	}
});
