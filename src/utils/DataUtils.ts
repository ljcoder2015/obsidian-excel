import { Notice } from "obsidian";
import { t } from "../lang/helpers"
/**
 * 获取 sheet 数据
 * @param data markdown 文件原始data
 * @returns 去掉头部数据的 sheet data
 */
export const getExcelData = (data: string): string => {
	const tagText = "# Excel\n";
	const trimLocation = data.search(tagText);
	if (trimLocation == -1) return data;
	const excelData = data.substring(
		trimLocation + tagText.length,
		data.length
	);
	// console.log("trimLocation", trimLocation, excelData, this.data);
	return excelData;
};

/**
 * 获取指定 sheet 中指定 cells 的数据
 * @param data markdown 文件原始data
 * @param sheet sheet 名称
 * @param cells 选中的cells 格式为: sri-sci:eri-eci 例如 6-6:7-8
 * @returns
 */
export const getExcelAreaData = (
	data: string,
	sheet: string,
	cells: string
): string => {
	const excelData = getExcelData(data) || "{}";
	const jsonData = JSON.parse(excelData) || [];

	var sri: number | null = null;
	var sci: number | null = null;
	var eri: number | null = null;
	var eci: number | null = null;

	var cellArray = cells.split(":");
	const start = cellArray[0].split("-");
	sri = parseInt(start[0]); // 开始行
	sci = parseInt(start[1]); // 开始列

	const end = cellArray[1].split("-");
	eri = parseInt(end[0]); // 结束行
	eci = parseInt(end[1]); // 结束列

	var newData = new Map<string, any>();
	newData.set("name", sheet);
	newData.set("autofilter", {});
	newData.set("freeze", "A1");
	newData.set("styles", [{ "0": { bgcolor: "#fe0000" } }]);
	newData.set("validations", []);

	if (jsonData instanceof Array) {
		const sheetData = jsonData.filter((item) => {
			return item.name === sheet;
		})[0];
		var rowLen = eri - sri + 1;
		if (sheetData) {
			// 用来存储新数据
			var rows = new Map<string, any>();
			// 解析 row，并重 0 开始排数据
			for (var row = 0; row <= eri - sri; row++) {
				// 获取原始 row 的数据
				const rowsData = sheetData.rows[`${row + sri}`];
				console.log("getExcelAreaData", sheetData, rowsData, row + eri);
				var newCells = new Map<string, any>();
				if (rowsData) {
					var cellsData = new Map<string, any>();
					// 设置列，从 0 开始重排数据
					for (var col = 0; col <= eci - sci; col++) {
						// 获取原始 当前 [row, col] 的数据
						const cell = rowsData.cells[`${col + sci}`];
						if (cell) {
							cellsData.set(`${col}`, cell);
							// 是否有合并单元格的数据
							if (row == eri - sri && cell.merge) {
								rowLen = Math.max(
									rowLen,
									eri - sri + 1 + cell.merge[0]
								);
								// console.log(rowLen);
							}
						}
					}
					newCells.set("cells", Object.fromEntries(cellsData));
				}
				rows.set(`${row}`, Object.fromEntries(newCells));
			}
			// const rowLen = Math.max(9, eri - sri + 1)

			console.log("rows", sheetData, rows);
			rows.set("len", rowLen);
			newData.set("rows", Object.fromEntries(rows));
			// const colLen = Math.max(Math.ceil(clientWidth / 91), eci - sci + 1)
			const colLen = eci - sci + 1;
			newData.set("cols", { len: colLen });
		} else {
			new Notice(t("PLEASE_SELECT_DATA"));
		}
	}

	const newJsonData = JSON.stringify(Object.fromEntries(newData));
	// console.log("newData", Object.fromEntries(newData))
	return newJsonData;
};
