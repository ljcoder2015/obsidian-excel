export interface ExcelSettings {
	folder: string;
	excelFilenamePrefix: String,
	excelEmbedPrefixWithFilename: true,
	excelFilnameEmbedPostfix: String,
	excelFilenameDateTime: String,
}

export const DEFAULT_SETTINGS: ExcelSettings = {
	folder: "Excel",
	excelFilenamePrefix: "Excel ",
	excelEmbedPrefixWithFilename: true,
	excelFilnameEmbedPostfix: " ",
	excelFilenameDateTime: "YYYY-MM-DD HH.mm.ss",
};
