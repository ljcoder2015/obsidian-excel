export interface ExcelSettings {
	folder: string;
	excelFilenamePrefix: string,
	excelFilenameDateTime: string,
	sheetHeight: string,
	rowHeight: string,
	colWidth: string,
	theme: string
}

export const DEFAULT_SETTINGS: ExcelSettings = {
	folder: "/",
	excelFilenamePrefix: "Excel ",
	excelFilenameDateTime: "YYYY-MM-DD HH.mm.ss",
	sheetHeight: "300",
	rowHeight: "25",
	colWidth: "100",
	theme: "light"
};
