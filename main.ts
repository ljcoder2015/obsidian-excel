import {
	TFile,
	Plugin,
	WorkspaceLeaf,
	normalizePath,
	MenuItem,
	Menu,
} from "obsidian";
import { ExcelSettings, DEFAULT_SETTINGS } from "./src/utils/Settings";
import {
	emulateCTRLClickForLinks,
	linkClickModifierType,
	PaneTarget,
} from "./src/utils/ModifierkeyHelper";
import { ExcelView, VIEW_TYPE_EXCEL } from "./src/ExcelView";
import {
	checkAndCreateFolder,
	getNewUniqueFilepath,
	getExcelFilename,
} from "./src/utils/FileUtils";

import {
	initializeMarkdownPostProcessor,
	markdownPostProcessor,
} from "./src/MarkdownPostProcessor";

declare const PLUGIN_VERSION: string;

export default class ExcelPlugin extends Plugin {
	public settings: ExcelSettings;

	async onload() {
		this.registerView(
			VIEW_TYPE_EXCEL,
			(leaf: WorkspaceLeaf) => new ExcelView(leaf, this)
		);
		this.registerExtensions(["sheet"], VIEW_TYPE_EXCEL);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"table",
			"Excel",
			(e: MouseEvent) => {
				// Called when the user clicks the icon.
				this.createAndOpenExcel(getExcelFilename(this.settings));
			}
		);

		// TODO markdwon后处理
		// this.addMarkdownPostProcessor();

		// TODO 链接处理
		// this.registerCommand();
	}

	private registerCommand() {
		const fileMenuHandlerConvertKeepExtension = (
			menu: Menu,
			file: TFile
		) => {
			console.log("fileMenuHandlerConvertKeepExtension");
			if (file instanceof TFile && file.extension == "excel") {
				menu.addItem((item: MenuItem) => {
					item.setTitle("*.xlsx => *.xlsx.md").onClick(() => {
						this.convertSingleExcalidrawToMD(file, false, false);
					});
				});
			}
		};

		this.registerEvent(
			this.app.workspace.on(
				"file-menu",
				fileMenuHandlerConvertKeepExtension
			)
		);
	}

	public async convertSingleExcalidrawToMD(
		file: TFile,
		replaceExtension: boolean = false,
		keepOriginal: boolean = false
	): Promise<TFile> {
		const data = await this.app.vault.read(file);
		const filename =
			file.name.substring(0, file.name.lastIndexOf(".xlsx")) +
			(replaceExtension ? ".md" : ".xlsx.md");
		const fname = getNewUniqueFilepath(
			this.app.vault,
			filename,
			normalizePath(
				file.path.substring(0, file.path.lastIndexOf(file.name))
			)
		);

		const result = await this.app.vault.create(fname, "{}");
		// if (this.settings.keepInSync) {
		//   EXPORT_TYPES.forEach((ext: string) => {
		// 	const oldIMGpath =
		// 	  file.path.substring(0, file.path.lastIndexOf(".xlsx")) + ext;
		// 	const imgFile = this.app.vault.getAbstractFileByPath(
		// 	  normalizePath(oldIMGpath),
		// 	);
		// 	if (imgFile && imgFile instanceof TFile) {
		// 	  const newIMGpath = fname.substring(0, fname.lastIndexOf(".md")) + ext;
		// 	  this.app.fileManager.renameFile(imgFile, newIMGpath);
		// 	}
		//   });
		// }
		// if (!keepOriginal) {
		//   this.app.vault.delete(file);
		// }
		return result;
	}

	private addMarkdownPostProcessor() {
		initializeMarkdownPostProcessor(this);
		this.registerMarkdownPostProcessor(markdownPostProcessor);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	public async createExcel(
		filename: string,
		foldername?: string,
		initData?: string
	): Promise<TFile> {
		// const folderpath = normalizePath(
		// 	foldername ? foldername : "Excel"
		// );
		// await checkAndCreateFolder(folderpath); //create folder if it does not exist
		const fname = normalizePath(filename);
		const file = await this.app.vault.create(fname, initData ?? "{}");

		return file;
	}

	public async createAndOpenExcel(
		filename: string,
		foldername?: string,
		initData?: string
	): Promise<string> {
		const file = await this.createExcel(filename, foldername, initData);
		this.openExcel(file, "new-pane", true, undefined);
		return file.path;
	}

	public openExcel(
		excelFile: TFile,
		location: PaneTarget,
		active: boolean = false,
		subpath?: string
	) {
		if (location === "md-properties") {
			location = "new-tab";
		}
		var leaf: WorkspaceLeaf | null = null;
		if (location === "popout-window") {
			leaf = app.workspace.openPopoutLeaf();
		}
		if (location === "new-tab") {
			leaf = app.workspace.getLeaf("tab");
		}
		if (!leaf) {
			leaf = this.app.workspace.getLeaf(false);
			if (
				leaf.view.getViewType() !== "empty" &&
				location === "new-pane"
			) {
				leaf = app.workspace.getMostRecentLeaf();
			}
		}

		leaf?.openFile(
			excelFile,
			!subpath || subpath === ""
				? { active }
				: { active, eState: { subpath } }
		).then(() => {});
	}

	public isExcelFile(f: TFile) {
		if (!f) return false;
		if (f.extension === "sheet") {
			return true;
		}
		return false;
	}
}
