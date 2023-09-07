import {
	MarkdownPostProcessorContext,
	MetadataCache,
	TFile,
	Vault,
} from "obsidian";
import ExcelPlugin from "./main";
import Spreadsheet from "x-data-spreadsheet";
import { getExcelData, getExcelAreaData } from "./utils/DataUtils";

let plugin: ExcelPlugin;
let vault: Vault;
let metadataCache: MetadataCache;

export const initializeMarkdownPostProcessor = (p: ExcelPlugin) => {
	plugin = p;
	vault = p.app.vault;
	metadataCache = p.app.metadataCache;
};

// 编辑模式
const tmpObsidianWYSIWYG = async (
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
) => {
	const file = plugin.app.vault.getAbstractFileByPath(ctx.sourcePath);
	console.log("tmpObsidianWYSIWYG");
	if (!(file instanceof TFile)) return;
	if (!plugin.isExcelFile(file)) return;

	//@ts-ignore
	if (ctx.remainingNestLevel < 4) {
		return;
	}

	//internal-embed: Excalidraw is embedded into a markdown document
	//markdown-reading-view: we are processing the markdown reading view of an actual Excalidraw file
	//markdown-embed: we are processing the hover preview of a markdown file
	//alt, width, and height attributes of .internal-embed to size and style the image

	//@ts-ignore
	const containerEl = ctx.containerEl;
	let internalEmbedDiv: HTMLElement = containerEl;
	while (
		!internalEmbedDiv.hasClass("dataview") &&
		!internalEmbedDiv.hasClass("cm-preview-code-block") &&
		!internalEmbedDiv.hasClass("cm-embed-block") &&
		!internalEmbedDiv.hasClass("internal-embed") &&
		!internalEmbedDiv.hasClass("markdown-reading-view") &&
		!internalEmbedDiv.hasClass("markdown-embed") &&
		internalEmbedDiv.parentElement
	) {
		internalEmbedDiv = internalEmbedDiv.parentElement;
	}

	if (
		internalEmbedDiv.hasClass("dataview") ||
		internalEmbedDiv.hasClass("cm-preview-code-block") ||
		internalEmbedDiv.hasClass("cm-embed-block")
	) {
		return; //https://github.com/zsviczian/obsidian-excalidraw-plugin/issues/835
	}

	const markdownEmbed = internalEmbedDiv.hasClass("markdown-embed");
	const markdownReadingView = internalEmbedDiv.hasClass(
		"markdown-reading-view"
	);
	if (
		!internalEmbedDiv.hasClass("internal-embed") &&
		(markdownEmbed || markdownReadingView)
	) {
		//We are processing the markdown preview of an actual Excalidraw file
		//the excalidraw file in markdown preview mode
		const isFrontmatterDiv = Boolean(el.querySelector(".frontmatter"));
		el.empty();
		if (!isFrontmatterDiv) {
			if (el.parentElement === containerEl) containerEl.removeChild(el);
			return;
		}
		internalEmbedDiv.empty();

		const data = await vault.read(file);
		const src = internalEmbedDiv.getAttribute("src") ?? "";
		const alt = internalEmbedDiv.getAttribute("alt") ?? "";
		const split = src.split("#");
		var excelData = getExcelData(data);
		if (split.length > 1) {
			excelData = getExcelAreaData(
				data,
				split[1],
				alt
			);
		}

		const sheetDiv = createSheetEl(excelData, internalEmbedDiv.clientWidth);
		if (markdownEmbed) {
			//display image on canvas without markdown frame
			internalEmbedDiv.removeClass("markdown-embed");
			internalEmbedDiv.removeClass("inline-embed");
		}
		internalEmbedDiv.appendChild(sheetDiv);
		// console.log('internalEmbedDiv', internalEmbedDiv, markdownEmbed)
	}

	el.empty();

	if (internalEmbedDiv.hasAttribute("ready")) {
		return;
	}
	internalEmbedDiv.setAttribute("ready", "");

	internalEmbedDiv.empty();

	const data = await vault.read(file);
	const src = internalEmbedDiv.getAttribute("src") ?? "";
	const alt = internalEmbedDiv.getAttribute("alt") ?? "";
	const split = src.split("#");
	var excelData = getExcelData(data);
	if (split.length > 1) {
		excelData = getExcelAreaData(
			data,
			split[1],
			alt
		);
	}

	// console.log('internalEmbedDiv', excelData, src, alt)
	const sheetDiv = createSheetEl(excelData, internalEmbedDiv.clientWidth);
	if (markdownEmbed) {
		//display image on canvas without markdown frame
		internalEmbedDiv.removeClass("markdown-embed");
		internalEmbedDiv.removeClass("inline-embed");
	}
	internalEmbedDiv.appendChild(sheetDiv);
};

const createSheetEl = (data: string, width: number): HTMLDivElement => {
	const sheetEle = createDiv({
		cls: "sheet-iframe",
		attr: {
			id: `x-spreadsheet-${new Date().getTime()}`,
		},
	});

	const jsonData = JSON.parse(data || "{}") || {};
	// console.log("createSheetEl", jsonData, data)
	//@ts-ignore
	const sheet = new Spreadsheet(sheetEle, {
		mode: "read",
		showToolbar: false,
		showBottomBar: true,
		view: {
			height: () => 300,
			width: () => width,
		},
	}).loadData(jsonData); // load data

	// @ts-ignore
	sheet.validate();
	return sheetEle;
};

/**
 *
 * @param el
 * @param ctx
 */
export const markdownPostProcessor = async (
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
) => {
	//check to see if we are rendering in editing mode or live preview
	//if yes, then there should be no .internal-embed containers
	const embeddedItems = el.querySelectorAll(".internal-embed");
	// console.log("markdownPostProcessor", embeddedItems.length);
	if (embeddedItems.length === 0) {
		tmpObsidianWYSIWYG(el, ctx);
		return;
	}

	await processReadingMode(embeddedItems, ctx);
};

const processReadingMode = async (
	embeddedItems: NodeListOf<Element> | [HTMLElement],
	ctx: MarkdownPostProcessorContext
) => {
	// console.log("processReadingMode");
	//We are processing a non-excalidraw file in reading mode
	//Embedded files will be displayed in an .internal-embed container

	//Iterating all the containers in the file to check which one is an excalidraw drawing
	//This is a for loop instead of embeddedItems.forEach() because processInternalEmbed at the end
	//is awaited, otherwise excalidraw images would not display in the Kanban plugin
	embeddedItems.forEach(async (maybeDrawing, index) => {
		//check to see if the file in the src attribute exists
		console.log(maybeDrawing);
		const fname = maybeDrawing.getAttribute("src")?.split("#")[0];
		if (!fname) return true;

		const file = metadataCache.getFirstLinkpathDest(fname, ctx.sourcePath);
		// console.log("forEach", file, ctx.sourcePath);

		//if the embeddedFile exits and it is an Excalidraw file
		//then lets replace the .internal-embed with the generated PNG or SVG image
		if (file && file instanceof TFile && plugin.isExcelFile(file)) {
			maybeDrawing.parentElement?.replaceChild(
				await processInternalEmbed(maybeDrawing, file),
				maybeDrawing
			);
		}
	});
};

const processInternalEmbed = async (
	internalEmbedEl: Element,
	file: TFile
): Promise<HTMLDivElement> => {
	const src = internalEmbedEl.getAttribute("src");
	//@ts-ignore
	if (!src) return;

	//https://github.com/zsviczian/obsidian-excalidraw-plugin/issues/1059
	internalEmbedEl.removeClass("markdown-embed");
	internalEmbedEl.removeClass("inline-embed");

	const data = await vault.read(file);

	const alt = internalEmbedEl.getAttribute("alt") ?? "";
	const split = src.split("#");
	var excelData = getExcelData(data);
	if (split.length > 1) {
		excelData = getExcelAreaData(
			data,
			split[1],
			alt
		);
	}

	return await createSheetEl(excelData, internalEmbedEl.clientWidth);
};
