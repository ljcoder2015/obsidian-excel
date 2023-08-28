export interface ExcelSettings {
	folder: string;
	excelFilenamePrefix: string,
	excelEmbedPrefixWithFilename: true,
	excelFilnameEmbedPostfix: string,
	excelFilenameDateTime: string,
}

export const DEFAULT_SETTINGS: ExcelSettings = {
	folder: "Excel",
	excelFilenamePrefix: "Excel ",
	excelEmbedPrefixWithFilename: true,
	excelFilnameEmbedPostfix: " ",
	excelFilenameDateTime: "YYYY-MM-DD HH.mm.ss",
};
