/* echo.js */

ui.debug.addDebugData("echo", {
	url: "5/5/g1012030340i1202012010g1012020120i3403012010g",
	failcheck: [
		[
			"brNoShade",
			"pzprv3/echo/5/5/. 1 1,2 3 3,4 /. . . 1,2 2 /1,2 1 . 1 1,2 /2 1,2 . . . /3,4 3 1,2 1 . /"
		],
		[
			"cs2x2",
			"pzprv3/echo/5/5/1 . . . . /. . # # + /. . # # + /+ + + + + /+ + + + + /"
		],
		[
			"csDivide",
			"pzprv3/echo/5/5/# 1 1,2 3 3,4 /# # # 1,2 2 /1,2 1 # 1 1,2 /2 1,2 + # # /3,4 3 1,2 1 # /"
		],
		[
			"ceEchoNe",
			"pzprv3/echo/5/5/+ 1 1,2 3 3,4 /# # # 1,2 2 /1,2 1 # 1 1,2 /2 1,2 # # # /3,4 3 1,2 1 # /"
		],
		[
			null,
			"pzprv3/echo/5/5/# 1 1,2 3 3,4 /# # # 1,2 2 /1,2 1 # 1 1,2 /2 1,2 # # # /3,4 3 1,2 1 # /"
		]
	],
	inputs: [
		/* 問題入力テスト */
		{ input: ["editmode", "newboard,5,1"] },
		{
			input: [
				"cursor,1,1",
				"key,2",
				"key,right",
				"key,3",
				"key,right",
				"key,-",
				"key,right",
				"key,2",
				"key,3",
				"key,right",
				"key,2"
			],
			result: "pzprv3/echo/1/5/2 3 - 2,3 2 /"
		},
		/* 複数の?は"-"キーを連打して入力する */
		{ input: ["editmode", "newboard,5,1"] },
		{
			input: ["cursor,1,1", "key,-", "key,-", "key,-", "key,-"],
			result: "pzprv3/echo/1/5/-,-,-,- . . . . /"
		},
		{
			input: ["cursor,1,1", "key,BS"],
			result: "pzprv3/echo/1/5/-,-,- . . . . /"
		},
		{
			input: ["editmode,clear", "mouse,left,1,1,9,1"],
			result: "pzprv3/echo/1/5/. . . . . /"
		},
		/* 回答入力テスト */
		{
			input: ["ansclear", "playmode", "mouse,left, 1,1, 9,1"],
			result: "pzprv3/echo/1/5/# # # # # /"
		}
	]
});
