export interface ExcelSettings {
	folder: string;
	excelFilenamePrefix: string,
	excelFilenameDateTime: string,
	sheetHeight: string,
	rowHeight: string,
	colWidth: string,
	theme: string,
	showSheetButton: string,
	defaultRowsLen: string,
	defaultColsLen: string,
}

export const DEFAULT_SETTINGS: ExcelSettings = {
	folder: "/",
	excelFilenamePrefix: "Excel ",
	excelFilenameDateTime: "YYYY-MM-DD HH.mm.ss",
	sheetHeight: "300",
	rowHeight: "25",
	colWidth: "100",
	theme: "light",
	showSheetButton: "true",
	defaultRowsLen: "100",
	defaultColsLen: "26",
};
